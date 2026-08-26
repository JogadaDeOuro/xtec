import { useEffect, useState, useMemo } from 'react';
import { 
  Users, FileText, FileSignature, TrendingUp, DollarSign, BarChart3, 
  Target, AlertTriangle, ArrowUpRight, ArrowDownRight, Loader2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { formatCurrency, formatNumber } from '@/lib/mock-data';
import { fetchProposals, type ProposalRecord } from '@/lib/proposals';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';

const COLORS = ['hsl(152,55%,33%)', 'hsl(172,55%,40%)', 'hsl(38,92%,50%)', 'hsl(210,80%,52%)', 'hsl(280,55%,50%)'];

const statusToFunnel: Record<string, string> = {
  novo: 'Leads',
  em_atendimento: 'Em Atendimento',
  proposta_enviada: 'Proposta Enviada',
  negociacao: 'Negociação',
  fechado: 'Fechados',
  instalacao: 'Fechados',
  finalizado: 'Fechados',
};

export default function Dashboard() {
  type ClientRow = Tables<'clients'>;
  type StageItemRow = Tables<'stage_items'> & { project_stages: { client_id: string } | null };
  type ContractRow = Tables<'contracts'>;

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [stageItems, setStageItems] = useState<StageItemRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [proposalsData, setProposalsData] = useState<ProposalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [clientsRes, stagesRes, contractsRes, proposalsRes] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('stage_items').select('*, project_stages(client_id)'),
        supabase.from('contracts').select('*'),
        fetchProposals().catch(() => [] as ProposalRecord[]),
      ]);
      setProposalsData(proposalsRes);
      if (clientsRes.data) setClients(clientsRes.data as ClientRow[]);
      if (stagesRes.data) setStageItems(stagesRes.data as unknown as StageItemRow[]);
      if (contractsRes.data) setContracts(contractsRes.data as ContractRow[]);
      setLoading(false);
    }
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const totalLeads = clients.length;
    
    const proposals = proposalsData;
    const proposalsEnviadas = proposals.filter(p => p.status !== 'rascunho').length;
    const proposalsAceitas = proposals.filter(p => p.status === 'aceita').length;
    const taxaConversao = proposalsEnviadas > 0 ? ((proposalsAceitas / proposalsEnviadas) * 100) : 0;

    // Contracts from DB
    const contratosAssinados = contracts.filter(c => c.status === 'assinado').length;
    const faturamentoFechado = contracts
      .filter(c => c.status === 'assinado')
      .reduce((sum, c) => sum + (Number(c.valor) || 0), 0);
    const faturamentoPrevisto = contracts.reduce((sum, c) => sum + (Number(c.valor) || 0), 0);

    // Funnel from real client statuses
    const funnelMap: Record<string, number> = {
      'Leads': 0,
      'Em Atendimento': 0,
      'Proposta Enviada': 0,
      'Negociação': 0,
      'Fechados': 0,
    };
    clients.forEach(c => {
      const label = statusToFunnel[c.status] || 'Leads';
      funnelMap[label] = (funnelMap[label] || 0) + 1;
    });
    // Funnel should be cumulative (each stage includes those who passed through)
    const funnelOrder = ['Leads', 'Em Atendimento', 'Proposta Enviada', 'Negociação', 'Fechados'];
    let cumulative = totalLeads;
    const funil = funnelOrder.map(etapa => {
      const q = etapa === 'Leads' ? totalLeads : cumulative;
      const quantidade = etapa === 'Leads' ? totalLeads : funnelMap[etapa];
      if (etapa !== 'Leads') cumulative = quantidade;
      return { etapa, quantidade: etapa === 'Leads' ? totalLeads : funnelMap[etapa] };
    });

    // Vendedores from real data
    const vendedorMap: Record<string, { leads: number; fechamentos: number; faturamento: number }> = {};
    clients.forEach(c => {
      const v = c.vendedor || 'Sem vendedor';
      if (!vendedorMap[v]) vendedorMap[v] = { leads: 0, fechamentos: 0, faturamento: 0 };
      vendedorMap[v].leads++;
      if (['fechado', 'instalacao', 'finalizado'].includes(c.status)) {
        vendedorMap[v].fechamentos++;
      }
    });
    // Add contract revenue to vendedores
    contracts.filter(c => c.status === 'assinado').forEach(contract => {
      const client = clients.find(cl => cl.id === contract.client_id || cl.name === contract.client_name);
      if (client) {
        const v = client.vendedor || 'Sem vendedor';
        if (vendedorMap[v]) vendedorMap[v].faturamento += Number(contract.valor) || 0;
      }
    });
    const vendedores = Object.entries(vendedorMap)
      .map(([nome, data]) => ({ nome, ...data }))
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, 5);

    // Monthly sales from contracts by creation date
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const vendasMensais: { mes: string; valor: number; propostas: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mes = monthNames[d.getMonth()];
      const year = d.getFullYear();
      const month = d.getMonth();
      const valor = contracts
        .filter(c => {
          const cd = new Date(c.created_at);
          return cd.getFullYear() === year && cd.getMonth() === month && c.status === 'assinado';
        })
        .reduce((sum, c) => sum + (Number(c.valor) || 0), 0);
      const propostas = proposals
        .filter(p => {
          const pd = new Date(p.createdAt);
          return pd.getFullYear() === year && pd.getMonth() === month;
        }).length;
      vendasMensais.push({ mes, valor, propostas });
    }

    // Stage items by status
    const stageStatusMap: Record<string, number> = {};
    stageItems.forEach(item => {
      const s = item.status || 'pendente';
      stageStatusMap[s] = (stageStatusMap[s] || 0) + 1;
    });

    // Delayed projects
    const atrasados = stageItems.filter(item => {
      if (item.status === 'concluido') return false;
      if (!item.data_prevista) return false;
      return new Date(item.data_prevista) < new Date();
    });

    return {
      totalLeads,
      proposalsEnviadas,
      proposalsAceitas,
      taxaConversao,
      faturamentoFechado,
      faturamentoPrevisto,
      funil,
      vendedores,
      vendasMensais,
      stageStatusMap,
      atrasados,
      contratosAssinados,
      totalContracts: contracts.length,
    };
  }, [clients, stageItems, contracts, proposalsData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do desempenho comercial</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Leads"
          value={formatNumber(stats.totalLeads)}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Propostas Aceitas"
          value={`${stats.proposalsAceitas}`}
          subtitle={`de ${stats.proposalsEnviadas} enviadas`}
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          title="Taxa de Conversão"
          value={`${stats.taxaConversao.toFixed(1)}%`}
          icon={<Target className="h-5 w-5" />}
        />
        <StatCard
          title="Faturamento Fechado"
          value={formatCurrency(stats.faturamentoFechado)}
          subtitle={`Previsto: ${formatCurrency(stats.faturamentoPrevisto)}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Chart */}
        <Card className="lg:col-span-2 animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Vendas Mensais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.vendasMensais}>
                  <defs>
                    <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(152,55%,33%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(152,55%,33%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(140,15%,89%)" />
                  <XAxis dataKey="mes" stroke="hsl(150,10%,45%)" fontSize={12} />
                  <YAxis stroke="hsl(150,10%,45%)" fontSize={12} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="valor" stroke="hsl(152,55%,33%)" fill="url(#colorValor)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Funnel */}
        <Card className="animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Funil Comercial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.funil.map((item, i) => {
                const maxQty = Math.max(...stats.funil.map(f => f.quantidade), 1);
                const width = (item.quantidade / maxQty) * 100;
                return (
                  <div key={item.etapa} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{item.etapa}</span>
                      <span className="font-medium">{item.quantidade}</span>
                    </div>
                    <div className="h-6 rounded-md overflow-hidden bg-muted">
                      <div
                        className="h-full rounded-md transition-all duration-500"
                        style={{
                          width: `${Math.max(width, 2)}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                          opacity: 1 - (i * 0.15),
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendedores & Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Vendedores */}
        <Card className="animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Desempenho dos Vendedores</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.vendedores.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum vendedor atribuído aos clientes ainda.</p>
            ) : (
              <div className="space-y-4">
                {stats.vendedores.map((v, i) => (
                  <div key={v.nome} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {i + 1}º
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{v.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {v.fechamentos} fechamentos · {formatCurrency(v.faturamento)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-success flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3" />
                        {v.leads > 0 ? ((v.fechamentos / v.leads) * 100).toFixed(0) : 0}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumo Geral */}
        <Card className="animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Resumo Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-2xl font-bold font-display">{stats.totalLeads}</p>
                <p className="text-xs text-muted-foreground">Clientes</p>
              </div>
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-2xl font-bold font-display">{proposalsData.length}</p>
                <p className="text-xs text-muted-foreground">Propostas</p>
              </div>
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-2xl font-bold font-display">{stats.totalContracts}</p>
                <p className="text-xs text-muted-foreground">Contratos</p>
              </div>
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-2xl font-bold font-display">{stats.contratosAssinados}</p>
                <p className="text-xs text-muted-foreground">Assinados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {stats.atrasados.length > 0 && (
        <Card className="border-warning/30 bg-warning/5 animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Atenção: {stats.atrasados.length} etapa(s) com atraso</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.atrasados.slice(0, 3).map(a => a.name).join(', ')}
                  {stats.atrasados.length > 3 && ` e mais ${stats.atrasados.length - 3}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
