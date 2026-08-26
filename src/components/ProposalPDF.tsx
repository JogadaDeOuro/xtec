import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import type { SystemType } from '@/lib/mock-data';
import { DEFAULT_PROPOSAL_CONFIG, mergeConfig, type ProposalDocConfig } from '@/lib/proposal-config';
import { fetchEquipment, fetchProposalSettings, type EquipmentItem } from '@/lib/proposal-settings';
import { buildDocumentCss, PRINT_PAGE_RULE } from '@/components/proposal/document-styles';
import { ProposalDocument, type ProposalDocData, type ProposalPaymentInfo } from '@/components/proposal/ProposalDocument';

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
  /** configuração específica da proposta (snapshot); se ausente usa a global */
  docConfig?: ProposalDocConfig | null;
}

export function ProposalPDF(props: ProposalPDFProps) {
  const { open, onOpenChange } = props;
  const printRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<ProposalDocConfig>(DEFAULT_PROPOSAL_CONFIG);
  const [equipamentos, setEquipamentos] = useState<EquipmentItem[]>([]);

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
    win.document.close();
    setTimeout(() => win.print(), 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[92vh] overflow-y-auto bg-muted/40">
        <DialogHeader className="no-print">
          <DialogTitle className="flex items-center justify-between">
            <span>Pré-visualização A4</span>
            <Button onClick={handlePrint} className="gap-2 mr-8">
              <Printer className="h-4 w-4" /> Gerar PDF / Imprimir
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="origin-top scale-[0.82] -mb-[16%]">
          <div ref={printRef}>
            <ProposalDocument config={config} data={data} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
