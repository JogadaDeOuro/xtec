import { supabase } from '@/integrations/supabase/client';

type PublicPortalAction =
  | 'get-proposal'
  | 'accept-proposal'
  | 'get-client-portal'
  | 'get-contract'
  | 'sign-contract'
  | 'get-tracking';

export async function invokePublicPortal<T>(action: PublicPortalAction, args: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('public-portal', {
    body: { action, args },
  });
  return { data: (data?.data ?? null) as T | null, error: error ?? (data?.error ? new Error(data.error) : null) };
}