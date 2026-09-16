import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminShell } from './AdminLayout';
import { AdminOrg, fetchOrganizations } from '@/lib/admin';

export default function AdminUso() {
  const [orgs, setOrgs] = useState<AdminOrg[] | null>(null);
  useEffect(() => { fetchOrganizations().then(setOrgs).catch(() => setOrgs([])); }, []);

  const sorted = [...(orgs ?? [])].sort((a, b) => (b.clients + b.proposals + b.contracts) - (a.clients + a.proposals + a.contracts));

  return (
    <AdminShell title="Uso" description="Quem mais utiliza a plataforma">
      {!orgs ? <Skeleton className="h-64 rounded-xl" /> : (
        <div className="grid gap-3">
          {sorted.map((o) => {
            const total = o.clients + o.proposals + o.contracts;
            const max = Math.max(1, ...sorted.map((x) => x.clients + x.proposals + x.contracts));
            return (
              <Card key={o.id} className="border-border/60">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{o.name}</span>
                    <span className="text-muted-foreground">{o.clients} clientes · {o.proposals} propostas · {o.contracts} contratos · {o.users} usuários</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(total / max) * 100}%` }} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
