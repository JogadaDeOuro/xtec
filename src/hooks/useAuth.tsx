import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

const ALL_PAGES = ['dashboard', 'crm', 'propostas', 'contratos', 'etapas', 'financeiro', 'whatsapp'] as const;
export type PageKey = typeof ALL_PAGES[number];
export { ALL_PAGES };

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: string[];
  allowedPages: string[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  isAdmin: boolean;
  hasPageAccess: (pageKey: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setProfile(data as Profile);
  };

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    if (data) setRoles(data.map((r: any) => r.role));
  };

  const fetchPermissions = async (userId: string) => {
    const { data } = await supabase
      .from('user_page_permissions')
      .select('page_key')
      .eq('user_id', userId);
    if (data) setAllowedPages(data.map((p: any) => p.page_key));
  };

  useEffect(() => {
    let active = true;

    // Loads profile, roles and permissions BEFORE releasing the loading flag,
    // otherwise ProtectedRoute evaluates permissions with empty arrays and
    // bounces the user back to the dashboard.
    const hydrate = async (session: Session | null) => {
      if (!active) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await Promise.all([
          fetchProfile(session.user.id),
          fetchRoles(session.user.id),
          fetchPermissions(session.user.id),
        ]);
      } else {
        setProfile(null);
        setRoles([]);
        setAllowedPages([]);
      }
      if (active) setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void hydrate(session);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => hydrate(session));

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = roles.includes('admin');

  const hasPageAccess = (pageKey: string) => {
    if (isAdmin) return true;
    return allowedPages.includes(pageKey);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
    setAllowedPages([]);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, roles, allowedPages, loading, signIn, signUp, signOut, resetPassword, isAdmin, hasPageAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
