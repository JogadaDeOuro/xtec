import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AdminShell } from './AdminLayout';
import { supabase } from '@/integrations/supabase/client';

export default function AdminAuditoria() {
  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    supabase
      .from('admin_audit_log')
      .select('*, organizations(name)')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => setRows(data ?? []));
  }, []);

  return (
    <AdminShell title="Auditoria" description="Trilha das ações administrativas da plataforma">
      {!rows ? <Skeleton className="h-64 rounded-xl" /> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="border-border/60">
              <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{r.action}</Badge>
                    <span className="text-sm font-medium">{r.organizations?.name ?? 'Plataforma'}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    antes: {JSON.stringify(r.before_value)} · depois: {JSON.stringify(r.after_value)}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('pt-BR')}</span>
              </CardContent>
            </Card>
          ))}
          {rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma ação registrada ainda.</p>}
        </div>
      )}
    </AdminShell>
  );
}
