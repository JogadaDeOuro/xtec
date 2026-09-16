import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const SITE = 'Inforsol';

type Meta = { title: string; description: string; noindex?: boolean };

const STATIC_ROUTES: Record<string, Meta> = {
  '/': {
    title: 'SolarFlow — gestão comercial para energia solar',
    description: 'CRM, propostas, contratos e pós-venda para empresas de energia solar em uma só plataforma. Comece grátis.',
  },
  '/cadastro': {
    title: 'Criar conta grátis — SolarFlow',
    description: 'Crie sua conta gratuita no SolarFlow e organize clientes, propostas e contratos de energia solar.',
  },
  '/dashboard': {
    title: `Painel comercial — ${SITE}`,
    description: 'Acompanhe propostas, contratos e obras de energia solar em um só painel.',
  },
  '/conta/plano': {
    title: `Plano e assinatura — ${SITE}`,
    description: 'Consulte seu plano, limites e uso atual na plataforma.',
    noindex: true,
  },
  '/admin': {
    title: `Administração da plataforma — ${SITE}`,
    description: 'Painel administrativo do SaaS SolarFlow.',
    noindex: true,
  },
  '/login': {
    title: `Entrar — ${SITE} Propostas & Contratos`,
    description: 'Acesse a plataforma Inforsol para criar propostas e contratos de energia solar.',
  },
  '/reset-password': {
    title: `Redefinir senha — ${SITE}`,
    description: 'Redefina a senha da sua conta Inforsol.',
    noindex: true,
  },
  '/crm': {
    title: `CRM de clientes — ${SITE}`,
    description: 'Funil de vendas solar com clientes, responsáveis e etapas de negociação.',
  },
  '/propostas': {
    title: `Gestão de propostas — ${SITE}`,
    description: 'Crie, envie e acompanhe propostas de energia solar com cálculo de payback.',
  },
  '/propostas/nova': {
    title: `Nova proposta solar — ${SITE}`,
    description: 'Dimensione o sistema fotovoltaico e gere a proposta comercial.',
    noindex: true,
  },
  '/propostas/manutencao': {
    title: `Nova proposta de manutenção — ${SITE}`,
    description: 'Monte propostas de manutenção preventiva de usinas solares.',
    noindex: true,
  },
  '/contratos': {
    title: `Contratos e assinaturas — ${SITE}`,
    description: 'Gere contratos de instalação e manutenção com assinatura digital.',
  },
  '/etapas': {
    title: `Etapas e prazos da obra — ${SITE}`,
    description: 'Acompanhe as etapas técnicas e os prazos de cada instalação solar.',
  },
  '/financeiro': {
    title: `Financeiro — ${SITE}`,
    description: 'Indicadores financeiros de propostas, contratos e recebimentos.',
  },
  '/whatsapp': {
    title: `Atendimento WhatsApp — ${SITE}`,
    description: 'Central de atendimento por WhatsApp integrada ao CRM solar.',
  },
  '/whatsapp-admin': {
    title: `Gestão do WhatsApp — ${SITE}`,
    description: 'Configure números, atendentes e automações de WhatsApp.',
    noindex: true,
  },
  '/integracoes': {
    title: `Integrações — ${SITE}`,
    description: 'Conecte serviços externos à plataforma Inforsol.',
    noindex: true,
  },
  '/personalizacao-proposta': {
    title: `Personalização da proposta — ${SITE}`,
    description: 'Ajuste cores, textos e imagens do documento de proposta.',
    noindex: true,
  },
  '/modelo-contrato': {
    title: `Modelo de contrato — ${SITE}`,
    description: 'Edite os modelos de contrato de instalação e manutenção.',
    noindex: true,
  },
  '/configuracoes': {
    title: `Configurações — ${SITE}`,
    description: 'Dados da empresa, cálculos e usuários da plataforma.',
    noindex: true,
  },
  '/cliente': {
    title: `Portal do cliente — ${SITE}`,
    description: 'Acompanhe sua proposta, contrato e o andamento da instalação.',
  },
};

const PREFIX_ROUTES: Array<[string, Meta]> = [
  ['/propostas/', { title: `Editar proposta — ${SITE}`, description: 'Edite e envie a proposta comercial ao cliente.', noindex: true }],
  ['/proposta/', { title: `Proposta comercial — ${SITE} Energia Solar`, description: 'Sua proposta de sistema fotovoltaico com economia e payback estimados.', noindex: true }],
  ['/aceite/', { title: `Aceite da proposta — ${SITE} Energia Solar`, description: 'Revise as condições e aceite sua proposta de energia solar.', noindex: true }],
  ['/assinar/', { title: `Assinatura de contrato — ${SITE} Energia Solar`, description: 'Assine digitalmente o contrato do seu sistema fotovoltaico.', noindex: true }],
  ['/acompanhamento/', { title: `Andamento da instalação — ${SITE} Energia Solar`, description: 'Acompanhe em tempo real as etapas da instalação da sua usina solar.', noindex: true }],
];

const FALLBACK: Meta = {
  title: `${SITE} — Propostas & Contratos de energia solar`,
  description: 'Sistema de gestão comercial para energia solar — Inforsol Energia Solar.',
  noindex: true,
};

function resolve(pathname: string): Meta {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (STATIC_ROUTES[clean]) return STATIC_ROUTES[clean];
  const prefix = PREFIX_ROUTES.find(([p]) => clean.startsWith(p));
  return prefix ? prefix[1] : FALLBACK;
}

export function RouteSeo() {
  const { pathname } = useLocation();
  const meta = resolve(pathname);
  const canonical = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/';

  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={canonical} />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      {meta.noindex ? <meta name="robots" content="noindex, follow" /> : null}
    </Helmet>
  );
}
