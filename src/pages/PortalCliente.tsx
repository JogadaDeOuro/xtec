import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Sun, FileText, FileSignature, MapPin, CheckCircle2, Circle, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/mock-data';
import { formatCpfCnpj, isValidCpfCnpj } from '@/lib/utils';

interface PortalProposal {
  id: string; numero: string | null; public_token: string; status: string;
  system_type: string; potencia_kwp: number; valor_sistema: number;
  garantia_estendida: boolean; garantia_estendida_valor: number; created_at: string;
}
interface PortalContract {
  id: string; status: string; valor: number; signing_token: string | null;
  signed_at: string | null; created_at: string; signatures: string[];
}
interface PortalStage {
  name: string; status: string; position: number;
  data_prevista: string | null; data_real: string | null; observacoes: string | null;
}
interface PortalData {
  error?: string;
  client?: { id: string; name: string; city: string | null; state: string | null };
  proposals?: PortalProposal[];
  contracts?: PortalContract[];
  tracking_token?: string | null;
  stages?: PortalStage[];
}

const statusIcon: Record<string, typeof CheckCircle2> = {
  concluido: CheckCircle2, em_andamento: Clock, pendente: Circle,
};

const dateBR = (v: string) => new Date(v).toLocaleDateString('pt-BR');

export default function PortalCliente() {
  const [documento, setDocumento] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PortalData | null>(null);

  const buscar = async () => {
    setLoading(true);
    const { data: res, error } = await (supabase as any).rpc('get_client_portal', {
      _document: documento.replace(/\D/g, ''),
    });
    setLoading(false);
    if (error) { toast.error('Não foi possível consultar seus dados'); return; }
    const payload = res as PortalData;
    if (payload?.error === 'not_found') {
      toast.error('Nenhum cadastro encontrado para este CPF/CNPJ');
      setData(null);
      return;
    }
    if (payload?.error) { toast.error('CPF ou CNPJ inválido'); return; }
    setData(payload);
  };

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl space-y-4">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-8">
            <div className="flex items-center gap-2 mb-1">
              <Sun className="h-6 w-6" />
              <span className="text-sm font-medium opacity-80">PORTAL DO CLIENTE</span>
            </div>
            <h1 className="text-2xl font-bold">Acompanhe seu projeto solar</h1>
            <p className="text-sm opacity-80 mt-1">Propostas, contratos e o andamento da sua obra em um só lugar.</p>
          </div>
          <CardContent className="p-6 space-y-3">
            <Label htmlFor="doc">CPF ou CNPJ</Label>
            <div className="flex gap-2">
              <Input
                id="doc"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={documento}
                onChange={(e) => setDocumento(formatCpfCnpj(e.target.value))}
                onKeyDown={(e) => { if (e.key === 'Enter' && isValidCpfCnpj(documento)) buscar(); }}
              />
              <Button onClick={buscar} disabled={!isValidCpfCnpj(documento) || loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Acessar
              </Button>
            </div>
          </CardContent>
        </Card>

        {data?.client && (
          <>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="text-lg font-semibold">{data.client.name}</p>
                  {data.client.city && (
                    <p className="text-xs text-muted-foreground">{data.client.city} / {data.client.state}</p>
                  )}
                </div>

                <Separator />

                <section className="space-y-2">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Propostas
                  </h2>
                  {(data.proposals ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhuma proposta disponível.</p>
                  )}
                  {(data.proposals ?? []).map((p) => (
                    <div key={p.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{p.numero || 'Proposta'} · {p.potencia_kwp} kWp</p>
                        <p className="text-xs text-muted-foreground">
                          {dateBR(p.created_at)} · {formatCurrency(Number(p.valor_sistema))}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{p.status}</Badge>
                        <Button size="sm" variant="outline" asChild>
                          <a href={`/proposta/${p.public_token}`}>Ver</a>
                        </Button>
                        {p.status !== 'aceita' && (
                          <Button size="sm" asChild>
                            <a href={`/aceite/${p.public_token}`}>Aceitar</a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </section>

                <Separator />

                <section className="space-y-2">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <FileSignature className="h-4 w-4 text-primary" /> Contratos
                  </h2>
                  {(data.contracts ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum contrato gerado.</p>
                  )}
                  {(data.contracts ?? []).map((c) => {
                    const jaAssinou = (c.signatures ?? []).includes('cliente');
                    return (
                      <div key={c.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{formatCurrency(Number(c.valor))}</p>
                          <p className="text-xs text-muted-foreground">
                            {dateBR(c.created_at)} · {(c.signatures ?? []).length}/2 assinaturas
                          </p>
                        </div>
                        {c.signed_at || jaAssinou ? (
                          <Badge className="bg-success text-success-foreground text-[10px]">Assinado</Badge>
                        ) : c.signing_token ? (
                          <Button size="sm" asChild>
                            <a href={`/assinar/${c.signing_token}`}>Assinar</a>
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Em preparação</Badge>
                        )}
                      </div>
                    );
                  })}
                </section>

                {(data.stages ?? []).length > 0 && (
                  <>
                    <Separator />
                    <section className="space-y-2">
                      <h2 className="text-sm font-semibold flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" /> Andamento da obra
                      </h2>
                      <div className="space-y-2">
                        {(data.stages ?? []).map((s) => {
                          const Icon = statusIcon[s.status] ?? Circle;
                          return (
                            <div key={s.position} className="flex items-start gap-2 text-sm">
                              <Icon className={
                                s.status === 'concluido' ? 'h-4 w-4 text-success mt-0.5'
                                  : s.status === 'em_andamento' ? 'h-4 w-4 text-warning mt-0.5'
                                    : 'h-4 w-4 text-muted-foreground mt-0.5'
                              } />
                              <div>
                                <p className={s.status === 'concluido' ? 'font-medium' : ''}>{s.name}</p>
                                {(s.data_real || s.data_prevista) && (
                                  <p className="text-xs text-muted-foreground">
                                    {s.data_real ? `Concluído em ${dateBR(s.data_real)}` : `Previsto para ${dateBR(s.data_prevista!)}`}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {data.tracking_token && (
                        <p className="text-xs text-muted-foreground pt-2">
                          Link direto:{' '}
                          <a className="underline" href={`/acompanhamento/${data.tracking_token}`}>
                            acompanhamento completo com fotos
                          </a>
                        </p>
                      )}
                    </section>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </motion.div>
    </div>
  );
}
