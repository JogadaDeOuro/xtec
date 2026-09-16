import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  pageKey?: string;
}

export function ProtectedRoute({ children, pageKey }: ProtectedRouteProps) {
  const { session, loading, hasPageAccess, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // System pages (integracoes, configuracoes) are admin-only
  if (pageKey === 'integracoes' || pageKey === 'configuracoes') {
    if (!isAdmin) return <Navigate to="/dashboard" replace />;
  }

  // Check page-level permissions for non-admin users
  if (pageKey && !hasPageAccess(pageKey)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
