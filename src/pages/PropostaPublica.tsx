import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Sun, Zap, DollarSign, TrendingUp, Clock, Shield, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { fetchPublicProposal, type ProposalRecord } from '@/lib/proposals';
import { formatCurrency, formatNumber } from '@/lib/mock-data';
import { getMilestones, EXTENDED_WARRANTY_YEARS, EXTENDED_WARRANTY_DESCRIPTION } from '@/lib/payment-options';

export default function PropostaPublica() {
  const { token } = useParams<{ token: string }>();
  const [proposal, setProposal] = useState<ProposalRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = token ? await fetchPublicProposal(token) : null;
        if (active) setProposal(p);
      } catch {
        if (active) setProposal(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Sun className="h-10 w-10 text-muted-foreground opacity-40" />
        <h1 className="text-xl font-semibold">Proposta não encontrada</h1>
        <p className="text-sm text-muted-foreground">O link pode estar incorreto ou a proposta foi removida.</p>
      </div>
    );
  }

  const milestones = getMilestones(proposal.condicaoPagamento);
  const totalGeral = proposal.valorSistema + (proposal.garantiaEstendidaValor || 0);

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-8">
            <div className="flex items-center gap-2 mb-1">
              <Sun className="h-6 w-6" />
              <span className="text-sm font-medium opacity-80">PROPOSTA COMERCIAL</span>
            </div>
            <h1 className="text-2xl font-bold">Sistema Fotovoltaico {proposal.systemType.toUpperCase()}</h1>
            <p className="text-sm opacity-80 mt-1">{proposal.numero} · {proposal.createdAt}</p>
            <div className="mt-4 bg-primary-foreground/10 rounded-lg p-3">
              <p className="text-xs opacity-70">Preparado para</p>
              <p className="text-lg font-semibold">{proposal.clientName}</p>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            <section>
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-primary" /> Especificações do Sistema
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Potência</p>
                  <p className="text-sm font-semibold">{proposal.potenciaKwp} kWp</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Produção estimada</p>
                  <p className="text-sm font-semibold">{formatNumber(proposal.producaoEstimada)} kWh/mês</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 col-span-2">
                  <p className="text-xs text-muted-foreground">Consumo médio informado</p>
                  <p className="text-sm font-semibold">{formatNumber(proposal.consumoMedio)} kWh/mês</p>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-primary" /> Investimento
              </h2>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex justify-between items-center">
                <span className="font-medium">Valor Final</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(proposal.valorSistema)}</span>
              </div>
            </section>

            {milestones && (
              <>
                <Separator />
                <section>
                  <h2 className="text-sm font-semibold mb-3">Condição de Pagamento</h2>
                  <div className="space-y-1.5">
                    {milestones.map(({ label, pct }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{pct}% — {label}</span>
                        <span className="font-medium">{formatCurrency(proposal.valorSistema * pct / 100)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {proposal.garantiaEstendida && (
              <>
                <Separator />
                <section>
                  <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-primary" /> Garantia Estendida ({EXTENDED_WARRANTY_YEARS} anos)
                  </h2>
                  <p className="text-xs text-muted-foreground mb-2">{EXTENDED_WARRANTY_DESCRIPTION}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Serviço adicional (8% do contrato)</span>
                    <span className="font-semibold text-primary">{formatCurrency(proposal.garantiaEstendidaValor)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="font-medium">Total geral</span>
                    <span className="font-bold text-primary">{formatCurrency(totalGeral)}</span>
                  </div>
                </section>
              </>
            )}

            <Separator />

            <section>
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" /> Retorno do Investimento
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-success/10 p-4 text-center">
                  <DollarSign className="h-5 w-5 mx-auto text-success mb-1" />
                  <p className="text-xs text-muted-foreground">{proposal.finalidade === 'investimento' ? 'Ganho/mês' : 'Economia/mês'}</p>
                  <p className="text-base font-bold text-success">{formatCurrency(proposal.economiaMensal)}</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-4 text-center">
                  <Clock className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-xs text-muted-foreground">Payback</p>
                  <p className="text-base font-bold text-primary">{proposal.paybackAnos > 0 ? `${proposal.paybackAnos} anos` : '—'}</p>
                </div>
                <div className="rounded-lg bg-accent p-4 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto text-accent-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">{proposal.finalidade === 'investimento' ? 'Ganho/ano' : 'Economia/ano'}</p>
                  <p className="text-base font-bold">{formatCurrency(proposal.economiaAnual)}</p>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-primary" /> Garantias
              </h2>
              <div className="space-y-2">
                {[
                  'Módulos fotovoltaicos: 25 anos de garantia de performance',
                  'Inversor: 10 a 15 anos de garantia',
                  'Instalação: 5 anos de garantia de serviço',
                  'Monitoramento remoto incluso',
                ].map((g) => (
                  <div key={g} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <span>{g}</span>
                  </div>
                ))}
              </div>
            </section>

            <p className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
              Proposta válida por 15 dias • Valores sujeitos à vistoria técnica
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
