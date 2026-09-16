import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminShell } from './AdminLayout';
import { AdminOrg, fetchOrganizations } from '@/lib/admin';
import { SUBSCRIPTION_STATUS_LABELS, formatCurrency } from '@/lib/saas';

export default function AdminAssinaturas() {
  const [orgs, setOrgs] = useState<AdminOrg[] | null>(null);
  useEffect(() => { fetchOrganizations().then(setOrgs).catch(() => setOrgs([])); }, []);

  return (
    <AdminShell title="Assinaturas" description="Situação contratual de cada empresa">
      {!orgs ? <Skeleton className="h-64 rounded-xl" /> : (
        <Card className="border-border/60">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left">Empresa</th>
                  <th className="px-5 py-3 text-left">Plano</th>
                  <th className="px-5 py-3 text-left">Valor</th>
                  <th className="px-5 py-3 text-left">Situação</th>
                  <th className="px-5 py-3 text-left">Tolerância até</th>
                  <th className="px-5 py-3 text-left">Próxima cobrança</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <tr key={o.id} className="border-b border-border/40 last:border-0">
                    <td className="px-5 py-3 font-medium">{o.name}</td>
                    <td className="px-5 py-3">{o.plan_name ?? '—'}</td>
                    <td className="px-5 py-3">{formatCurrency(Number(o.plan_price ?? 0))}</td>
                    <td className="px-5 py-3"><Badge variant="secondary">{SUBSCRIPTION_STATUS_LABELS[o.subscription_status ?? ''] ?? '—'}</Badge></td>
                    <td className="px-5 py-3">{o.grace_until ? new Date(o.grace_until).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-5 py-3">{o.next_billing_at ? new Date(o.next_billing_at).toLocaleDateString('pt-BR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </AdminShell>
  );
}
