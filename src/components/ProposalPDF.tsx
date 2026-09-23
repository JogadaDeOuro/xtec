import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Maximize2, Printer } from 'lucide-react';
import type { SystemType } from '@/lib/mock-data';
import { DEFAULT_PROPOSAL_CONFIG, mergeConfig, type ProposalDocConfig } from '@/lib/proposal-config';
import { fetchEquipment, fetchProposalSettings, type EquipmentItem } from '@/lib/proposal-settings';
import { buildDocumentCss, PRINT_PAGE_RULE } from '@/components/proposal/document-styles';
import { ProposalDocument, type DocLayoutInfo, type ProposalDocData, type ProposalPaymentInfo } from '@/components/proposal/ProposalDocument';
import { downloadProposalPdf, generateProposalPdfServerSide, deliverPdf, sharePdf, isAppleWebKit, type PdfProgress } from '@/lib/pdf-export';
import type { Finalidade } from '@/lib/investment';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';


interface ProposalPDFProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** id da proposta salva — habilita o motor oficial server-side */
  proposalId?: string;
  /** Sincroniza alterações da tela antes de o servidor carregar a proposta. */
  beforeServerDownload?: () => Promise<string | void>;
  clientName: string;

  clientCity?: string;
  clientState?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientDocument?: string;
  concessionaria?: string;
  systemType: SystemType;
  potencia: number;
  numPlacas: number;
  potenciaModuloW?: number;
  /** @deprecated mantido por compatibilidade */
  potenciaMin?: number;
  /** @deprecated mantido por compatibilidade */
  potenciaMax?: number;
  producao: number;
  consumoMedio?: number;
  valorBruto: number;
  valorFinal: number;
  desconto: number;
  tarifaKwh: number;
  economiaMensal: number;
  economiaAnual: number;
  paybackExato: number;
  economiaTotal20: number;
  payment: ProposalPaymentInfo;
  numero?: string;
  consultor?: string;
  finalidade?: Finalidade;
  desagioPct?: number;
  tipo?: 'usina' | 'manutencao';
  manutencao?: ProposalDocData['manutencao'];
  /** configuração específica da proposta (snapshot); se ausente usa a global */
  docConfig?: ProposalDocConfig | null;
}

export function ProposalPDF(props: ProposalPDFProps) {
  const { open, onOpenChange } = props;
  const printRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<ProposalDocConfig>(DEFAULT_PROPOSAL_CONFIG);
  const [equipamentos, setEquipamentos] = useState<EquipmentItem[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [layout, setLayout] = useState<DocLayoutInfo>({ totalPages: 0, overflow: [] });
  const [tamanhoReal, setTamanhoReal] = useState(false);
  const [progress, setProgress] = useState<PdfProgress | null>(null);
  const [previewScale, setPreviewScale] = useState(0.82);
  const [documentHeight, setDocumentHeight] = useState(0);


  useEffect(() => {
    if (!open) return;
    if (props.docConfig) { setConfig(mergeConfig(props.docConfig)); }
    else { fetchProposalSettings().then(setConfig).catch(() => setConfig(DEFAULT_PROPOSAL_CONFIG)); }
    fetchEquipment().then(list => setEquipamentos(list.filter(e => e.active))).catch(() => setEquipamentos([]));
  }, [open, props.docConfig]);

  useEffect(() => {
    if (!open) return;
    const updatePreviewSize = () => {
      const viewport = previewRef.current;
      const documentNode = printRef.current;
      if (!viewport || !documentNode) return;
      const availableWidth = Math.max(280, viewport.clientWidth);
      setPreviewScale(Math.min(0.82, availableWidth / 794));
      setDocumentHeight(documentNode.scrollHeight);
    };
    const frame = window.requestAnimationFrame(updatePreviewSize);
    const observer = new ResizeObserver(updatePreviewSize);
    if (previewRef.current) observer.observe(previewRef.current);
    if (printRef.current) observer.observe(printRef.current);
    window.addEventListener('orientationchange', updatePreviewSize);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('orientationchange', updatePreviewSize);
    };
  }, [open, config, layout.totalPages]);

  const data: ProposalDocData = {
    numero: props.numero ?? '',
    data: new Date(),
    consultor: props.consultor ?? '',
    clientName: props.clientName,
    clientCity: props.clientCity,
    clientState: props.clientState,
    clientEmail: props.clientEmail,
    clientPhone: props.clientPhone,
    clientDocument: props.clientDocument,
    concessionaria: props.concessionaria,
    systemType: props.systemType,
    numModulos: props.numPlacas,
    potenciaModuloW: props.potenciaModuloW ?? 650,
    potenciaKwp: props.potencia,
    producaoMensal: props.producao,
    consumoMedio: props.consumoMedio ?? 0,
    valorBruto: props.valorBruto,
    valorFinal: props.valorFinal,
    desconto: props.desconto,
    tarifaKwh: props.tarifaKwh,
    economiaMensal: props.economiaMensal,
    economiaAnual: props.economiaAnual,
    paybackAnos: props.paybackExato,
    economiaTotal: props.economiaTotal20,
    payment: props.payment,
    equipamentos,
    finalidade: props.finalidade ?? 'consumo',
    desagioPct: props.desagioPct ?? 0,
    tipo: props.tipo ?? 'usina',
    manutencao: props.manutencao,
  };

  const progressPct: Record<PdfProgress, number> = {
    'preparando': 15,
    'carregando-imagens': 35,
    'gerando': 65,
    'finalizando': 90,
    'pronto': 100,
    'erro': 100,
  };

  const progressLabel: Record<PdfProgress, string> = {
    'preparando': 'Preparando proposta...',
    'carregando-imagens': 'Carregando imagens...',
    'gerando': 'Gerando PDF...',
    'finalizando': 'Finalizando...',
    'pronto': 'Pronto!',
    'erro': 'Erro na geração',
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    const nome = `Proposta-${(data.numero || '').replace(/\W+/g, '') || 'SolarFlow'}-${props.clientName.replace(/\W+/g, '-')}`;
    let officialProposalId = props.proposalId;
    try {
      // 1) motor oficial: Chromium server-side
      const syncedProposalId = await props.beforeServerDownload?.();
      officialProposalId = syncedProposalId || props.proposalId;
      if (officialProposalId) {
        const result = await generateProposalPdfServerSide(officialProposalId, nome, setProgress);
        if (!(await sharePdf(result.blob, result.fileName))) {
          deliverPdf(result.blob, result.fileName);
        }
        toast.success('PDF pronto!');
        return;
      }
      if (isAppleWebKit()) {
        throw new Error('Salve a proposta para gerar o PDF oficial neste dispositivo.');
      }
      // 2) fallback local controlado (somente navegadores compatíveis)
      setProgress('gerando');
      const content = printRef.current;
      if (!content) throw new Error('Documento não renderizado');
      const result = await downloadProposalPdf(content, config, nome);
      deliverPdf(result.blob, result.fileName);
    } catch (e) {
      setProgress('erro');
      const msg = e instanceof Error ? e.message : 'Falha ao gerar o PDF';
      // Propostas ainda não salvas podem usar o exportador local. Quando existe
      // um id, nunca substituímos silenciosamente o PDF oficial por uma captura
      // rasterizada, pois ela não mantém a mesma fidelidade da impressão.
      if (!officialProposalId && !isAppleWebKit() && printRef.current) {
        try {
          const result = await downloadProposalPdf(printRef.current, config, nome);
          deliverPdf(result.blob, result.fileName);
          return;
        } catch { /* segue para o aviso */ }
      }
      toast.error(msg);
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  };


  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8" />
      <title>Proposta ${data.numero || ''} - ${props.clientName}</title>
      <style>${PRINT_PAGE_RULE}${buildDocumentCss(config)}</style></head>
      <body><div class="pdoc">${content.innerHTML}</div></body></html>`);
    win.document.querySelectorAll('.pdoc-measure').forEach(n => n.remove());
    win.document.close();
    const start = () => setTimeout(() => win.print(), 300);
    const fonts = (win.document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) fonts.ready.then(start).catch(start);
    else start();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!downloading) onOpenChange(v); }}>
      <DialogContent className="proposal-pdf-dialog flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden border-0 bg-muted/40 p-0 sm:h-[92vh] sm:w-[calc(100vw-2rem)] sm:max-w-[900px] sm:rounded-lg sm:border">
        {downloading && (
          <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-background/85 backdrop-blur-sm px-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">{progress ? progressLabel[progress] : 'Gerando PDF...'}</p>
            <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress ? progressPct[progress] : 10}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              O documento está sendo renderizado em alta qualidade. Isso pode levar alguns segundos.
            </p>
          </div>
        )}
        <DialogHeader className="no-print shrink-0 border-b bg-background px-4 pb-3 pt-4 text-left sm:px-6 sm:pb-4 sm:pt-5">
          <DialogTitle className="pr-8 text-base leading-tight sm:text-lg">
            Pré-visualização A4 <span className="font-normal text-muted-foreground">· {layout.totalPages} página{layout.totalPages === 1 ? '' : 's'}</span>
          </DialogTitle>
          <div className="grid grid-cols-2 gap-2 pt-3 sm:flex sm:items-center">
              <Button onClick={handleDownload} disabled={downloading} className="col-span-2 gap-2 sm:col-span-1">
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {downloading ? (progress ? progressLabel[progress] : 'Gerando PDF...') : 'Baixar PDF'}
              </Button>
              <Button variant="outline" onClick={() => setTamanhoReal(v => !v)} className="gap-2">
                <Maximize2 className="h-4 w-4" />
                {tamanhoReal ? 'Ajustar à tela' : 'Tamanho real'}
              </Button>
              <Button variant="outline" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
          </div>
        </DialogHeader>

        {layout.overflow.length > 0 && (
          <div className="no-print rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Conteúdo excede a altura útil da folha A4 nas seções: {layout.overflow.join(', ')}. Reduza o texto ou divida a seção.
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-2 sm:p-4">
          <div ref={previewRef} className={tamanhoReal ? 'min-w-[794px]' : 'flex w-full justify-center'}>
            <div
              className="shrink-0"
              style={{
                width: tamanhoReal ? 794 : 794 * previewScale,
                height: tamanhoReal ? documentHeight : documentHeight * previewScale,
              }}
            >
              <div
                className="origin-top-left"
                style={{ width: 794, transform: tamanhoReal ? undefined : `scale(${previewScale})` }}
              >
                <div ref={printRef}>
                  <ProposalDocument config={config} data={data} onLayout={setLayout} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
