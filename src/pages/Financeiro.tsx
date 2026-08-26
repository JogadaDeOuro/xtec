import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { formatCurrency } from '@/lib/mock-data';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, subDays, subMonths, startOfYear, subYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DollarSign, TrendingUp, BarChart3, Target, CalendarIcon, FileText } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['hsl(152,55%,33%)', 'hsl(172,55%,40%)', 'hsl(38,92%,50%)', 'hsl(210,80%,52%)'];

const comparativoData = [
  { ano: 'Ano 1', semSolar: 14400, comSolar: 1200 },
  { ano: 'Ano 5', semSolar: 21150, comSolar: 1200 },
  { ano: 'Ano 10', semSolar: 34070, comSolar: 1200 },
  { ano: 'Ano 15', semSolar: 54870, comSolar: 1200 },
  { ano: 'Ano 20', semSolar: 88370, comSolar: 1200 },
  { ano: 'Ano 25', semSolar: 142340, comSolar: 1200 },
  { ano: 'Ano 30', semSolar: 229230, comSolar: 1200 },
];

type PeriodoKey = '24h' | '7d' | '30d' | '2m' | '3m' | 'ultimo_ano' | 'este_ano' | 'todo' | 'personalizado';

const periodoLabels: Record<PeriodoKey, string> = {
  '24h': 'Últimas 24h',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '2m': 'Últimos 2 meses',
  '3m': 'Últimos 3 meses',
  'ultimo_ano': 'Último ano',
  'este_ano': 'Este ano',
  'todo': 'Todo período',
  'personalizado': 'Personalizado',
};

function getDateRange(periodo: PeriodoKey): { from: Date; to: Date } | null {
  const now = new Date();
  switch (periodo) {
    case '24h': return { from: subDays(now, 1), to: now };
    case '7d': return { from: subDays(now, 7), to: now };
    case '30d': return { from: subDays(now, 30), to: now };
    case '2m': return { from: subMonths(now, 2), to: now };
    case '3m': return { from: subMonths(now, 3), to: now };
    case 'ultimo_ano': return { from: subYears(now, 1), to: now };
    case 'este_ano': return { from: startOfYear(now), to: now };
    case 'todo': return null;
    case 'personalizado': return null;
  }
}

export default function Financeiro() {
  const [periodo, setPeriodo] = useState<PeriodoKey>('todo');
  const [customFrom, setCustomFrom] = useState<Date>();
  const [customTo, setCustomTo] = useState<Date>();

  const dateRange = periodo === 'personalizado'
    ? (customFrom && customTo ? { from: customFrom, to: customTo } : null)
    : getDateRange(periodo);

  const [contracts, setContracts] = useState<{ valor: number; status: string; created_at: string; client_id: string | null; proposal_id: string | null }[]>([]);
  const [clientTypes, setClientTypes] = useState<Record<string, string>>({});
  const [proposals, setProposals] = useState<{ id: string; numero: string | null; client_name: string; valor: number; status: string; created_at: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      const [{ data: c }, { data: cl }, { data: p }] = await Promise.all([
        supabase.from('contracts').select('valor, status, created_at, client_id, proposal_id'),
        supabase.from('clients').select('id, client_type'),
        supabase.from('proposals').select('id, numero, client_name, valor_sistema, status, created_at'),
      ]);
      setContracts((c || []).map(r => ({ ...r, valor: Number(r.valor) || 0 })));
      const map: Record<string, string> = {};
      (cl || []).forEach(x => { map[x.id] = x.client_type; });
      setClientTypes(map);
      setProposals((p || []).map(r => ({
        id: r.id, numero: r.numero, client_name: r.client_name,
        valor: Number(r.valor_sistema) || 0, status: r.status, created_at: r.created_at,
      })));
    };
    load();
  }, []);

  const inRange = (iso: string) => {
    if (!dateRange) return true;
    const d = new Date(iso);
    return d >= dateRange.from && d <= dateRange.to;
  };

  const periodContracts = contracts.filter(c => inRange(c.created_at));
  const assinados = periodContracts.filter(c => c.status === 'assinado');
  const faturamentoFechado = assinados.reduce((s2, c) => s2 + c.valor, 0);
  const faturamentoPrevisto = periodContracts.reduce((s2, c) => s2 + c.valor, 0);
  const ticketMedio = assinados.length > 0 ? faturamentoFechado / assinados.length : 0;
  const contratosAtivos = periodContracts.filter(c => c.status !== 'cancelado').length;

  // Propostas que ainda não viraram contrato
  const contratadasIds = useMemo(
    () => new Set(contracts.map(c => c.proposal_id).filter(Boolean) as string[]),
    [contracts],
  );

  const propostasEmAberto = useMemo(
    () => proposals
      .filter(p => inRange(p.created_at))
      .filter(p => !contratadasIds.has(p.id))
      .filter(p => !['perdida', 'recusada', 'cancelada'].includes(p.status))
      .sort((a, b) => b.valor - a.valor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [proposals, contratadasIds, dateRange],
  );

  const valorEmAberto = propostasEmAberto.reduce((s2, p) => s2 + p.valor, 0);

  const statusLabels: Record<string, string> = {
    rascunho: 'Rascunho', enviada: 'Enviada', visualizada: 'Visualizada', aceita: 'Aceita',
  };


  const allMeses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  const filteredVendas = useMemo(() => {
    const buckets: Record<string, { mes: string; valor: number; propostas: number }> = {};
    periodContracts.forEach(c => {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!buckets[key]) buckets[key] = { mes: allMeses[d.getMonth()], valor: 0, propostas: 0 };
      buckets[key].valor += c.valor;
      buckets[key].propostas += 1;
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [periodContracts]);

  const tipoLabels: Record<string, string> = {
    residencial: 'Residencial', comercial: 'Comercial', industrial: 'Industrial', rural: 'Rural',
  };

  const faturamentoPorTipo = useMemo(() => {
    const map: Record<string, number> = {};
    periodContracts.forEach(c => {
      const tipo = tipoLabels[clientTypes[c.client_id || ''] || ''] || 'Outros';
      map[tipo] = (map[tipo] || 0) + c.valor;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [periodContracts, clientTypes]);

  const periodoLabel = dateRange
    ? `${format(dateRange.from, 'dd/MM/yy')} — ${format(dateRange.to, 'dd/MM/yy')}`
    : periodo === 'personalizado' ? 'Selecione as datas' : 'Todo o período';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Dashboard Financeiro</h1>
          <p className="text-sm text-muted-foreground">Análise financeira e comercial • {periodoLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoKey)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(periodoLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {periodo === 'personalizado' && (
            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn('text-xs', !customFrom && 'text-muted-foreground')}>
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {customFrom ? format(customFrom, 'dd/MM/yy') : 'De'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">—</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn('text-xs', !customTo && 'text-muted-foreground')}>
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {customTo ? format(customTo, 'dd/MM/yy') : 'Até'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customTo} onSelect={setCustomTo} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Faturamento Fechado" value={formatCurrency(faturamentoFechado)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard title="Faturamento Previsto" value={formatCurrency(faturamentoPrevisto)} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard
          title="Em propostas (sem contrato)"
          value={formatCurrency(valorEmAberto)}
          subtitle={`${propostasEmAberto.length} proposta${propostasEmAberto.length === 1 ? '' : 's'} em aberto`}
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard title="Ticket Médio" value={formatCurrency(ticketMedio)} icon={<BarChart3 className="h-5 w-5" />} />
        <StatCard title="Contratos Ativos" value={`${contratosAtivos}`} icon={<Target className="h-5 w-5" />} />

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Comparativo: Com vs Sem Energia Solar (cliente típico)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparativoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(140,15%,89%)" />
                  <XAxis dataKey="ano" fontSize={11} stroke="hsl(150,10%,45%)" />
                  <YAxis fontSize={11} stroke="hsl(150,10%,45%)" tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="semSolar" name="Sem Solar" fill="hsl(0,72%,51%)" radius={[4,4,0,0]} opacity={0.7} />
                  <Bar dataKey="comSolar" name="Com Solar" fill="hsl(152,55%,33%)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Faturamento por Tipo de Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {faturamentoPorTipo.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados no período</div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={faturamentoPorTipo} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {faturamentoPorTipo.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="animate-fade-in">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Evolução de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredVendas}>
                <defs>
                  <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(152,55%,33%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(152,55%,33%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(140,15%,89%)" />
                <XAxis dataKey="mes" fontSize={12} stroke="hsl(150,10%,45%)" />
                <YAxis fontSize={12} stroke="hsl(150,10%,45%)" tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="valor" stroke="hsl(152,55%,33%)" fill="url(#colorVendas)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
