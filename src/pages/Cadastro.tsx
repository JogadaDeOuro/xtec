import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Building2, Loader2, Lock, Mail, Moon, Sun, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/integrations/supabase/client';
import logoInforsol from '@/assets/logo-inforsol.png';

export default function Cadastro() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, company_name: company },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    // Só conseguimos criar a empresa quando a sessão já existe (e-mail confirmado
    // automaticamente). Caso contrário, a empresa é criada no primeiro login.
    if (data.session) {
      const { error: orgError } = await supabase.rpc('signup_create_organization', {
        _name: company,
        _document: null,
        _phone: null,
      });
      setLoading(false);
      if (orgError) {
        toast.error('Conta criada, mas não foi possível concluir o cadastro da empresa. Entre e tente novamente.');
        navigate('/login');
        return;
      }
      toast.success('Conta criada! Bem-vindo ao SolarFlow.');
      navigate('/dashboard', { replace: true });
      return;
    }

    setLoading(false);
    setCheckEmail(true);
  };

  return (
    <div className="relative min-h-screen bg-background p-4">
      <div className="absolute inset-0 bg-gradient-hero opacity-40" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center">
        <div className="mb-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para o SolarFlow
          </Link>
          <Button variant="ghost" size="icon" aria-label="Alternar tema" onClick={toggleTheme}>
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </div>

        <Card className="border-border/60 bg-card/95 shadow-elegant backdrop-blur-sm">
          <CardHeader className="space-y-3 text-center">
            <img src={logoInforsol} alt="SolarFlow" className="mx-auto h-14 w-auto object-contain" />
            <div>
              <CardTitle className="font-display text-xl">Criar conta grátis</CardTitle>
              <CardDescription>Plano Gratuito: 10 clientes, 1 proposta e 1 contrato por semana.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {checkEmail ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Enviamos um e-mail de confirmação para <strong>{email}</strong>. Confirme o endereço e faça login
                  para concluir o cadastro da sua empresa.
                </p>
                <Button className="w-full" asChild><Link to="/login">Ir para o login</Link></Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-xs">Seu nome</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Nome da empresa</Label>
                  <div className="relative mt-1">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" value={company} onChange={(e) => setCompany(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">E-mail</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="email" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Senha</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="password" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar conta grátis
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
