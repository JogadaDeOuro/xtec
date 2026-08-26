import { useState, useEffect, useCallback } from 'react';
import { Search, FileSignature, Download, Trash2, Eye, Link2, PenLine, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/mock-data';
import { cn, formatCpfCnpj, isValidCpfCnpj } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ContractPDF } from '@/components/ContractPDF';
import { SignatureStylePicker } from '@/components/SignatureStylePicker';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

// DB types
interface ContractSignatureDB {
  id: string;
  contract_id: string;
  signer_type: 'empresa' | 'cliente';
  name: string;
  document: string;
  email: string | null;
  signed_at: string;
  ip: string | null;
  location: string | null;
  user_agent: string | null;
  hash: string;
  signature_font: string | null;
}

interface ContractDB {
  id: string;
  proposal_id: string | null;
  client_id: string | null;
  client_name: string;
  client_document: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  client_city: string | null;
  client_state: string | null;
  system_type: string;
  potencia_kwp: number;
  valor: number;
  condicao_pagamento: string | null;
  garantia_estendida?: boolean | null;
  garantia_estendida_valor?: number | null;
  status: string;
  signing_token: string | null;
  signed_at: string | null;
  created_at: string;
  contract_signatures: ContractSignatureDB[];
}

const contractStatusLabels: Record<string, string> = {
  rascunho: 'Rascunho', enviado: 'Enviado', assinado: 'Assinado', cancelado: 'Cancelado', aguardando_assinaturas: 'Aguardando Assinaturas',
};
const contractStatusColors: Record<string, string> = {
  rascunho: 'bg-muted text-muted-foreground',
  enviado: 'bg-info text-info-foreground',
  assinado: 'bg-success text-success-foreground',
  cancelado: 'bg-destructive text-destructive-foreground',
  aguardando_assinaturas: 'bg-warning text-warning-foreground',
};

function getSignatureCount(sigs: ContractSignatureDB[]): { empresa: boolean; cliente: boolean; count: number } {
  const empresa = sigs.some(s => s.signer_type === 'empresa');
  const cliente = sigs.some(s => s.signer_type === 'cliente');
  return { empresa, cliente, count: (empresa ? 1 : 0) + (cliente ? 1 : 0) };
}

function getDisplayStatus(contract: ContractDB): string {
  if (contract.status === 'assinado') return 'assinado';
  const { count } = getSignatureCount(contract.contract_signatures);
  if (count > 0 && count < 2) return 'aguardando_assinaturas';
  return contract.status;
}

async function sendNotification(type: string, contractId: string, contractName: string, signerName: string, signerEmail: string, signerType: string) {
  try {
    await supabase.functions.invoke('send-contract-notification', {
      body: { type, contractId, contractName, signerName, signerEmail, signerType },
    });
  } catch (e) {
    console.error('Notification error:', e);
  }
}

export default function Contratos() {
  const [search, setSearch] = useState('');
  const [contracts, setContracts] = useState<ContractDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<ContractDB | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfWithSignatures, setPdfWithSignatures] = useState(false);
  const { isAdmin } = useAuth();

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  // Internal signing state
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signContractId, setSignContractId] = useState<string | null>(null);
  const [signName, setSignName] = useState('');
  const [signDocument, setSignDocument] = useState('');
  const [signEmail, setSignEmail] = useState('');
  const [signAccepted, setSignAccepted] = useState(false);
  const [signFont, setSignFont] = useState('');
  const [signing, setSigning] = useState(false);

  const fetchContracts = useCallback(async () => {
    const { data, error } = await supabase
      .from('contracts')
      .select('*, contract_signatures(*)')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setContracts(data as unknown as ContractDB[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  // Keep selectedContract in sync after fetch
  useEffect(() => {
    if (selectedContract) {
      const updated = contracts.find(c => c.id === selectedContract.id);
      if (updated) setSelectedContract(updated);
    }
  }, [contracts]);

  const filtered = contracts.filter(c =>
    c.client_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    setContracts(prev => prev.filter(c => c.id !== id));
    toast.success('Contrato excluído');
  };

  const handleSendForSignature = async (contract: ContractDB) => {
    const token = crypto.randomUUID().slice(0, 12);
    const { error } = await supabase.from('contracts').update({
      signing_token: token,
      status: contract.contract_signatures.length > 0 ? contract.status : 'enviado',
    }).eq('id', contract.id);
    if (error) { toast.error('Erro ao gerar link'); return; }
    await fetchContracts();
    const url = `${window.location.origin}/assinar/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link de assinatura copiado!', { description: url });
  };

  const openPreview = (contract: ContractDB) => {
    setSelectedContract(contract);
    setPreviewOpen(true);
  };

  const openPdf = (contract: ContractDB, withSignatures: boolean) => {
    setSelectedContract(contract);
    setPdfWithSignatures(withSignatures);
    setPdfOpen(true);
  };

  const openInternalSign = (contract: ContractDB) => {
    setSignContractId(contract.id);
    setSignName('');
    setSignDocument('');
    setSignEmail('');
    setSignAccepted(false);
    setSignFont('');
    setPreviewOpen(false);
    setSignDialogOpen(true);
  };

  const handleInternalSign = async () => {
    if (!signContractId) return;
    if (!signName.trim() || !signDocument.trim()) { toast.error('Preencha nome e CPF/CNPJ'); return; }
    if (!signEmail.trim() || !signEmail.includes('@')) { toast.error('Informe um e-mail válido'); return; }
    if (!signAccepted) { toast.error('Você precisa aceitar os termos'); return; }
    if (!signFont) { toast.error('Escolha um estilo de assinatura'); return; }

    setSigning(true);
    const now = new Date();
    const rawData = `${signContractId}-${signName}-${signDocument}-${signEmail}-internal-${now.toISOString()}`;
    const generatedHash = btoa(rawData).slice(0, 20).toUpperCase();

    // Insert signature
    const { error: sigError } = await supabase.from('contract_signatures').insert({
      contract_id: signContractId,
      signer_type: 'empresa',
      name: signName.trim(),
      document: signDocument.trim(),
      email: signEmail.trim(),
      signed_at: now.toISOString(),
      ip: 'Assinatura interna',
      location: 'Plataforma Inforsol',
      user_agent: navigator.userAgent,
      hash: generatedHash,
      signature_font: signFont,
    });

    if (sigError) {
      setSigning(false);
      if (sigError.code === '23505') {
        toast.error('Esta parte já assinou este contrato');
      } else {
        toast.error('Erro ao registrar assinatura: ' + sigError.message);
      }
      return;
    }

    // Check if both signatures now exist
    const { data: sigs } = await supabase
      .from('contract_signatures')
      .select('signer_type')
      .eq('contract_id', signContractId);

    const hasEmpresa = sigs?.some(s => s.signer_type === 'empresa');
    const hasCliente = sigs?.some(s => s.signer_type === 'cliente');
    const newStatus = hasEmpresa && hasCliente ? 'assinado' : 'enviado';

    await supabase.from('contracts').update({
      status: newStatus,
      ...(newStatus === 'assinado' ? { signed_at: now.toISOString() } : {}),
    }).eq('id', signContractId);

    setSigning(false);
    setSignDialogOpen(false);
    await fetchContracts();

    toast.success('Assinatura registrada com sucesso!', { description: `Hash: ${generatedHash}` });

    const contract = contracts.find(c => c.id === signContractId);
    await sendNotification(
      newStatus === 'assinado' ? 'fully_signed' : 'company_signed',
      signContractId,
      contract?.client_name || '',
      signName.trim(),
      signEmail.trim(),
      'empresa'
    );
  };

  // Adapter to convert DB contract to the format ContractPDF expects
  const toPdfContract = (c: ContractDB) => ({
    id: c.id,
    proposalId: c.proposal_id || '',
    clientId: c.client_id || '',
    clientName: c.client_name,
    clientDocument: c.client_document,
    clientEmail: c.client_email,
    clientPhone: c.client_phone,
    clientAddress: c.client_address,
    clientCity: c.client_city,
    clientState: c.client_state,
    systemType: c.system_type as any,
    potenciaKwp: c.potencia_kwp,
    valor: c.valor,
    condicaoPagamento: c.condicao_pagamento || '',
    garantiaEstendida: c.garantia_estendida || false,
    garantiaEstendidaValor: Number(c.garantia_estendida_valor || 0),
    status: c.status as any,
    createdAt: c.created_at,
    signedAt: c.signed_at || undefined,
    signingToken: c.signing_token || undefined,
    signatures: c.contract_signatures.map(s => ({
      name: s.name,
      document: s.document,
      email: s.email || undefined,
      signedAt: s.signed_at,
      ip: s.ip || '',
      location: s.location || undefined,
      userAgent: s.user_agent || undefined,
      hash: s.hash,
      signatureFont: s.signature_font || undefined,
      signerType: s.signer_type as 'empresa' | 'cliente',
    })),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Contratos</h1>
          <p className="text-sm text-muted-foreground">{contracts.length} contratos</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar contrato..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-3">
        {filtered.map(c => {
          const { count } = getSignatureCount(c.contract_signatures);
          const displayStatus = getDisplayStatus(c);
          return (
            <Card key={c.id} className="hover:shadow-md transition-shadow animate-fade-in cursor-pointer" onClick={() => openPreview(c)}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileSignature className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{c.client_name}</p>
                        <Badge className={cn('text-[10px]', contractStatusColors[displayStatus])}>
                          {contractStatusLabels[displayStatus]}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {count}/2 assinaturas
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {c.system_type.toUpperCase()} · {c.potencia_kwp} kWp · {c.condicao_pagamento}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(c.valor)}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.signed_at ? `Assinado em ${new Date(c.signed_at).toLocaleDateString('pt-BR')}` : 'Pendente assinatura'}
                      </p>
                    </div>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openPreview(c)} title="Visualizar">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o contrato de {c.client_name}? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileSignature className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum contrato encontrado</p>
          </div>
        )}
      </div>

      {/* Contract Preview Dialog */}
      {selectedContract && (() => {
        const { empresa, cliente, count } = getSignatureCount(selectedContract.contract_signatures);
        const displayStatus = getDisplayStatus(selectedContract);
        return (
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Contrato</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="font-medium">{selectedContract.client_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sistema</span>
                    <span className="font-medium">{selectedContract.system_type.toUpperCase()} · {selectedContract.potencia_kwp} kWp</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor</span>
                    <span className="font-bold text-primary">{formatCurrency(selectedContract.valor)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pagamento</span>
                    <span className="font-medium">{selectedContract.condicao_pagamento}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={cn('text-[10px]', contractStatusColors[displayStatus])}>
                      {contractStatusLabels[displayStatus]}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Assinaturas</span>
                    <Badge variant="outline">{count}/2</Badge>
                  </div>
                </div>

                {selectedContract.contract_signatures.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-medium">Assinaturas registradas:</p>
                      {selectedContract.contract_signatures.map((sig) => (
                        <div key={sig.id} className="rounded bg-muted p-2 text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px]">
                                {sig.signer_type === 'empresa' ? 'Empresa' : 'Cliente'}
                              </Badge>
                              {sig.signature_font ? (
                                <span className="text-base" style={{ fontFamily: sig.signature_font }}>{sig.name}</span>
                              ) : (
                                <span className="font-medium">{sig.name}</span>
                              )}
                            </div>
                            <span className="text-muted-foreground">{new Date(sig.signed_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>{sig.document}</span>
                            <span className="font-mono text-[10px]">Hash: {sig.hash}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <Separator />

                <div className="grid grid-cols-1 gap-2">
                  <Button variant="outline" className="gap-2" onClick={() => { setPreviewOpen(false); openPdf(selectedContract, false); }}>
                    <Download className="h-4 w-4" /> Baixar sem assinaturas
                  </Button>
                  {selectedContract.contract_signatures.length > 0 && (
                    <Button variant="outline" className="gap-2" onClick={() => { setPreviewOpen(false); openPdf(selectedContract, true); }}>
                      <Download className="h-4 w-4" /> Baixar com assinaturas
                    </Button>
                  )}

                  <Separator className="my-1" />

                  {!empresa && (
                    <Button className="gap-2" variant="default" onClick={() => openInternalSign(selectedContract)}>
                      <PenLine className="h-4 w-4" /> Assinar internamente (empresa)
                    </Button>
                  )}

                  {!cliente && (
                    <Button className="gap-2" variant="outline" onClick={() => { setPreviewOpen(false); handleSendForSignature(selectedContract); }}>
                      <Link2 className="h-4 w-4" /> Encaminhar para assinatura (cliente)
                    </Button>
                  )}

                  {selectedContract.signing_token && (
                    <div className="rounded bg-muted p-2 text-xs text-center">
                      <p className="text-muted-foreground mb-1">Link de assinatura ativo:</p>
                      <code className="text-[10px] break-all">{window.location.origin}/assinar/{selectedContract.signing_token}</code>
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Internal Signing Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-primary" />
              Assinatura Interna
            </DialogTitle>
          </DialogHeader>
          {signContractId && (() => {
            const sc = contracts.find(c => c.id === signContractId);
            if (!sc) return null;
            return (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                  <p className="font-medium">{sc.client_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {sc.system_type.toUpperCase()} · {formatCurrency(sc.valor)}
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Nome do Responsável</Label>
                    <Input value={signName} onChange={e => setSignName(e.target.value)} placeholder="Nome completo do assinante" className="mt-1" />
                  </div>

                  {signName.trim().length >= 3 && (
                    <SignatureStylePicker name={signName} selectedFont={signFont} onSelectFont={setSignFont} />
                  )}

                  <div>
                    <Label className="text-xs">CPF</Label>
                    <Input value={signDocument} onChange={e => setSignDocument(formatCpfCnpj(e.target.value))} placeholder="000.000.000-00" maxLength={18} className="mt-1" />
                    {signDocument && !isValidCpfCnpj(signDocument) && (
                      <p className="text-[10px] text-destructive mt-1">CPF: 000.000.000-00 ou CNPJ: 00.000.000/0000-00</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">E-mail</Label>
                    <Input type="email" value={signEmail} onChange={e => setSignEmail(e.target.value)} placeholder="email@empresa.com" className="mt-1" />
                    {signEmail && !isValidEmail(signEmail) && (
                      <p className="text-[10px] text-destructive mt-1">Informe um e-mail válido</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox id="accept-internal" checked={signAccepted} onCheckedChange={(v) => setSignAccepted(v === true)} />
                  <label htmlFor="accept-internal" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    Declaro que li e concordo com todas as cláusulas do contrato, representando a empresa nesta assinatura digital.
                  </label>
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={handleInternalSign}
                  disabled={!signName.trim() || !isValidCpfCnpj(signDocument) || !isValidEmail(signEmail) || !signAccepted || !signFont || signing}
                >
                  {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
                  {signing ? 'Assinando...' : 'Assinar como Empresa'}
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Contract PDF */}
      {selectedContract && (
        <ContractPDF
          open={pdfOpen}
          onOpenChange={setPdfOpen}
          contract={toPdfContract(selectedContract)}
          showSignatures={pdfWithSignatures}
        />
      )}
    </div>
  );
}
