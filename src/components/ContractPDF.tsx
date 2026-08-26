import { useRef } from 'react';
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

interface ContractPDFProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract & { garantiaEstendida?: boolean; garantiaEstendidaValor?: number };
  showSignatures?: boolean;
}

export function ContractPDF({ open, onOpenChange, contract, showSignatures = false }: ContractPDFProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const systemLabel = contract.systemType === 'on-grid' ? 'On-Grid (Conectado à Rede)' :
    contract.systemType === 'off-grid' ? 'Off-Grid (Isolado)' : 'Híbrido';

  const milestones = getMilestones(mapCondicaoFromLabel(contract.condicaoPagamento || ''));
  const garantiaValor = contract.garantiaEstendidaValor || 0;

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

        <div ref={printRef} className="text-xs leading-relaxed text-foreground">
          <div style={{ textAlign: 'center', borderBottom: '2px solid #f97316', paddingBottom: '16px', marginBottom: '20px' }}>
            <img src={logoImg} alt="Inforsol" style={{ height: '48px', marginBottom: '8px' }} />
            <h1 style={{ fontSize: '18px', fontWeight: 700 }}>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
            <p style={{ fontSize: '10px', color: '#666' }}>Instalação de Sistema de Energia Solar Fotovoltaica</p>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#f97316', marginBottom: '4px' }}>CLÁUSULA 1ª — DAS PARTES</h2>
            <p><strong>CONTRATADA:</strong> Inforsol Energia Solar Ltda, inscrita no CNPJ sob nº 00.000.000/0001-00, com sede em São Paulo/SP, doravante denominada CONTRATADA.</p>
            <p><strong>CONTRATANTE:</strong> {contract.clientName}, inscrito(a) no CPF/CNPJ sob nº {contract.clientDocument || '___.___.___/____-__'}, residente/sediado(a) em {contract.clientAddress || '______'}, {contract.clientCity || '______'}/{contract.clientState || '__'}, doravante denominado(a) CONTRATANTE.</p>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#f97316', marginBottom: '4px' }}>CLÁUSULA 2ª — DO OBJETO</h2>
            <p>O presente contrato tem por objeto a instalação de um sistema de energia solar fotovoltaica do tipo <strong>{systemLabel}</strong>, com potência instalada de <strong>{contract.potenciaKwp} kWp</strong>, incluindo fornecimento de materiais, mão de obra especializada, projeto técnico e homologação junto à concessionária de energia.</p>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#f97316', marginBottom: '4px' }}>CLÁUSULA 3ª — DO VALOR E FORMA DE PAGAMENTO</h2>
            <div style={{ background: '#fff7ed', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid #f97316', margin: '8px 0' }}>
              <p>Valor total do contrato: <strong>{formatCurrency(contract.valor)}</strong></p>
              <p>Condição de pagamento: <strong>{contract.condicaoPagamento}</strong></p>
              {milestones && (
                <ul style={{ paddingLeft: '18px', marginTop: '4px' }}>
                  {milestones.map(m => (
                    <li key={m.label}>{m.pct}% — {m.label}: <strong>{formatCurrency(contract.valor * m.pct / 100)}</strong></li>
                  ))}
                </ul>
              )}
              {contract.garantiaEstendida && (
                <>
                  <p style={{ marginTop: '4px' }}>Serviço adicional de garantia estendida: <strong>{formatCurrency(garantiaValor)}</strong></p>
                  <p>Total geral (contrato + serviço adicional): <strong>{formatCurrency(contract.valor + garantiaValor)}</strong></p>
                </>
              )}
            </div>
            <p>O não pagamento nas datas acordadas acarretará juros de mora de 1% ao mês e multa de 2% sobre o valor em atraso.</p>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#f97316', marginBottom: '4px' }}>CLÁUSULA 4ª — DO PRAZO DE EXECUÇÃO</h2>
            <p>A CONTRATADA se compromete a executar a instalação no prazo de <strong>30 (trinta) dias úteis</strong> após a liberação técnica pela concessionária e recebimento da primeira parcela/pagamento integral.</p>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#f97316', marginBottom: '4px' }}>CLÁUSULA 5ª — DAS GARANTIAS</h2>
            <ul style={{ paddingLeft: '18px' }}>
              <li>Módulos fotovoltaicos: <strong>25 anos</strong> de garantia de performance linear</li>
              <li>Inversor: <strong>10 anos</strong> de garantia do fabricante</li>
              <li>Estrutura de fixação: <strong>12 anos</strong> contra corrosão</li>
              <li>Mão de obra e instalação: <strong>5 anos</strong></li>
              <li>Monitoramento: <strong>1 ano</strong> de acompanhamento gratuito</li>
            </ul>
            <p style={{ marginTop: '6px' }}>{STANDARD_WARRANTY_DESCRIPTION}</p>
            {contract.garantiaEstendida && (
              <p style={{ marginTop: '6px' }}><strong>Garantia Estendida ({EXTENDED_WARRANTY_YEARS} anos adicionais):</strong> {EXTENDED_WARRANTY_DESCRIPTION} Contratada como serviço adicional no valor de <strong>{formatCurrency(garantiaValor)}</strong>, cobrado à parte do valor do contrato.</p>
            )}
          </div>

          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#f97316', marginBottom: '4px' }}>CLÁUSULA 6ª — DAS OBRIGAÇÕES DA CONTRATADA</h2>
            <ul style={{ paddingLeft: '18px' }}>
              <li>Fornecer todos os materiais e equipamentos necessários para a instalação</li>
              <li>Executar a instalação com profissionais qualificados e certificados</li>
              <li>Elaborar e registrar o projeto técnico junto ao CREA/CAU</li>
              <li>Solicitar e acompanhar o processo de homologação junto à concessionária</li>
              <li>Fornecer manual de operação e manutenção do sistema</li>
            </ul>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#f97316', marginBottom: '4px' }}>CLÁUSULA 7ª — DAS OBRIGAÇÕES DO CONTRATANTE</h2>
            <ul style={{ paddingLeft: '18px' }}>
              <li>Efetuar os pagamentos nas datas e formas acordadas</li>
              <li>Disponibilizar acesso ao local de instalação</li>
              <li>Fornecer documentação necessária para homologação (conta de energia, documentos pessoais)</li>
              <li>Manter o local adequado para a instalação do sistema</li>
            </ul>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#f97316', marginBottom: '4px' }}>CLÁUSULA 8ª — DA RESCISÃO</h2>
            <p>O presente contrato poderá ser rescindido por qualquer das partes mediante notificação escrita com antecedência mínima de 30 (trinta) dias, ficando a parte que der causa à rescisão obrigada ao pagamento de multa rescisória de 10% sobre o valor total do contrato.</p>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#f97316', marginBottom: '4px' }}>CLÁUSULA 9ª — DO FORO</h2>
            <p>Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer dúvidas ou litígios oriundos deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>
          </div>

          <p style={{ textAlign: 'center', margin: '20px 0 10px', fontSize: '11px' }}>
            {contract.clientCity || 'São Paulo'}/{contract.clientState || 'SP'}, {today}.
          </p>

          {/* Signature area */}
          <div className="signatures" style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', gap: '40px' }}>
            {/* CONTRATANTE (Cliente) */}
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

            {/* CONTRATADA (Empresa) */}
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
                    <p style={{ fontWeight: 700, fontSize: '11px' }}>Inforsol Energia Solar Ltda</p>
                    <p style={{ fontSize: '10px' }}>CONTRATADA</p>
                    <p style={{ fontSize: '10px' }}>CNPJ: 00.000.000/0001-00</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '30px', textAlign: 'center', borderTop: '1px solid #ddd', paddingTop: '10px', fontSize: '9px', color: '#888' }}>
            <p>Inforsol Energia Solar Ltda — CNPJ: 00.000.000/0001-00</p>
            <p>Tel: (11) 99999-9999 — contato@inforsol.com.br</p>
            <p>Este documento tem validade jurídica conforme Lei nº 14.063/2020</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
