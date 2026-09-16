import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  AccountSummary,
  FeatureCode,
  FeatureState,
  isRestricted,
} from '@/lib/saas';

interface AccountContextType {
  account: AccountSummary | null;
  loading: boolean;
  refresh: () => Promise<void>;
  isSuperAdmin: boolean;
  restricted: boolean;
  /** Regra centralizada: a organização pode usar esta funcionalidade agora? */
  canUseFeature: (code: FeatureCode) => boolean;
  /** Limite efetivo (null = ilimitado). */
  getUsageLimit: (code: FeatureCode) => number | null;
  getFeature: (code: FeatureCode) => FeatureState | null;
  /** Já atingiu o limite de criação desta funcionalidade? */
  limitReached: (code: FeatureCode) => boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session) {
      setAccount(null);
      setLoading(false);
      return;
    }
    let { data } = await supabase.rpc('get_my_account_summary');
    let summary = data as unknown as AccountSummary | null;

    // Cadastro concluído por e-mail: a empresa é criada no primeiro login.
    if (summary?.error === 'no_organization') {
      const meta = session.user.user_metadata as { company_name?: string; full_name?: string };
      const name = meta?.company_name || meta?.full_name || session.user.email?.split('@')[0] || 'Minha empresa';
      const { error: orgError } = await supabase.rpc('signup_create_organization', {
        _name: name, _document: null, _phone: null,
      });
      if (!orgError) {
        const retry = await supabase.rpc('get_my_account_summary');
        summary = retry.data as unknown as AccountSummary | null;
      }
    }

    if (summary && !summary.error) setAccount(summary);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  const isSuperAdmin = !!account?.is_super_admin;
  const restricted = !isSuperAdmin && isRestricted(account?.subscription);

  const getFeature = (code: FeatureCode) => account?.features?.[code] ?? null;

  const canUseFeature = (code: FeatureCode) => {
    if (isSuperAdmin) return true;
    if (restricted) return false;
    const f = getFeature(code);
    return f ? f.enabled : false;
  };

  const getUsageLimit = (code: FeatureCode) => {
    if (isSuperAdmin) return null;
    const f = getFeature(code);
    if (!f || f.unlimited) return null;
    return f.limit;
  };

  const limitReached = (code: FeatureCode) => {
    if (isSuperAdmin) return false;
    if (restricted) return true;
    const f = getFeature(code);
    if (!f || f.unlimited || f.limit === null) return false;
    return f.used >= f.limit;
  };

  return (
    <AccountContext.Provider
      value={{ account, loading, refresh, isSuperAdmin, restricted, canUseFeature, getUsageLimit, getFeature, limitReached }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used within AccountProvider');
  return ctx;
}
