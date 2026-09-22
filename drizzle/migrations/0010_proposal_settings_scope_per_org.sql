DROP INDEX IF EXISTS public.proposal_settings_scope_idx;

CREATE UNIQUE INDEX proposal_settings_org_scope_idx
  ON public.proposal_settings (organization_id, scope)
  WHERE organization_id IS NOT NULL;

CREATE UNIQUE INDEX proposal_settings_global_scope_idx
  ON public.proposal_settings (scope)
  WHERE organization_id IS NULL;