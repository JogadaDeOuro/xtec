import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import type { SystemType } from '@/lib/mock-data';
import { DEFAULT_PROPOSAL_CONFIG, mergeConfig, type ProposalDocConfig } from '@/lib/proposal-config';
import { fetchEquipment, fetchProposalSettings, type EquipmentItem } from '@/lib/proposal-settings';
import { buildDocumentCss, PRINT_PAGE_RULE } from '@/components/proposal/document-styles';
import { ProposalDocument, type DocLayoutInfo, type ProposalDocData, type ProposalPaymentInfo } from '@/components/proposal/ProposalDocument';
import { downloadProposalPdf, generateProposalPdfServerSide, deliverPdf, isAppleWebKit, type PdfProgress } from '@/lib/pdf-export';
import type { Finalidade } from '@/lib/investment';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';


interface ProposalPDFProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  /** configuração específica da proposta (snapshot); se ausente usa a global */
  docConfig?: ProposalDocConfig | null;
}

export function ProposalPDF(props: ProposalPDFProps) {
  const { open, onOpenChange } = props;
  const printRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<ProposalDocConfig>(DEFAULT_PROPOSAL_CONFIG);
  const [equipamentos, setEquipamentos] = useState<EquipmentItem[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [layout, setLayout] = useState<DocLayoutInfo>({ totalPages: 0, overflow: [] });
  const [tamanhoReal, setTamanhoReal] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (props.docConfig) { setConfig(mergeConfig(props.docConfig)); }
    else { fetchProposalSettings().then(setConfig).catch(() => setConfig(DEFAULT_PROPOSAL_CONFIG)); }
    fetchEquipment().then(list => setEquipamentos(list.filter(e => e.active))).catch(() => setEquipamentos([]));
  }, [open, props.docConfig]);

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
  };

  const handleDownload = async () => {
    const content = printRef.current;
    if (!content || downloading) return;
    setDownloading(true);
    try {
      const nome = `Proposta-${(data.numero || '').replace(/\W+/g, '') || 'Inforsol'}-${props.clientName.replace(/\W+/g, '-')}`;
      await downloadProposalPdf(content, config, nome);
    } catch {
      // fallback: impressão do navegador
      handlePrint();
    } finally {
      setDownloading(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[92vh] overflow-y-auto overflow-x-hidden bg-muted/40">
        <DialogHeader className="no-print">
          <DialogTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>Pré-visualização A4 · {layout.totalPages} página{layout.totalPages === 1 ? '' : 's'}</span>
            <div className="flex items-center gap-2 mr-8">
              <Button onClick={handleDownload} disabled={downloading} className="gap-2">
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {downloading ? 'Gerando PDF...' : 'Baixar PDF'}
              </Button>
              <Button variant="outline" onClick={() => setTamanhoReal(v => !v)} className="gap-2">
                {tamanhoReal ? 'Ajustar à tela' : 'Tamanho real'}
              </Button>
              <Button variant="outline" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {layout.overflow.length > 0 && (
          <div className="no-print rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Conteúdo excede a altura útil da folha A4 nas seções: {layout.overflow.join(', ')}. Reduza o texto ou divida a seção.
          </div>
        )}

        <div className="overflow-x-auto">
          <div className={tamanhoReal ? 'origin-top' : 'origin-top scale-[0.82] -mb-[16%]'}>
            <div ref={printRef}>
              <ProposalDocument config={config} data={data} onLayout={setLayout} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
