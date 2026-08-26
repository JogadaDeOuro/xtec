import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Lock, Eye, EyeOff, User, ArrowLeft, Loader2, Sun, Zap, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import logoInforsol from '@/assets/logo-inforsol.png';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, resetPassword } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos'
        : error.message);
    } else {
      navigate('/');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Cadastro realizado! Verifique seu e-mail para confirmar a conta.');
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      setForgotMode(false);
    }
  };

  if (forgotMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <Card className="w-full max-w-md relative animate-fade-in shadow-elegant border-border/60 backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center space-y-4">
            <img src={logoInforsol} alt="Inforsol" className="mx-auto h-16 w-auto object-contain" />
            <div>
              <CardTitle className="text-xl font-display">Recuperar Senha</CardTitle>
              <CardDescription>Informe seu e-mail para redefinir a senha</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <Label className="text-xs">E-mail</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="email" placeholder="seu@email.com" className="pl-9" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enviar Link
              </Button>
              <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => setForgotMode(false)}>
                <ArrowLeft className="h-3 w-3 mr-1" /> Voltar ao login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background relative overflow-hidden">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-primary-foreground bg-gradient-primary overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-60" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary-foreground/5 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <img src={logoInforsol} alt="Inforsol" className="h-11 w-11 rounded-xl bg-white/10 p-1 backdrop-blur" />
          <div>
            <p className="font-display text-xl font-bold leading-none">Inforsol</p>
            <p className="text-xs text-primary-foreground/70 mt-1">Energia Solar</p>
          </div>
        </div>

        <div className="relative space-y-6 max-w-md">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-primary-foreground/80">
            <Sun className="h-3.5 w-3.5" /> Plataforma comercial solar
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight">
            Do primeiro orçamento ao contrato assinado.
          </h1>
          <p className="text-primary-foreground/80 text-sm leading-relaxed">
            Dimensione o sistema, gere a proposta, feche o contrato com assinatura digital e acompanhe a obra — tudo num só lugar.
          </p>
          <div className="grid grid-cols-1 gap-3 pt-2">
            {[
              { icon: Zap, t: 'Propostas em minutos', d: 'Dimensionamento e payback automatizados' },
              { icon: ShieldCheck, t: 'Contratos com validade jurídica', d: 'Assinatura digital com metadados' },
              { icon: Sparkles, t: 'CRM solar especializado', d: 'Funil, vendedores e métricas em tempo real' },
            ].map(f => (
              <div key={f.t} className="flex items-start gap-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-3">
                <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <f.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{f.t}</p>
                  <p className="text-xs text-primary-foreground/70">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Inforsol Energia Solar
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-4 sm:p-8 relative">
        <div className="absolute inset-0 bg-gradient-hero lg:hidden" />
        <Card className="w-full max-w-md relative animate-fade-in shadow-elegant border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-3">
          <img src={logoInforsol} alt="Inforsol" className="mx-auto h-14 w-auto object-contain lg:hidden" />
          <div>
            <CardTitle className="text-2xl font-display tracking-tight">Bem-vindo de volta</CardTitle>
            <CardDescription>Acesse sua conta para continuar</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label className="text-xs">E-mail</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="email" placeholder="seu@email.com" className="pl-9" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Senha</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="pl-9 pr-9" value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-primary hover:underline">Esqueci a senha</button>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label className="text-xs">Nome completo</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="text" placeholder="Seu nome" className="pl-9" value={fullName} onChange={e => setFullName(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">E-mail</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="email" placeholder="seu@email.com" className="pl-9" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Senha</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type={showPassword ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" className="pl-9 pr-9" value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Criar Conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} Inforsol Energia Solar
          </p>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
