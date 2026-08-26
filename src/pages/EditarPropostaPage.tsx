import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatNumber, type SystemType } from '@/lib/mock-data';
import { fetchProposal, updateProposal, updateProposalStatus, type ProposalInput, type ProposalRecord } from '@/lib/proposals';
import { supabase } from '@/integrations/supabase/client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceDot,
} from 'recharts';
import { ArrowLeft, Save, Send, Eye, Zap, TrendingUp, DollarSign, Clock, Plus, Trash2, FileSignature, Loader2 } from 'lucide-react';
import { ProposalPreview } from '@/components/ProposalPreview';
import { ProposalPDF } from '@/components/ProposalPDF';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { PAYMENT_CONDITIONS, getMilestones, getCondicaoLabel, mapCondicaoFromLabel, calcExtendedWarranty, EXTENDED_WARRANTY_YEARS, EXTENDED_WARRANTY_DESCRIPTION, STANDARD_WARRANTY_DESCRIPTION } from '@/lib/payment-options';

const calcProducao = (kwp: number) => Math.round(kwp * 125);

interface EtapaPersonalizada {
  descricao: string;
  valor: number;
}

interface ProjecaoItem {
  ano: number;
  label: string;
  economiaAnual: number;
  acumulado: number;
  investimento: number;
}

const projecaoAnos = (econAnual: number, valorFinal: number, tarifaKwh: number, anos = 20): ProjecaoItem[] => {
  const data: ProjecaoItem[] = [];
  let acumulado = 0;
  for (let ano = 1; ano <= anos; ano++) {
    const economiaAno = econAnual * Math.pow(1.05, ano - 1);
    acumulado += economiaAno;
    data.push({ ano, label: `Ano ${ano}`, economiaAnual: Math.round(economiaAno), acumulado: Math.round(acumulado), investimento: valorFinal });
  }
  return data;
};

interface SupaClient {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  consumo_medio: number | null;
  concessionaria: string | null;
  client_type: string;
  project_location: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export default function EditarPropostaPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<ProposalRecord | null>(null);
  const [loadingProposal, setLoadingProposal] = useState(true);

  const [clients, setClients] = useState<SupaClient[]>([]);
  const [clientId, setClientId] = useState(proposal?.clientId || '');
  const [systemType, setSystemType] = useState<SystemType>(proposal?.systemType || 'on-grid');
  const [consumoMensal, setConsumoMensal] = useState<number | ''>('');
  const [potenciaKwp, setPotenciaKwp] = useState<number | ''>(proposal?.potenciaKwp || '');

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, name, city, state, consumo_medio, concessionaria, client_type, project_location, document, email, phone, address')
        .order('name');
      if (data) setClients(data);
    };
    fetchClients();
  }, []);

  // Set initial consumo from DB client once loaded
  useEffect(() => {
    if (clients.length > 0 && clientId) {
      const c = clients.find(cl => cl.id === clientId);
      if (c?.consumo_medio && consumoMensal === '') {
        setConsumoMensal(c.consumo_medio);
      }
    }
  }, [clients, clientId]);

  const sliderConfig = {
    'on-grid':  { min: 1800, max: 5000, initial: 2500 },
    'off-grid': { min: 5800, max: 10000, initial: 6200 },
    'hibrido':  { min: 3400, max: 6200, initial: 4000 },
  } as const;

  const initialValorKwp = proposal ? Math.round(proposal.valorSistema / proposal.potenciaKwp) : sliderConfig['on-grid'].initial;
  const [valorKwp, setValorKwp] = useState<number>(initialValorKwp);
  const [armazenamentoKwh, setArmazenamentoKwh] = useState<number | ''>('');
  const [desconto, setDesconto] = useState(proposal?.desconto || 0);
  const [descontoTipo, setDescontoTipo] = useState<'percent' | 'fixed'>('percent');
  const [condicao, setCondicao] = useState(proposal?.condicaoPagamento ? mapCondicao(proposal.condicaoPagamento) : '');
  const [tarifaKwh, setTarifaKwh] = useState(proposal?.tarifaKwh ?? 0.85);
  const [potenciaModuloW, setPotenciaModuloW] = useState(650);
  const [entradaValor, setEntradaValor] = useState(0);
  const [numParcelas, setNumParcelas] = useState(12);
  const [etapasPersonalizadas, setEtapasPersonalizadas] = useState<EtapaPersonalizada[]>([{ descricao: '', valor: 0 }]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [garantiaEstendida, setGarantiaEstendida] = useState(false);

  useEffect(() => {
    let active = true;
    if (!id) { setLoadingProposal(false); return; }
    fetchProposal(id)
      .then(p => {
        if (!active) return;
        if (p) {
          setProposal(p);
          setClientId(p.clientId);
          setSystemType(p.systemType);
          setPotenciaKwp(p.potenciaKwp);
          if (p.potenciaKwp > 0) setValorKwp(Math.round(p.valorSistema / p.potenciaKwp));
          setDesconto(p.desconto);
          setCondicao(mapCondicaoFromLabel(p.condicaoPagamento));
          setGarantiaEstendida(p.garantiaEstendida);
          if (p.consumoMedio > 0) setConsumoMensal(p.consumoMedio);
          if (p.tarifaKwh > 0) setTarifaKwh(p.tarifaKwh);
          if (p.potenciaModuloW > 0) setPotenciaModuloW(p.potenciaModuloW);
        }
      })
      .catch(() => toast.error('Erro ao carregar proposta'))
      .finally(() => { if (active) setLoadingProposal(false); });
    return () => { active = false; };
  }, [id]);

  function mapCondicao(label: string): string {
    return mapCondicaoFromLabel(label);
  }

  const handleSystemTypeChange = (t: SystemType) => {
    setSystemType(t);
    setValorKwp(sliderConfig[t].initial);
    if (t !== 'off-grid') setArmazenamentoKwh('');
  };

  const handleConsumoChange = (val: string) => {
    const consumo = val ? +val : '';
    setConsumoMensal(consumo);
    if (typeof consumo === 'number' && consumo > 0) {
      const placasMin = Math.ceil((consumo / 125) * 1000 / 700);
      const placasParMin = placasMin % 2 === 0 ? placasMin : placasMin + 1;
      const potMin = +((placasParMin * 0.6).toFixed(2));
      const potMax = +((placasParMin * 0.7).toFixed(2));
      setPotenciaKwp(+((potMin + potMax) / 2).toFixed(2));
    }
  };

  const potencia = typeof potenciaKwp === 'number' ? potenciaKwp : 0;
  const numPlacasRaw = potencia > 0 ? Math.ceil((potencia * 1000) / potenciaModuloW) : 0;
  const numPlacas = numPlacasRaw % 2 === 0 ? numPlacasRaw : numPlacasRaw + 1;
  const potenciaExata = +((numPlacas * potenciaModuloW) / 1000).toFixed(2);
  const potenciaMin = numPlacas > 0 ? +((numPlacas * 0.6).toFixed(2)) : 0;
  const potenciaMax = numPlacas > 0 ? +((numPlacas * 0.7).toFixed(2)) : 0;
  const client = clients.find(c => c.id === clientId);
  const producao = calcProducao(potencia);
  const valorBruto = Math.round(potencia * valorKwp);
  const descontoValor = descontoTipo === 'percent' ? Math.round(valorBruto * desconto / 100) : desconto;
  const valorFinal = Math.max(0, valorBruto - descontoValor);
  const milestones = getMilestones(condicao);
  const garantiaValor = garantiaEstendida ? calcExtendedWarranty(valorFinal) : 0;
  const totalGeral = valorFinal + garantiaValor;

  const buildProposalInput = (status: 'rascunho' | 'enviada' | 'aceita'): ProposalInput => ({
    clientId: client?.id || clientId,
    clientName: client?.name || proposal?.clientName || '',
    systemType,
    potenciaKwp: potencia,
    valorSistema: valorFinal,
    producaoEstimada: producao,
    economiaMensal,
    economiaAnual,
    paybackAnos: paybackExato,
    status,
    condicaoPagamento: getCondicaoLabel(condicao),
    desconto,
    consumoMedio: typeof consumoMensal === 'number' ? consumoMensal : 0,
    garantiaEstendida,
    garantiaEstendidaValor: garantiaValor,
    tarifaKwh,
    numModulos: numPlacas,
    potenciaModuloW: potenciaModuloW,
  });

  const economiaMensal = Math.round(producao * tarifaKwh);
  const economiaAnual = economiaMensal * 12;
  const paybackExato = economiaAnual > 0 ? +(valorFinal / economiaAnual).toFixed(1) : 0;
  const proj = projecaoAnos(economiaAnual, valorFinal, tarifaKwh);
  const paybackAno = proj.find(p => p.acumulado >= valorFinal)?.ano || null;
  const saldoAposEntrada = Math.max(0, valorFinal - entradaValor);
  const valorParcela = numParcelas > 0 ? Math.round(saldoAposEntrada / numParcelas) : 0;
  const totalEtapas = etapasPersonalizadas.reduce((s, e) => s + (e.valor || 0), 0);
  const restantePersonalizada = valorFinal - totalEtapas;

  const addEtapa = () => setEtapasPersonalizadas(prev => [...prev, { descricao: '', valor: 0 }]);
  const removeEtapa = (i: number) => setEtapasPersonalizadas(prev => prev.filter((_, idx) => idx !== i));
  const updateEtapa = (i: number, field: keyof EtapaPersonalizada, value: string | number) =>
    setEtapasPersonalizadas(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));

  const handleSendPDF = async () => {
    if (id) {
      try {
        await updateProposal(id, buildProposalInput('enviada'));
        setProposal(prev => prev ? { ...prev, status: 'enviada' } : prev);
      } catch (e) {
        toast.error('Erro ao salvar: ' + (e as Error).message);
        return;
      }
    }
    setPdfOpen(true);
    toast.success('Proposta enviada!');
  };

  if (loadingProposal) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/propostas')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-display">Proposta não encontrada</h1>
            <p className="text-sm text-muted-foreground">A proposta {id} não existe</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/propostas')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-display">Editar Proposta {id}</h1>
          <p className="text-sm text-muted-foreground">Edite os dados e gere o PDF</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Client */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
             <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} — {c.city || ''}/{c.state || ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" size="icon" variant="outline" onClick={() => navigate('/crm?novo=1')} title="Adicionar novo cliente">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {client && (
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>Consumo: {formatNumber(client.consumo_medio || 0)} kWh/mês</span>
                  <span>Concessionária: {client.concessionaria || '-'}</span>
                  <span>Tipo: {client.client_type}</span>
                  <span>Local: {client.project_location || '-'}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Config */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Sistema Fotovoltaico</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label className="text-xs">Tipo de Sistema</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {(['on-grid', 'off-grid', 'hibrido'] as const).map(t => (
                    <motion.button key={t} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => handleSystemTypeChange(t)}
                      className={`rounded-lg border p-3 text-center transition-all ${systemType === t ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'}`}
                    >
                      <Zap className="h-5 w-5 mx-auto mb-1" />
                      <span className="text-xs font-medium uppercase">{t}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-primary" /> Consumo médio mensal (kWh/mês)
                </Label>
                <Input type="number" placeholder="Ex: 800" value={consumoMensal} onChange={e => handleConsumoChange(e.target.value)} min={0} className="mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Potência do Sistema (kWp)</Label>
                  <Input type="number" placeholder="Ex: 10" value={potenciaKwp} onChange={e => setPotenciaKwp(e.target.value ? +e.target.value : '')} min={0.5} step={0.1} className="mt-1" />
                  {numPlacas > 0 && (
                    <div className="flex flex-col gap-1 mt-1.5">
                      <Badge variant="secondary" className="text-[10px] font-normal w-fit">{numPlacas} placas de 600–700 Wp</Badge>
                      <span className="text-[10px] text-muted-foreground">Potência: {potenciaMin} a {potenciaMax} kWp</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Valor médio do kWh (R$)</Label>
                  <Input type="number" placeholder="0.85" value={tarifaKwh} onChange={e => setTarifaKwh(+e.target.value || 0)} min={0.1} step={0.01} className="mt-1" />
                </div>
              </div>

              {systemType === 'off-grid' && (
                <div>
                  <Label className="text-xs">Armazenamento (kWh)</Label>
                  <Input type="number" placeholder="Ex: 10" value={armazenamentoKwh} onChange={e => setArmazenamentoKwh(e.target.value ? +e.target.value : '')} min={1} className="mt-1" />
                </div>
              )}

              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-xs">Valor por kWp</Label>
                  <span className="text-sm font-bold text-primary">{formatCurrency(valorKwp)}/kWp</span>
                </div>
                <Slider value={[valorKwp]} onValueChange={([v]) => setValorKwp(v)} min={sliderConfig[systemType].min} max={sliderConfig[systemType].max} step={50} />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>{formatCurrency(sliderConfig[systemType].min)}</span>
                  <span>{formatCurrency(sliderConfig[systemType].max)}</span>
                </div>
              </div>

              <Separator />
              <div>
                <Label className="text-xs">Desconto</Label>
                <div className="flex gap-2 mt-1">
                  <Select value={descontoTipo} onValueChange={(v) => { setDescontoTipo(v as 'percent' | 'fixed'); setDesconto(0); }}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">%</SelectItem>
                      <SelectItem value="fixed">R$</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={desconto}
                    onChange={e => setDesconto(+e.target.value)}
                    min={0}
                    max={descontoTipo === 'percent' ? 100 : valorBruto}
                    className="flex-1"
                    placeholder={descontoTipo === 'percent' ? '0%' : 'R$ 0,00'}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Condição de Pagamento</Label>
                <Select value={condicao} onValueChange={setCondicao}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_CONDITIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <AnimatePresence mode="wait">
                {condicao === 'entrada-parcelas' && (
                  <motion.div key="entrada-parcelas" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Entrada (R$)</Label>
                        <Input type="number" value={entradaValor || ''} onChange={e => setEntradaValor(+e.target.value || 0)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Nº de Parcelas</Label>
                        <Input type="number" value={numParcelas} onChange={e => setNumParcelas(+e.target.value || 1)} min={1} max={120} className="mt-1" />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-primary">
                      <span>{numParcelas}x de</span>
                      <span>{formatCurrency(valorParcela)}</span>
                    </div>
                  </motion.div>
                )}

                {condicao === 'entrada-saldo' && (
                  <motion.div key="entrada-saldo" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                    <div>
                      <Label className="text-xs">Entrada (R$)</Label>
                      <Input type="number" value={entradaValor || ''} onChange={e => setEntradaValor(+e.target.value || 0)} className="mt-1" />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Saldo na entrega</span>
                      <span className="font-bold text-primary">{formatCurrency(saldoAposEntrada)}</span>
                    </div>
                  </motion.div>
                )}

                {milestones && valorFinal > 0 && (
                  <motion.div key={condicao} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
                    {milestones.map(({ label, pct }) => (
                      <div key={label} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{pct}% — {label}</span>
                        <span className="font-medium">{formatCurrency(valorFinal * pct / 100)}</span>
                      </div>
                    ))}
                  </motion.div>
                )}

                {condicao === 'personalizada' && (
                  <motion.div key="personalizada" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-xs font-medium">Etapas de pagamento:</p>
                    {etapasPersonalizadas.map((etapa, i) => (
                      <div key={i} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input value={etapa.descricao} onChange={e => updateEtapa(i, 'descricao', e.target.value)} placeholder="Descrição" className="text-xs" />
                        </div>
                        <div className="w-32">
                          <Input type="number" value={etapa.valor || ''} onChange={e => updateEtapa(i, 'valor', +e.target.value || 0)} className="text-xs" />
                        </div>
                        {etapasPersonalizadas.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeEtapa(i)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={addEtapa}>
                      <Plus className="h-3.5 w-3.5" /> Adicionar etapa
                    </Button>
                    <div className={`flex justify-between text-xs font-bold ${restantePersonalizada === 0 ? 'text-success' : 'text-destructive'}`}>
                      <span>Restante</span>
                      <span>{formatCurrency(restantePersonalizada)}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label className="text-xs">Garantia da Instalação</Label>
                <Select value={garantiaEstendida ? 'estendida' : 'padrao'} onValueChange={v => setGarantiaEstendida(v === 'estendida')}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="padrao">Garantia padrão (1 ano)</SelectItem>
                    <SelectItem value="estendida">Garantia estendida (+{EXTENDED_WARRANTY_YEARS} anos, +8%)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {garantiaEstendida ? EXTENDED_WARRANTY_DESCRIPTION : STANDARD_WARRANTY_DESCRIPTION}
                </p>
                {garantiaEstendida && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Serviço adicional de garantia</span>
                      <span className="font-medium">{formatCurrency(garantiaValor)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Total geral</span>
                      <span className="font-bold text-primary">{formatCurrency(totalGeral)}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Financial Projection */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Projeção Financeira (20 anos)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={proj}>
                    <defs>
                      <linearGradient id="colorAcumEdit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="ano" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name === 'acumulado' ? 'Economia Acumulada' : 'Investimento']} labelFormatter={v => `Ano ${v}`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="acumulado" stroke="hsl(var(--chart-2))" fill="url(#colorAcumEdit)" strokeWidth={2} name="acumulado" />
                    {valorFinal > 0 && <ReferenceLine y={valorFinal} stroke="hsl(var(--destructive))" strokeDasharray="6 4" strokeWidth={1.5} label={{ value: `Investimento: ${formatCurrency(valorFinal)}`, position: 'right', fill: 'hsl(var(--destructive))', fontSize: 10 }} />}
                    {paybackAno && (
                      <>
                        <ReferenceLine x={paybackAno} stroke="hsl(var(--primary))" strokeDasharray="4 4" strokeWidth={2} label={{ value: `⚡ Payback: Ano ${paybackAno}`, position: 'top', fill: 'hsl(var(--primary))', fontSize: 11, fontWeight: 700 }} />
                        <ReferenceDot x={paybackAno} y={proj.find(p => p.ano === paybackAno)?.acumulado || 0} r={8} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={3} />
                      </>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-2">
                Economia total em 20 anos: <strong className="text-foreground">{formatCurrency(proj[proj.length - 1]?.acumulado || 0)}</strong>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Summary */}
        <div className="space-y-4">
          <Card className="border-primary/30 bg-primary/5 sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Resumo da Proposta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">Sistema</span><Badge variant="outline">{systemType.toUpperCase()}</Badge></div>
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">Potência</span><span className="text-sm font-medium">{potencia} kWp</span></div>
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">Valor/kWp</span><span className="text-sm font-medium">{formatCurrency(valorKwp)}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">Produção</span><span className="text-sm font-medium">{formatNumber(producao)} kWh/mês</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">Valor do Sistema</span><span className="text-sm">{formatCurrency(valorBruto)}</span></div>
                {descontoValor > 0 && (
                  <div className="flex justify-between text-success"><span className="text-xs">Desconto ({descontoTipo === 'percent' ? `${desconto}%` : 'fixo'})</span><span className="text-sm">-{formatCurrency(descontoValor)}</span></div>
                )}
                <div className="flex justify-between border-t pt-2"><span className="text-sm font-medium">Valor Final</span><span className="text-lg font-bold text-primary">{formatCurrency(valorFinal)}</span></div>

                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-success/10 p-3 text-center">
                    <DollarSign className="h-4 w-4 mx-auto text-success mb-1" />
                    <p className="text-xs text-muted-foreground">Economia/mês</p>
                    <p className="text-sm font-bold">{formatCurrency(economiaMensal)}</p>
                  </div>
                  <div className="rounded-lg bg-info/10 p-3 text-center">
                    <Clock className="h-4 w-4 mx-auto text-info mb-1" />
                    <p className="text-xs text-muted-foreground">Payback</p>
                    <p className="text-sm font-bold">{paybackExato > 0 ? `${paybackExato} anos` : '—'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Button className="w-full gap-2" onClick={async () => {
                  if (!id) return;
                  try {
                    await updateProposal(id, buildProposalInput(proposal?.status === 'aceita' ? 'aceita' : 'rascunho'));
                    toast.success('Proposta salva!');
                    navigate('/propostas');
                  } catch (e) {
                    toast.error('Erro ao salvar: ' + (e as Error).message);
                  }
                }}><Save className="h-4 w-4" /> Salvar</Button>
                <Button variant="outline" className="w-full gap-2" onClick={() => setPreviewOpen(true)}>
                  <Eye className="h-4 w-4" /> Visualizar
                </Button>
                <Button variant="secondary" className="w-full gap-2" onClick={handleSendPDF}>
                  <Send className="h-4 w-4" /> Enviar ao Cliente
                </Button>
                <Button variant="outline" className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10" onClick={async () => {
                  if (!client) { toast.error('Selecione um cliente'); return; }
                  if (id) {
                    try {
                      await updateProposal(id, buildProposalInput('aceita'));
                    } catch (e) {
                      toast.error('Erro ao salvar: ' + (e as Error).message);
                      return;
                    }
                  }
                  const condicaoLabel = getCondicaoLabel(condicao);
                  const { error } = await supabase.from('contracts').insert({
                    proposal_id: id || '',
                    client_id: client.id,
                    client_name: client.name,
                    client_document: client.document,
                    client_email: client.email,
                    client_phone: client.phone,
                    client_address: client.address,
                    client_city: client.city,
                    client_state: client.state,
                    system_type: systemType,
                    potencia_kwp: potencia,
                    valor: valorFinal,
                    condicao_pagamento: condicaoLabel,
                    garantia_estendida: garantiaEstendida,
                    garantia_estendida_valor: garantiaValor,
                    status: 'rascunho',
                  });
                  if (error) { toast.error('Erro ao criar contrato: ' + error.message); return; }
                  toast.success('Proposta aceita e contrato criado!');
                  navigate('/contratos');
                }}>
                  <FileSignature className="h-4 w-4" /> Criar Contrato
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ProposalPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        clientName={client?.name || ''}
        clientCity={client?.city}
        clientState={client?.state}
        systemType={systemType}
        potencia={potencia}
        numPlacas={numPlacas}
        potenciaMin={potenciaMin}
        potenciaMax={potenciaMax}
        producao={producao}
        valorBruto={valorBruto}
        valorFinal={valorFinal}
        desconto={desconto}
        tarifaKwh={tarifaKwh}
        economiaMensal={economiaMensal}
        economiaAnual={economiaAnual}
        paybackExato={paybackExato}
        paybackAno={paybackAno}
        economiaTotal30={proj[proj.length - 1]?.acumulado || 0}
        payment={{ condicao, entradaValor, numParcelas, valorParcela, saldoAposEntrada, etapasPersonalizadas, garantiaEstendida, garantiaValor }}
      />

      <ProposalPDF
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        clientName={client?.name || ''}
        clientCity={client?.city}
        clientState={client?.state}
        clientEmail={client?.email}
        clientPhone={client?.phone}
        systemType={systemType}
        potencia={potenciaExata}
        numPlacas={numPlacas}
        potenciaModuloW={potenciaModuloW}
        producao={producao}
        consumoMedio={typeof consumoMensal === 'number' ? consumoMensal : 0}
        numero={proposal?.numero ?? ""}
        valorBruto={valorBruto}
        valorFinal={valorFinal}
        desconto={desconto}
        tarifaKwh={tarifaKwh}
        economiaMensal={economiaMensal}
        economiaAnual={economiaAnual}
        paybackExato={paybackExato}
        economiaTotal20={proj[proj.length - 1]?.acumulado || 0}
        payment={{ condicao, entradaValor, numParcelas, valorParcela, saldoAposEntrada, etapasPersonalizadas, garantiaEstendida, garantiaValor }}
      />
    </div>
  );
}
