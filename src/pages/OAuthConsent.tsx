import { useEffect, useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Bot, Check, Loader2, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { SolarFlowLogo } from '@/components/brand/SolarFlowLogo';

type AuthorizationDetails = {
  authorization_id: string;
  client: { name: string; uri: string; logo_uri: string };
  user: { email: string };
  scope: string;
};

export default function OAuthConsent() {
  const { session, loading: authLoading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const authorizationId = searchParams.get('authorization_id') ?? '';
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading || !session || !authorizationId) return;

    let active = true;
    supabase.auth.oauth.getAuthorizationDetails(authorizationId).then(({ data, error: authError }) => {
      if (!active) return;
      if (authError || !data) {
        setError('Não foi possível validar esta solicitação de acesso.');
        return;
      }
      if ('redirect_url' in data) {
        window.location.assign(data.redirect_url);
        return;
      }
      setDetails(data as AuthorizationDetails);
    });

    return () => { active = false; };
  }, [authLoading, session, authorizationId]);

  if (!authLoading && !session) {
    return <Navigate to="/login" state={{ returnTo: `${location.pathname}${location.search}` }} replace />;
  }

  const decide = async (approved: boolean) => {
    if (!authorizationId) return;
    setSubmitting(true);
    setError('');
    const result = approved
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
      : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
    setSubmitting(false);
    if (result.error || !result.data?.redirect_url) {
      setError('Não foi possível concluir a autorização. Tente novamente.');
      return;
    }
    window.location.assign(result.data.redirect_url);
  };

  const scopes = details?.scope.split(' ').filter(Boolean) ?? [];

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-border shadow-elegant">
        <CardHeader className="space-y-4 text-center">
          <SolarFlowLogo className="mx-auto h-11 w-auto max-w-[220px] dark:hidden" tone="light" />
          <SolarFlowLogo className="mx-auto hidden h-11 w-auto max-w-[220px] dark:block" tone="dark" />
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>Autorizar assistente</CardTitle>
            <CardDescription className="mt-2">
               {details?.client.name ?? 'Um assistente'} quer acessar sua conta SolarFlow.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          {!details && !error ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Validando solicitação…
            </div>
          ) : null}
          {details ? (
            <>
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium">Acesso somente aos dados permitidos para você</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      O assistente poderá consultar clientes, propostas, contratos e etapas conforme seu perfil.
                    </p>
                  </div>
                </div>
                {scopes.length > 0 ? (
                  <p className="text-xs text-muted-foreground">Permissões solicitadas: {scopes.join(', ')}</p>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">Conta: {details.user.email}</p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => void decide(false)} disabled={submitting}>
                  <X className="mr-2 h-4 w-4" /> Negar
                </Button>
                <Button onClick={() => void decide(true)} disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Autorizar
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}