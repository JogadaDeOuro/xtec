import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Sun, Shield, CheckCircle2, FileSignature, MapPin, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchPublicProposal, type ProposalRecord } from '@/lib/proposals';
import { formatCurrency, formatNumber } from '@/lib/mock-data';
import { formatCpfCnpj, isValidCpfCnpj } from '@/lib/utils';
import {
  getMilestones, EXTENDED_WARRANTY_YEARS, EXTENDED_WARRANTY_DESCRIPTION,
  STANDARD_WARRANTY_DESCRIPTION, calcExtendedWarranty,
} from '@/lib/payment-options';

interface AcceptResult {
  error?: string;
  contract_id?: string;
  signing_token?: string;
  tracking_token?: string | null;
  garantia_estendida_valor?: number;
}

const errorMessages: Record<string, string> = {
  not_found: 'Proposta não encontrada.',
  invalid_document: 'CPF ou CNPJ inválido.',
  document_mismatch: 'O CPF/CNPJ informado não corresponde ao cadastro desta proposta.',
};

export default function AceiteProposta() {
  const { token } = useParams<{ token: string }>();
  const [proposal, setProposal] = useState<ProposalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [documento, setDocumento] = useState('');
  const [garantia, setGarantia] = useState(false);
  const [condicaoEscolhida, setCondicaoEscolhida] = useState('');
  const [aceite, setAceite] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AcceptResult | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = token ? await fetchPublicProposal(token) : null;
        if (active) {
          setProposal(p);
          if (p) { setGarantia(p.garantiaEstendida); setCondicaoEscolhida(p.condicaoPagamento || ''); }
        }
      } catch {
        if (active) setProposal(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setSaving(true);
    const { data, error } = await (supabase as any).rpc('accept_proposal_public', {
      _token: token,
      _document: documento.replace(/\D/g, ''),
      _garantia: garantia,
      _condicao: condicaoEscolhida || null,
    });
    setSaving(false);
    setConfirmOpen(false);
    if (error) { toast.error('Não foi possível registrar o aceite'); return; }
    const res = data as AcceptResult;
    if (res?.error) { toast.error(errorMessages[res.error] ?? 'Não foi possível registrar o aceite'); return; }
    setResult(res);
    toast.success('Proposta aceita! Contrato gerado para assinatura.');
  };

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
        <AlertTriangle className="h-10 w-10 text-muted-foreground opacity-40" />
        <h1 className="text-xl font-semibold">Proposta não encontrada</h1>
        <p className="text-sm text-muted-foreground">O link pode estar incorreto ou a proposta foi removida.</p>
      </div>
    );
  }

  const garantiaValor = garantia ? calcExtendedWarranty(proposal.valorSistema) : 0;
  const totalGeral = proposal.valorSistema + garantiaValor;
  const opcoesPagamento = [proposal.condicaoPagamento, ...(proposal.condicoesAlternativas ?? [])]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);
  const milestones = getMilestones(mapCondicaoFromLabel(condicaoEscolhida || proposal.condicaoPagamento));
  const docOk = isValidCpfCnpj(documento);

  if (result) {
    const signUrl = `${window.location.origin}/assinar/${result.signing_token}`;
    const trackUrl = result.tracking_token ? `${window.location.origin}/acompanhamento/${result.tracking_token}` : null;
    return (
      <div className="min-h-screen bg-muted/30 py-10 px-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl space-y-4">
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
              <h1 className="text-xl font-bold">Proposta aceita com sucesso!</h1>
              <p className="text-sm text-muted-foreground">
                Seu contrato foi gerado automaticamente. Leia com atenção e assine digitalmente para dar início ao projeto.
              </p>
              <Button className="w-full gap-2" onClick={() => { window.location.href = signUrl; }}>
                <FileSignature className="h-4 w-4" /> Ler e assinar o contrato
              </Button>
              {trackUrl && (
                <div className="pt-4 border-t border-border text-left space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> Acompanhamento da obra
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Guarde este link para acompanhar cada etapa da instalação:
                  </p>
                  <code className="block text-[11px] break-all rounded-md bg-muted p-2">{trackUrl}</code>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl space-y-4">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-8">
            <div className="flex items-center gap-2 mb-1">
              <Sun className="h-6 w-6" />
              <span className="text-sm font-medium opacity-80">ACEITE DA PROPOSTA</span>
            </div>
            <h1 className="text-2xl font-bold">Sistema Fotovoltaico {proposal.systemType.toUpperCase()}</h1>
            <p className="text-sm opacity-80 mt-1">{proposal.numero} · {proposal.clientName}</p>
          </div>

          <CardContent className="p-6 space-y-6">
            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Potência</p>
                <p className="text-sm font-semibold">{proposal.potenciaKwp} kWp</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Produção estimada</p>
                <p className="text-sm font-semibold">{formatNumber(proposal.producaoEstimada)} kWh/mês</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Economia mensal</p>
                <p className="text-sm font-semibold text-success">{formatCurrency(proposal.economiaMensal)}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Payback</p>
                <p className="text-sm font-semibold">{proposal.paybackAnos > 0 ? `${proposal.paybackAnos} anos` : '—'}</p>
              </div>
            </section>

            {(milestones || opcoesPagamento.length > 1) && (
              <>
                <Separator />
                <section>
                  <h2 className="text-sm font-semibold mb-3">Condição de pagamento</h2>
                  {opcoesPagamento.length > 1 && (
                    <div className="mb-3 space-y-2">
                      <p className="text-xs text-muted-foreground">Escolha a forma de pagamento desejada:</p>
                      {opcoesPagamento.map(op => (
                        <label
                          key={op}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                            condicaoEscolhida === op ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                        >
                          <input
                            type="radio"
                            name="condicao"
                            className="accent-primary"
                            checked={condicaoEscolhida === op}
                            onChange={() => setCondicaoEscolhida(op)}
                          />
                          <span>{op}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {(milestones ?? []).map(({ label, pct }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{pct}% — {label}</span>
                        <span className="font-medium">{formatCurrency(proposal.valorSistema * pct / 100)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            <Separator />

            <section className="space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Garantia da instalação
              </h2>
              <p className="text-xs text-muted-foreground">{STANDARD_WARRANTY_DESCRIPTION}</p>
              <div className="flex items-start justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div>
                  <p className="text-sm font-medium">Garantia estendida (+{EXTENDED_WARRANTY_YEARS} anos)</p>
                  <p className="text-xs text-muted-foreground mt-1">{EXTENDED_WARRANTY_DESCRIPTION}</p>
                  <p className="text-xs font-medium text-primary mt-2">
                    + {formatCurrency(calcExtendedWarranty(proposal.valorSistema))} (8% do contrato)
                  </p>
                </div>
                <Switch checked={garantia} onCheckedChange={setGarantia} />
              </div>
            </section>

            <Separator />

            <section className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sistema fotovoltaico</span>
                <span className="font-medium">{formatCurrency(proposal.valorSistema)}</span>
              </div>
              {garantia && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Garantia estendida</span>
                  <span className="font-medium">{formatCurrency(garantiaValor)}</span>
                </div>
              )}
              <div className="flex justify-between items-center rounded-xl border border-primary/20 bg-primary/5 p-4">
                <span className="font-medium">Total geral</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(totalGeral)}</span>
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Confirme o aceite</h2>
              <div className="space-y-1.5">
                <Label htmlFor="doc">CPF ou CNPJ do titular</Label>
                <Input
                  id="doc"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={documento}
                  onChange={(e) => setDocumento(formatCpfCnpj(e.target.value))}
                />
                {documento.length > 0 && !docOk && (
                  <p className="text-xs text-destructive">Informe um CPF ou CNPJ válido.</p>
                )}
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="aceite" checked={aceite} onCheckedChange={(v) => setAceite(v === true)} />
                <Label htmlFor="aceite" className="text-xs font-normal leading-relaxed text-muted-foreground">
                  Li e concordo com as condições técnicas, comerciais e de pagamento desta proposta.
                </Label>
              </div>
              <Button
                className="w-full gap-2"
                disabled={!docOk || !aceite}
                onClick={() => setConfirmOpen(true)}
              >
                <CheckCircle2 className="h-4 w-4" /> Aceitar proposta
              </Button>
            </section>
          </CardContent>
        </Card>
      </motion.div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar aceite da proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao aceitar, o contrato será gerado imediatamente com o valor total de{' '}
              <strong>{formatCurrency(totalGeral)}</strong>
              {garantia ? ' (com garantia estendida)' : ' (garantia padrão de 1 ano)'} e você será direcionado
              para ler e assinar digitalmente. Após a assinatura, você receberá o link de acompanhamento da obra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Revisar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleAccept(); }} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar e gerar contrato'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
