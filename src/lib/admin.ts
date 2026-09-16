import { supabase } from '@/integrations/supabase/client';

export interface AdminOrg {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  status: string;
  created_at: string;
  owner_email: string | null;
  plan_code: string | null;
  plan_name: string | null;
  plan_price: number | null;
  subscription_status: string | null;
  next_billing_at: string | null;
  grace_until: string | null;
  users: number;
  clients: number;
  proposals: number;
  contracts: number;
  overdue_amount: number;
}

export interface PlatformOverview {
  organizations: number;
  organizations_active: number;
  free_orgs: number;
  paid_orgs: number;
  subscriptions_active: number;
  past_due: number;
  grace: number;
  restricted: number;
  new_orgs_30d: number;
  users_total: number;
  mrr: number;
  revenue_paid_30d: number;
  pending_amount: number;
  usage: { clients: number; proposals: number; contracts: number };
}

export async function fetchOverview(): Promise<PlatformOverview> {
  const { data, error } = await supabase.rpc('admin_platform_overview');
  if (error) throw error;
  return data as unknown as PlatformOverview;
}

export async function fetchOrganizations(): Promise<AdminOrg[]> {
  const { data, error } = await supabase.rpc('admin_list_organizations');
  if (error) throw error;
  return (data ?? []) as unknown as AdminOrg[];
}

/** Toda ação administrativa sensível passa por aqui e fica auditada. */
export async function logAdminAction(
  action: string,
  organizationId: string | null,
  before: unknown,
  after: unknown,
) {
  const { data: userData } = await supabase.auth.getUser();
  await supabase.from('admin_audit_log').insert({
    actor_user_id: userData.user?.id ?? null,
    action,
    organization_id: organizationId,
    before_value: (before ?? null) as never,
    after_value: (after ?? null) as never,
  });
}
