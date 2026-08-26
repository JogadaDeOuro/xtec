import { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatNumber, type SystemType } from '@/lib/mock-data';
import { Printer, Download } from 'lucide-react';
import { getMilestones, EXTENDED_WARRANTY_YEARS, EXTENDED_WARRANTY_DESCRIPTION } from '@/lib/payment-options';

interface PaymentInfo {
  condicao: string;
  entradaValor: number;
  numParcelas: number;
  valorParcela: number;
  saldoAposEntrada: number;
  etapasPersonalizadas: { descricao: string; valor: number }[];
  garantiaEstendida?: boolean;
  garantiaValor?: number;
}

interface ProposalPDFProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientCity?: string;
  clientState?: string;
  clientEmail?: string;
  clientPhone?: string;
  systemType: SystemType;
  potencia: number;
  numPlacas: number;
  potenciaMin: number;
  potenciaMax: number;
  producao: number;
  valorBruto: number;
  valorFinal: number;
  desconto: number;
  tarifaKwh: number;
  economiaMensal: number;
  economiaAnual: number;
  paybackExato: number;
  economiaTotal20: number;
  payment: PaymentInfo;
}

export function ProposalPDF({
  open, onOpenChange,
  clientName, clientCity, clientState, clientEmail, clientPhone,
  systemType, potencia, numPlacas, potenciaMin, potenciaMax,
  producao, valorBruto, valorFinal, desconto, tarifaKwh,
  economiaMensal, economiaAnual, paybackExato, economiaTotal20,
  payment,
}: ProposalPDFProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html><head><title>Proposta - ${clientName}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.5; }
        .pdf-container { max-width: 210mm; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #2d7a4f 0%, #1b5e20 100%); color: white; padding: 32px; border-radius: 0 0 16px 16px; margin-bottom: 24px; }
        .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
        .header .subtitle { opacity: 0.85; font-size: 13px; }
        .header .date { opacity: 0.7; font-size: 12px; margin-top: 8px; }
        .client-box { background: rgba(255,255,255,0.15); border-radius: 10px; padding: 14px; margin-top: 16px; }
        .client-box .label { font-size: 11px; opacity: 0.7; }
        .client-box .name { font-size: 17px; font-weight: 600; }
        .client-box .detail { font-size: 12px; opacity: 0.8; }
        .section { margin-bottom: 20px; padding: 0 8px; }
        .section-title { font-size: 14px; font-weight: 700; color: #2d7a4f; border-bottom: 2px solid #e8f5e9; padding-bottom: 6px; margin-bottom: 12px; }
        .specs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .spec-card { background: #f8faf8; border: 1px solid #e8f5e9; border-radius: 8px; padding: 12px; }
        .spec-card .label { font-size: 11px; color: #666; }
        .spec-card .value { font-size: 15px; font-weight: 700; color: #1a1a1a; }
        .spec-card.full { grid-column: span 2; }
        .invest-box { background: #f1f8f3; border: 2px solid #c8e6c9; border-radius: 12px; padding: 16px; }
        .invest-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
        .invest-row.discount { color: #2e7d32; }
        .invest-row.total { font-size: 18px; font-weight: 800; color: #2d7a4f; border-top: 2px solid #c8e6c9; padding-top: 8px; margin-top: 8px; }
        .payment-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; }
        .economy-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .economy-card { background: #f8faf8; border-radius: 10px; padding: 14px; text-align: center; border: 1px solid #e8f5e9; }
        .economy-card .value { font-size: 17px; font-weight: 800; color: #2d7a4f; }
        .economy-card .label { font-size: 11px; color: #666; margin-top: 2px; }
        .guarantee { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 13px; color: #444; }
        .guarantee::before { content: '✓'; color: #2d7a4f; font-weight: 700; font-size: 14px; }
        .included { display: flex; align-items: flex-start; gap: 8px; padding: 4px 0; font-size: 12px; color: #555; }
        .included::before { content: '•'; color: #2d7a4f; font-weight: 700; }
        .footer { text-align: center; border-top: 1px solid #e0e0e0; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #999; }
        .company-info { text-align: center; margin-top: 8px; font-size: 11px; color: #777; }
        hr { border: none; border-top: 1px solid #e8f5e9; margin: 16px 0; }
      </style>
      </head><body>
      ${content.innerHTML}
      </body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  const renderPayment = () => {
    const { condicao, entradaValor, numParcelas, valorParcela, saldoAposEntrada, etapasPersonalizadas } = payment;
    if (!condicao) return null;
    if (condicao === 'avista') return <div className="payment-row"><span>À vista antecipado</span><span style={{ fontWeight: 700 }}>{formatCurrency(valorFinal)}</span></div>;
    const milestones = getMilestones(condicao);
    if (milestones) return (
      <div>
        {milestones.map(({ label, pct }) => (
          <div key={label} className="payment-row"><span>{label} ({pct}%)</span><span style={{ fontWeight: 600 }}>{formatCurrency(valorFinal * pct / 100)}</span></div>
        ))}
      </div>
    );
    if (condicao === 'entrada-saldo') return (
      <div>
        <div className="payment-row"><span>Entrada</span><span style={{ fontWeight: 600 }}>{formatCurrency(entradaValor)}</span></div>
        <div className="payment-row"><span>Saldo na entrega</span><span style={{ fontWeight: 600 }}>{formatCurrency(saldoAposEntrada)}</span></div>
      </div>
    );
    if (condicao === 'entrada-parcelas') return (
      <div>
        <div className="payment-row"><span>Entrada</span><span style={{ fontWeight: 600 }}>{formatCurrency(entradaValor)}</span></div>
        <div className="payment-row" style={{ color: '#2d7a4f', fontWeight: 700 }}><span>{numParcelas}x de</span><span>{formatCurrency(valorParcela)}</span></div>
      </div>
    );
    if (condicao === 'personalizada') return (
      <div>
        {etapasPersonalizadas.filter(e => e.descricao).map((e, i) => (
          <div key={i} className="payment-row"><span>{e.descricao}</span><span style={{ fontWeight: 600 }}>{formatCurrency(e.valor)}</span></div>
        ))}
      </div>
    );
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Proposta para Envio</span>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Gerar PDF / Imprimir
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Printable content */}
        <div ref={printRef}>
          <div className="pdf-container">
            {/* Header */}
            <div className="header">
              <div className="subtitle">PROPOSTA COMERCIAL</div>
              <h1>Sistema Fotovoltaico {systemType.toUpperCase()}</h1>
              <div className="date">{today}</div>
              {clientName && (
                <div className="client-box">
                  <div className="label">Preparado para</div>
                  <div className="name">{clientName}</div>
                  {clientCity && <div className="detail">{clientCity}{clientState ? ` / ${clientState}` : ''}</div>}
                  {clientEmail && <div className="detail">{clientEmail}</div>}
                  {clientPhone && <div className="detail">{clientPhone}</div>}
                </div>
              )}
            </div>

            {/* Apresentação */}
            <div className="section">
              <div className="section-title">Apresentação</div>
              <p style={{ fontSize: '13px', color: '#444', lineHeight: '1.6' }}>
                A Inforsol é uma empresa especializada em soluções de energia solar fotovoltaica, com anos de experiência no mercado e centenas de projetos entregues com excelência. Nossa missão é proporcionar economia e sustentabilidade por meio de energia limpa e renovável.
              </p>
            </div>

            <hr />

            {/* Specs */}
            <div className="section">
              <div className="section-title">Especificações do Sistema</div>
              <div className="specs-grid">
                <div className="spec-card"><div className="label">Tipo</div><div className="value">{systemType.toUpperCase()}</div></div>
                <div className="spec-card"><div className="label">Potência</div><div className="value">{potencia} kWp</div></div>
                <div className="spec-card"><div className="label">Módulos</div><div className="value">{numPlacas} placas (600–700 Wp)</div></div>
                <div className="spec-card"><div className="label">Faixa de potência</div><div className="value">{potenciaMin} – {potenciaMax} kWp</div></div>
                <div className="spec-card full"><div className="label">Produção estimada mensal</div><div className="value">{formatNumber(producao)} kWh/mês</div></div>
              </div>
            </div>

            <hr />

            {/* Investment */}
            <div className="section">
              <div className="section-title">Investimento</div>
              <div className="invest-box">
                <div className="invest-row"><span>Valor do sistema</span><span>{formatCurrency(valorBruto)}</span></div>
                {desconto > 0 && (
                  <div className="invest-row discount"><span>Desconto ({desconto}%)</span><span>-{formatCurrency(valorBruto - valorFinal)}</span></div>
                )}
                <div className="invest-row total"><span>Valor Final</span><span>{formatCurrency(valorFinal)}</span></div>
              </div>
            </div>

            {/* Payment */}
            {payment.condicao && (
              <>
                <hr />
                <div className="section">
                  <div className="section-title">Condição de Pagamento</div>
                  {renderPayment()}
                </div>
              </>
            )}

            {payment.garantiaEstendida && (
              <>
                <hr />
                <div className="section">
                  <div className="section-title">Garantia Estendida ({EXTENDED_WARRANTY_YEARS} anos)</div>
                  <p style={{ fontSize: '12px', marginBottom: '6px' }}>{EXTENDED_WARRANTY_DESCRIPTION}</p>
                  <div className="payment-row"><span>Serviço adicional (8% do contrato)</span><span style={{ fontWeight: 700 }}>{formatCurrency(payment.garantiaValor || 0)}</span></div>
                  <div className="payment-row"><span>Total geral</span><span style={{ fontWeight: 700 }}>{formatCurrency(valorFinal + (payment.garantiaValor || 0))}</span></div>
                </div>
              </>
            )}

            <hr />

            {/* Economy */}
            <div className="section">
              <div className="section-title">Retorno do Investimento</div>
              <div className="economy-grid">
                <div className="economy-card">
                  <div className="label">Economia mensal</div>
                  <div className="value">{formatCurrency(economiaMensal)}</div>
                </div>
                <div className="economy-card">
                  <div className="label">Payback estimado</div>
                  <div className="value">{paybackExato > 0 ? `${paybackExato} anos` : '—'}</div>
                </div>
                <div className="economy-card">
                  <div className="label">Economia em 20 anos</div>
                  <div className="value">{formatCurrency(economiaTotal20)}</div>
                </div>
              </div>
              <p style={{ fontSize: '11px', color: '#888', textAlign: 'center', marginTop: '8px' }}>
                *Considerando reajuste anual de 5% na tarifa de energia. Tarifa base: {formatCurrency(tarifaKwh)}/kWh.
              </p>
            </div>

            <hr />

            {/* Itens Inclusos */}
            <div className="section">
              <div className="section-title">Itens Inclusos</div>
              {['Módulos fotovoltaicos de alta performance', 'Inversor(es) com monitoramento Wi-Fi', 'Estrutura de fixação em alumínio', 'Cabeamento, conectores e proteções elétricas', 'Projeto elétrico completo', 'Instalação com equipe especializada', 'Comissionamento e testes', 'Solicitação de acesso junto à concessionária'].map((item, i) => (
                <div key={i} className="included">{item}</div>
              ))}
            </div>

            <hr />

            {/* Guarantees */}
            <div className="section">
              <div className="section-title">Garantias</div>
              {['Módulos fotovoltaicos: 25 anos de garantia de performance', 'Inversor: 10 a 15 anos de garantia do fabricante', 'Instalação: 5 anos de garantia de serviço', 'Monitoramento remoto do sistema incluso', 'Suporte técnico dedicado'].map((g, i) => (
                <div key={i} className="guarantee">{g}</div>
              ))}
            </div>

            <hr />

            {/* Obs */}
            <div className="section">
              <div className="section-title">Observações Técnicas</div>
              <p style={{ fontSize: '12px', color: '#555', lineHeight: '1.6' }}>
                O dimensionamento foi realizado com base no consumo médio informado e condições de irradiação solar da região. A produção real pode variar de acordo com condições climáticas, orientação e inclinação do telhado. Proposta válida por 15 dias. Valores sujeitos à confirmação após vistoria técnica.
              </p>
            </div>

            {/* Footer */}
            <div className="footer">
              <p>Proposta válida por 15 dias • Valores sujeitos à vistoria técnica</p>
              <div className="company-info">
                <p><strong>Inforsol Energia Solar</strong></p>
                <p>contato@inforsol.com.br • (11) 3456-7890</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
