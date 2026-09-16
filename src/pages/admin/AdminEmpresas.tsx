import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Search, Building2, ShieldAlert, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminShell } from './AdminLayout';
import { AdminOrg, fetchOrganizations, logAdminAction } from '@/lib/admin';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, FEATURE_LABELS, SUBSCRIPTION_STATUS_LABELS } from '@/lib/saas';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default', trial: 'secondary', past_due: 'outline', grace_period: 'outline',
  restricted: 'destructive', canceled: 'destructive',
};

const OVERRIDE_FEATURES = ['max_clients', 'proposals_per_week', 'contracts_per_week', 'max_users', 'whatsapp', 'ai', 'custom_branding'];

export default function AdminEmpresas() {
  const [orgs, setOrgs] = useState<AdminOrg[] | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [selected, setSelected] = useState<AdminOrg | null>(null);
  const [plans, setPlans] = useState<{ id: string; code: string; name: string }[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  // formulário de override
  const [ovFeature, setOvFeature] = useState('max_clients');
  const [ovLimit, setOvLimit] = useState('');
  const [ovExpires, setOvExpires] = useState('');
  const [ovReason, setOvReason] = useState('');
  const [graceDate, setGraceDate] = useState('');
  const [note, setNote] = useState('');

  const load = async () => {
    setOrgs(null);
    try { setOrgs(await fetchOrganizations()); } catch { setOrgs([]); }
  };

  useEffect(() => {
    void load();
    supabase.from('plans').select('id, code, name').order('sort_order').then(({ data }) => setPlans(data ?? []));
  }, []);

  const openOrg = async (org: AdminOrg) => {
    setSelected(org);
    setGraceDate(org.grace_until ? org.grace_until.slice(0, 10) : '');
    const { data } = await supabase
      .from('organization_feature_overrides')
      .select('*')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false });
    setOverrides(data ?? []);
  };

  const filtered = useMemo(() => {
    if (!orgs) return [];
    return orgs.filter((o) => {
      const q = query.trim().toLowerCase();
      const matchQ = !q || o.name.toLowerCase().includes(q) || (o.owner_email ?? '').toLowerCase().includes(q);
      const matchS = statusFilter === 'todos' || o.subscription_status === statusFilter;
      return matchQ && matchS;
    });
  }, [orgs, query, statusFilter]);

  const updateSubscription = async (patch: Record<string, unknown>, action: string) => {
    if (!selected) return;
    setBusy(true);
    const before = { status: selected.subscription_status, plan: selected.plan_code, grace_until: selected.grace_until };
    const { error } = await supabase.from('subscriptions').update(patch as never).eq('organization_id', selected.id);
    if (error) { toast.error('Não foi possível salvar: ' + error.message); setBusy(false); return; }
    await logAdminAction(action, selected.id, before, patch);
    toast.success('Alteração aplicada e registrada na auditoria.');
    setBusy(false);
    await load();
    setSelected(null);
  };

  const saveOverride = async () => {
    if (!selected) return;
    setBusy(true);
    const isNumeric = ['max_clients', 'proposals_per_week', 'contracts_per_week', 'max_users'].includes(ovFeature);
    const payload = {
      organization_id: selected.id,
      feature_code: ovFeature,
      enabled: isNumeric ? null : true,
      limit_value: isNumeric && ovLimit ? Number(ovLimit) : null,
      unlimited: isNumeric && ovLimit === '0' ? false : !isNumeric ? false : false,
      expires_at: ovExpires ? new Date(ovExpires).toISOString() : null,
      reason: ovReason || null,
      created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    };
    const { error } = await supabase.from('organization_feature_overrides').insert(payload as never);
    if (error) { toast.error(error.message); setBusy(false); return; }
    await logAdminAction('override_criado', selected.id, null, payload);
    toast.success('Liberação manual aplicada.');
    setOvLimit(''); setOvReason(''); setOvExpires('');
    setBusy(false);
    await openOrg(selected);
  };

  const removeOverride = async (id: string) => {
    if (!selected) return;
    await supabase.from('organization_feature_overrides').delete().eq('id', id);
    await logAdminAction('override_removido', selected.id, { id }, null);
    toast.success('Liberação removida.');
    await openOrg(selected);
  };

  return (
    <AdminShell title="Empresas" description="Todas as empresas clientes do SolarFlow">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por empresa ou responsável" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as situações</SelectItem>
            {Object.entries(SUBSCRIPTION_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" /> Atualizar</Button>
      </div>

      {!orgs ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((o) => (
            <Card key={o.id} className="cursor-pointer border-border/60 transition-colors hover:border-primary/40" onClick={() => openOrg(o)}>
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{o.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{o.owner_email ?? 'sem responsável'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4 md:w-[520px]">
                  <div><p className="text-muted-foreground">Plano</p><p className="font-medium">{o.plan_name ?? '—'}</p></div>
                  <div><p className="text-muted-foreground">Usuários</p><p className="font-medium">{o.users}</p></div>
                  <div><p className="text-muted-foreground">Uso</p><p className="font-medium">{o.clients}c · {o.proposals}p · {o.contracts}ct</p></div>
                  <div><p className="text-muted-foreground">Pendência</p><p className="font-medium">{formatCurrency(Number(o.overdue_amount))}</p></div>
                </div>
                <Badge variant={STATUS_VARIANT[o.subscription_status ?? ''] ?? 'secondary'}>
                  {SUBSCRIPTION_STATUS_LABELS[o.subscription_status ?? ''] ?? 'Sem assinatura'}
                </Badge>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma empresa encontrada.</p>}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div><p className="text-xs text-muted-foreground">Responsável</p><p>{selected.owner_email ?? '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Criada em</p><p>{new Date(selected.created_at).toLocaleDateString('pt-BR')}</p></div>
                <div><p className="text-xs text-muted-foreground">Situação</p><p>{SUBSCRIPTION_STATUS_LABELS[selected.subscription_status ?? ''] ?? '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Clientes</p><p>{selected.clients}</p></div>
                <div><p className="text-xs text-muted-foreground">Propostas</p><p>{selected.proposals}</p></div>
                <div><p className="text-xs text-muted-foreground">Contratos</p><p>{selected.contracts}</p></div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Plano</Label>
                <Select value={plans.find((p) => p.code === selected.plan_code)?.id ?? ''} onValueChange={(v) => updateSubscription({ plan_id: v }, 'plano_alterado')}>
                  <SelectTrigger><SelectValue placeholder="Selecionar plano" /></SelectTrigger>
                  <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs">Permitir acesso até (tolerância)</Label>
                  <div className="flex gap-2">
                    <Input type="date" value={graceDate} onChange={(e) => setGraceDate(e.target.value)} />
                    <Button variant="outline" disabled={busy || !graceDate}
                      onClick={() => updateSubscription({ grace_until: new Date(graceDate).toISOString(), status: 'grace_period' }, 'grace_period_alterado')}>
                      Aplicar
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Situação da conta</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => updateSubscription({ status: 'active', restricted_at: null }, 'conta_reativada')}>Reativar</Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => updateSubscription({ status: 'past_due' }, 'marcada_em_atraso')}>Em atraso</Button>
                    <Button size="sm" variant="destructive" disabled={busy}
                      onClick={() => updateSubscription({ status: 'restricted', restricted_at: new Date().toISOString() }, 'conta_restrita')}>
                      <ShieldAlert className="mr-1 h-3.5 w-3.5" /> Restringir
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border/60 p-4">
                <p className="text-sm font-medium">Liberação manual de recursos</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Select value={ovFeature} onValueChange={setOvFeature}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{OVERRIDE_FEATURES.map((f) => <SelectItem key={f} value={f}>{FEATURE_LABELS[f] ?? f}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="text" inputMode="numeric" placeholder="Novo limite" value={ovLimit} onChange={(e) => setOvLimit(e.target.value.replace(/\D/g, ''))} />
                  <Input type="date" value={ovExpires} onChange={(e) => setOvExpires(e.target.value)} />
                </div>
                <Textarea placeholder="Justificativa" value={ovReason} onChange={(e) => setOvReason(e.target.value)} rows={2} />
                <Button size="sm" disabled={busy} onClick={saveOverride}>Aplicar liberação</Button>

                {overrides.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {overrides.map((o) => (
                      <div key={o.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-xs">
                        <span>
                          {FEATURE_LABELS[o.feature_code] ?? o.feature_code}: {o.unlimited ? 'ilimitado' : o.limit_value ?? (o.enabled ? 'liberado' : 'bloqueado')}
                          {o.expires_at && ` · até ${new Date(o.expires_at).toLocaleDateString('pt-BR')}`}
                        </span>
                        <Button size="sm" variant="ghost" onClick={() => removeOverride(o.id)}>Remover</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Observação administrativa</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
                <Button size="sm" variant="outline" disabled={!note.trim()}
                  onClick={async () => { await logAdminAction('observacao', selected.id, null, { note }); setNote(''); toast.success('Observação registrada na auditoria.'); }}>
                  Registrar observação
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
