import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/mock-data';
import { formatCpfCnpj, isValidCpfCnpj } from '@/lib/utils';
import { CheckCircle, FileSignature, Shield, AlertTriangle, MapPin, Globe, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import logoImg from '@/assets/logo-inforsol.png';
import { SignatureStylePicker } from '@/components/SignatureStylePicker';
import { supabase } from '@/integrations/supabase/client';

interface ContractData {
  id: string;
  client_name: string;
  client_document: string | null;
  system_type: string;
  potencia_kwp: number;
  valor: number;
  condicao_pagamento: string | null;
  signing_token: string | null;
  status: string;
  signatures: { signer_type: string }[];
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

export default function AssinarContrato() {
  const { token } = useParams<{ token: string }>();
  const isValidEmailFn = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const [contract, setContract] = useState<ContractData | null>(null);
  const [loadingContract, setLoadingContract] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [signed, setSigned] = useState(false);
  const [hash, setHash] = useState('');
  const [signFont, setSignFont] = useState('');
  const [signingInProgress, setSigningInProgress] = useState(false);
  const [signingData, setSigningData] = useState<{
    ip: string; location: string; userAgent: string; signedAt: string;
  } | null>(null);
  const [ip, setIp] = useState('');
  const [location, setLocation] = useState('');
  const [loadingIp, setLoadingIp] = useState(true);
  const [loadingGeo, setLoadingGeo] = useState(false);

  // Fetch contract by token from DB
  useEffect(() => {
    if (!token) { setNotFound(true); setLoadingContract(false); return; }
    const fetchContract = async () => {
      const { data, error } = await supabase.rpc('get_contract_for_signing', { _token: token });
      const result = data as unknown as ContractData | null;
      if (error || !result) {
        setNotFound(true);
      } else {
        setContract({ ...result, signatures: result.signatures || [] });
      }

      setLoadingContract(false);
    };
    fetchContract();
  }, [token]);

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(data => setIp(data.ip))
      .catch(() => setIp('Não identificado'))
      .finally(() => setLoadingIp(false));
  }, []);

  useEffect(() => {
    if ('geolocation' in navigator) {
      setLoadingGeo(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => { setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`); setLoadingGeo(false); },
        () => { setLocation('Não autorizado'); setLoadingGeo(false); },
        { timeout: 10000 }
      );
    } else {
      setLocation('Indisponível');
    }
  }, []);

  if (loadingContract) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !contract) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="text-xl font-bold">Link inválido</h1>
            <p className="text-sm text-muted-foreground">
              Este link de assinatura não foi encontrado ou já expirou.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const alreadySigned = contract.signatures.some(s => s.signer_type === 'cliente');

  const handleSign = async () => {
    if (!name.trim() || !document.trim()) { toast.error('Preencha seu nome e CPF/CNPJ'); return; }
    if (!email.trim() || !email.includes('@')) { toast.error('Informe um e-mail válido para confirmação'); return; }
    if (!accepted) { toast.error('Você precisa aceitar os termos do contrato'); return; }
    if (!signFont) { toast.error('Escolha um estilo de assinatura'); return; }

    setSigningInProgress(true);
    const now = new Date();
    const userAgent = navigator.userAgent;
    const rawData = `${contract.id}-${name}-${document}-${email}-${ip}-${now.toISOString()}`;
    const generatedHash = btoa(rawData).slice(0, 20).toUpperCase();

    // Insert signature into DB
    const { error: sigError } = await supabase.from('contract_signatures').insert({
      contract_id: contract.id,
      signer_type: 'cliente',
      name: name.trim(),
      document: document.trim(),
      email: email.trim(),
      signed_at: now.toISOString(),
      ip: ip || 'Não identificado',
      location: location || 'Não disponível',
      user_agent: userAgent,
      hash: generatedHash,
      signature_font: signFont,
    });

    if (sigError) {
      setSigningInProgress(false);
      if (sigError.code === '23505') {
        toast.error('Este contrato já foi assinado pelo cliente');
      } else {
        toast.error('Erro ao registrar assinatura');
      }
      return;
    }

    // Update contract status
    const hasEmpresa = contract.signatures.some(s => s.signer_type === 'empresa');
    const newStatus = hasEmpresa ? 'assinado' : 'enviado';

    await supabase.from('contracts').update({
      status: newStatus,
      ...(newStatus === 'assinado' ? { signed_at: now.toISOString() } : {}),
    }).eq('id', contract.id);

    setSigningInProgress(false);
    setSigningData({
      ip: ip || 'Não identificado',
      location: location || 'Não disponível',
      userAgent,
      signedAt: now.toISOString(),
    });
    setHash(generatedHash);
    setSigned(true);
    toast.success('Contrato assinado com sucesso!');

    await sendNotification(
      newStatus === 'assinado' ? 'fully_signed' : 'client_signed',
      contract.id,
      contract.client_name,
      name.trim(),
      email.trim(),
      'cliente'
    );
  };

  if (signed && signingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="p-8 text-center space-y-6">
            <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Contrato Assinado!</h1>
              <p className="text-sm text-muted-foreground mt-2">Sua assinatura digital foi registrada com sucesso.</p>
            </div>
            <div className="rounded-lg bg-muted p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Assinatura:</span>
                <span className="text-lg" style={{ fontFamily: signFont }}>{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPF/CNPJ:</span>
                <span className="font-medium">{document}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">E-mail:</span>
                <span className="font-medium">{email}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data/Hora:</span>
                <span className="font-medium">{new Date(signingData.signedAt).toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> IP:</span>
                <span className="font-mono text-xs">{signingData.ip}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Localização:</span>
                <span className="font-mono text-xs">{signingData.location}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Hash de verificação:</span>
                <Badge variant="outline" className="font-mono text-xs">{hash}</Badge>
              </div>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-primary" />
                <span>Uma cópia de confirmação será enviada para <strong className="text-foreground">{email}</strong></span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
              <Shield className="h-3.5 w-3.5" />
              <span>Assinatura digital com validade jurídica (Lei 14.063/2020)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadySigned) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-success" />
            <h1 className="text-xl font-bold">Contrato já assinado</h1>
            <p className="text-sm text-muted-foreground">
              Este contrato já foi assinado pelo cliente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const systemLabel = contract.system_type === 'on-grid' ? 'On-Grid' :
    contract.system_type === 'off-grid' ? 'Off-Grid' : 'Híbrido';

  const sigCount = contract.signatures.filter(s => ['empresa', 'cliente'].includes(s.signer_type)).length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <img src={logoImg} alt="Inforsol" className="h-10 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Assinatura Digital de Contrato</h1>
          <p className="text-sm text-muted-foreground">Revise os termos e assine digitalmente</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-primary" />
              Resumo do Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Cliente</span>
                <p className="font-medium">{contract.client_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Sistema</span>
                <p className="font-medium">{systemLabel} — {contract.potencia_kwp} kWp</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Valor do Contrato</span>
                <p className="font-bold text-primary">{formatCurrency(contract.valor)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Condição de Pagamento</span>
                <p className="font-medium">{contract.condicao_pagamento}</p>
              </div>
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Objeto:</strong> Instalação de sistema fotovoltaico {systemLabel} de {contract.potencia_kwp} kWp</p>
              <p><strong>Prazo:</strong> 30 dias úteis após liberação técnica</p>
              <p><strong>Garantias:</strong> Módulos 25 anos · Inversor 10 anos · Estrutura 12 anos · Mão de obra 5 anos</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline">{sigCount}/2 assinaturas</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <span className="block text-foreground font-medium">IP detectado</span>
                  {loadingIp ? (
                    <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Detectando...</span>
                  ) : (
                    <span className="font-mono">{ip}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <span className="block text-foreground font-medium">Geolocalização</span>
                  {loadingGeo ? (
                    <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Solicitando...</span>
                  ) : (
                    <span className="font-mono">{location}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <span className="block text-foreground font-medium">Segurança</span>
                  <span>Conexão protegida · Lei 14.063/2020</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">Dados para Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Nome Completo / Razão Social</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Digite seu nome completo" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">CPF</Label>
                <Input value={document} onChange={e => setDocument(formatCpfCnpj(e.target.value))} placeholder="000.000.000-00" maxLength={18} className="mt-1" />
                {document && !isValidCpfCnpj(document) && (
                  <p className="text-[10px] text-destructive mt-1">CPF: 000.000.000-00 ou CNPJ: 00.000.000/0000-00</p>
                )}
              </div>
            </div>

            {name.trim().length >= 3 && (
              <SignatureStylePicker name={name} selectedFont={signFont} onSelectFont={setSignFont} />
            )}

            <div>
              <Label className="text-xs flex items-center gap-1">
                <Mail className="h-3 w-3" /> E-mail para confirmação
              </Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="mt-1" />
              {email && !isValidEmailFn(email) && (
                <p className="text-[10px] text-destructive mt-1">Informe um e-mail válido</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">Uma cópia da assinatura será enviada para este endereço</p>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="accept" checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} />
              <label htmlFor="accept" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                Declaro que li e concordo com todas as cláusulas do contrato. Esta assinatura eletrônica tem validade jurídica nos termos da Lei nº 14.063/2020 e equivale à assinatura manuscrita para todos os fins legais.
              </label>
            </div>

            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handleSign}
              disabled={!name.trim() || !isValidCpfCnpj(document) || !isValidEmailFn(email) || !accepted || !signFont || signingInProgress}
            >
              {signingInProgress ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
              {signingInProgress ? 'Assinando...' : 'Assinar Digitalmente'}
            </Button>

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground justify-center">
              <Shield className="h-3 w-3" />
              <span>IP, geolocalização e timestamp serão registrados com a assinatura</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
