import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const SITE = 'SolarFlow';
const ORIGIN = 'https://solarflow.inforsol.group';
const SOCIAL_IMAGE = `${ORIGIN}/solarflow-social-card.png`;

type Meta = { title: string; description: string; noindex?: boolean };

const STATIC_ROUTES: Record<string, Meta> = {
  '/': {
     title: 'SolarFlow — gestão para integradoras solares',
     description: 'Organize CRM, propostas, contratos e operação comercial da sua integradora solar em um único fluxo com a SolarFlow.',
  },
  '/cadastro': {
    title: 'Criar conta grátis — SolarFlow',
    description: 'Crie sua conta gratuita no SolarFlow e organize clientes, propostas e contratos de energia solar.',
  },
  '/dashboard': {
     title: `Dashboard | ${SITE}`,
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
     title: `Entrar | ${SITE}`,
     description: 'Acesse a SolarFlow e coloque sua operação solar em fluxo.',
  },
  '/reset-password': {
    title: `Redefinir senha — ${SITE}`,
     description: 'Redefina a senha da sua conta SolarFlow.',
    noindex: true,
  },
  '/crm': {
     title: `CRM | ${SITE}`,
    description: 'Funil de vendas solar com clientes, responsáveis e etapas de negociação.',
  },
  '/propostas': {
     title: `Propostas | ${SITE}`,
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
     title: `Contratos | ${SITE}`,
    description: 'Gere contratos de instalação e manutenção com assinatura digital.',
  },
  '/etapas': {
    title: `Etapas e prazos da obra — ${SITE}`,
    description: 'Acompanhe as etapas técnicas e os prazos de cada instalação solar.',
  },
  '/financeiro': {
     title: `Financeiro | ${SITE}`,
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
     description: 'Conecte serviços externos à plataforma SolarFlow.',
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
   ['/proposta/', { title: `Proposta comercial | ${SITE}`, description: 'Sua proposta de sistema fotovoltaico com economia e payback estimados.', noindex: true }],
   ['/aceite/', { title: `Aceite da proposta | ${SITE}`, description: 'Revise as condições e aceite sua proposta de energia solar.', noindex: true }],
   ['/assinar/', { title: `Assinatura de contrato | ${SITE}`, description: 'Assine digitalmente o contrato do seu sistema fotovoltaico.', noindex: true }],
   ['/acompanhamento/', { title: `Andamento da instalação | ${SITE}`, description: 'Acompanhe em tempo real as etapas da instalação da sua usina solar.', noindex: true }],
];

const FALLBACK: Meta = {
   title: `${SITE} — gestão para integradoras solares`,
   description: 'Tecnologia para colocar sua operação solar em fluxo.',
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
   const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/';
   const canonical = new URL(path, ORIGIN).toString();

  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={canonical} />
       <meta property="og:type" content="website" />
       <meta property="og:image" content={SOCIAL_IMAGE} />
       <meta property="og:image:width" content="1200" />
       <meta property="og:image:height" content="630" />
       <meta property="og:image:alt" content="SolarFlow — Sua operação solar em fluxo." />
       <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
       <meta name="twitter:image" content={SOCIAL_IMAGE} />
      {meta.noindex ? <meta name="robots" content="noindex, follow" /> : null}
    </Helmet>
  );
}
