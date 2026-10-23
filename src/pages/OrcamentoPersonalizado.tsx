import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Loader2, Plus, Save, Send, Trash2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProposalPDF } from '@/components/ProposalPDF';
import { AltConditionsEditor } from '@/components/proposal/AltConditionsEditor';
import { CustomQuoteSummary } from '@/components/proposal/CustomQuoteSummary';
import { QuoteNumberInput } from '@/components/proposal/QuoteNumberInput';
import { supabase } from '@/integrations/supabase/client';
import { createProposal, fetchProposal, updateProposal, type ProposalInput, type ProposalRecord } from '@/lib/proposals';
import { EMPTY_QUOTE, QUOTE_UNITS, quoteNumber, quoteItemTotal, quoteTotals, validateQuote, type CustomQuote, type QuoteItem } from '@/lib/custom-quote';
import { fetchProposalSettings } from '@/lib/proposal-settings';
import { DEFAULT_PROPOSAL_CONFIG, mergeConfig, type ProposalDocConfig } from '@/lib/proposal-config';
import { PAYMENT_CONDITIONS, buildPaymentRows, getCondicaoLabel, parseAlt, serializeAlt, type AltPaymentCondition } from '@/lib/payment-options';
import { formatCurrency } from '@/lib/mock-data';
import { customerUrl } from '@/lib/public-url';

interface Client { id: string; name: string; city: string | null; state: string | null; email: string | null; phone: string | null; document: string | null }
const newItem = (): QuoteItem => ({ id: crypto.randomUUID(), descricao: '', categoria: 'servico', unidade: 'un', quantidade: 1, valorUnitario: 0 });

export default function OrcamentoPersonalizado() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [quote, setQuote] = useState<CustomQuote>({ ...EMPTY_QUOTE, itens: [newItem()] });
  const [config, setConfig] = useState<ProposalDocConfig>(DEFAULT_PROPOSAL_CONFIG);
  const [saved, setSaved] = useState<ProposalRecord | null>(null);
  const [condicao, setCondicao] = useState('avista');
  const [entrada, setEntrada] = useState(0);
  const [parcelas, setParcelas] = useState(12);
  const [etapas, setEtapas] = useState<{ descricao: string; valor: number }[]>([]);
  const [alternativas, setAlternativas] = useState<AltPaymentCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [consultor, setConsultor] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([supabase.from('clients').select('id,name,city,state,email,phone,document').order('name'), fetchProposalSettings(), id ? fetchProposal(id) : Promise.resolve(null)]).then(([cl, cfg, p]) => {
      if (!active) return;
      if (cl.error) throw cl.error;
      if (id && (!p || p.tipo !== 'personalizado')) throw new Error('Orçamento personalizado não encontrado.');
      setClients(cl.data ?? []);
      setConfig(p?.docConfig ? mergeConfig(p.docConfig) : cfg);
      if (p) {
        setSaved(p); setQuote(p.personalizado); setClientId(p.clientId); setConsultor(p.consultor);
        setCondicao(p.pagamentoConfig.condicao || 'avista'); setEntrada(p.pagamentoConfig.entradaValor ?? 0);
        setParcelas(p.pagamentoConfig.numParcelas ?? 12); setEtapas(p.pagamentoConfig.etapas ?? []);
        setAlternativas(p.condicoesAlternativas.map(parseAlt));
      }
    }).catch(e => toast.error(e.message || 'Não foi possível carregar o orçamento.')).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  const client = clients.find(c => c.id === clientId);
  const totals = quoteTotals(quote);
  const patch = (data: Partial<CustomQuote>) => setQuote(q => ({ ...q, ...data }));
  const patchItem = (itemId: string, data: Partial<QuoteItem>) => setQuote(q => ({ ...q, itens: q.itens.map(i => i.id === itemId ? { ...i, ...data } : i) }));
  const validate = () => {
    if (!client) throw new Error('Selecione o cliente.');
    const error = validateQuote(quote);
    if (error) throw new Error(error);
    if (['entrada-saldo', 'entrada-parcelas'].includes(condicao) && entrada > totals.total) throw new Error('A entrada não pode superar o total.');
    if (['parcelado', 'entrada-parcelas'].includes(condicao) && parcelas < 1) throw new Error('Informe o número de parcelas.');
    if (condicao === 'personalizada' && (etapas.some(e => !e.descricao.trim()) || Math.abs(etapas.reduce((s, e) => s + e.valor, 0) - totals.total) > 0.01)) throw new Error('As etapas de pagamento devem somar o total do orçamento.');
  };
  const buildInput = (status: ProposalInput['status']): ProposalInput => ({
    clientId, clientName: client?.name ?? '', systemType: 'on-grid', tipo: 'personalizado', personalizado: quote,
    potenciaKwp: 0, valorSistema: totals.total, producaoEstimada: 0, economiaMensal: 0, economiaAnual: 0, paybackAnos: 0,
    status, desconto: 0, consultor, docConfig: config as unknown as Record<string, unknown>,
    condicaoPagamento: getCondicaoLabel(condicao), pagamentoConfig: { condicao, entradaValor: entrada, numParcelas: parcelas, etapas }, condicoesAlternativas: alternativas.map(serializeAlt),
  });
  const persist = async (send = false) => {
    validate();
    const current = saved ? await fetchProposal(saved.id) : null;
    if (saved && !current) throw new Error('Orçamento não encontrado.');
    const status = current?.status === 'aceita' || current?.status === 'recusada' ? current.status : send ? 'enviada' : current?.status ?? 'rascunho';
    const result = current ? await updateProposal(current.id, buildInput(status)) : await createProposal(buildInput(status));
    setSaved(result);
    return result;
  };
  const save = async (send = false) => {
    setBusy(true);
    try {
      const result = await persist(send);
      if (send) { await navigator.clipboard.writeText(customerUrl(`/proposta/${result.publicToken}`)); toast.success('Orçamento salvo e link copiado!'); }
      else { toast.success('Orçamento salvo!'); navigate('/propostas'); }
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao salvar.'); }
    finally { setBusy(false); }
  };
  const paymentRows = buildPaymentRows(condicao, { valorTotal: totals.total, entradaValor: entrada, numParcelas: parcelas, etapas });
  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><Button variant="ghost" size="icon" aria-label="Voltar às propostas" onClick={() => navigate('/propostas')}><ArrowLeft className="h-5 w-5" /></Button><h1 className="font-display text-2xl font-bold">{id ? 'Editar orçamento personalizado' : 'Orçamento personalizado'}</h1></div>
      <Button variant="outline" onClick={() => navigate('/personalizacao-proposta')} className="gap-2"><Settings2 className="h-4 w-4" />Personalização</Button>
    </header>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <div className="min-w-0 space-y-6">
        <section className="space-y-4 border-b pb-6"><h2 className="font-semibold">Dados do orçamento</h2>
          <Label>Cliente<Select value={clientId} onValueChange={setClientId}><SelectTrigger className="mt-2"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger><SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></Label>
          <Label className="block">Título do orçamento<Input aria-label="Título do orçamento" className="mt-2" value={quote.titulo} onChange={e => patch({ titulo: e.target.value })} placeholder="Passagem de cabeamento e ligações necessárias" /></Label>
          <Label className="block">Consultor<Input className="mt-2" value={consultor} onChange={e => setConsultor(e.target.value)} /></Label>
          <Label className="block">Descrição dos serviços / produtos<Textarea aria-label="Descrição dos serviços / produtos" className="mt-2" rows={5} value={quote.detalhes} onChange={e => patch({ detalhes: e.target.value })} /></Label>
        </section>
        <section className="space-y-4 border-b pb-6"><div className="flex items-center justify-between"><h2 className="font-semibold">Produtos e serviços</h2><Button variant="outline" size="sm" className="gap-2" onClick={() => patch({ itens: [...quote.itens, newItem()] })}><Plus className="h-4 w-4" />Adicionar item</Button></div>
          {quote.itens.map((i, ix) => <div key={i.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Item {ix + 1}</h3><Button variant="ghost" size="icon" aria-label={`Excluir item ${ix + 1}`} title="Excluir item" onClick={() => patch({ itens: quote.itens.filter(x => x.id !== i.id) })}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
            <Label className="block">Descrição<Input aria-label={`Descrição do item ${ix + 1}`} className="mt-1" value={i.descricao} onChange={e => patchItem(i.id, { descricao: e.target.value })} /></Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Label>Tipo<Select value={i.categoria} onValueChange={v => patchItem(i.id, { categoria: v as QuoteItem['categoria'] })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="produto">Produto</SelectItem><SelectItem value="servico">Serviço</SelectItem></SelectContent></Select></Label>
              <Label>Unidade<Input aria-label={`Unidade do item ${ix + 1}`} className="mt-1" list="quote-units" value={i.unidade} onChange={e => patchItem(i.id, { unidade: e.target.value })} /></Label>
              <Label>Quantidade<QuoteNumberInput aria-label={`Quantidade do item ${ix + 1}`} className="mt-1" value={i.quantidade} onValueChange={v => patchItem(i.id, { quantidade: v })} /></Label>
              <Label>Valor unitário (R$)<QuoteNumberInput aria-label={`Valor unitário do item ${ix + 1}`} className="mt-1" value={i.valorUnitario} onValueChange={v => patchItem(i.id, { valorUnitario: v })} /></Label>
            </div><p className="text-right text-sm font-semibold">Total do item: {formatCurrency(quoteItemTotal(i))}</p>
          </div>)}<datalist id="quote-units">{QUOTE_UNITS.map(u => <option key={u} value={u} />)}</datalist>
          <div className="grid gap-3 sm:grid-cols-2">{([['entrega', 'Taxa de entrega (R$)'], ['maoDeObra', 'Mão de obra adicional (R$)']] as const).map(([key, title]) => <Label key={key}>{title}<QuoteNumberInput aria-label={title} className="mt-1" value={quote[key]} onValueChange={v => patch({ [key]: v })} /></Label>)}</div>
        </section>
        <section className="space-y-4 border-b pb-6"><h2 className="font-semibold">Detalhes e condições do serviço</h2>{([['prazo', 'Prazo de entrega / execução'], ['garantia', 'Garantia'], ['observacoes', 'Observações e responsabilidades']] as const).map(([key, title]) => <Label className="block" key={key}>{title}<Textarea className="mt-1" rows={3} value={quote[key]} onChange={e => patch({ [key]: e.target.value })} /></Label>)}</section>
        <details className="space-y-4 border-b pb-6"><summary className="cursor-pointer font-semibold">Personalização deste documento</summary>
          <Label className="block">Apresentação da empresa e experiência no mercado<Textarea className="mt-2" rows={5} value={config.texts.apresentacao} onChange={e => setConfig(c => ({ ...c, texts: { ...c.texts, apresentacao: e.target.value } }))} /></Label>
          <Label className="block">Diferenciais<Textarea className="mt-2" rows={3} value={config.texts.diferenciais} onChange={e => setConfig(c => ({ ...c, texts: { ...c.texts, diferenciais: e.target.value } }))} /></Label>
          <Label className="block">Validade da proposta<Textarea className="mt-2" value={config.texts.validade} onChange={e => setConfig(c => ({ ...c, texts: { ...c.texts, validade: e.target.value } }))} /></Label>
          {config.sectionsPersonalizado.map(s => <div key={s.id} className="space-y-2"><Label className="flex items-center gap-2"><input type="checkbox" checked={s.enabled} disabled={s.required} onChange={e => setConfig(c => ({ ...c, sectionsPersonalizado: c.sectionsPersonalizado.map(x => x.id === s.id ? { ...x, enabled: e.target.checked } : x) }))} />{s.title}</Label>{s.key === 'personalizada' && <Textarea value={s.content ?? ''} onChange={e => setConfig(c => ({ ...c, sectionsPersonalizado: c.sectionsPersonalizado.map(x => x.id === s.id ? { ...x, content: e.target.value } : x) }))} />}</div>)}
          <Button variant="outline" size="sm" onClick={() => setConfig(c => ({ ...c, sectionsPersonalizado: [...c.sectionsPersonalizado, { id: crypto.randomUUID(), key: 'personalizada', title: 'Detalhes adicionais', enabled: true, newPage: false, background: 'branco', columns: 1, required: false, content: '' }] }))}><Plus className="mr-2 h-4 w-4" />Adicionar seção</Button>
        </details>
        <section className="space-y-4"><h2 className="font-semibold">Formas de pagamento</h2>
          <Select value={condicao} onValueChange={setCondicao}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_CONDITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select>
          {['entrada-saldo', 'entrada-parcelas'].includes(condicao) && <Label className="block">Entrada (R$)<Input type="text" inputMode="numeric" value={entrada || ''} onChange={e => setEntrada(quoteNumber(e.target.value))} /></Label>}
          {['parcelado', 'entrada-parcelas'].includes(condicao) && <Label className="block">Número de parcelas<Input type="text" inputMode="numeric" value={parcelas || ''} onChange={e => setParcelas(Math.floor(quoteNumber(e.target.value)))} /></Label>}
          {condicao === 'personalizada' && <div className="space-y-2">{etapas.map((e, ix) => <div key={ix} className="flex gap-2"><Input aria-label={`Descrição da etapa ${ix + 1}`} placeholder="Assinatura / medição / entrega" value={e.descricao} onChange={ev => setEtapas(etapas.map((x, j) => j === ix ? { ...x, descricao: ev.target.value } : x))} /><Input className="w-28" aria-label={`Valor da etapa ${ix + 1}`} type="text" inputMode="numeric" value={e.valor || ''} onChange={ev => setEtapas(etapas.map((x, j) => j === ix ? { ...x, valor: quoteNumber(ev.target.value) } : x))} /><Button variant="ghost" size="icon" aria-label="Excluir etapa" onClick={() => setEtapas(etapas.filter((_, j) => j !== ix))}><Trash2 className="h-4 w-4" /></Button></div>)}<Button variant="outline" size="sm" onClick={() => setEtapas([...etapas, { descricao: '', valor: 0 }])}><Plus className="mr-2 h-4 w-4" />Adicionar etapa</Button></div>}
          <AltConditionsEditor condicaoPrincipal={condicao} valorFinal={totals.total} value={alternativas} onChange={setAlternativas} />
        </section>
      </div>
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start"><h2 className="font-semibold">Resumo comercial</h2><CustomQuoteSummary quote={quote} />
        <div className="space-y-2 border-t pt-4">{paymentRows.map((r, i) => <div key={i} className="flex justify-between gap-2 text-sm"><span>{r.label}</span><span className="whitespace-nowrap">{formatCurrency(r.value)}</span></div>)}</div>
        <div className="grid gap-2"><Button disabled={busy} className="gap-2" onClick={() => save()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar orçamento</Button><Button disabled={busy} variant="outline" className="gap-2" onClick={() => { try { validate(); setPdfOpen(true); } catch (e) { toast.error((e as Error).message); } }}><Eye className="h-4 w-4" />Pré-visualizar / PDF</Button><Button disabled={busy} variant="outline" className="gap-2" onClick={() => save(true)}><Send className="h-4 w-4" />Salvar e copiar link</Button></div>
      </aside>
    </div>
    <ProposalPDF open={pdfOpen} onOpenChange={setPdfOpen} proposalId={saved?.id} beforeServerDownload={async () => (await persist()).id} clientName={client?.name ?? ''} clientCity={client?.city ?? ''} clientState={client?.state ?? ''} clientEmail={client?.email ?? ''} clientPhone={client?.phone ?? ''} clientDocument={client?.document ?? ''} systemType="on-grid" potencia={0} numPlacas={0} producao={0} valorBruto={totals.total} valorFinal={totals.total} desconto={0} tarifaKwh={0} economiaMensal={0} economiaAnual={0} paybackExato={0} economiaTotal20={0} tipo="personalizado" personalizado={quote} docConfig={config} numero={saved?.numero} consultor={consultor} payment={{ condicao, entradaValor: entrada, numParcelas: parcelas, valorParcela: parcelas > 0 ? (totals.total - (condicao === 'parcelado' ? 0 : entrada)) / parcelas : 0, saldoAposEntrada: Math.max(0, totals.total - entrada), etapasPersonalizadas: etapas, alternativas: alternativas.map(serializeAlt) }} />
  </div>;
}