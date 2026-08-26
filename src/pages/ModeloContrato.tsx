import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Save, Star, Plus, Trash2, FileSignature } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ContractDocument } from '@/components/ContractDocument';
import logoImg from '@/assets/logo-inforsol.png';
import { fetchProposalSettings } from '@/lib/proposal-settings';
import {
  CONTRACT_VARIABLES, DEFAULT_CONTRACT_TEMPLATE, ensureDefaultContractTemplate,
  createContractTemplate, updateContractTemplate, setDefaultContractTemplate, deleteContractTemplate,
  buildContractVariables, type ContractTemplate, type ContractTemplateContent, type ContractVariableSource,
} from '@/lib/contract-template';

const SAMPLE: ContractVariableSource = {
  clientName: 'João da Silva',
  clientDocument: '123.456.789-00',
  clientEmail: 'joao@email.com',
  clientPhone: '(61) 9 9999-9999',
  clientAddress: 'Rua das Flores, 100',
  clientCity: 'Brasília',
  clientState: 'DF',
  systemType: 'on-grid',
  potenciaKwp: 10.5,
  valor: 45000,
  condicaoPagamento: '50% na assinatura do contrato, 20% projeto aprovado, 20% chegada dos equipamentos, 10% entrega da obra',
  garantiaEstendida: true,
  garantiaEstendidaValor: 3600,
};

export default function ModeloContrato() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [draft, setDraft] = useState<ContractTemplateContent>(DEFAULT_CONTRACT_TEMPLATE);
  const [name, setName] = useState('');
  const [company, setCompany] = useState<Record<string, string | undefined>>({});
  const [contracts, setContracts] = useState<ContractVariableSource[]>([]);
  const [previewSource, setPreviewSource] = useState<string>('exemplo');
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const selected = templates.find(t => t.id === selectedId);

  useEffect(() => {
    (async () => {
      try {
        const [tpls, settings, { data: cs }] = await Promise.all([
          ensureDefaultContractTemplate(),
          fetchProposalSettings().catch(() => null),
          supabase.from('contracts')
            .select('id, proposal_id, client_name, client_document, client_email, client_phone, client_address, client_city, client_state, system_type, potencia_kwp, valor, condicao_pagamento, garantia_estendida, garantia_estendida_valor')
            .order('created_at', { ascending: false })
            .limit(20),
        ]);
        setTemplates(tpls);
        const def = tpls.find(t => t.isDefault) || tpls[0];
        if (def) { setSelectedId(def.id); setDraft(def.content); setName(def.name); }
        if (settings) setCompany(settings.company as unknown as Record<string, string | undefined>);
        setContracts((cs || []).map(c => ({
          contractId: c.id,
          proposalId: c.proposal_id || undefined,
          clientName: c.client_name,
          clientDocument: c.client_document || undefined,
          clientEmail: c.client_email || undefined,
          clientPhone: c.client_phone || undefined,
          clientAddress: c.client_address || undefined,
          clientCity: c.client_city || undefined,
          clientState: c.client_state || undefined,
          systemType: c.system_type,
          potenciaKwp: Number(c.potencia_kwp) || 0,
          valor: Number(c.valor) || 0,
          condicaoPagamento: c.condicao_pagamento || undefined,
          garantiaEstendida: c.garantia_estendida,
          garantiaEstendidaValor: Number(c.garantia_estendida_valor) || 0,
        })));
      } catch (e) {
        toast.error('Não foi possível carregar os modelos de contrato');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const source: ContractVariableSource = useMemo(() => {
    if (previewSource === 'exemplo') return { ...SAMPLE, company };
    const found = contracts.find(c => c.contractId === previewSource);
    return { ...(found || SAMPLE), company };
  }, [previewSource, contracts, company]);

  const vars = useMemo(() => buildContractVariables(source), [source]);

  const selectTemplate = (id: string) => {
    const t = templates.find(x => x.id === id);
    if (!t) return;
    setSelectedId(id); setDraft(t.content); setName(t.name);
  };

  const insertVariable = (key: string) => {
    const el = bodyRef.current;
    const token = `%${key}%`;
    if (!el) { setDraft(d => ({ ...d, body: `${d.body}${token}` })); return; }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const next = el.value.slice(0, start) + token + el.value.slice(end);
    setDraft(d => ({ ...d, body: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const reload = async () => {
    const tpls = await ensureDefaultContractTemplate();
    setTemplates(tpls);
    return tpls;
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await updateContractTemplate(selectedId, { name: name.trim() || 'Modelo', content: draft });
      await reload();
      toast.success('Modelo de contrato salvo');
    } catch {
      toast.error('Não foi possível salvar (apenas administradores podem editar)');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const t = await createContractTemplate(`Modelo ${templates.length + 1}`, draft, false);
      const tpls = await reload();
      const created = tpls.find(x => x.id === t.id);
      if (created) { setSelectedId(created.id); setName(created.name); setDraft(created.content); }
      toast.success('Novo modelo criado a partir do conteúdo atual');
    } catch {
      toast.error('Não foi possível criar o modelo');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async () => {
    if (!selectedId) return;
    try {
      await setDefaultContractTemplate(selectedId);
      await reload();
      toast.success('Modelo definido como padrão');
    } catch {
      toast.error('Não foi possível definir como padrão');
    }
  };

  const handleDelete = async () => {
    if (!selectedId || templates.length <= 1) { toast.error('Mantenha ao menos um modelo'); return; }
    try {
      await deleteContractTemplate(selectedId);
      const tpls = await reload();
      const next = tpls[0];
      if (next) { setSelectedId(next.id); setName(next.name); setDraft(next.content); }
      toast.success('Modelo removido');
    } catch {
      toast.error('Não foi possível remover o modelo');
    }
  };

  const groups = useMemo(() => {
    const map: Record<string, typeof CONTRACT_VARIABLES> = {};
    CONTRACT_VARIABLES.forEach(v => { (map[v.group] ||= []).push(v); });
    return map;
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <FileSignature className="h-6 w-6 text-primary" /> Modelo de Contrato
          </h1>
          <p className="text-sm text-muted-foreground">
            Edite o texto do contrato usando variáveis como <code>%cliente_nome%</code> — elas são trocadas pelos dados reais do cliente e da proposta.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedId} onValueChange={selectTemplate}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Modelo" /></SelectTrigger>
            <SelectContent>
              {templates.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}{t.isDefault ? ' • padrão' : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleCreate} className="gap-1"><Plus className="h-4 w-4" /> Novo</Button>
          <Button variant="outline" size="sm" onClick={handleSetDefault} disabled={selected?.isDefault} className="gap-1">
            <Star className="h-4 w-4" /> Padrão
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="gap-1 text-destructive"><Trash2 className="h-4 w-4" /></Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Editor</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nome do modelo</Label>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Título do documento</Label>
                <Input value={draft.headerTitle} onChange={e => setDraft(d => ({ ...d, headerTitle: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Subtítulo</Label>
              <Input value={draft.headerSubtitle} onChange={e => setDraft(d => ({ ...d, headerSubtitle: e.target.value }))} />
            </div>

            <Tabs defaultValue="corpo">
              <TabsList>
                <TabsTrigger value="corpo">Cláusulas</TabsTrigger>
                <TabsTrigger value="rodape">Rodapé</TabsTrigger>
                <TabsTrigger value="variaveis">Variáveis</TabsTrigger>
              </TabsList>

              <TabsContent value="corpo" className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Use <code>## Título da cláusula</code> para títulos, <code>- item</code> para listas e <code>**texto**</code> para negrito.
                </p>
                <Textarea
                  ref={bodyRef}
                  value={draft.body}
                  onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
                  className="min-h-[460px] font-mono text-xs"
                />
              </TabsContent>

              <TabsContent value="rodape" className="space-y-2">
                <p className="text-xs text-muted-foreground">Uma linha por item do rodapé.</p>
                <Textarea
                  value={draft.footerText}
                  onChange={e => setDraft(d => ({ ...d, footerText: e.target.value }))}
                  className="min-h-[140px] font-mono text-xs"
                />
              </TabsContent>

              <TabsContent value="variaveis" className="space-y-4">
                <p className="text-xs text-muted-foreground">Clique para inserir a variável no ponto do cursor nas cláusulas.</p>
                {Object.entries(groups).map(([group, items]) => (
                  <div key={group} className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">{group}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map(v => (
                        <button key={v.key} type="button" onClick={() => insertVariable(v.key)} title={`${v.label} • ex.: ${v.example}`}>
                          <Badge variant="secondary" className="cursor-pointer hover:bg-primary/15 font-mono text-[11px]">
                            %{v.key}%
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-medium">Pré-visualização</CardTitle>
            <Select value={previewSource} onValueChange={setPreviewSource}>
              <SelectTrigger className="w-[240px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="exemplo">Dados de exemplo</SelectItem>
                {contracts.map(c => (
                  <SelectItem key={c.contractId} value={c.contractId!}>{c.clientName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="bg-white text-black rounded-lg border p-6 max-h-[70vh] overflow-y-auto">
              <ContractDocument
                template={draft}
                vars={vars}
                logoUrl={logoImg}
                cityLine={`${source.clientCity || vars.empresa_cidade}/${source.clientState || vars.empresa_estado}, ${vars.data_hoje}.`}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
