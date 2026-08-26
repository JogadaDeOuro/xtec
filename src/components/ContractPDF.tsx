import { useRef, useEffect, useState } from 'react';
import '@fontsource/dancing-script/400.css';
import '@fontsource/great-vibes/400.css';
import '@fontsource/pacifico/400.css';
import '@fontsource/sacramento/400.css';
import '@fontsource/allura/400.css';
import '@fontsource/satisfy/400.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { type Contract, formatCurrency } from '@/lib/mock-data';
import logoImg from '@/assets/logo-inforsol.png';
import { getMilestones, mapCondicaoFromLabel, EXTENDED_WARRANTY_YEARS, EXTENDED_WARRANTY_DESCRIPTION, STANDARD_WARRANTY_DESCRIPTION } from '@/lib/payment-options';
import { ContractDocument } from '@/components/ContractDocument';
import {
  DEFAULT_CONTRACT_TEMPLATE, buildContractVariables, ensureDefaultContractTemplate,
  type ContractTemplateContent,
} from '@/lib/contract-template';
import { fetchProposalSettings } from '@/lib/proposal-settings';

interface ContractPDFProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract & { garantiaEstendida?: boolean; garantiaEstendidaValor?: number };
  showSignatures?: boolean;
}

export function ContractPDF({ open, onOpenChange, contract, showSignatures = false }: ContractPDFProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<ContractTemplateContent>(DEFAULT_CONTRACT_TEMPLATE);
  const [company, setCompany] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [tpls, settings] = await Promise.all([
          ensureDefaultContractTemplate(),
          fetchProposalSettings().catch(() => null),
        ]);
        const def = tpls.find(t => t.isDefault && t.isActive) || tpls.find(t => t.isActive);
        if (def) setTemplate(def.content);
        if (settings) setCompany(settings.company as unknown as Record<string, string | undefined>);
      } catch {
        /* mantém o modelo padrão local */
      }
    })();
  }, [open]);

  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const garantiaValor = contract.garantiaEstendidaValor || 0;

  const vars = buildContractVariables({
    clientName: contract.clientName,
    clientDocument: contract.clientDocument,
    clientEmail: contract.clientEmail,
    clientPhone: contract.clientPhone,
    clientAddress: contract.clientAddress,
    clientCity: contract.clientCity,
    clientState: contract.clientState,
    systemType: contract.systemType,
    potenciaKwp: contract.potenciaKwp,
    valor: contract.valor,
    condicaoPagamento: contract.condicaoPagamento,
    garantiaEstendida: contract.garantiaEstendida,
    garantiaEstendidaValor: garantiaValor,
    proposalId: contract.proposalId,
    contractId: contract.id,
    company,
  });

  const empresaSig = contract.signatures.find(s => s.signerType === 'empresa');
  const clienteSig = contract.signatures.find(s => s.signerType === 'cliente');


  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Contrato - ${contract.clientName}</title>
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script&family=Great+Vibes&family=Pacifico&family=Sacramento&family=Allura&family=Satisfy&display=swap" rel="stylesheet">
      <style>
        @page { size: A4; margin: 20mm 15mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; line-height: 1.6; color: #1a1a1a; padding: 0; }
        .contract-header { text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 16px; margin-bottom: 20px; }
        .contract-header img { height: 48px; margin-bottom: 8px; }
        .contract-header h1 { font-size: 18px; font-weight: 700; color: #1a1a1a; }
        .contract-header p { font-size: 10px; color: #666; }
        .clause { margin-bottom: 14px; }
        .clause h2 { font-size: 12px; font-weight: 700; color: #f97316; margin-bottom: 4px; text-transform: uppercase; }
        .clause p, .clause li { font-size: 11px; line-height: 1.6; }
        .clause ul { padding-left: 18px; }
        .clause li { margin-bottom: 2px; }
        .signatures { margin-top: 40px; display: flex; justify-content: space-between; gap: 40px; }
        .sig-box { flex: 1; text-align: center; }
        .sig-styled { font-size: 22px; min-height: 40px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 4px; }
        .sig-line { border-top: 1px solid #333; padding-top: 8px; }
        .sig-box p { font-size: 10px; }
        .sig-box .sig-name { font-weight: 700; font-size: 11px; }
        .sig-filled { color: #16a34a; font-size: 9px; margin-top: 4px; }
        .footer { margin-top: 30px; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; font-size: 9px; color: #888; }
        .highlight { background: #fff7ed; padding: 8px 12px; border-radius: 6px; border-left: 3px solid #f97316; margin: 8px 0; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head><body>${content}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Contrato — {contract.clientName}</span>
            <Button size="sm" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef}>
          <ContractDocument
            template={template}
            vars={vars}
            logoUrl={logoImg}
            cityLine={`${contract.clientCity || vars.empresa_cidade}/${contract.clientState || vars.empresa_estado}, ${today}.`}
            signatures={
              <div className="signatures" style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', gap: '40px' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div className="sig-styled" style={{ fontSize: '22px', minHeight: '40px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '4px' }}>
                    {showSignatures && clienteSig && clienteSig.signatureFont ? (
                      <span style={{ fontFamily: clienteSig.signatureFont }}>{clienteSig.name}</span>
                    ) : showSignatures && clienteSig ? (
                      <span style={{ fontStyle: 'italic' }}>{clienteSig.name}</span>
                    ) : (
                      <span style={{ color: '#ccc', fontSize: '11px' }}>&nbsp;</span>
                    )}
                  </div>
                  <div className="sig-line" style={{ borderTop: '1px solid #333', paddingTop: '8px' }}>
                    {showSignatures && clienteSig ? (
                      <>
                        <p style={{ fontWeight: 700, fontSize: '11px' }}>{clienteSig.name}</p>
                        <p style={{ fontSize: '10px' }}>CPF/CNPJ: {clienteSig.document}</p>
                        <p style={{ color: '#16a34a', fontSize: '9px', marginTop: '4px' }}>
                          ✓ Assinado em {new Date(clienteSig.signedAt).toLocaleDateString('pt-BR')}
                        </p>
                      </>
                    ) : (
                      <>
                        <p style={{ fontWeight: 700, fontSize: '11px' }}>{contract.clientName}</p>
                        <p style={{ fontSize: '10px' }}>CONTRATANTE</p>
                        <p style={{ fontSize: '10px' }}>CPF/CNPJ: {contract.clientDocument || '___.___.___/____-__'}</p>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div className="sig-styled" style={{ fontSize: '22px', minHeight: '40px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '4px' }}>
                    {showSignatures && empresaSig && empresaSig.signatureFont ? (
                      <span style={{ fontFamily: empresaSig.signatureFont }}>{empresaSig.name}</span>
                    ) : showSignatures && empresaSig ? (
                      <span style={{ fontStyle: 'italic' }}>{empresaSig.name}</span>
                    ) : (
                      <span style={{ color: '#ccc', fontSize: '11px' }}>&nbsp;</span>
                    )}
                  </div>
                  <div className="sig-line" style={{ borderTop: '1px solid #333', paddingTop: '8px' }}>
                    {showSignatures && empresaSig ? (
                      <>
                        <p style={{ fontWeight: 700, fontSize: '11px' }}>{empresaSig.name}</p>
                        <p style={{ fontSize: '10px' }}>CPF/CNPJ: {empresaSig.document}</p>
                        <p style={{ color: '#16a34a', fontSize: '9px', marginTop: '4px' }}>
                          ✓ Assinado em {new Date(empresaSig.signedAt).toLocaleDateString('pt-BR')}
                        </p>
                      </>
                    ) : (
                      <>
                        <p style={{ fontWeight: 700, fontSize: '11px' }}>{vars.empresa_nome}</p>
                        <p style={{ fontSize: '10px' }}>CONTRATADA</p>
                        <p style={{ fontSize: '10px' }}>CNPJ: {vars.empresa_cnpj}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

