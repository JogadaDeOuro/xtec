import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Users, FileText, FileSignature, Clock, BarChart3, MessageSquare,
  Check, Menu, X, ShieldCheck, Zap, Sun, Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/saas';
import logoInforsol from '@/assets/logo-inforsol.png';

interface PublicPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  billing_interval: string;
  sort_order: number;
  features: { feature_code: string; enabled: boolean; limit_value: number | null; period: string }[];
}

const FEATURE_HIGHLIGHTS: Record<string, (limit: number | null) => string | null> = {
  max_clients: (l) => (l === null ? 'Clientes ilimitados no CRM' : `Até ${l} clientes no CRM`),
  proposals_per_week: (l) => (l === null ? 'Propostas ilimitadas' : `${l} proposta${l > 1 ? 's' : ''} por semana`),
  contracts_per_week: (l) => (l === null ? 'Contratos ilimitados' : `${l} contrato${l > 1 ? 's' : ''} por semana`),
  max_users: (l) => (l === null ? 'Usuários ilimitados' : `${l} usuário${l > 1 ? 's' : ''}`),
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [plans, setPlans] = useState<PublicPlan[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('plans')
        .select('id, code, name, description, price, billing_interval, sort_order, plan_features(feature_code, enabled, limit_value, period)')
        .eq('active', true)
        .eq('public', true)
        .order('sort_order');
      if (data) {
        setPlans(
          data.map((p: any) => ({ ...p, features: p.plan_features ?? [] })) as PublicPlan[],
        );
      }
    })();
  }, []);

  const steps = [
    { icon: Users, title: 'Cadastre o cliente', text: 'Centralize leads, contatos e histórico comercial no CRM.' },
    { icon: FileText, title: 'Crie a proposta', text: 'Dimensionamento solar, preço e PDF profissional em minutos.' },
    { icon: FileSignature, title: 'Gere o contrato', text: 'Modelo com variáveis do cliente e assinatura digital.' },
    { icon: Clock, title: 'Acompanhe o pós-venda', text: 'Etapas da obra com link público de acompanhamento.' },
  ];

  const features = [
    { icon: Users, title: 'CRM solar', text: 'Funil comercial, responsáveis, tags e origem dos leads em um só lugar.' },
    { icon: FileText, title: 'Propostas', text: 'Usina de consumo, investimento e manutenção com cálculo de economia, payback e PDF pronto.' },
    { icon: FileSignature, title: 'Contratos', text: 'Modelos por tipo de proposta, variáveis automáticas e assinatura com trilha legal.' },
    { icon: Clock, title: 'Pós-venda', text: 'Nove etapas técnicas do projeto com prazos e acompanhamento do cliente.' },
    { icon: BarChart3, title: 'Gestão comercial', text: 'Indicadores de vendas, propostas aceitas e faturamento por período.' },
    { icon: MessageSquare, title: 'WhatsApp e automações', text: 'Atendimento centralizado e disparos automáticos.', soon: true },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <img src={logoInforsol} alt="SolarFlow" className="h-9 w-9 rounded-lg object-contain" />
            <span className="font-display text-lg font-bold tracking-tight">SolarFlow</span>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#recursos" className="transition-colors hover:text-foreground">Recursos</a>
            <a href="#como-funciona" className="transition-colors hover:text-foreground">Como funciona</a>
            <a href="#planos" className="transition-colors hover:text-foreground">Planos</a>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" size="icon" aria-label="Alternar tema" onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" asChild><Link to="/login">Entrar</Link></Button>
            <Button asChild><Link to="/cadastro">Começar grátis</Link></Button>
          </div>

          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {menuOpen && (
          <div className="border-t border-border/60 bg-background px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3 text-sm">
              <a href="#recursos" onClick={() => setMenuOpen(false)}>Recursos</a>
              <a href="#como-funciona" onClick={() => setMenuOpen(false)}>Como funciona</a>
              <a href="#planos" onClick={() => setMenuOpen(false)}>Planos</a>
              <div className="mt-2 flex gap-2">
                <Button variant="outline" className="flex-1" asChild><Link to="/login">Entrar</Link></Button>
                <Button className="flex-1" asChild><Link to="/cadastro">Começar grátis</Link></Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 right-0 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-2">
          <motion.div initial="hidden" animate="show" variants={fadeUp}>
            <Badge variant="secondary" className="mb-5 gap-1.5">
              <Zap className="h-3 w-3" /> Plataforma para empresas de energia solar
            </Badge>
            <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl">
              Do primeiro contato ao pós-venda, toda a sua operação solar em um só lugar.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              O SolarFlow conecta CRM, propostas, contratos e acompanhamento de obra em um fluxo único —
              menos planilhas, propostas em minutos e nenhum cliente esquecido no caminho.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="gap-2" asChild>
                <Link to="/cadastro">Começar grátis <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild><a href="#recursos">Conhecer recursos</a></Button>
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Dados de cada empresa isolados e protegidos.
            </p>
          </motion.div>

          {/* Representação do produto com componentes reais da interface */}
          <motion.div initial="hidden" animate="show" variants={fadeUp} transition={{ delay: 0.15 }} className="relative">
            <div className="rounded-2xl border border-border bg-card p-3 shadow-elegant">
              <div className="mb-3 flex items-center gap-1.5 px-2">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary/50" />
                <span className="ml-3 text-[10px] text-muted-foreground">solarflow.inforsol.group</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Propostas no mês', value: '18' },
                  { label: 'Taxa de aceite', value: '62%' },
                  { label: 'Potência vendida', value: '214 kWp' },
                ].map((k) => (
                  <div key={k.label} className="rounded-xl border border-border/60 bg-background p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.label}</p>
                    <p className="mt-1 font-display text-xl font-bold">{k.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                {[
                  { name: 'Residencial · 8,4 kWp', status: 'Aceita' },
                  { name: 'Comercial · 42 kWp', status: 'Em análise' },
                  { name: 'Manutenção · 320 m²', status: 'Enviada' },
                ].map((row) => (
                  <div key={row.name} className="flex items-center justify-between rounded-xl border border-border/60 bg-background px-3 py-2.5">
                    <span className="text-xs font-medium">{row.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{row.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Um fluxo, quatro passos</h2>
            <p className="mt-3 text-muted-foreground">
              Cada etapa alimenta a seguinte: o cliente cadastrado vira proposta, a proposta aceita vira contrato
              e o contrato assinado abre o acompanhamento da obra.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-4">
            {steps.map((s, i) => (
              <motion.div key={s.title} initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} transition={{ delay: i * 0.08 }}>
                <Card className="h-full border-border/60">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground">Passo {i + 1}</p>
                    <h3 className="mt-1 font-display text-lg font-semibold">{s.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* RECURSOS */}
      <section id="recursos" className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Tudo que a operação solar precisa</h2>
          <p className="mt-3 text-muted-foreground">Recursos construídos para o dia a dia de integradores de energia solar.</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div key={f.title} initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} transition={{ delay: i * 0.06 }}>
              <Card className="h-full border-border/60 transition-colors hover:border-primary/40">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <f.icon className="h-5 w-5" />
                    </div>
                    {f.soon && <Badge variant="outline" className="text-[10px]">Em breve · planos superiores</Badge>}
                  </div>
                  <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Planos</h2>
            <p className="mt-3 text-muted-foreground">Comece sem custo e evolua conforme a operação crescer.</p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {plans.map((plan) => {
              const highlights = plan.features
                .filter((f) => f.enabled && FEATURE_HIGHLIGHTS[f.feature_code])
                .map((f) => FEATURE_HIGHLIGHTS[f.feature_code](f.limit_value))
                .filter(Boolean) as string[];
              return (
                <Card key={plan.id} className="border-border/60">
                  <CardContent className="p-7">
                    <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                    {plan.description && <p className="mt-1.5 text-sm text-muted-foreground">{plan.description}</p>}
                    <p className="mt-6 font-display text-4xl font-bold">
                      {formatCurrency(Number(plan.price))}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">/mês</span>
                    </p>
                    <ul className="mt-6 space-y-2.5 text-sm">
                      {['CRM, propostas, contratos e pós-venda', ...highlights].map((h) => (
                        <li key={h} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="text-muted-foreground">{h}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className="mt-7 w-full" asChild>
                      <Link to="/cadastro">{Number(plan.price) === 0 ? 'Começar grátis' : 'Assinar'}</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            {plans.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum plano publicado no momento.</p>
            )}
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            Novos planos com mais volume, equipe, WhatsApp integrado e automações serão publicados em breve.
          </p>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <div className="rounded-3xl border border-border bg-gradient-primary p-10 text-primary-foreground md:p-14">
          <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight md:text-4xl">
            Organize sua operação solar ainda hoje.
          </h2>
          <p className="mt-3 max-w-xl text-primary-foreground/80">
            Crie sua conta gratuita, cadastre seus primeiros clientes e envie a primeira proposta em minutos.
          </p>
          <Button size="lg" variant="secondary" className="mt-8 gap-2" asChild>
            <Link to="/cadastro">Criar conta grátis <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row md:px-6">
          <div className="flex items-center gap-2">
            <img src={logoInforsol} alt="SolarFlow" className="h-6 w-6 rounded object-contain" />
            <span>SolarFlow — gestão para energia solar</span>
          </div>
          <div className="flex gap-6">
            <Link to="/login" className="hover:text-foreground">Entrar</Link>
            <Link to="/cadastro" className="hover:text-foreground">Criar conta</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
