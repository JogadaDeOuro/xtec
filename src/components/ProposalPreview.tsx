import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatNumber, type SystemType } from '@/lib/mock-data';
import { Zap, Sun, TrendingUp, DollarSign, Clock, Shield, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
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


interface ProposalPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientCity?: string;
  clientState?: string;
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
  paybackAno: number | null;
  economiaTotal30: number;
  payment: PaymentInfo;
}

export function ProposalPreview({
  open, onOpenChange,
  clientName, clientCity, clientState,
  systemType, potencia, numPlacas, potenciaMin, potenciaMax,
  producao, valorBruto, valorFinal, desconto, tarifaKwh,
  economiaMensal, economiaAnual, paybackExato, paybackAno, economiaTotal30,
  payment,
}: ProposalPreviewProps) {
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const renderPayment = () => {
    const { condicao, entradaValor, numParcelas, valorParcela, saldoAposEntrada, etapasPersonalizadas } = payment;
    if (!condicao) return <p className="text-sm text-muted-foreground">Não definida</p>;

    if (condicao === 'avista') return <p className="text-sm font-medium">À vista antecipado</p>;

    const milestones = getMilestones(condicao);
    if (milestones) return (
      <div className="space-y-1.5">
        {milestones.map(({ label, pct }) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{pct}% — {label}</span>
            <span className="font-medium">{formatCurrency(valorFinal * pct / 100)}</span>
          </div>
        ))}
      </div>
    );


    if (condicao === 'entrada-saldo') return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Entrada</span>
          <span className="font-medium">{formatCurrency(entradaValor)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Saldo na entrega</span>
          <span className="font-medium">{formatCurrency(saldoAposEntrada)}</span>
        </div>
      </div>
    );

    if (condicao === 'entrada-parcelas') return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Entrada</span>
          <span className="font-medium">{formatCurrency(entradaValor)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold text-primary">
          <span>{numParcelas}x de</span>
          <span>{formatCurrency(valorParcela)}</span>
        </div>
      </div>
    );

    if (condicao === 'personalizada') return (
      <div className="space-y-1.5">
        {etapasPersonalizadas.filter(e => e.descricao).map((e, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{e.descricao}</span>
            <span className="font-medium">{formatCurrency(e.valor)}</span>
          </div>
        ))}
      </div>
    );

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-8 rounded-t-lg">
          <div className="flex items-center gap-2 mb-1">
            <Sun className="h-6 w-6" />
            <span className="text-sm font-medium opacity-80">PROPOSTA COMERCIAL</span>
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary-foreground">
              Sistema Fotovoltaico {systemType.toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm opacity-80 mt-2">{today}</p>
          {clientName && (
            <div className="mt-4 bg-primary-foreground/10 rounded-lg p-3">
              <p className="text-xs opacity-70">Preparado para</p>
              <p className="text-lg font-semibold">{clientName}</p>
              {clientCity && <p className="text-sm opacity-80">{clientCity}{clientState ? ` / ${clientState}` : ''}</p>}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* System specs */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-primary" /> Especificações do Sistema
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="text-sm font-semibold">{systemType.toUpperCase()}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Potência</p>
                <p className="text-sm font-semibold">{potencia} kWp</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Módulos</p>
                <p className="text-sm font-semibold">{numPlacas} placas</p>
                <p className="text-[10px] text-muted-foreground">600–700 Wp cada</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Faixa de potência</p>
                <p className="text-sm font-semibold">{potenciaMin} – {potenciaMax} kWp</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 col-span-2">
                <p className="text-xs text-muted-foreground">Produção estimada</p>
                <p className="text-sm font-semibold">{formatNumber(producao)} kWh/mês</p>
              </div>
            </div>
          </motion.div>

          <Separator />

          {/* Investment */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-primary" /> Investimento
            </h3>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor do sistema</span>
                <span>{formatCurrency(valorBruto)}</span>
              </div>
              {desconto > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Desconto ({desconto}%)</span>
                  <span>-{formatCurrency(valorBruto - valorFinal)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-medium">Valor Final</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(valorFinal)}</span>
              </div>
            </div>
          </motion.div>

          {/* Payment */}
          {payment.condicao && (
            <>
              <Separator />
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <h3 className="text-sm font-semibold text-foreground mb-3">Condição de Pagamento</h3>
                {renderPayment()}
              </motion.div>
            </>
          )}

          {payment.garantiaEstendida && (
            <>
              <Separator />
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27 }}>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-primary" /> Garantia Estendida ({EXTENDED_WARRANTY_YEARS} anos)
                </h3>
                <p className="text-xs text-muted-foreground mb-2">{EXTENDED_WARRANTY_DESCRIPTION}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Serviço adicional (8% do contrato)</span>
                  <span className="font-semibold text-primary">{formatCurrency(payment.garantiaValor || 0)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="font-medium">Total geral</span>
                  <span className="font-bold text-primary">{formatCurrency(valorFinal + (payment.garantiaValor || 0))}</span>
                </div>
              </motion.div>
            </>
          )}

          <Separator />


          {/* Economy */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" /> Retorno do Investimento
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-success/10 p-4 text-center">
                <DollarSign className="h-5 w-5 mx-auto text-success mb-1" />
                <p className="text-xs text-muted-foreground">Economia/mês</p>
                <p className="text-lg font-bold text-success">{formatCurrency(economiaMensal)}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-4 text-center">
                <Clock className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">Payback</p>
                <p className="text-lg font-bold text-primary">{paybackExato > 0 ? `${paybackExato} anos` : '—'}</p>
              </div>
              <div className="rounded-lg bg-accent p-4 text-center">
                <TrendingUp className="h-5 w-5 mx-auto text-accent-foreground mb-1" />
                <p className="text-xs text-muted-foreground">20 anos</p>
                <p className="text-lg font-bold">{formatCurrency(economiaTotal30)}</p>
              </div>
            </div>
          </motion.div>

          <Separator />

          {/* Guarantees */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-primary" /> Garantias
            </h3>
            <div className="space-y-2">
              {[
                'Módulos fotovoltaicos: 25 anos de garantia de performance',
                'Inversor: 10 a 15 anos de garantia',
                'Instalação: 5 anos de garantia de serviço',
                'Monitoramento remoto incluso',
              ].map((g, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>{g}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Footer */}
          <div className="text-center pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Proposta válida por 15 dias • Valores sujeitos à vistoria técnica
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tarifa de energia considerada: {formatCurrency(tarifaKwh)}/kWh (reajuste anual estimado de 5%)
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
