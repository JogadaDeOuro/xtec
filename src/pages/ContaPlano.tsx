import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2, CreditCard, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccount } from '@/hooks/useAccount';
import { FEATURE_LABELS, SUBSCRIPTION_STATUS_LABELS, formatCurrency, nextWeekReset } from '@/lib/saas';

const COUNTED = ['max_clients', 'proposals_per_week', 'contracts_per_week', 'max_users'] as const;

export default function ContaPlano() {
  const { account, loading } = useAccount();

  if (loading) return <div className="space-y-4"><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>;

  const plan = account?.plan;
  const sub = account?.subscription;
  const reset = nextWeekReset().toLocaleDateString('pt-BR');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Plano e assinatura</h1>
        <p className="text-sm text-muted-foreground">{account?.organization?.name}</p>
      </div>

      <Card className="border-border/60">
        <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Plano atual</p>
            <p className="mt-1 font-display text-2xl font-bold">{plan?.name ?? 'Sem plano'}</p>
            <p className="text-sm text-muted-foreground">
              {plan ? `${formatCurrency(Number(plan.price))} / mês` : '—'}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <Badge variant={sub?.status === 'active' ? 'default' : 'destructive'}>
              {SUBSCRIPTION_STATUS_LABELS[sub?.status ?? ''] ?? 'Sem assinatura'}
            </Badge>
            {sub?.next_billing_at && (
              <p className="text-xs text-muted-foreground">Próxima cobrança: {new Date(sub.next_billing_at).toLocaleDateString('pt-BR')}</p>
            )}
            {sub?.grace_until && (
              <p className="text-xs text-muted-foreground">Acesso liberado até {new Date(sub.grace_until).toLocaleDateString('pt-BR')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="space-y-5 p-6">
          <p className="font-medium">Uso atual</p>
          {COUNTED.map((code) => {
            const f = account?.features?.[code];
            if (!f) return null;
            const limit = f.unlimited || f.limit === null ? null : f.limit;
            const pct = limit ? Math.min(100, (f.used / limit) * 100) : 0;
            return (
              <div key={code}>
                <div className="flex items-center justify-between text-sm">
                  <span>{FEATURE_LABELS[code]}</span>
                  <span className="text-muted-foreground">
                    {limit === null ? `${f.used} · ilimitado` : `${f.used} / ${limit}${f.period === 'week' ? ' nesta semana' : ''}`}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${pct >= 100 ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${limit === null ? 4 : pct}%` }} />
                </div>
              </div>
            );
          })}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" /> Os contadores semanais reiniciam em {reset}. Nada é apagado ao atingir um limite.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="space-y-3 p-6">
          <p className="font-medium">Recursos incluídos</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(account?.features ?? {})
              .filter(([code, f]) => f?.enabled && !COUNTED.includes(code as never))
              .map(([code]) => (
                <div key={code} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> {FEATURE_LABELS[code] ?? code}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-muted/30">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-medium">Precisa de mais volume?</p>
            <p className="text-sm text-muted-foreground">
              Novos planos com mais clientes, propostas, usuários, WhatsApp integrado e automações estarão disponíveis em breve.
            </p>
          </div>
          <Button className="gap-2" asChild>
            <Link to="/#planos"><CreditCard className="h-4 w-4" /> Fazer upgrade <ArrowUpRight className="h-4 w-4" /></Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
