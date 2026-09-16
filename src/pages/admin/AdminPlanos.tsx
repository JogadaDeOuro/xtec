import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminShell } from './AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { logAdminAction } from '@/lib/admin';
import { FEATURE_LABELS } from '@/lib/saas';

interface PlanRow {
  id: string; code: string; name: string; description: string | null;
  price: number; billing_interval: string; active: boolean; public: boolean; sort_order: number;
  plan_features: { id: string; feature_code: string; enabled: boolean; limit_value: number | null; period: string }[];
}

export default function AdminPlanos() {
  const [plans, setPlans] = useState<PlanRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('plans')
      .select('*, plan_features(id, feature_code, enabled, limit_value, period)')
      .order('sort_order');
    setPlans((data ?? []) as unknown as PlanRow[]);
  };
  useEffect(() => { void load(); }, []);

  const savePlan = async (plan: PlanRow, patch: Partial<PlanRow>) => {
    setBusy(true);
    const { error } = await supabase.from('plans').update(patch as never).eq('id', plan.id);
    if (error) toast.error(error.message);
    else { await logAdminAction('plano_atualizado', null, { code: plan.code }, patch); toast.success('Plano atualizado.'); await load(); }
    setBusy(false);
  };

  const saveFeature = async (featureId: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from('plan_features').update(patch as never).eq('id', featureId);
    if (error) toast.error(error.message);
    else { await logAdminAction('feature_plano_atualizada', null, { featureId }, patch); await load(); }
  };

  return (
    <AdminShell title="Planos" description="Preços, publicação e limites de cada plano">
      {!plans ? <Skeleton className="h-64 rounded-xl" /> : (
        <div className="space-y-5">
          {plans.map((plan) => (
            <Card key={plan.id} className="border-border/60">
              <CardContent className="space-y-5 p-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <Label className="text-xs">Nome</Label>
                    <Input defaultValue={plan.name} onBlur={(e) => e.target.value !== plan.name && savePlan(plan, { name: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Preço mensal (R$)</Label>
                    <Input type="text" inputMode="numeric" defaultValue={String(plan.price)}
                      onBlur={(e) => savePlan(plan, { price: Number(e.target.value.replace(',', '.')) || 0 })} />
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={plan.active} disabled={busy} onCheckedChange={(v) => savePlan(plan, { active: v })} />
                      <span className="text-sm">Ativo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={plan.public} disabled={busy} onCheckedChange={(v) => savePlan(plan, { public: v })} />
                      <span className="text-sm">Público</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Descrição</Label>
                    <Input defaultValue={plan.description ?? ''} onBlur={(e) => savePlan(plan, { description: e.target.value })} />
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  {plan.plan_features.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2">
                      <span className="flex-1 text-sm">{FEATURE_LABELS[f.feature_code] ?? f.feature_code}</span>
                      <Input
                        className="h-8 w-24"
                        type="text"
                        inputMode="numeric"
                        placeholder="ilimitado"
                        defaultValue={f.limit_value === null ? '' : String(f.limit_value)}
                        onBlur={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          saveFeature(f.id, { limit_value: raw === '' ? null : Number(raw) });
                        }}
                      />
                      <Switch checked={f.enabled} onCheckedChange={(v) => saveFeature(f.id, { enabled: v })} />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Campo de limite vazio = ilimitado. Planos inativos ou não públicos não aparecem na página de vendas.</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
