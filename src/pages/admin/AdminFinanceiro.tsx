import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminShell } from './AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { AdminOrg, fetchOrganizations, logAdminAction } from '@/lib/admin';
import { formatCurrency } from '@/lib/saas';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente', paid: 'Paga', overdue: 'Vencida', canceled: 'Cancelada',
};

export default function AdminFinanceiro() {
  const [records, setRecords] = useState<any[] | null>(null);
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [open, setOpen] = useState(false);
  const [orgId, setOrgId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [method, setMethod] = useState('');
  const [notes, setNotes] = useState('');

  const load = async () => {
    const { data } = await supabase
      .from('billing_records')
      .select('*, organizations(name)')
      .order('created_at', { ascending: false });
    setRecords(data ?? []);
  };

  useEffect(() => { void load(); fetchOrganizations().then(setOrgs).catch(() => setOrgs([])); }, []);

  const createRecord = async () => {
    if (!orgId || !amount) { toast.error('Informe empresa e valor.'); return; }
    const { data: sub } = await supabase.from('subscriptions').select('id').eq('organization_id', orgId).maybeSingle();
    const payload = {
      organization_id: orgId,
      subscription_id: sub?.id ?? null,
      amount: Number(amount.replace(',', '.')),
      due_date: dueDate || null,
      status: 'pending',
      method: method || null,
      notes: notes || null,
      created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    };
    const { error } = await supabase.from('billing_records').insert(payload as never);
    if (error) { toast.error(error.message); return; }
    await logAdminAction('cobranca_registrada', orgId, null, payload);
    toast.success('Cobrança registrada.');
    setOpen(false); setAmount(''); setDueDate(''); setMethod(''); setNotes('');
    await load();
  };

  const setStatus = async (rec: any, status: string) => {
    const patch: Record<string, unknown> = { status, paid_at: status === 'paid' ? new Date().toISOString() : null };
    const { error } = await supabase.from('billing_records').update(patch as never).eq('id', rec.id);
    if (error) { toast.error(error.message); return; }
    await logAdminAction('cobranca_' + status, rec.organization_id, { status: rec.status }, patch);
    toast.success('Cobrança atualizada.');
    await load();
  };

  return (
    <AdminShell title="Financeiro" description="Controle manual das cobranças de assinatura">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Registrar cobrança</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova cobrança</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Empresa</Label>
                <Select value={orgId} onValueChange={setOrgId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Valor (R$)</Label><Input type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                <div><Label className="text-xs">Vencimento</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
              </div>
              <div><Label className="text-xs">Forma de pagamento</Label><Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="PIX, boleto..." /></div>
              <div><Label className="text-xs">Observações</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              <Button className="w-full" onClick={createRecord}>Registrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!records ? <Skeleton className="h-64 rounded-xl" /> : (
        <Card className="border-border/60">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left">Empresa</th>
                  <th className="px-5 py-3 text-left">Valor</th>
                  <th className="px-5 py-3 text-left">Vencimento</th>
                  <th className="px-5 py-3 text-left">Pago em</th>
                  <th className="px-5 py-3 text-left">Situação</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-border/40 last:border-0">
                    <td className="px-5 py-3 font-medium">{r.organizations?.name ?? '—'}</td>
                    <td className="px-5 py-3">{formatCurrency(Number(r.amount))}</td>
                    <td className="px-5 py-3">{r.due_date ? new Date(r.due_date).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-5 py-3">{r.paid_at ? new Date(r.paid_at).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-5 py-3"><Badge variant={r.status === 'paid' ? 'default' : r.status === 'overdue' ? 'destructive' : 'secondary'}>{STATUS_LABELS[r.status]}</Badge></td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setStatus(r, 'paid')}>Paga</Button>
                        <Button size="sm" variant="ghost" onClick={() => setStatus(r, 'overdue')}>Vencida</Button>
                        <Button size="sm" variant="ghost" onClick={() => setStatus(r, 'canceled')}>Cancelar</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">Nenhuma cobrança registrada.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">
        Estrutura preparada para receber pagamentos automáticos de um gateway futuramente, alimentando estes mesmos registros.
      </p>
    </AdminShell>
  );
}
