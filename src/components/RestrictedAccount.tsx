import { Link } from 'react-router-dom';
import { ShieldAlert, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useAccount } from '@/hooks/useAccount';
import { SUBSCRIPTION_STATUS_LABELS } from '@/lib/saas';

/**
 * Conta restrita por pendência financeira: nenhum dado é apagado.
 * O usuário continua autenticado e pode ver a situação da assinatura e sair.
 */
export function RestrictedAccount() {
  const { signOut } = useAuth();
  const { account } = useAccount();
  const sub = account?.subscription;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border-border/60">
        <CardContent className="space-y-5 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">Acesso temporariamente restrito</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Existe uma pendência financeira na assinatura de <strong>{account?.organization?.name}</strong>.
              Seus clientes, propostas e contratos continuam salvos e serão liberados assim que a situação for regularizada.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 p-4 text-left text-sm">
            <p><span className="text-muted-foreground">Plano:</span> {account?.plan?.name ?? '—'}</p>
            <p><span className="text-muted-foreground">Situação:</span> {SUBSCRIPTION_STATUS_LABELS[sub?.status ?? ''] ?? '—'}</p>
            {sub?.grace_until && (
              <p><span className="text-muted-foreground">Tolerância até:</span> {new Date(sub.grace_until).toLocaleDateString('pt-BR')}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" asChild><Link to="/conta/plano">Ver assinatura</Link></Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" /> Sair da conta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
