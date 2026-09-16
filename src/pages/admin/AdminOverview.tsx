import { useEffect, useState } from 'react';
import { Building2, Users, CreditCard, AlertTriangle, TrendingUp, ShieldAlert, Clock, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminShell } from './AdminLayout';
import { fetchOverview, PlatformOverview } from '@/lib/admin';
import { formatCurrency } from '@/lib/saas';

function Metric({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint?: string }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <p className="mt-2 font-display text-2xl font-bold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminOverview() {
  const [data, setData] = useState<PlatformOverview | null>(null);

  useEffect(() => { fetchOverview().then(setData).catch(() => setData(null)); }, []);

  return (
    <AdminShell title="Visão geral" description="Indicadores da plataforma SolarFlow">
      {!data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={Building2} label="Empresas" value={String(data.organizations)} hint={`${data.organizations_active} ativas`} />
            <Metric icon={Users} label="Usuários" value={String(data.users_total)} />
            <Metric icon={CreditCard} label="Assinaturas ativas" value={String(data.subscriptions_active)} hint={`${data.free_orgs} no gratuito · ${data.paid_orgs} em planos pagos`} />
            <Metric icon={TrendingUp} label="MRR" value={formatCurrency(Number(data.mrr))} hint="Somatório dos planos mensais ativos" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={AlertTriangle} label="Pagamentos pendentes" value={formatCurrency(Number(data.pending_amount))} hint={`${data.past_due} empresa(s) em atraso`} />
            <Metric icon={Clock} label="Em tolerância" value={String(data.grace)} />
            <Metric icon={ShieldAlert} label="Contas restritas" value={String(data.restricted)} />
            <Metric icon={Building2} label="Novos cadastros (30d)" value={String(data.new_orgs_30d)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={TrendingUp} label="Recebido (30d)" value={formatCurrency(Number(data.revenue_paid_30d))} hint="Somente pagamentos registrados" />
            <Metric icon={Users} label="Clientes na plataforma" value={String(data.usage.clients)} />
            <Metric icon={FileText} label="Propostas criadas" value={String(data.usage.proposals)} />
            <Metric icon={FileText} label="Contratos criados" value={String(data.usage.contracts)} />
          </div>
        </>
      )}
    </AdminShell>
  );
}
