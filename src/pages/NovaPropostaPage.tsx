import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { formatCurrency, formatNumber, type SystemType } from '@/lib/mock-data';
import { createProposal, type ProposalInput } from '@/lib/proposals';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceDot,
} from 'recharts';
import { ArrowLeft, Save, Send, Eye, Zap, TrendingUp, DollarSign, Clock, Plus, Trash2, FileSignature, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { ProposalPreview } from '@/components/ProposalPreview';
import { ProposalPDF } from '@/components/ProposalPDF';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatCpfCnpj } from '@/lib/utils';
import {
  PAYMENT_CONDITIONS, getMilestones, getCondicaoLabel,
  calcExtendedWarranty, EXTENDED_WARRANTY_YEARS,
  EXTENDED_WARRANTY_DESCRIPTION, STANDARD_WARRANTY_DESCRIPTION,
} from '@/lib/payment-options';

// Calculation helpers
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
    data.push({
      ano,
      label: `Ano ${ano}`,
      economiaAnual: Math.round(economiaAno),
      acumulado: Math.round(acumulado),
      investimento: valorFinal,
    });
  }
  return data;
};

interface ClientDB {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  project_location: string | null;
  concessionaria: string | null;
  consumo_medio: number | null;
  client_type: string;
}

const emptyClientForm = {
  name: '', document: '', phone: '', whatsapp: '', email: '',
  address: '', city: '', state: 'SP', project_location: '',
  concessionaria: '', consumo_medio: 0, client_type: 'residencial',
};

export default function NovaPropostaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clientId, setClientId] = useState('');
  const [clients, setClients] = useState<ClientDB[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickForm, setQuickForm] = useState(emptyClientForm);
  const [quickSaving, setQuickSaving] = useState(false);

  const fetchClients = useCallback(async () => {
    setClientsLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('id,name,document,phone,whatsapp,email,address,city,state,project_location,concessionaria,consumo_medio,client_type')
      .order('name');
    if (!error) setClients((data as ClientDB[]) ?? []);
    setClientsLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickForm.name.trim()) { toast.error('Nome é obrigatório'); return; }
    setQuickSaving(true);
    const { data, error } = await supabase.from('clients').insert({
      name: quickForm.name.trim(),
      document: quickForm.document || null,
      phone: quickForm.phone || null,
      whatsapp: quickForm.whatsapp || null,
      email: quickForm.email || null,
      address: quickForm.address || null,
      city: quickForm.city || null,
      state: quickForm.state || null,
      project_location: quickForm.project_location || null,
      concessionaria: quickForm.concessionaria || null,
      consumo_medio: quickForm.consumo_medio || 0,
      client_type: quickForm.client_type,
      status: 'novo',
      user_id: user?.id ?? null,
    }).select('id').single();
    setQuickSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Cliente cadastrado!');
    setQuickAddOpen(false);
    setQuickForm(emptyClientForm);
    await fetchClients();
    if (data) setClientId(data.id);
  };

  const [systemType, setSystemType] = useState<SystemType>('on-grid');
  const [consumoMensal, setConsumoMensal] = useState<number | ''>('');
  const [potenciaKwp, setPotenciaKwp] = useState<number | ''>('');
  const [armazenamentoKwh, setArmazenamentoKwh] = useState<number | ''>('');

  // Slider config per system type
  const sliderConfig = {
    'on-grid':  { min: 1800, max: 5000, initial: 2500 },
    'off-grid': { min: 5800, max: 10000, initial: 6200 },
    'hibrido':  { min: 3400, max: 6200, initial: 4000 },
  } as const;

  const [valorKwp, setValorKwp] = useState<number>(sliderConfig['on-grid'].initial);

  const handleSystemTypeChange = (t: SystemType) => {
    setSystemType(t);
    const cfg = sliderConfig[t];
    setValorKwp(cfg.initial);
    if (t !== 'off-grid') setArmazenamentoKwh('');
  };
  const [desconto, setDesconto] = useState(0);
  const [descontoTipo, setDescontoTipo] = useState<'percent' | 'fixed'>('percent');
  const [condicoesAlt, setCondicoesAlt] = useState<string[]>([]);
  const [condicao, setCondicao] = useState('');
  const [garantiaEstendida, setGarantiaEstendida] = useState(false);
  const [tarifaKwh, setTarifaKwh] = useState(0.85);
  const [potenciaModuloW, setPotenciaModuloW] = useState(650);
  const [entradaValor, setEntradaValor] = useState(0);
  const [numParcelas, setNumParcelas] = useState(12);
  const [etapasPersonalizadas, setEtapasPersonalizadas] = useState<EtapaPersonalizada[]>([
    { descricao: '', valor: 0 },
  ]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);

  const handleSelectClient = (id: string) => {
    setClientId(id);
    setClientPopoverOpen(false);
    const c = clients.find(cl => cl.id === id);
    if (c) {
      // Auto-fill consumo e recalcular potência sugerida
      if (c.consumo_medio && c.consumo_medio > 0) {
        setConsumoMensal(c.consumo_medio);
        // Replica lógica de handleConsumoChange
        const consumo = c.consumo_medio;
        const placasMin = Math.ceil((consumo / 125) * 1000 / 700);
        const placasParMin = placasMin % 2 === 0 ? placasMin : placasMin + 1;
        const potMin = +((placasParMin * 0.6).toFixed(2));
        const potMax = +((placasParMin * 0.7).toFixed(2));
        setPotenciaKwp(+((potMin + potMax) / 2).toFixed(2));
      }
    }
  };

  const handleConsumoChange = (val: string) => {
    const consumo = val ? +val : '';
    setConsumoMensal(consumo);
    if (typeof consumo === 'number' && consumo > 0) {
      // Calcula placas arredondando para cima ao número par mais próximo
      const placasMin = Math.ceil((consumo / 125) * 1000 / 700);
      const placasMax = Math.ceil((consumo / 125) * 1000 / 600);
      const placasParMin = placasMin % 2 === 0 ? placasMin : placasMin + 1;
      const placasParMax = placasMax % 2 === 0 ? placasMax : placasMax + 1;
      // Usa a média de placas (par) para sugerir potência
      const placasSugeridas = placasParMin;
      const potMin = +((placasSugeridas * 0.6).toFixed(2));
      const potMax = +((placasSugeridas * 0.7).toFixed(2));
      setPotenciaKwp(+((potMin + potMax) / 2).toFixed(2));
    }
  };

  const potencia = typeof potenciaKwp === 'number' ? potenciaKwp : 0;
  // Sempre número par de placas, arredondado para cima
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
  const economiaMensal = Math.round(producao * tarifaKwh);
  const economiaAnual = economiaMensal * 12;
  const paybackExato = economiaAnual > 0 ? +(valorFinal / economiaAnual).toFixed(1) : 0;

  const proj = projecaoAnos(economiaAnual, valorFinal, tarifaKwh);
  const paybackAno = proj.find(p => p.acumulado >= valorFinal)?.ano || null;

  // Payment breakdown calculations
  const milestones = getMilestones(condicao);
  const semEntrada = condicao === 'parcelado';
  const saldoAposEntrada = semEntrada ? valorFinal : Math.max(0, valorFinal - entradaValor);
  const valorParcela = numParcelas > 0 ? Math.round(saldoAposEntrada / numParcelas) : 0;

  // Garantia estendida (serviço adicional de 8% sobre o valor do contrato)
  const garantiaValor = garantiaEstendida ? calcExtendedWarranty(valorFinal) : 0;
  const totalGeral = valorFinal + garantiaValor;

  const buildProposalInput = (status: 'rascunho' | 'enviada' | 'aceita'): ProposalInput => ({
    clientId: client?.id || '',
    clientName: client?.name || '',
    systemType,
    potenciaKwp: potencia,
    valorSistema: valorFinal,
    producaoEstimada: producao,
    economiaMensal,
    economiaAnual,
    paybackAnos: paybackExato,
    status,
    condicaoPagamento: getCondicaoLabel(condicao),
    condicoesAlternativas: condicoesAlt.map(getCondicaoLabel),
    desconto,
    consumoMedio: typeof consumoMensal === 'number' ? consumoMensal : 0,
    garantiaEstendida,
    garantiaEstendidaValor: garantiaValor,
    tarifaKwh,
    numModulos: numPlacas,
    potenciaModuloW: potenciaModuloW,
  });


  const totalEtapas = etapasPersonalizadas.reduce((s, e) => s + (e.valor || 0), 0);
  const restantePersonalizada = valorFinal - totalEtapas;

  const addEtapa = () => setEtapasPersonalizadas(prev => [...prev, { descricao: '', valor: 0 }]);
  const removeEtapa = (i: number) => setEtapasPersonalizadas(prev => prev.filter((_, idx) => idx !== i));
  const updateEtapa = (i: number, field: keyof EtapaPersonalizada, value: string | number) =>
    setEtapasPersonalizadas(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/propostas')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-display">Nova Proposta</h1>
          <p className="text-sm text-muted-foreground">Configure o sistema e gere a proposta</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Config */}
        <div className="lg:col-span-2 space-y-4">
          {/* Client */}
           <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
             <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={clientPopoverOpen} className="flex-1 justify-between font-normal">
                      {client ? `${client.name} — ${client.city || ''}/${client.state || ''}` : 'Selecione o cliente...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Pesquisar por nome, CPF/CNPJ..." />
                      <CommandList>
                        <CommandEmpty>{clientsLoading ? 'Carregando...' : 'Nenhum cliente encontrado.'}</CommandEmpty>
                        <CommandGroup>
                          {clients.map(c => (
                            <CommandItem
                              key={c.id}
                              value={`${c.name} ${c.document || ''} ${c.email || ''}`}
                              onSelect={() => handleSelectClient(c.id)}
                            >
                              <Check className={cn('mr-2 h-4 w-4', clientId === c.id ? 'opacity-100' : 'opacity-0')} />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{c.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {c.document || 'Sem documento'} • {c.city || ''}/{c.state || ''}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button type="button" size="icon" variant="outline" onClick={() => { setQuickForm(emptyClientForm); setQuickAddOpen(true); }} title="Cadastrar novo cliente">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {client && (
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>Consumo: {formatNumber(client.consumo_medio ?? 0)} kWh/mês</span>
                  <span>Concessionária: {client.concessionaria}</span>
                  <span>Tipo: {client.client_type}</span>
                  <span>Local: {client.project_location}</span>
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
                    <motion.button
                      key={t}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSystemTypeChange(t)}
                      className={`rounded-lg border p-3 text-center transition-all ${
                        systemType === t ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'
                      }`}
                    >
                      <Zap className="h-5 w-5 mx-auto mb-1" />
                      <span className="text-xs font-medium uppercase">{t}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  Consumo médio mensal do cliente (kWh/mês)
                </Label>
                <Input
                  type="number"
                  placeholder="Ex: 800"
                  value={consumoMensal}
                  onChange={e => handleConsumoChange(e.target.value)}
                  min={0}
                  className="mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Informe o gasto médio para dimensionar o sistema automaticamente
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Potência do Sistema (kWp)</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 10"
                    value={potenciaKwp}
                    onChange={e => setPotenciaKwp(e.target.value ? +e.target.value : '')}
                    min={0.5}
                    step={0.1}
                    className="mt-1"
                  />
                  {numPlacas > 0 && (
                    <div className="flex flex-col gap-1 mt-1.5">
                      <Badge variant="secondary" className="text-[10px] font-normal w-fit">
                        {numPlacas} placas de 600–700 Wp
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        Potência do sistema: {potenciaMin} a {potenciaMax} kWp
                      </span>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">Editável — ajuste se necessário</p>
                </div>
                <div>
                  <Label className="text-xs">Valor médio do kWh (R$)</Label>
                  <Input
                    type="number"
                    placeholder="0.85"
                    value={tarifaKwh}
                    onChange={e => setTarifaKwh(+e.target.value || 0)}
                    min={0.1}
                    step={0.01}
                    className="mt-1"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Tarifa que o cliente paga por kWh</p>
                </div>
              </div>

              {systemType === 'off-grid' && (
                <div>
                  <Label className="text-xs flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-warning" />
                    Capacidade de Armazenamento (kWh)
                  </Label>
                  <Input
                    type="number"
                    placeholder="Ex: 10"
                    value={armazenamentoKwh}
                    onChange={e => setArmazenamentoKwh(e.target.value ? +e.target.value : '')}
                    min={1}
                    step={1}
                    className="mt-1"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Quantidade de armazenamento em baterias</p>
                </div>
              )}

              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-xs">Valor por kWp</Label>
                  <span className="text-sm font-bold text-primary">{formatCurrency(valorKwp)}/kWp</span>
                </div>
                <Slider
                  value={[valorKwp]}
                  onValueChange={([v]) => setValorKwp(v)}
                  min={sliderConfig[systemType].min}
                  max={sliderConfig[systemType].max}
                  step={50}
                />
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

              <div className="rounded-lg border border-border p-3">
                <Label className="text-xs">Outras condições que o cliente pode escolher (opcional)</Label>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Marque outras condições para oferecer alternativas. O cliente escolhe uma no link de aceite.
                </p>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {PAYMENT_CONDITIONS.filter(o => o.value !== condicao).map(opt => (
                    <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-primary"
                        checked={condicoesAlt.includes(opt.value)}
                        onChange={e => setCondicoesAlt(prev =>
                          e.target.checked ? [...prev, opt.value] : prev.filter(v => v !== opt.value))}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Dynamic payment fields */}
              <AnimatePresence mode="wait">
                {milestones && valorFinal > 0 && (
                  <motion.div
                    key={condicao}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 rounded-lg border border-border bg-muted/30 p-4"
                  >
                    <p className="text-xs font-medium text-foreground mb-2">Distribuição do pagamento:</p>
                    {milestones.map(({ label, pct }) => (
                      <div key={label} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{pct}% — {label}</span>
                        <span className="font-medium">{formatCurrency(valorFinal * pct / 100)}</span>
                      </div>
                    ))}
                  </motion.div>
                )}


                {condicao === 'parcelado' && (
                  <motion.div
                    key="parcelado"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 rounded-lg border border-border bg-muted/30 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-xs">Nº de Parcelas (sem entrada)</Label>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                        Sem juros
                      </span>
                    </div>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={numParcelas || ''}
                      onChange={e => setNumParcelas(Math.min(120, +e.target.value.replace(/\D/g, '') || 0))}
                      placeholder="Ex: 12"
                    />
                    <Separator />
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total financiado (100%)</span>
                        <span>{formatCurrency(valorFinal)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-primary">
                        <span>{numParcelas || 0}x de</span>
                        <span>{formatCurrency(valorParcela)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {condicao === 'entrada-saldo' && (
                  <motion.div
                    key="entrada-saldo"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 rounded-lg border border-border bg-muted/30 p-4"
                  >
                    <div>
                      <Label className="text-xs">Valor da Entrada (R$)</Label>
                      <Input
                        type="number"
                        value={entradaValor || ''}
                        onChange={e => setEntradaValor(+e.target.value || 0)}
                        className="mt-1"
                        placeholder="Ex: 10000"
                      />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Saldo na entrega</span>
                      <span className="font-bold text-primary">{formatCurrency(saldoAposEntrada)}</span>
                    </div>
                  </motion.div>
                )}

                {condicao === 'entrada-parcelas' && (
                  <motion.div
                    key="entrada-parcelas"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 rounded-lg border border-border bg-muted/30 p-4"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Valor da Entrada (R$)</Label>
                        <Input
                          type="number"
                          value={entradaValor || ''}
                          onChange={e => setEntradaValor(+e.target.value || 0)}
                          className="mt-1"
                          placeholder="Ex: 10000"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Nº de Parcelas</Label>
                        <Input
                          type="number"
                          value={numParcelas}
                          onChange={e => setNumParcelas(+e.target.value || 1)}
                          min={1}
                          max={120}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Entrada</span>
                        <span className="font-medium">{formatCurrency(entradaValor)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Restante</span>
                        <span>{formatCurrency(saldoAposEntrada)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-primary">
                        <span>{numParcelas}x de</span>
                        <span>{formatCurrency(valorParcela)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {condicao === 'personalizada' && (
                  <motion.div
                    key="personalizada"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 rounded-lg border border-border bg-muted/30 p-4"
                  >
                    <p className="text-xs font-medium text-foreground">Adicione as etapas de pagamento:</p>
                    {etapasPersonalizadas.map((etapa, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex gap-2 items-end"
                      >
                        <div className="flex-1">
                          <Label className="text-[10px]">Descrição</Label>
                          <Input
                            value={etapa.descricao}
                            onChange={e => updateEtapa(i, 'descricao', e.target.value)}
                            placeholder="Ex: Na aprovação, Material, Instalação..."
                            className="mt-0.5 text-xs"
                          />
                        </div>
                        <div className="w-32">
                          <Label className="text-[10px]">Valor (R$)</Label>
                          <Input
                            type="number"
                            value={etapa.valor || ''}
                            onChange={e => updateEtapa(i, 'valor', +e.target.value || 0)}
                            className="mt-0.5 text-xs"
                          />
                        </div>
                        {etapasPersonalizadas.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeEtapa(i)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </motion.div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={addEtapa}>
                      <Plus className="h-3.5 w-3.5" /> Adicionar etapa
                    </Button>
                    <Separator />
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total das etapas</span>
                        <span className="font-medium">{formatCurrency(totalEtapas)}</span>
                      </div>
                      <div className={`flex justify-between font-bold ${restantePersonalizada === 0 ? 'text-success' : 'text-destructive'}`}>
                        <span>Restante</span>
                        <span>{formatCurrency(restantePersonalizada)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Separator />

              <div>
                <Label className="text-xs">Garantia da Instalação</Label>
                <Select value={garantiaEstendida ? 'estendida' : 'padrao'} onValueChange={v => setGarantiaEstendida(v === 'estendida')}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="padrao">Sem garantia estendida (1 ano padrão)</SelectItem>
                    <SelectItem value="estendida">Com garantia estendida (+{EXTENDED_WARRANTY_YEARS} anos, +8%)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {garantiaEstendida ? EXTENDED_WARRANTY_DESCRIPTION : STANDARD_WARRANTY_DESCRIPTION}
                </p>
                {garantiaEstendida && valorFinal > 0 && (
                  <div className="mt-2 space-y-1 rounded-lg border border-border bg-muted/30 p-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cobertura estendida ({EXTENDED_WARRANTY_YEARS} anos) — 8%</span>
                      <span className="font-medium">{formatCurrency(garantiaValor)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-primary">
                      <span>Total geral</span>
                      <span>{formatCurrency(totalGeral)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Cobrada à parte, como serviço adicional de garantia estendida, apoio ao funcionamento e manutenções preventivas.
                    </p>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>

          {/* Financial Projection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Projeção Financeira (20 anos)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={proj}>
                    <defs>
                      <linearGradient id="colorAcumPre" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAcumPost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="ano"
                      fontSize={10}
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={v => `${v}`}
                    />
                    <YAxis
                      fontSize={10}
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(v: number, name: string) => [
                        formatCurrency(v),
                        name === 'acumulado' ? 'Economia Acumulada' : 'Investimento',
                      ]}
                      labelFormatter={v => `Ano ${v}`}
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="acumulado"
                      stroke="hsl(var(--chart-2))"
                      fill="url(#colorAcumPost)"
                      strokeWidth={2}
                      name="acumulado"
                    />
                    {valorFinal > 0 && (
                      <ReferenceLine
                        y={valorFinal}
                        stroke="hsl(var(--destructive))"
                        strokeDasharray="6 4"
                        strokeWidth={1.5}
                        label={{
                          value: `Investimento: ${formatCurrency(valorFinal)}`,
                          position: 'right',
                          fill: 'hsl(var(--destructive))',
                          fontSize: 10,
                        }}
                      />
                    )}
                    {paybackAno && (
                      <>
                        <ReferenceLine
                          x={paybackAno}
                          stroke="hsl(var(--primary))"
                          strokeDasharray="4 4"
                          strokeWidth={2}
                          label={{
                            value: `⚡ Payback: Ano ${paybackAno}`,
                            position: 'top',
                            fill: 'hsl(var(--primary))',
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        />
                        <ReferenceDot
                          x={paybackAno}
                          y={proj.find(p => p.ano === paybackAno)?.acumulado || 0}
                          r={8}
                          fill="hsl(var(--primary))"
                          stroke="hsl(var(--background))"
                          strokeWidth={3}
                        />
                      </>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-2">
                Economia total em 20 anos: <strong className="text-foreground">{formatCurrency(proj[proj.length - 1]?.acumulado || 0)}</strong>
                {' '}(considerando reajuste anual de 5% na tarifa de energia)
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
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Sistema</span>
                  <Badge variant="outline">{systemType.toUpperCase()}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Potência</span>
                  <span className="text-sm font-medium">{potencia} kWp</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Valor/kWp</span>
                  <span className="text-sm font-medium">{formatCurrency(valorKwp)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Tarifa kWh</span>
                  <span className="text-sm font-medium">{formatCurrency(tarifaKwh)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Produção Estimada</span>
                  <span className="text-sm font-medium">{formatNumber(producao)} kWh/mês</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Valor do Sistema</span>
                  <span className="text-sm">{formatCurrency(valorBruto)}</span>
                </div>
                {descontoValor > 0 && (
                  <div className="flex justify-between text-success">
                    <span className="text-xs">Desconto ({descontoTipo === 'percent' ? `${desconto}%` : 'fixo'})</span>
                    <span className="text-sm">-{formatCurrency(descontoValor)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium">Valor Final</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(valorFinal)}</span>
                </div>

                {/* Payment condition summary */}
                {condicao && condicao !== 'avista' && (
                  <>
                    <Separator />
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-foreground">Condição de Pagamento</p>

                      {milestones && (
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {milestones.map(({ label, pct }) => (
                            <div key={label} className="flex justify-between">
                              <span>{pct}% — {label}</span>
                              <span>{formatCurrency(valorFinal * pct / 100)}</span>
                            </div>
                          ))}
                        </div>
                      )}


                      {condicao === 'parcelado' && (
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex justify-between font-medium text-foreground">
                            <span>{numParcelas}x de</span><span>{formatCurrency(valorParcela)}</span>
                          </div>
                          <div className="text-[11px] font-semibold text-primary">Sem entrada · sem juros</div>
                        </div>
                      )}

                      {condicao === 'entrada-saldo' && (
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex justify-between"><span>Entrada</span><span>{formatCurrency(entradaValor)}</span></div>
                          <div className="flex justify-between"><span>Saldo na entrega</span><span>{formatCurrency(saldoAposEntrada)}</span></div>
                        </div>
                      )}

                      {condicao === 'entrada-parcelas' && (
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex justify-between"><span>Entrada</span><span>{formatCurrency(entradaValor)}</span></div>
                          <div className="flex justify-between font-medium text-foreground">
                            <span>{numParcelas}x de</span><span>{formatCurrency(valorParcela)}</span>
                          </div>
                        </div>
                      )}

                      {condicao === 'personalizada' && (
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {etapasPersonalizadas.filter(e => e.descricao).map((e, i) => (
                            <div key={i} className="flex justify-between">
                              <span>{e.descricao}</span>
                              <span>{formatCurrency(e.valor)}</span>
                            </div>
                          ))}
                          {restantePersonalizada !== 0 && (
                            <div className="flex justify-between text-destructive font-medium">
                              <span>Restante</span><span>{formatCurrency(restantePersonalizada)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {garantiaEstendida && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Garantia estendida ({EXTENDED_WARRANTY_YEARS} anos)</span>
                        <span className="font-medium">{formatCurrency(garantiaValor)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Total geral</span>
                        <span className="text-base font-bold text-primary">{formatCurrency(totalGeral)}</span>
                      </div>
                    </div>
                  </>
                )}



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
                  if (!client) { toast.error('Selecione um cliente'); return; }
                  if (potencia <= 0) { toast.error('Configure o sistema'); return; }
                  try {
                    await createProposal(buildProposalInput('rascunho'));
                    toast.success('Rascunho salvo com sucesso!');
                    navigate('/propostas');
                  } catch (e) {
                    toast.error('Erro ao salvar: ' + (e as Error).message);
                  }
                }}>
                  <Save className="h-4 w-4" /> Salvar Rascunho
                </Button>
                <Button variant="outline" className="w-full gap-2" onClick={() => setPreviewOpen(true)}>
                  <Eye className="h-4 w-4" /> Visualizar
                </Button>
                <Button variant="secondary" className="w-full gap-2" onClick={async () => {
                  if (!client) { toast.error('Selecione um cliente'); return; }
                  if (potencia <= 0) { toast.error('Configure o sistema'); return; }
                  try {
                    await createProposal(buildProposalInput('enviada'));
                    setPdfOpen(true);
                    toast.success('Proposta enviada!');
                  } catch (e) {
                    toast.error('Erro ao salvar: ' + (e as Error).message);
                  }
                }}>
                  <Send className="h-4 w-4" /> Enviar ao Cliente
                </Button>
                <Button variant="outline" className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10" onClick={async () => {
                  if (!client) { toast.error('Selecione um cliente'); return; }
                  if (potencia <= 0) { toast.error('Configure o sistema'); return; }
                  try {
                    const saved = await createProposal(buildProposalInput('aceita'));
                    const { error } = await supabase.from('contracts').insert({
                      proposal_id: saved.id,
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
                      condicao_pagamento: getCondicaoLabel(condicao),
                      garantia_estendida: garantiaEstendida,
                      garantia_estendida_valor: garantiaValor,
                      status: 'rascunho',
                      user_id: user?.id ?? null,
                    });
                    if (error) { toast.error('Erro ao criar contrato: ' + error.message); return; }
                    toast.success('Proposta aceita e contrato criado!');
                    navigate('/contratos');
                  } catch (e) {
                    toast.error('Erro ao salvar: ' + (e as Error).message);
                  }
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
        payment={{
          condicao,
          alternativas: condicoesAlt.map(getCondicaoLabel),
          entradaValor,
          numParcelas,
          valorParcela,
          saldoAposEntrada,
          etapasPersonalizadas,
          garantiaEstendida,
          garantiaValor,
        }}
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
        numero={""}
        valorBruto={valorBruto}
        valorFinal={valorFinal}
        desconto={desconto}
        tarifaKwh={tarifaKwh}
        economiaMensal={economiaMensal}
        economiaAnual={economiaAnual}
        paybackExato={paybackExato}
        economiaTotal20={proj[proj.length - 1]?.acumulado || 0}
        payment={{
          condicao,
          alternativas: condicoesAlt.map(getCondicaoLabel),
          entradaValor,
          numParcelas,
          valorParcela,
          saldoAposEntrada,
          etapasPersonalizadas,
          garantiaEstendida,
          garantiaValor,
        }}
      />

      {/* Quick Add Client Dialog */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastro Rápido de Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleQuickAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label className="text-xs">Nome *</Label><Input className="mt-1" value={quickForm.name} onChange={e => setQuickForm({ ...quickForm, name: e.target.value })} required /></div>
              <div><Label className="text-xs">CPF/CNPJ</Label><Input className="mt-1" value={quickForm.document} onChange={e => setQuickForm({ ...quickForm, document: formatCpfCnpj(e.target.value) })} maxLength={18} placeholder="000.000.000-00" /></div>
              <div><Label className="text-xs">Telefone</Label><Input className="mt-1" value={quickForm.phone} onChange={e => setQuickForm({ ...quickForm, phone: e.target.value })} /></div>
              <div><Label className="text-xs">WhatsApp</Label><Input className="mt-1" value={quickForm.whatsapp} onChange={e => setQuickForm({ ...quickForm, whatsapp: e.target.value })} /></div>
              <div><Label className="text-xs">E-mail</Label><Input type="email" className="mt-1" value={quickForm.email} onChange={e => setQuickForm({ ...quickForm, email: e.target.value })} /></div>
              <div><Label className="text-xs">Endereço</Label><Input className="mt-1" value={quickForm.address} onChange={e => setQuickForm({ ...quickForm, address: e.target.value })} /></div>
              <div><Label className="text-xs">Cidade</Label><Input className="mt-1" value={quickForm.city} onChange={e => setQuickForm({ ...quickForm, city: e.target.value })} /></div>
              <div><Label className="text-xs">Estado</Label><Input className="mt-1" value={quickForm.state} onChange={e => setQuickForm({ ...quickForm, state: e.target.value })} maxLength={2} /></div>
            </div>
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados do Projeto Solar</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label className="text-xs">Local do Projeto</Label><Input className="mt-1" value={quickForm.project_location} onChange={e => setQuickForm({ ...quickForm, project_location: e.target.value })} /></div>
              <div><Label className="text-xs">Concessionária</Label><Input className="mt-1" value={quickForm.concessionaria} onChange={e => setQuickForm({ ...quickForm, concessionaria: e.target.value })} placeholder="Ex: CEMIG, ENEL..." /></div>
              <div><Label className="text-xs">Consumo Médio (kWh/mês)</Label><Input type="number" className="mt-1" value={quickForm.consumo_medio} onChange={e => setQuickForm({ ...quickForm, consumo_medio: parseInt(e.target.value) || 0 })} /></div>
              <div>
                <Label className="text-xs">Tipo de Cliente</Label>
                <Select value={quickForm.client_type} onValueChange={v => setQuickForm({ ...quickForm, client_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residencial">Residencial</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="rural">Rural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setQuickAddOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={quickSaving}>
                {quickSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Cadastrar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
