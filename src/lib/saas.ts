/**
 * Camada central do SaaS (organizações, planos, limites).
 *
 * REGRA DE PRIORIDADE DE ACESSO (documentada e implementada aqui + no banco):
 *  1. Super Admin global  -> nunca é bloqueado
 *  2. Restrição da assinatura (restricted/canceled) -> bloqueia criação
 *  3. Override explícito da organização (organization_feature_overrides)
 *  4. Feature/limite do plano (plan_features)
 *  5. Uso atual no período
 *  6. Acesso permitido ou bloqueado
 *
 * O banco é a fonte de verdade: triggers `enforce_plan_limit` impedem a criação
 * mesmo que o frontend seja contornado. O frontend apenas antecipa a mensagem.
 */

export type FeatureCode =
  | 'crm'
  | 'proposals'
  | 'contracts'
  | 'post_sale'
  | 'reports'
  | 'max_clients'
  | 'proposals_per_week'
  | 'contracts_per_week'
  | 'max_users'
  | 'team_members'
  | 'custom_branding'
  | 'whatsapp'
  | 'whatsapp_numbers'
  | 'whatsapp_automation'
  | 'whatsapp_ai'
  | 'ai';

export interface FeatureState {
  enabled: boolean;
  limit: number | null;
  unlimited: boolean;
  period: 'total' | 'week' | 'month';
  used: number;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  legal_name: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
}

export interface SubscriptionSummary {
  id: string;
  organization_id: string;
  plan_id: string | null;
  status: 'trial' | 'active' | 'past_due' | 'grace_period' | 'restricted' | 'canceled' | string;
  started_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_billing_at: string | null;
  grace_until: string | null;
  restricted_at: string | null;
}

export interface PlanSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  billing_interval: string;
  active: boolean;
  public: boolean;
}

export interface AccountSummary {
  organization: OrganizationSummary | null;
  membership_role: string | null;
  is_super_admin: boolean;
  subscription: SubscriptionSummary | null;
  plan: PlanSummary | null;
  features: Partial<Record<FeatureCode, FeatureState>>;
  error?: string;
}

export const FEATURE_LABELS: Record<string, string> = {
  crm: 'CRM',
  proposals: 'Propostas',
  contracts: 'Contratos',
  post_sale: 'Pós-venda',
  reports: 'Relatórios',
  max_clients: 'Clientes cadastrados',
  proposals_per_week: 'Propostas por semana',
  contracts_per_week: 'Contratos por semana',
  max_users: 'Usuários',
  team_members: 'Equipe',
  custom_branding: 'Identidade personalizada',
  whatsapp: 'WhatsApp integrado',
  whatsapp_numbers: 'Números de WhatsApp',
  whatsapp_automation: 'Automações de WhatsApp',
  whatsapp_ai: 'IA no WhatsApp',
  ai: 'Recursos de IA',
};

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  trial: 'Período de teste',
  active: 'Ativa',
  past_due: 'Pagamento em atraso',
  grace_period: 'Período de tolerância',
  restricted: 'Acesso restrito',
  canceled: 'Cancelada',
};

/** Status em que a conta perde a criação de novos registros. */
export function isRestricted(sub: SubscriptionSummary | null | undefined) {
  return !!sub && (sub.status === 'restricted' || sub.status === 'canceled');
}

/** Traduz os erros de limite lançados pelos triggers do banco. */
export function describeSaasError(error: unknown): string | null {
  const message = (error as { message?: string })?.message ?? '';
  if (message.includes('subscription_restricted')) {
    return 'A conta está com acesso restrito por pendência financeira. Seus dados continuam salvos — regularize para voltar a criar registros.';
  }
  const match = message.match(/plan_limit_reached:([a-z_]+):(\d+)/);
  if (match) {
    const [, code, limit] = match;
    const labels: Record<string, string> = {
      max_clients: `Seu plano permite ${limit} cliente(s) cadastrado(s).`,
      proposals_per_week: `Seu plano permite ${limit} nova(s) proposta(s) por semana.`,
      contracts_per_week: `Seu plano permite ${limit} novo(s) contrato(s) por semana.`,
    };
    const base = labels[code] ?? `Limite do plano atingido (${code}).`;
    return `${base} Nada foi apagado: os registros existentes continuam disponíveis. O contador semanal reinicia na segunda-feira, ou faça upgrade do plano.`;
  }
  return null;
}

/** Início do período semanal usado pelos limites (segunda-feira). */
export function currentWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function nextWeekReset(date = new Date()) {
  const start = currentWeekStart(date);
  start.setDate(start.getDate() + 7);
  return start;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
}
