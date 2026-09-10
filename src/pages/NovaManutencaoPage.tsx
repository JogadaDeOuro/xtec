import { formatPotencia } from '@/lib/solar-calc';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Save, Send, Eye, Wrench, Loader2, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatNumber } from '@/lib/mock-data';
import {
  createProposal, updateProposal, fetchProposal, type ProposalInput,
} from '@/lib/proposals';
import {
  PAYMENT_CONDITIONS, getCondicaoLabel, buildPaymentRows, serializeAlt,
  type AltPaymentCondition,
} from '@/lib/payment-options';
import { AltConditionsEditor } from '@/components/proposal/AltConditionsEditor';
import { ProposalPDF } from '@/components/ProposalPDF';
import {
  MANUTENCAO_ITENS, areaSugerida, calcManutencao, AREA_POR_MODULO_M2,
} from '@/lib/manutencao';

interface ClientDB {
  id: string; name: string; document: string | null; email: string | null;
  phone: string | null; city: string | null; state: string | null;
}
interface OrigemItem {
  id: string;
  tipo: 'contrato' | 'proposta';
  rotulo: string;
  clientId: string | null;
  numModulos: number;
  potenciaKwp: number;
}

const ITENS_PADRAO = ['rocagem', 'limpeza_modulos', 'aterramento', 'estrutura'];

export default function NovaManutencaoPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const editing = !!id;

  const [clients, setClients] = useState<ClientDB[]>([]);
  const [origens, setOrigens] = useState<OrigemItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [clientId, setClientId] = useState('');
  const [origemTipo, setOrigemTipo] = useState<'contrato' | 'proposta' | 'manual'>('manual');
  const [origemRef, setOrigemRef] = useState('');

  const [numModulos, setNumModulos] = useState<number>(0);
  const [areaM2, setAreaM2] = useState<number>(0);
  const [potenciaKwp, setPotenciaKwp] = useState<number>(0);

  const [minPorM2, setMinPorM2] = useState(3);
  const [maxPorM2, setMaxPorM2] = useState(30);
  const [valorPorM2, setValorPorM2] = useState(8);
  const [valorFinalManual, setValorFinalManual] = useState<number | ''>('');

  const [itens, setItens] = useState<string[]>(ITENS_PADRAO);

  const [condicao, setCondicao] = useState('avista');
  const [condicoesAlt, setCondicoesAlt] = useState<AltPaymentCondition[]>([]);
  const [entradaValor, setEntradaValor] = useState(0);
  const [numParcelas, setNumParcelas] = useState(3);
  const [etapas, setEtapas] = useState<{ descricao: string; valor: number }[]>([{ descricao: '', valor: 0 }]);

  const [pdfOpen, setPdfOpen] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [cl, ct, pr] = await Promise.all([
      supabase.from('clients').select('id,name,document,email,phone,city,state').order('name'),
      supabase.from('contracts').select('id,client_id,client_name,proposal_id,potencia_kwp,status').order('created_at', { ascending: false }),
      supabase.from('proposals').select('id,numero,client_id,client_name,num_modulos,potencia_kwp,tipo').order('created_at', { ascending: false }),
    ]);
    setClients((cl.data as ClientDB[]) ?? []);

    const props = (pr.data ?? []) as { id: string; numero: string | null; client_id: string | null; client_name: string; num_modulos: number | null; potencia_kwp: number | null; tipo: string | null }[];
    const modulosDaProposta = new Map(props.map(p => [p.id, Number(p.num_modulos ?? 0)]));

    const contratos: OrigemItem[] = ((ct.data ?? []) as { id: string; client_id: string | null; client_name: string; proposal_id: string | null; potencia_kwp: number | null; status: string }[])
      .filter(c => c.status !== 'cancelado')
      .map(c => {
        const kwp = Number(c.potencia_kwp ?? 0);
        const mod = (c.proposal_id && modulosDaProposta.get(c.proposal_id)) || Math.round((kwp * 1000) / 650);
        return {
          id: c.id, tipo: 'contrato' as const,
          rotulo: `${c.client_name} — ${formatPotencia(kwp)}`,
          clientId: c.client_id, numModulos: mod, potenciaKwp: kwp,
        };
      });

    const propostas: OrigemItem[] = props
      .filter(p => p.tipo !== 'manutencao')
      .map(p => ({
        id: p.id, tipo: 'proposta' as const,
        rotulo: `${p.numero || 'Proposta'} — ${p.client_name} — ${Number(p.num_modulos ?? 0)} módulos`,
        clientId: p.client_id, numModulos: Number(p.num_modulos ?? 0), potenciaKwp: Number(p.potencia_kwp ?? 0),
      }));

    setOrigens([...contratos, ...propostas]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!id) return;
    fetchProposal(id).then(p => {
      if (!p) return;
      setClientId(p.clientId);
      setNumModulos(p.numModulos);
      setAreaM2(p.areaM2 || areaSugerida(p.numModulos));
      setPotenciaKwp(p.potenciaKwp);
      setValorPorM2(p.areaM2 > 0 ? +(p.valorSistema / p.areaM2).toFixed(2) : 8);
      setValorFinalManual(p.valorSistema);
      setItens(p.manutencaoItens?.length ? p.manutencaoItens : ITENS_PADRAO);
      setOrigemTipo((p.origemTipo as 'contrato' | 'proposta' | 'manual') || 'manual');
      setOrigemRef(p.origemRef || '');
      setSavedId(p.id);
    }).catch(() => toast.error('Erro ao carregar a proposta'));
  }, [id]);

  const client = clients.find(c => c.id === clientId);
  const origensFiltradas = origens.filter(o => o.tipo === origemTipo);

  const handleOrigem = (refId: string) => {
    setOrigemRef(refId);
    const o = origens.find(x => x.id === refId);
    if (!o) return;
    setNumModulos(o.numModulos);
    setAreaM2(areaSugerida(o.numModulos));
    setPotenciaKwp(o.potenciaKwp);
    if (o.clientId) setClientId(o.clientId);
  };

  const calc = useMemo(() => calcManutencao({
    numModulos, areaM2, valorPorM2,
    valorFinalManual: valorFinalManual === '' ? null : valorFinalManual,
  }), [numModulos, areaM2, valorPorM2, valorFinalManual]);

  const rows = buildPaymentRows(condicao, {
    valorTotal: calc.valorFinal, entradaValor, numParcelas, etapas,
  });

  const origemDescricao = origemTipo === 'manual'
    ? 'Cadastro manual'
    : origens.find(o => o.id === origemRef)?.rotulo ?? '';

  const buildInput = (status: 'rascunho' | 'enviada'): ProposalInput => ({
    clientId,
    clientName: client?.name ?? '',
    systemType: 'on-grid',
    potenciaKwp,
    valorSistema: calc.valorFinal,
    producaoEstimada: 0,
    economiaMensal: 0,
    economiaAnual: 0,
    paybackAnos: 0,
    status,
    condicaoPagamento: getCondicaoLabel(condicao),
    condicoesAlternativas: condicoesAlt.map(serializeAlt),
    desconto: Math.max(0, calc.valorCalculado - calc.valorFinal),
    numModulos,
    tipo: 'manutencao',
    areaM2,
    valorPorModulo: 0,
    manutencaoItens: itens,
    origemTipo,
    origemRef: origemTipo === 'manual' ? '' : origemRef,
  });

  const salvar = async (status: 'rascunho' | 'enviada') => {
    if (!client) { toast.error('Selecione o cliente'); return; }
    if (numModulos <= 0) { toast.error('Informe o número de módulos'); return; }
    if (calc.valorFinal <= 0) { toast.error('Defina o valor da manutenção'); return; }
    setSaving(true);
    try {
      const saved = editing && id
        ? await updateProposal(id, buildInput(status))
        : await createProposal(buildInput(status));
      setSavedId(saved.id);
      toast.success(status === 'rascunho' ? 'Rascunho salvo!' : 'Proposta de manutenção salva!');
      if (status === 'enviada') setPdfOpen(true);
      else navigate('/propostas');
    } catch (e) {
      toast.error('Erro ao salvar: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/propostas')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-display">
            {editing ? 'Editar Manutenção' : 'Nova Proposta de Manutenção'}
          </h1>
          <p className="text-sm text-muted-foreground">Cobrança por módulo, com valor por m² informativo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Origem da usina */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Usina a ser mantida</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {([
                  { v: 'contrato' as const, t: 'De um contrato' },
                  { v: 'proposta' as const, t: 'De uma proposta' },
                  { v: 'manual' as const, t: 'Cadastrar manual' },
                ]).map(opt => (
                  <motion.button
                    key={opt.v}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => { setOrigemTipo(opt.v); setOrigemRef(''); }}
                    className={`rounded-lg border p-3 text-center text-xs font-semibold transition-all ${
                      origemTipo === opt.v ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'
                    }`}
                  >{opt.t}</motion.button>
                ))}
              </div>

              {origemTipo !== 'manual' && (
                <div>
                  <Label className="text-xs">{origemTipo === 'contrato' ? 'Contrato' : 'Proposta'} de origem</Label>
                  <Select value={origemRef} onValueChange={handleOrigem}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={loading ? 'Carregando...' : 'Selecione'} />
                    </SelectTrigger>
                    <SelectContent>
                      {origensFiltradas.map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.rotulo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Os módulos e a metragem são preenchidos automaticamente e podem ser ajustados.
                  </p>
                </div>
              )}

              <div>
                <Label className="text-xs">Cliente</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}{c.city ? ` — ${c.city}/${c.state ?? ''}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Nº de módulos</Label>
                  <Input
                    type="text" inputMode="numeric" className="mt-1"
                    value={numModulos || ''}
                    onChange={e => {
                      const n = +e.target.value.replace(/\D/g, '') || 0;
                      setNumModulos(n);
                      setAreaM2(areaSugerida(n));
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Área (m²)</Label>
                  <Input
                    type="text" inputMode="numeric" className="mt-1"
                    value={areaM2 || ''}
                    onChange={e => setAreaM2(+e.target.value.replace(/\D/g, '') || 0)}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Sugestão: {AREA_POR_MODULO_M2} m²/módulo</p>
                </div>
                <div>
                  <Label className="text-xs">Potência (kWp)</Label>
                  <Input
                    type="number" className="mt-1" step={0.01}
                    value={potenciaKwp || ''}
                    onChange={e => setPotenciaKwp(+e.target.value || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preço */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Precificação</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Mínimo por m² (R$)</Label>
                  <Input
                    type="text" inputMode="numeric" className="mt-1"
                    value={minPorM2}
                    onChange={e => setMinPorM2(+e.target.value.replace(/\D/g, '') || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Máximo por m² (R$)</Label>
                  <Input
                    type="text" inputMode="numeric" className="mt-1"
                    value={maxPorM2}
                    onChange={e => setMaxPorM2(+e.target.value.replace(/\D/g, '') || 0)}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-xs">Valor por m²</Label>
                  <span className="text-sm font-bold text-primary">{formatCurrency(valorPorM2)}/m²</span>
                </div>
                <Slider
                  value={[Math.min(Math.max(valorPorM2, minPorM2), Math.max(maxPorM2, minPorM2 + 1))]}
                  onValueChange={([v]) => { setValorPorM2(v); setValorFinalManual(''); }}
                  min={minPorM2}
                  max={Math.max(maxPorM2, minPorM2 + 1)}
                  step={0.5}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>{formatCurrency(minPorM2)}</span><span>{formatCurrency(maxPorM2)}</span>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{formatNumber(areaM2)} m² × {formatCurrency(valorPorM2)}</span>
                  <span>{formatCurrency(calc.valorCalculado)}</span>
                </div>
                <div className="flex justify-between font-semibold text-primary">
                  <span>Valor total do serviço</span>
                  <span>{formatCurrency(calc.valorFinal)}</span>
                </div>
              </div>

              <div>
                <Label className="text-xs">Valor final exato (R$) — opcional</Label>
                <Input
                  type="text" inputMode="numeric" className="mt-1"
                  placeholder="Deixe vazio para usar o cálculo por m²"
                  value={valorFinalManual === '' ? '' : valorFinalManual}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setValorFinalManual(raw ? +raw : '');
                  }}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Ao definir o valor exato, o valor por m² apresentado passa a ser {formatCurrency(calc.valorPorM2)}.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Escopo */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">O que está incluso</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {MANUTENCAO_ITENS.map(item => (
                <label key={item.key} className="flex gap-3 items-start cursor-pointer rounded-lg border border-border p-3 hover:bg-accent/50">
                  <Checkbox
                    checked={itens.includes(item.key)}
                    onCheckedChange={v => setItens(prev => v ? [...prev, item.key] : prev.filter(k => k !== item.key))}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-xs font-semibold">{item.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{item.descricao}</span>
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Pagamento */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Condições de Pagamento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Select value={condicao} onValueChange={setCondicao}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_CONDITIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>

              {(condicao === 'entrada-saldo' || condicao === 'entrada-parcelas') && (
                <div>
                  <Label className="text-xs">Valor da entrada (R$)</Label>
                  <Input type="text" inputMode="numeric" className="mt-1" value={entradaValor || ''}
                    onChange={e => setEntradaValor(+e.target.value.replace(/\D/g, '') || 0)} />
                </div>
              )}
              {(condicao === 'parcelado' || condicao === 'entrada-parcelas') && (
                <div>
                  <Label className="text-xs">Nº de parcelas</Label>
                  <Input type="text" inputMode="numeric" className="mt-1" value={numParcelas || ''}
                    onChange={e => setNumParcelas(Math.min(60, +e.target.value.replace(/\D/g, '') || 0))} />
                </div>
              )}
              {condicao === 'personalizada' && (
                <div className="space-y-2">
                  {etapas.map((et, i) => (
                    <div key={i} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-[10px]">Descrição</Label>
                        <Input className="mt-0.5 text-xs" value={et.descricao}
                          onChange={e => setEtapas(prev => prev.map((x, ix) => ix === i ? { ...x, descricao: e.target.value } : x))} />
                      </div>
                      <div className="w-32">
                        <Label className="text-[10px]">Valor (R$)</Label>
                        <Input className="mt-0.5 text-xs" type="text" inputMode="numeric" value={et.valor || ''}
                          onChange={e => setEtapas(prev => prev.map((x, ix) => ix === i ? { ...x, valor: +e.target.value.replace(/\D/g, '') || 0 } : x))} />
                      </div>
                      {etapas.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"
                          onClick={() => setEtapas(prev => prev.filter((_, ix) => ix !== i))}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full gap-1 text-xs"
                    onClick={() => setEtapas(prev => [...prev, { descricao: '', valor: 0 }])}>
                    <Plus className="h-3.5 w-3.5" /> Adicionar etapa
                  </Button>
                </div>
              )}

              <AltConditionsEditor
                condicaoPrincipal={condicao}
                valorFinal={calc.valorFinal}
                value={condicoesAlt}
                onChange={setCondicoesAlt}
              />

              {rows.length > 0 && (
                <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-4 text-xs">
                  {rows.map((r, i) => (
                    <div key={i} className={`flex justify-between ${r.strong ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                      <span>{r.label}</span><span>{formatCurrency(r.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resumo */}
        <div className="space-y-4">
          <Card className="border-primary/30 bg-primary/5 sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" /> Resumo da Manutenção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Origem</span>
                  <Badge variant="outline">{origemTipo === 'manual' ? 'Manual' : origemTipo}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Módulos</span>
                  <span className="text-sm font-medium">{formatNumber(numModulos)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Área</span>
                  <span className="text-sm font-medium">{formatNumber(areaM2)} m²</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Por m²</span>
                  <span className="text-sm font-medium">{formatCurrency(calc.valorPorM2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium">Valor total</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(calc.valorFinal)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {itens.length} serviço(s) incluso(s)
                </div>
              </div>

              <div className="space-y-2">
                <Button className="w-full gap-2" disabled={saving} onClick={() => salvar('rascunho')}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar Rascunho
                </Button>
                <Button variant="outline" className="w-full gap-2" onClick={() => setPdfOpen(true)}>
                  <Eye className="h-4 w-4" /> Visualizar PDF
                </Button>
                <Button variant="secondary" className="w-full gap-2" disabled={saving} onClick={() => salvar('enviada')}>
                  <Send className="h-4 w-4" /> Salvar e Enviar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ProposalPDF
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        proposalId={savedId ?? undefined}
        clientName={client?.name ?? ''}
        clientCity={client?.city ?? undefined}
        clientState={client?.state ?? undefined}
        clientEmail={client?.email ?? undefined}
        clientPhone={client?.phone ?? undefined}
        clientDocument={client?.document ?? undefined}
        systemType="on-grid"
        potencia={potenciaKwp}
        numPlacas={numModulos}
        producao={0}
        valorBruto={calc.valorCalculado}
        valorFinal={calc.valorFinal}
        desconto={Math.max(0, calc.valorCalculado - calc.valorFinal)}
        tarifaKwh={0}
        economiaMensal={0}
        economiaAnual={0}
        paybackExato={0}
        economiaTotal20={0}
        tipo="manutencao"
        manutencao={{
          areaM2,
          valorPorModulo: calc.valorPorModuloEfetivo,
          valorPorM2: calc.valorPorM2,
          itens,
          origemDescricao,
        }}
        payment={{
          condicao,
          alternativas: condicoesAlt.map(serializeAlt),
          entradaValor,
          numParcelas,
          valorParcela: numParcelas > 0 ? Math.round((calc.valorFinal - (condicao === 'entrada-parcelas' ? entradaValor : 0)) / numParcelas) : 0,
          saldoAposEntrada: Math.max(0, calc.valorFinal - entradaValor),
          etapasPersonalizadas: etapas,
        }}
      />
    </div>
  );
}
