import { useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  ArrowDown, ArrowUp, Copy, Loader2, Plus, RotateCcw, Save, Star, Trash2, Upload,
} from 'lucide-react';
import {
  AVAILABLE_VARIABLES, DEFAULT_PROPOSAL_CONFIG, EQUIPMENT_CATEGORIES, FONT_OPTIONS,
  SECTION_LABELS, type ProposalDocConfig, type SectionConfig,
} from '@/lib/proposal-config';
import {
  createTemplate, deleteEquipment, deleteTemplate, fetchEquipment, fetchProposalSettings,
  fetchTemplates, refreshDefaultTemplates, saveEquipment, saveProposalSettings, seedDefaultTemplates,
  setDefaultTemplate, updateTemplate, uploadBrandingFile, type EquipmentItem, type ProposalTemplate,
} from '@/lib/proposal-settings';
import { applyTemplateConfig } from '@/lib/proposal-themes';
import { ProposalDocument, type ProposalDocData } from '@/components/proposal/ProposalDocument';
import { useAuth } from '@/hooks/useAuth';

const SAMPLE: ProposalDocData = {
  numero: 'PROP-2026-0001',
  data: new Date(),
  consultor: 'Consultor Inforsol',
  clientName: 'Cliente Exemplo',
  clientCity: 'Luziânia',
  clientState: 'GO',
  clientEmail: 'cliente@exemplo.com.br',
  clientPhone: '(61) 9 9999-9999',
  concessionaria: 'Enel Brasil',
  systemType: 'on-grid',
  numModulos: 4,
  potenciaModuloW: 700,
  potenciaKwp: 2.8,
  producaoMensal: 366,
  consumoMedio: 380,
  valorBruto: 7140,
  valorFinal: 7140,
  desconto: 0,
  tarifaKwh: 0.85,
  economiaMensal: 311,
  economiaAnual: 3732,
  paybackAnos: 1.5,
  economiaTotal: 123000,
  payment: {
    condicao: '50-20-20-10',
    entradaValor: 0, numParcelas: 0, valorParcela: 0, saldoAposEntrada: 0,
    etapasPersonalizadas: [], garantiaEstendida: false, garantiaValor: 0,
  },
};

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="h-9 w-10 cursor-pointer rounded border bg-transparent p-0.5" />
        <Input value={value} onChange={e => onChange(e.target.value)} className="h-9 font-mono text-xs" />
      </div>
    </div>
  );
}

const ACCEPTED_IMAGE_TYPES = [
  'image/*',
  '.png', '.jpg', '.jpeg', '.jfif', '.pjpeg', '.webp', '.gif', '.svg', '.avif',
  '.bmp', '.dib', '.ico', '.cur', '.tif', '.tiff', '.heic', '.heif', '.apng', '.jxl', '.pnm', '.tga',
].join(',');

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadBrandingFile(file));
      toast.success('Imagem enviada');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      toast.error(
        msg === 'unsupported_image'
          ? 'Formato de imagem não suportado pelo navegador. Converta para PNG, JPG, WEBP ou SVG.'
          : 'Falha no upload da imagem',
      );
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        {value
          ? <img src={value} alt="" className="h-10 w-16 rounded border object-contain bg-muted" />
          : <div className="h-10 w-16 rounded border bg-muted" />}
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        </Button>
        {value && <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>Remover</Button>}
        <input ref={ref} type="file" accept={ACCEPTED_IMAGE_TYPES} className="hidden"
          onChange={e => upload(e.target.files?.[0])} />
      </div>
      <p className="text-[10px] text-muted-foreground">
        PNG, JPG, WEBP, SVG, GIF, AVIF, BMP, TIFF, ICO, HEIC — formatos incomuns são convertidos automaticamente.
      </p>
    </div>
  );
}

function ScaleField({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number) => void }) {
  const v = Math.min(4, Math.max(0.3, Number(value) || 1));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs font-medium text-muted-foreground">{Math.round(v * 100)}%</span>
      </div>
      <Slider min={0.3} max={4} step={0.05} value={[v]} onValueChange={([n]) => onChange(n)} />
    </div>
  );
}


export default function PersonalizacaoProposta() {
  const { isAdmin } = useAuth();
  const [config, setConfig] = useState<ProposalDocConfig>(DEFAULT_PROPOSAL_CONFIG);
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(0.55);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'template' | 'equip'; id: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [cfg, tpls, eqs] = await Promise.all([
          fetchProposalSettings(), fetchTemplates(), fetchEquipment(),
        ]);
        setConfig(cfg);
        setEquipment(eqs);
        setTemplates(await seedDefaultTemplates(cfg));
        void tpls;
      } catch {
        toast.error('Não foi possível carregar a personalização');
      } finally { setLoading(false); }
    })();
  }, []);

  const set = <K extends keyof ProposalDocConfig>(key: K, value: ProposalDocConfig[K]) =>
    setConfig(c => ({ ...c, [key]: value }));
  const patch = <K extends keyof ProposalDocConfig>(key: K, value: Partial<ProposalDocConfig[K]>) =>
    setConfig(c => ({ ...c, [key]: { ...(c[key] as object), ...value } as ProposalDocConfig[K] }));

  const save = async () => {
    setSaving(true);
    try { await saveProposalSettings(config); toast.success('Personalização salva'); }
    catch { toast.error('Sem permissão para salvar (apenas administradores)'); }
    finally { setSaving(false); }
  };

  /* seções */
  const moveSection = (i: number, dir: -1 | 1) => {
    const arr = [...config.sections];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set('sections', arr);
  };
  const updateSection = (id: string, p: Partial<SectionConfig>) =>
    set('sections', config.sections.map(s => (s.id === id ? { ...s, ...p } : s)));
  const duplicateSection = (s: SectionConfig) =>
    set('sections', [...config.sections, { ...s, id: `${s.key}-${Date.now()}`, required: false, title: `${s.title} (cópia)` }]);
  const addCustomSection = () =>
    set('sections', [...config.sections, {
      id: `personalizada-${Date.now()}`, key: 'personalizada', title: 'Nova seção',
      enabled: true, newPage: false, background: 'branco', columns: 1, required: false, content: '',
    }]);
  const removeSection = (id: string) => set('sections', config.sections.filter(s => s.id !== id));

  /* equipamentos */
  const addEquipment = async () => {
    try {
      await saveEquipment({ category: 'modulo', manufacturer: '', model: 'Novo equipamento', active: true });
      setEquipment(await fetchEquipment());
    } catch { toast.error('Sem permissão para cadastrar equipamentos'); }
  };
  const persistEquipment = async (item: EquipmentItem) => {
    try { await saveEquipment(item); toast.success('Equipamento salvo'); }
    catch { toast.error('Sem permissão para salvar'); }
  };

  const preview = useMemo(() => <ProposalDocument config={config} data={SAMPLE} />, [config]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 p-1">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Personalização da Proposta</h1>
          <p className="text-sm text-muted-foreground">
            Identidade visual, estrutura, textos e modelos aplicados às novas propostas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setConfig(DEFAULT_PROPOSAL_CONFIG)} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Restaurar padrão
          </Button>
          <Button onClick={save} disabled={saving || !isAdmin} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
          </Button>
        </div>
      </header>
      {!isAdmin && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Somente administradores podem salvar alterações. Você pode visualizar e testar livremente.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
        <Tabs defaultValue="identidade">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="identidade">Identidade visual</TabsTrigger>
            <TabsTrigger value="capa">Capa</TabsTrigger>
            <TabsTrigger value="estrutura">Estrutura</TabsTrigger>
            <TabsTrigger value="textos">Textos padrão</TabsTrigger>
            <TabsTrigger value="galeria">Galeria</TabsTrigger>
            <TabsTrigger value="equipamentos">Equipamentos</TabsTrigger>
            <TabsTrigger value="premissas">Premissas</TabsTrigger>
            <TabsTrigger value="rodape">Rodapé e contato</TabsTrigger>
            <TabsTrigger value="modelos">Modelos</TabsTrigger>
          </TabsList>

          {/* IDENTIDADE */}
          <TabsContent value="identidade" className="space-y-4">
            <Card><CardHeader><CardTitle className="text-base">Logotipos e imagens</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <ImageField label="Logotipo principal" value={config.branding.logoPrincipal} onChange={v => patch('branding', { logoPrincipal: v })} />
                <ImageField label="Logotipo reduzido (rodapé)" value={config.branding.logoReduzido} onChange={v => patch('branding', { logoReduzido: v })} />
                <ImageField label="Logotipo para fundo claro" value={config.branding.logoClaro} onChange={v => patch('branding', { logoClaro: v })} />
                <ImageField label="Logotipo para fundo escuro" value={config.branding.logoEscuro} onChange={v => patch('branding', { logoEscuro: v })} />
                <ImageField label="Ícone / símbolo" value={config.branding.icone} onChange={v => patch('branding', { icone: v })} />
                <ImageField label="Imagem principal da capa" value={config.branding.imagemCapa} onChange={v => patch('branding', { imagemCapa: v })} />
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-base">Tamanho dos logotipos</CardTitle></CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-3">
                <ScaleField label="Logo da capa" value={config.branding.escalaLogoCapa}
                  onChange={v => patch('branding', { escalaLogoCapa: v })} />
                <ScaleField label="Logo do cabeçalho" value={config.branding.escalaLogoCabecalho}
                  onChange={v => patch('branding', { escalaLogoCabecalho: v })} />
                <ScaleField label="Logo do rodapé" value={config.branding.escalaLogoRodape}
                  onChange={v => patch('branding', { escalaLogoRodape: v })} />
              </CardContent>
            </Card>

            <Card><CardHeader><CardTitle className="text-base">Cores</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <ColorField label="Primária" value={config.branding.corPrimaria} onChange={v => patch('branding', { corPrimaria: v })} />
                <ColorField label="Secundária" value={config.branding.corSecundaria} onChange={v => patch('branding', { corSecundaria: v })} />
                <ColorField label="Destaque" value={config.branding.corDestaque} onChange={v => patch('branding', { corDestaque: v })} />
                <ColorField label="Texto" value={config.branding.corTexto} onChange={v => patch('branding', { corTexto: v })} />
                <ColorField label="Fundo" value={config.branding.corFundo} onChange={v => patch('branding', { corFundo: v })} />
                <ColorField label="Cards" value={config.branding.corCard} onChange={v => patch('branding', { corCard: v })} />
                <ColorField label="Linhas e divisórias" value={config.branding.corLinha} onChange={v => patch('branding', { corLinha: v })} />
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-base">Tipografia e estilo</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Fonte dos títulos</Label>
                  <Select value={config.branding.fonteTitulos} onValueChange={v => patch('branding', { fonteTitulos: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fonte dos textos</Label>
                  <Select value={config.branding.fonteTextos} onValueChange={v => patch('branding', { fonteTextos: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Estilo dos títulos</Label>
                  <Select value={config.branding.estiloTitulos} onValueChange={(v: 'normal' | 'uppercase' | 'capitalize') => patch('branding', { estiloTitulos: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="uppercase">MAIÚSCULAS</SelectItem>
                      <SelectItem value="capitalize">Capitalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Estilo do cabeçalho</Label>
                  <Select value={config.branding.estiloCabecalho} onValueChange={(v: 'faixa' | 'minimo' | 'oculto') => patch('branding', { estiloCabecalho: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="faixa">Faixa colorida</SelectItem>
                      <SelectItem value="minimo">Mínimo</SelectItem>
                      <SelectItem value="oculto">Oculto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Arredondamento dos cards: {config.branding.raioCards}px</Label>
                  <Slider value={[config.branding.raioCards]} min={0} max={24} step={1}
                    onValueChange={([v]) => patch('branding', { raioCards: v })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Intensidade das sombras: {config.branding.intensidadeSombra}</Label>
                  <Slider value={[config.branding.intensidadeSombra]} min={0} max={3} step={0.5}
                    onValueChange={([v]) => patch('branding', { intensidadeSombra: v })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Margens do documento: {config.branding.margemMm} mm</Label>
                  <Slider value={[config.branding.margemMm]} min={8} max={25} step={1}
                    onValueChange={([v]) => patch('branding', { margemMm: v })} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-xs">Usar degradê</Label>
                  <Switch checked={config.branding.usarDegrade} onCheckedChange={v => patch('branding', { usarDegrade: v })} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CAPA */}
          <TabsContent value="capa" className="space-y-4">
            <Card><CardHeader><CardTitle className="text-base">Conteúdo da capa</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label className="text-xs">Título principal</Label>
                    <Input value={config.cover.titulo} onChange={e => patch('cover', { titulo: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Subtítulo</Label>
                    <Input value={config.cover.subtitulo} onChange={e => patch('cover', { subtitulo: e.target.value })} /></div>
                </div>
                <ImageField label="Imagem de fundo da capa" value={config.cover.imagemFundo} onChange={v => patch('cover', { imagemFundo: v })} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Intensidade da máscara: {Math.round(config.cover.mascaraIntensidade * 100)}%</Label>
                    <Slider value={[config.cover.mascaraIntensidade]} min={0} max={1} step={0.02}
                      onValueChange={([v]) => patch('cover', { mascaraIntensidade: v })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Alinhamento</Label>
                    <Select value={config.cover.alinhamento} onValueChange={(v: 'esquerda' | 'centro') => patch('cover', { alinhamento: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="esquerda">À esquerda</SelectItem>
                        <SelectItem value="centro">Centralizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ['mostrarLogo', 'Logo'], ['mostrarCliente', 'Nome do cliente'], ['mostrarLocal', 'Cidade e estado'],
                    ['mostrarPotencia', 'Potência'], ['mostrarGeracao', 'Geração mensal'], ['mostrarData', 'Data'],
                    ['mostrarNumero', 'Número da proposta'], ['mostrarConsultor', 'Consultor'], ['mascara', 'Máscara sobre a imagem'],
                  ] as const).map(([k, label]) => (
                    <div key={k} className="flex items-center justify-between rounded-md border p-2.5">
                      <Label className="text-xs">{label}</Label>
                      <Switch checked={config.cover[k]} onCheckedChange={v => patch('cover', { [k]: v } as never)} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ESTRUTURA */}
          <TabsContent value="estrutura" className="space-y-3">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={addCustomSection} className="gap-2">
                <Plus className="h-4 w-4" /> Adicionar seção personalizada
              </Button>
            </div>
            {config.sections.map((s, i) => (
              <Card key={s.id} className={s.enabled ? '' : 'opacity-60'}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Switch checked={s.enabled} disabled={s.required}
                      onCheckedChange={v => updateSection(s.id, { enabled: v })} />
                    <Input value={s.title} onChange={e => updateSection(s.id, { title: e.target.value })}
                      className="h-8 max-w-xs" />
                    <Badge variant="secondary" className="text-[10px]">{SECTION_LABELS[s.key]}</Badge>
                    {s.required && <Badge className="text-[10px]">obrigatória</Badge>}
                    <div className="ml-auto flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveSection(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveSection(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicateSection(s)}><Copy className="h-3.5 w-3.5" /></Button>
                      {!s.required && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeSection(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="flex items-center justify-between rounded-md border p-2">
                      <Label className="text-[11px]">Nova página</Label>
                      <Switch checked={s.newPage} onCheckedChange={v => updateSection(s.id, { newPage: v })} />
                    </div>
                    <Select value={s.background} onValueChange={(v: SectionConfig['background']) => updateSection(s.id, { background: v })}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="branco">Fundo branco</SelectItem>
                        <SelectItem value="colorido">Fundo colorido</SelectItem>
                        <SelectItem value="imagem">Com imagem</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={String(s.columns)} onValueChange={v => updateSection(s.id, { columns: Number(v) as 1 | 2 })}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Uma coluna</SelectItem>
                        <SelectItem value="2">Duas colunas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {s.key === 'personalizada' && (
                    <Textarea rows={4} placeholder="Conteúdo da seção (aceita variáveis {{cliente_nome}})"
                      value={s.content ?? ''} onChange={e => updateSection(s.id, { content: e.target.value })} />
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* TEXTOS */}
          <TabsContent value="textos" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Variáveis disponíveis</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {AVAILABLE_VARIABLES.map(v => (
                  <Badge key={v} variant="outline" className="cursor-pointer font-mono text-[10px]"
                    onClick={() => { navigator.clipboard?.writeText(`{{${v}}}`); toast.success(`{{${v}}} copiado`); }}>
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </CardContent>
            </Card>
            {(Object.keys(config.texts) as (keyof typeof config.texts)[]).map(key => (
              <Card key={key}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">{key}</Label>
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"
                      onClick={() => patch('texts', { [key]: DEFAULT_PROPOSAL_CONFIG.texts[key] } as never)}>
                      <RotateCcw className="h-3 w-3" /> Padrão
                    </Button>
                  </div>
                  <Textarea rows={3} value={config.texts[key]}
                    onChange={e => patch('texts', { [key]: e.target.value } as never)} />
                  <p className="text-[10px] text-muted-foreground">Itens de lista podem ser separados por ponto e vírgula.</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* EQUIPAMENTOS */}
          <TabsContent value="equipamentos" className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={addEquipment} className="gap-2">
                <Plus className="h-4 w-4" /> Novo equipamento
              </Button>
            </div>
            {equipment.length === 0 && (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhum equipamento cadastrado. As garantias do PDF usarão o texto padrão.
              </p>
            )}
            {equipment.map(item => (
              <Card key={item.id}>
                <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Select value={item.category}
                    onValueChange={v => setEquipment(list => list.map(e => e.id === item.id ? { ...e, category: v } : e))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{EQUIPMENT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Fabricante" value={item.manufacturer}
                    onChange={e => setEquipment(l => l.map(x => x.id === item.id ? { ...x, manufacturer: e.target.value } : x))} />
                  <Input placeholder="Modelo" value={item.model}
                    onChange={e => setEquipment(l => l.map(x => x.id === item.id ? { ...x, model: e.target.value } : x))} />
                  <Input placeholder="Potência (W)" inputMode="numeric" value={item.potenciaW || ''}
                    onChange={e => setEquipment(l => l.map(x => x.id === item.id ? { ...x, potenciaW: Number(e.target.value.replace(/\D/g, '')) } : x))} />
                  <Input placeholder="Garantia defeito (anos)" inputMode="numeric" value={item.warrantyDefectYears || ''}
                    onChange={e => setEquipment(l => l.map(x => x.id === item.id ? { ...x, warrantyDefectYears: Number(e.target.value.replace(/\D/g, '')) } : x))} />
                  <Input placeholder="Garantia performance (anos)" inputMode="numeric" value={item.warrantyPerformanceYears || ''}
                    onChange={e => setEquipment(l => l.map(x => x.id === item.id ? { ...x, warrantyPerformanceYears: Number(e.target.value.replace(/\D/g, '')) } : x))} />
                  <Textarea className="sm:col-span-2 lg:col-span-3" rows={2} placeholder="Descrição / observações"
                    value={item.description}
                    onChange={e => setEquipment(l => l.map(x => x.id === item.id ? { ...x, description: e.target.value } : x))} />
                  <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={item.active}
                        onCheckedChange={v => setEquipment(l => l.map(x => x.id === item.id ? { ...x, active: v } : x))} />
                      <Label className="text-xs">Ativo</Label>
                    </div>
                    <Button size="sm" className="ml-auto gap-2" onClick={() => persistEquipment(item)}>
                      <Save className="h-3.5 w-3.5" /> Salvar
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive"
                      onClick={() => setConfirmDelete({ kind: 'equip', id: item.id })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* PREMISSAS */}
          <TabsContent value="premissas">
            <Card><CardHeader><CardTitle className="text-base">Premissas de cálculo</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {([
                  ['produtividadeKwhKwpMes', 'Produtividade (kWh/kWp·mês)'],
                  ['perdasPct', 'Perdas do sistema (%)'],
                  ['tarifaKwh', 'Tarifa padrão (R$/kWh)'],
                  ['reajusteTarifarioPct', 'Reajuste tarifário (% a.a.)'],
                  ['degradacaoAnualPct', 'Degradação anual (%)'],
                  ['horizonteAnos', 'Horizonte da projeção (anos)'],
                  ['custoManutencaoAnual', 'Custo anual de manutenção (R$)'],
                  ['consumoSimultaneoPct', 'Consumo simultâneo (%)'],
                  ['custoDisponibilidadeMensal', 'Custo de disponibilidade (R$/mês)'],
                  ['margemSegurancaPct', 'Margem de segurança (%)'],
                  ['areaPorModuloM2', 'Área por módulo (m²)'],
                  ['fatorCo2KgPorKwh', 'Fator CO₂ (kg/kWh)'],
                  ['validadeDias', 'Validade da proposta (dias)'],
                ] as const).map(([k, label]) => (
                  <div key={k} className="space-y-1.5">
                    <Label className="text-xs">{label}</Label>
                    <Input inputMode="decimal" value={String(config.assumptions[k])}
                      onChange={e => patch('assumptions', { [k]: Number(e.target.value.replace(',', '.')) || 0 } as never)} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* RODAPÉ E CONTATO */}
          <TabsContent value="rodape" className="space-y-4">
            <Card><CardHeader><CardTitle className="text-base">Dados institucionais</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {([
                  ['razaoSocial', 'Razão social'], ['nomeFantasia', 'Nome fantasia'], ['cnpj', 'CNPJ'],
                  ['endereco', 'Endereço'], ['cidade', 'Cidade'], ['estado', 'Estado'], ['cep', 'CEP'],
                  ['telefone', 'Telefone'], ['whatsapp', 'WhatsApp'], ['email', 'E-mail'], ['site', 'Site'],
                  ['instagram', 'Instagram'], ['responsavel', 'Responsável técnico'], ['registroProfissional', 'CREA / registro'],
                ] as const).map(([k, label]) => (
                  <div key={k} className="space-y-1.5">
                    <Label className="text-xs">{label}</Label>
                    <Input value={config.company[k]} onChange={e => patch('company', { [k]: e.target.value } as never)} />
                  </div>
                ))}
                <ImageField label="Assinatura digitalizada" value={config.company.assinaturaUrl} onChange={v => patch('company', { assinaturaUrl: v })} />
                <ImageField label="QR Code" value={config.company.qrCodeUrl} onChange={v => patch('company', { qrCodeUrl: v })} />
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-base">Rodapé do documento</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ['mostrarLogo', 'Logo reduzido'], ['mostrarRazaoSocial', 'Razão social'], ['mostrarCnpj', 'CNPJ'],
                    ['mostrarContato', 'Contatos'], ['mostrarInstagram', 'Instagram'],
                    ['mostrarNumeroProposta', 'Número da proposta'], ['mostrarPaginacao', 'Página atual / total'],
                  ] as const).map(([k, label]) => (
                    <div key={k} className="flex items-center justify-between rounded-md border p-2.5">
                      <Label className="text-xs">{label}</Label>
                      <Switch checked={config.footer[k]} onCheckedChange={v => patch('footer', { [k]: v } as never)} />
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Texto institucional</Label>
                  <Input value={config.footer.texto} onChange={e => patch('footer', { texto: e.target.value })} /></div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <ColorField label="Cor de fundo" value={config.footer.corFundo} onChange={v => patch('footer', { corFundo: v })} />
                  <ColorField label="Cor do texto" value={config.footer.corTexto} onChange={v => patch('footer', { corTexto: v })} />
                  <div className="space-y-2">
                    <Label className="text-xs">Altura: {config.footer.alturaMm} mm</Label>
                    <Slider value={[config.footer.alturaMm]} min={8} max={24} step={1}
                      onValueChange={([v]) => patch('footer', { alturaMm: v })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Estilo do rodapé</Label>
                  <Select value={config.branding.estiloRodape} onValueChange={(v: 'faixa' | 'linha' | 'oculto') => patch('branding', { estiloRodape: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="faixa">Faixa</SelectItem>
                      <SelectItem value="linha">Somente linha</SelectItem>
                      <SelectItem value="oculto">Oculto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GALERIA */}
          <TabsContent value="galeria" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Galeria de projetos entregues</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Título da seção</Label>
                    <Input value={config.gallery.titulo}
                      onChange={e => patch('gallery', { titulo: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Colunas do grid</Label>
                    <Select value={String(config.gallery.colunas)}
                      onValueChange={v => patch('gallery', { colunas: v === '2' ? 2 : 3 })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 colunas</SelectItem>
                        <SelectItem value="3">3 colunas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Descrição</Label>
                  <Textarea rows={2} value={config.gallery.descricao}
                    onChange={e => patch('gallery', { descricao: e.target.value })} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-xs">Mostrar títulos nos cards</Label>
                  <Switch checked={config.gallery.mostrarTitulos}
                    onCheckedChange={v => patch('gallery', { mostrarTitulos: v })} />
                </div>
                <p className="text-xs text-muted-foreground">
                  A galeria aparece logo após as condições de pagamento. Ative ou reordene em “Estrutura”.
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button size="sm" variant="outline" className="gap-2" onClick={() => patch('gallery', {
                itens: [...config.gallery.itens, { id: `img-${Date.now()}`, url: '', titulo: '', descricao: '' }],
              })}><Plus className="h-4 w-4" /> Adicionar imagem</Button>
            </div>

            {config.gallery.itens.length === 0 && (
              <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
                Nenhuma imagem cadastrada ainda.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {config.gallery.itens.map((item, i) => (
                <Card key={item.id}>
                  <CardContent className="space-y-3 p-4">
                    <ImageField label={`Imagem ${i + 1}`} value={item.url}
                      onChange={v => patch('gallery', {
                        itens: config.gallery.itens.map(x => x.id === item.id ? { ...x, url: v } : x),
                      })} />
                    <Input placeholder="Título do projeto" value={item.titulo}
                      onChange={e => patch('gallery', {
                        itens: config.gallery.itens.map(x => x.id === item.id ? { ...x, titulo: e.target.value } : x),
                      })} />
                    <Input placeholder="Descrição curta (opcional)" value={item.descricao ?? ''}
                      onChange={e => patch('gallery', {
                        itens: config.gallery.itens.map(x => x.id === item.id ? { ...x, descricao: e.target.value } : x),
                      })} />
                    <div className="flex justify-between">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" disabled={i === 0} onClick={() => {
                          const arr = [...config.gallery.itens];
                          [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                          patch('gallery', { itens: arr });
                        }}><ArrowUp className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" disabled={i === config.gallery.itens.length - 1} onClick={() => {
                          const arr = [...config.gallery.itens];
                          [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
                          patch('gallery', { itens: arr });
                        }}><ArrowDown className="h-3.5 w-3.5" /></Button>
                      </div>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => patch('gallery', {
                        itens: config.gallery.itens.filter(x => x.id !== item.id),
                      })}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* MODELOS */}
          <TabsContent value="modelos" className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Ao aplicar um modelo, apenas o estilo e a disposição das seções mudam. Logotipos, imagem de capa,
              galeria, textos e dados da empresa são sempre preservados — e a mudança é salva automaticamente.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="outline" className="gap-2" onClick={async () => {
                try {
                  const cfg = await fetchProposalSettings();
                  setConfig(cfg); toast.success('Configuração recarregada do servidor');
                } catch { toast.error('Não foi possível recarregar'); }
              }}>Recarregar do servidor</Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={async () => {
                try {
                  setTemplates(await refreshDefaultTemplates(config));
                  toast.success('Modelos padrão atualizados');
                } catch { toast.error('Sem permissão para atualizar modelos'); }
              }}>Restaurar modelos padrão</Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={async () => {
                try {
                  const t = await createTemplate(`Modelo ${templates.length + 1}`, config, 'Criado a partir da configuração atual');
                  setTemplates([...templates, t]); toast.success('Modelo criado');
                } catch { toast.error('Sem permissão para criar modelos'); }
              }}><Plus className="h-4 w-4" /> Criar modelo com a configuração atual</Button>
            </div>
            {templates.map(t => (
              <Card key={t.id}>
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-[180px] flex-1">
                    <div className="flex items-center gap-2">
                      <Input className="h-8 max-w-[220px]" value={t.name}
                        onChange={e => setTemplates(list => list.map(x => x.id === t.id ? { ...x, name: e.target.value } : x))} />
                      {t.isDefault && <Badge className="gap-1 text-[10px]"><Star className="h-3 w-3" /> padrão</Badge>}
                      {!t.isActive && <Badge variant="secondary" className="text-[10px]">inativo</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={async () => {
                      const merged = applyTemplateConfig(config, t.config);
                      setConfig(merged);
                      try { await saveProposalSettings(merged); toast.success(`Modelo "${t.name}" aplicado e salvo`); }
                      catch { toast.warning(`Modelo "${t.name}" aplicado (salve para persistir)`); }
                    }}>Usar / visualizar</Button>

                    <Button size="sm" variant="outline" onClick={async () => {
                      try { await updateTemplate(t.id, { name: t.name, config }); toast.success('Modelo atualizado'); }
                      catch { toast.error('Sem permissão'); }
                    }}>Salvar config. atual</Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      try {
                        const novo = await createTemplate(`${t.name} (cópia)`, t.config, t.description);
                        setTemplates([...templates, novo]);
                      } catch { toast.error('Sem permissão'); }
                    }}><Copy className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      try {
                        await setDefaultTemplate(t.id);
                        setTemplates(list => list.map(x => ({ ...x, isDefault: x.id === t.id })));
                      } catch { toast.error('Sem permissão'); }
                    }}><Star className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      try {
                        await updateTemplate(t.id, { is_active: !t.isActive });
                        setTemplates(list => list.map(x => x.id === t.id ? { ...x, isActive: !x.isActive } : x));
                      } catch { toast.error('Sem permissão'); }
                    }}>{t.isActive ? 'Desativar' : 'Ativar'}</Button>
                    <Button size="sm" variant="ghost" className="text-destructive"
                      onClick={() => setConfirmDelete({ kind: 'template', id: t.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* PRÉ-VISUALIZAÇÃO */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between space-y-0 py-3">
              <CardTitle className="text-sm">Pré-visualização A4</CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setZoom(z => Math.max(0.25, +(z - 0.05).toFixed(2)))}>−</Button>
                <span className="w-10 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
                <Button size="sm" variant="ghost" onClick={() => setZoom(z => Math.min(1, +(z + 0.05).toFixed(2)))}>+</Button>
              </div>
            </CardHeader>
            <CardContent className="max-h-[75vh] overflow-y-auto overflow-x-hidden bg-muted/40 p-3">
              <div className="mx-auto w-fit" style={{ zoom }}>
                {preview}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!confirmDelete) return;
              try {
                if (confirmDelete.kind === 'template') {
                  await deleteTemplate(confirmDelete.id);
                  setTemplates(list => list.filter(x => x.id !== confirmDelete.id));
                } else {
                  await deleteEquipment(confirmDelete.id);
                  setEquipment(list => list.filter(x => x.id !== confirmDelete.id));
                }
                toast.success('Excluído');
              } catch { toast.error('Sem permissão para excluir'); }
              setConfirmDelete(null);
            }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
