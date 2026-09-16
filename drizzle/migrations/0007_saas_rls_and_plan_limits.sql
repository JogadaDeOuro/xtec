-- =========================================================
-- Helpers de autorização e de plano
-- =========================================================
CREATE OR REPLACE FUNCTION private.is_org_manager(_uid uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.user_id = _uid AND m.organization_id = _org AND m.role IN ('owner','admin')
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles r WHERE r.user_id = _uid AND r.role = 'admin'
  );
$$;
REVOKE EXECUTE ON FUNCTION private.is_org_manager(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.is_org_manager(uuid, uuid) TO authenticated, service_role;

-- acesso a linha: membro da organização OU super admin da plataforma
CREATE OR REPLACE FUNCTION private.can_read_org(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _org IS NOT NULL AND (
    private.is_org_member(auth.uid(), _org) OR private.is_super_admin(auth.uid())
  );
$$;
REVOKE EXECUTE ON FUNCTION private.can_read_org(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.can_read_org(uuid) TO authenticated, service_role;

-- prioridade: override explícito -> plano -> default seguro
CREATE OR REPLACE FUNCTION private.effective_feature(_org uuid, _code text)
RETURNS TABLE (enabled boolean, limit_value integer, unlimited boolean, period text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pf RECORD;
  ov RECORD;
BEGIN
  SELECT f.enabled, f.limit_value, f.period INTO pf
  FROM public.subscriptions s
  JOIN public.plan_features f ON f.plan_id = s.plan_id AND f.feature_code = _code
  WHERE s.organization_id = _org;

  IF pf IS NULL THEN
    SELECT f.enabled, f.limit_value, f.period INTO pf
    FROM public.plans p
    JOIN public.plan_features f ON f.plan_id = p.id AND f.feature_code = _code
    WHERE p.code = 'free';
  END IF;

  enabled := COALESCE(pf.enabled, false);
  limit_value := pf.limit_value;
  period := COALESCE(pf.period, 'total');
  unlimited := (pf IS NOT NULL AND pf.limit_value IS NULL);

  SELECT o.enabled, o.limit_value, o.unlimited INTO ov
  FROM public.organization_feature_overrides o
  WHERE o.organization_id = _org AND o.feature_code = _code
    AND o.starts_at <= now() AND (o.expires_at IS NULL OR o.expires_at > now())
  ORDER BY o.created_at DESC LIMIT 1;

  IF ov IS NOT NULL THEN
    IF ov.enabled IS NOT NULL THEN enabled := ov.enabled; END IF;
    IF ov.unlimited THEN
      unlimited := true; limit_value := NULL;
    ELSIF ov.limit_value IS NOT NULL THEN
      unlimited := false; limit_value := ov.limit_value;
    END IF;
  END IF;

  RETURN NEXT;
END $$;
REVOKE EXECUTE ON FUNCTION private.effective_feature(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.effective_feature(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.feature_usage(_org uuid, _code text)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer := 0;
BEGIN
  IF _code = 'max_clients' THEN
    SELECT count(*) INTO n FROM public.clients WHERE organization_id = _org;
  ELSIF _code = 'proposals_per_week' THEN
    SELECT count(*) INTO n FROM public.proposals
      WHERE organization_id = _org AND created_at >= date_trunc('week', now());
  ELSIF _code = 'contracts_per_week' THEN
    SELECT count(*) INTO n FROM public.contracts
      WHERE organization_id = _org AND created_at >= date_trunc('week', now());
  ELSIF _code = 'max_users' THEN
    SELECT count(*) INTO n FROM public.organization_members WHERE organization_id = _org;
  END IF;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION private.feature_usage(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.feature_usage(uuid, text) TO authenticated, service_role;

-- bloqueio de criação por limite / assinatura restrita (à prova de corrida)
CREATE OR REPLACE FUNCTION public.enforce_plan_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code text := TG_ARGV[0];
  ef RECORD;
  v_status text;
  v_used integer;
BEGIN
  IF NEW.organization_id IS NULL THEN RETURN NEW; END IF;
  IF private.is_super_admin(auth.uid()) THEN RETURN NEW; END IF;

  SELECT status INTO v_status FROM public.subscriptions WHERE organization_id = NEW.organization_id;
  IF v_status IN ('restricted','canceled') THEN
    RAISE EXCEPTION 'subscription_restricted' USING ERRCODE = 'check_violation';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(NEW.organization_id::text || ':' || v_code));

  SELECT * INTO ef FROM private.effective_feature(NEW.organization_id, v_code);
  IF ef.unlimited OR ef.limit_value IS NULL THEN RETURN NEW; END IF;

  v_used := private.feature_usage(NEW.organization_id, v_code);
  IF v_used >= ef.limit_value THEN
    RAISE EXCEPTION 'plan_limit_reached:%:%', v_code, ef.limit_value USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER enforce_limit_clients   BEFORE INSERT ON public.clients   FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_limit('max_clients');
CREATE TRIGGER enforce_limit_proposals BEFORE INSERT ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_limit('proposals_per_week');
CREATE TRIGGER enforce_limit_contracts BEFORE INSERT ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_limit('contracts_per_week');

-- =========================================================
-- RPCs da aplicação
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_my_account_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('error','unauthenticated'); END IF;
  v_org := private.current_org(auth.uid());
  IF v_org IS NULL THEN RETURN jsonb_build_object('error','no_organization'); END IF;

  SELECT jsonb_build_object(
    'organization', (SELECT to_jsonb(o) - 'owner_user_id' FROM public.organizations o WHERE o.id = v_org),
    'membership_role', (SELECT m.role FROM public.organization_members m WHERE m.organization_id = v_org AND m.user_id = auth.uid()),
    'is_super_admin', private.is_super_admin(auth.uid()),
    'subscription', (SELECT to_jsonb(s) FROM public.subscriptions s WHERE s.organization_id = v_org),
    'plan', (SELECT to_jsonb(p) FROM public.subscriptions s JOIN public.plans p ON p.id = s.plan_id WHERE s.organization_id = v_org),
    'features', (
      SELECT jsonb_object_agg(code, jsonb_build_object(
        'enabled', ef.enabled, 'limit', ef.limit_value, 'unlimited', ef.unlimited,
        'period', ef.period, 'used', private.feature_usage(v_org, code)
      ))
      FROM (SELECT DISTINCT feature_code AS code FROM public.plan_features) codes
      CROSS JOIN LATERAL private.effective_feature(v_org, codes.code) ef
    )
  ) INTO v_result;
  RETURN v_result;
END $$;
REVOKE EXECUTE ON FUNCTION public.get_my_account_summary() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_account_summary() TO authenticated;

-- cadastro de nova empresa (transacional)
CREATE OR REPLACE FUNCTION public.signup_create_organization(_name text, _document text DEFAULT NULL, _phone text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_org uuid;
  v_plan uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _name IS NULL OR length(trim(_name)) < 2 THEN RAISE EXCEPTION 'invalid_name'; END IF;

  SELECT organization_id INTO v_org FROM public.organization_members WHERE user_id = v_uid LIMIT 1;
  IF v_org IS NOT NULL THEN RETURN v_org; END IF;

  INSERT INTO public.organizations (name, legal_name, document, phone, email, status, owner_user_id)
  VALUES (trim(_name), trim(_name), nullif(regexp_replace(coalesce(_document,''),'\D','','g'),''), _phone,
          (SELECT email FROM auth.users WHERE id = v_uid), 'active', v_uid)
  RETURNING id INTO v_org;

  INSERT INTO public.organization_members (organization_id, user_id, role) VALUES (v_org, v_uid, 'owner');

  SELECT id INTO v_plan FROM public.plans WHERE code = 'free';
  INSERT INTO public.subscriptions (organization_id, plan_id, status, current_period_start, current_period_end)
  VALUES (v_org, v_plan, 'active', now(), now() + interval '30 days');

  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin') ON CONFLICT DO NOTHING;
  RETURN v_org;
END $$;
REVOKE EXECUTE ON FUNCTION public.signup_create_organization(text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.signup_create_organization(text, text, text) TO authenticated;

-- métricas do super admin
CREATE OR REPLACE FUNCTION public.admin_platform_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN jsonb_build_object(
    'organizations', (SELECT count(*) FROM public.organizations),
    'organizations_active', (SELECT count(*) FROM public.organizations WHERE status = 'active'),
    'free_orgs', (SELECT count(*) FROM public.subscriptions s JOIN public.plans p ON p.id = s.plan_id WHERE p.code = 'free'),
    'paid_orgs', (SELECT count(*) FROM public.subscriptions s JOIN public.plans p ON p.id = s.plan_id WHERE p.price > 0),
    'subscriptions_active', (SELECT count(*) FROM public.subscriptions WHERE status = 'active'),
    'past_due', (SELECT count(*) FROM public.subscriptions WHERE status = 'past_due'),
    'grace', (SELECT count(*) FROM public.subscriptions WHERE status = 'grace_period'),
    'restricted', (SELECT count(*) FROM public.subscriptions WHERE status = 'restricted'),
    'new_orgs_30d', (SELECT count(*) FROM public.organizations WHERE created_at > now() - interval '30 days'),
    'users_total', (SELECT count(*) FROM public.organization_members),
    'mrr', (SELECT coalesce(sum(p.price),0) FROM public.subscriptions s JOIN public.plans p ON p.id = s.plan_id WHERE s.status = 'active' AND p.billing_interval = 'month'),
    'revenue_paid_30d', (SELECT coalesce(sum(amount),0) FROM public.billing_records WHERE status = 'paid' AND paid_at > now() - interval '30 days'),
    'pending_amount', (SELECT coalesce(sum(amount),0) FROM public.billing_records WHERE status IN ('pending','overdue')),
    'usage', jsonb_build_object(
      'clients', (SELECT count(*) FROM public.clients),
      'proposals', (SELECT count(*) FROM public.proposals),
      'contracts', (SELECT count(*) FROM public.contracts)
    )
  );
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_platform_overview() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_platform_overview() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_organizations()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', o.id, 'name', o.name, 'document', o.document, 'email', o.email,
      'status', o.status, 'created_at', o.created_at,
      'owner_email', (SELECT u.email FROM auth.users u WHERE u.id = o.owner_user_id),
      'plan_code', p.code, 'plan_name', p.name, 'plan_price', p.price,
      'subscription_status', s.status, 'next_billing_at', s.next_billing_at,
      'grace_until', s.grace_until,
      'users', (SELECT count(*) FROM public.organization_members m WHERE m.organization_id = o.id),
      'clients', (SELECT count(*) FROM public.clients c WHERE c.organization_id = o.id),
      'proposals', (SELECT count(*) FROM public.proposals pr WHERE pr.organization_id = o.id),
      'contracts', (SELECT count(*) FROM public.contracts ct WHERE ct.organization_id = o.id),
      'overdue_amount', (SELECT coalesce(sum(b.amount),0) FROM public.billing_records b WHERE b.organization_id = o.id AND b.status IN ('pending','overdue'))
    ) ORDER BY o.created_at DESC)
    FROM public.organizations o
    LEFT JOIN public.subscriptions s ON s.organization_id = o.id
    LEFT JOIN public.plans p ON p.id = s.plan_id
  ), '[]'::jsonb);
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_organizations() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_organizations() TO authenticated;

-- =========================================================
-- RLS das novas tabelas
-- =========================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orgs_select" ON public.organizations FOR SELECT TO authenticated
  USING (private.can_read_org(id));
CREATE POLICY "orgs_update" ON public.organizations FOR UPDATE TO authenticated
  USING (private.is_org_manager(auth.uid(), id) OR private.is_super_admin(auth.uid()))
  WITH CHECK (private.is_org_manager(auth.uid(), id) OR private.is_super_admin(auth.uid()));
CREATE POLICY "orgs_super_admin_all" ON public.organizations FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid())) WITH CHECK (private.is_super_admin(auth.uid()));

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_select" ON public.organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.can_read_org(organization_id));
CREATE POLICY "members_manage" ON public.organization_members FOR ALL TO authenticated
  USING (private.is_org_manager(auth.uid(), organization_id) OR private.is_super_admin(auth.uid()))
  WITH CHECK (private.is_org_manager(auth.uid(), organization_id) OR private.is_super_admin(auth.uid()));

ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_roles_self" ON public.platform_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_super_admin(auth.uid()));

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT TO anon, authenticated
  USING (active AND public);
CREATE POLICY "plans_member_read" ON public.plans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.plan_id = plans.id AND private.can_read_org(s.organization_id)));
CREATE POLICY "plans_super_admin" ON public.plans FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid())) WITH CHECK (private.is_super_admin(auth.uid()));

ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_features_public_read" ON public.plan_features FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.plans p WHERE p.id = plan_features.plan_id AND p.active AND p.public));
CREATE POLICY "plan_features_super_admin" ON public.plan_features FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid())) WITH CHECK (private.is_super_admin(auth.uid()));

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_read" ON public.subscriptions FOR SELECT TO authenticated
  USING (private.can_read_org(organization_id));
CREATE POLICY "subscriptions_super_admin" ON public.subscriptions FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid())) WITH CHECK (private.is_super_admin(auth.uid()));

ALTER TABLE public.organization_feature_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "overrides_read" ON public.organization_feature_overrides FOR SELECT TO authenticated
  USING (private.can_read_org(organization_id));
CREATE POLICY "overrides_super_admin" ON public.organization_feature_overrides FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid())) WITH CHECK (private.is_super_admin(auth.uid()));

ALTER TABLE public.billing_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_read" ON public.billing_records FOR SELECT TO authenticated
  USING (private.can_read_org(organization_id));
CREATE POLICY "billing_super_admin" ON public.billing_records FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid())) WITH CHECK (private.is_super_admin(auth.uid()));

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_super_admin" ON public.platform_settings FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid())) WITH CHECK (private.is_super_admin(auth.uid()));

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_super_admin_read" ON public.admin_audit_log FOR SELECT TO authenticated
  USING (private.is_super_admin(auth.uid()));
CREATE POLICY "audit_super_admin_insert" ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (private.is_super_admin(auth.uid()) AND actor_user_id = auth.uid());

-- =========================================================
-- Reescrita das políticas dos dados por organização
-- =========================================================
DROP POLICY IF EXISTS "Owners and admins can view clients" ON public.clients;
DROP POLICY IF EXISTS "Owners and admins can update clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
CREATE POLICY "clients_org_select" ON public.clients FOR SELECT TO authenticated
  USING (private.can_read_org(organization_id) AND (user_id = auth.uid() OR private.is_org_manager(auth.uid(), organization_id) OR private.is_super_admin(auth.uid())));
CREATE POLICY "clients_org_insert" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (private.is_org_member(auth.uid(), organization_id));
CREATE POLICY "clients_org_update" ON public.clients FOR UPDATE TO authenticated
  USING (private.can_read_org(organization_id) AND (user_id = auth.uid() OR private.is_org_manager(auth.uid(), organization_id) OR private.is_super_admin(auth.uid())))
  WITH CHECK (private.can_read_org(organization_id));
CREATE POLICY "clients_org_delete" ON public.clients FOR DELETE TO authenticated
  USING (private.is_org_manager(auth.uid(), organization_id) OR private.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Owners and admins can view proposals" ON public.proposals;
DROP POLICY IF EXISTS "Owners and admins can update proposals" ON public.proposals;
DROP POLICY IF EXISTS "Owners and admins can delete proposals" ON public.proposals;
DROP POLICY IF EXISTS "Authenticated users can insert proposals" ON public.proposals;
DROP POLICY IF EXISTS "Authenticated users can view proposals" ON public.proposals;
CREATE POLICY "proposals_org_select" ON public.proposals FOR SELECT TO authenticated
  USING (private.can_read_org(organization_id) AND (user_id = auth.uid() OR private.is_org_manager(auth.uid(), organization_id) OR private.is_super_admin(auth.uid())));
CREATE POLICY "proposals_org_insert" ON public.proposals FOR INSERT TO authenticated
  WITH CHECK (private.is_org_member(auth.uid(), organization_id));
CREATE POLICY "proposals_org_update" ON public.proposals FOR UPDATE TO authenticated
  USING (private.can_read_org(organization_id) AND (user_id = auth.uid() OR private.is_org_manager(auth.uid(), organization_id) OR private.is_super_admin(auth.uid())))
  WITH CHECK (private.can_read_org(organization_id));
CREATE POLICY "proposals_org_delete" ON public.proposals FOR DELETE TO authenticated
  USING (private.is_org_manager(auth.uid(), organization_id) OR private.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Owners and admins can view contracts" ON public.contracts;
DROP POLICY IF EXISTS "Owners and admins can update contracts" ON public.contracts;
DROP POLICY IF EXISTS "Admins can delete contracts" ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can insert contracts" ON public.contracts;
CREATE POLICY "contracts_org_select" ON public.contracts FOR SELECT TO authenticated
  USING (private.can_read_org(organization_id) AND (user_id = auth.uid() OR private.is_org_manager(auth.uid(), organization_id) OR private.is_super_admin(auth.uid())));
CREATE POLICY "contracts_org_insert" ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (private.is_org_member(auth.uid(), organization_id));
CREATE POLICY "contracts_org_update" ON public.contracts FOR UPDATE TO authenticated
  USING (private.can_read_org(organization_id) AND (user_id = auth.uid() OR private.is_org_manager(auth.uid(), organization_id) OR private.is_super_admin(auth.uid())))
  WITH CHECK (private.can_read_org(organization_id));
CREATE POLICY "contracts_org_delete" ON public.contracts FOR DELETE TO authenticated
  USING (private.is_org_manager(auth.uid(), organization_id) OR private.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Contract owners and admins can view signatures" ON public.contract_signatures;
DROP POLICY IF EXISTS "Authenticated users can insert signatures" ON public.contract_signatures;
CREATE POLICY "signatures_org_select" ON public.contract_signatures FOR SELECT TO authenticated
  USING (private.can_read_org(organization_id));
CREATE POLICY "signatures_org_insert" ON public.contract_signatures FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND private.is_org_member(auth.uid(), c.organization_id)));

DROP POLICY IF EXISTS "Owners and admins can view project_stages" ON public.project_stages;
DROP POLICY IF EXISTS "Owners and admins can update project_stages" ON public.project_stages;
DROP POLICY IF EXISTS "Admins can delete project_stages" ON public.project_stages;
DROP POLICY IF EXISTS "Authenticated users can insert project_stages" ON public.project_stages;
CREATE POLICY "stages_org_select" ON public.project_stages FOR SELECT TO authenticated
  USING (private.can_read_org(organization_id) AND (user_id = auth.uid() OR private.is_org_manager(auth.uid(), organization_id) OR private.is_super_admin(auth.uid())));
CREATE POLICY "stages_org_insert" ON public.project_stages FOR INSERT TO authenticated
  WITH CHECK (private.is_org_member(auth.uid(), organization_id));
CREATE POLICY "stages_org_update" ON public.project_stages FOR UPDATE TO authenticated
  USING (private.can_read_org(organization_id) AND (user_id = auth.uid() OR private.is_org_manager(auth.uid(), organization_id) OR private.is_super_admin(auth.uid())))
  WITH CHECK (private.can_read_org(organization_id));
CREATE POLICY "stages_org_delete" ON public.project_stages FOR DELETE TO authenticated
  USING (private.is_org_manager(auth.uid(), organization_id) OR private.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Owners and admins can view stage_items" ON public.stage_items;
DROP POLICY IF EXISTS "Owners and admins can update stage_items" ON public.stage_items;
DROP POLICY IF EXISTS "Owners and admins can delete stage_items" ON public.stage_items;
DROP POLICY IF EXISTS "Authenticated users can insert stage_items" ON public.stage_items;
CREATE POLICY "stage_items_org_select" ON public.stage_items FOR SELECT TO authenticated
  USING (private.can_read_org(organization_id));
CREATE POLICY "stage_items_org_insert" ON public.stage_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.project_stages ps WHERE ps.id = project_stage_id AND private.is_org_member(auth.uid(), ps.organization_id)));
CREATE POLICY "stage_items_org_update" ON public.stage_items FOR UPDATE TO authenticated
  USING (private.can_read_org(organization_id)) WITH CHECK (private.can_read_org(organization_id));
CREATE POLICY "stage_items_org_delete" ON public.stage_items FOR DELETE TO authenticated
  USING (private.can_read_org(organization_id));

DROP POLICY IF EXISTS "Authenticated users can view proposal settings" ON public.proposal_settings;
DROP POLICY IF EXISTS "Admins manage proposal settings" ON public.proposal_settings;
CREATE POLICY "proposal_settings_org_select" ON public.proposal_settings FOR SELECT TO authenticated
  USING (private.can_read_org(organization_id));
CREATE POLICY "proposal_settings_org_manage" ON public.proposal_settings FOR ALL TO authenticated
  USING (private.is_org_manager(auth.uid(), organization_id) OR private.is_super_admin(auth.uid()))
  WITH CHECK (private.is_org_member(auth.uid(), organization_id) OR private.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view templates" ON public.proposal_templates;
DROP POLICY IF EXISTS "Admins manage templates" ON public.proposal_templates;
CREATE POLICY "proposal_templates_org_select" ON public.proposal_templates FOR SELECT TO authenticated
  USING (organization_id IS NULL OR private.can_read_org(organization_id));
CREATE POLICY "proposal_templates_org_manage" ON public.proposal_templates FOR ALL TO authenticated
  USING (private.is_org_manager(auth.uid(), organization_id) OR private.is_super_admin(auth.uid()))
  WITH CHECK (private.is_org_member(auth.uid(), organization_id) OR private.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view contract templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Admins manage contract templates" ON public.contract_templates;
CREATE POLICY "contract_templates_org_select" ON public.contract_templates FOR SELECT TO authenticated
  USING (organization_id IS NULL OR private.can_read_org(organization_id));
CREATE POLICY "contract_templates_org_manage" ON public.contract_templates FOR ALL TO authenticated
  USING (private.is_org_manager(auth.uid(), organization_id) OR private.is_super_admin(auth.uid()))
  WITH CHECK (private.is_org_member(auth.uid(), organization_id) OR private.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view equipment" ON public.equipment_catalog;
DROP POLICY IF EXISTS "Admins manage equipment" ON public.equipment_catalog;
CREATE POLICY "equipment_org_select" ON public.equipment_catalog FOR SELECT TO authenticated
  USING (organization_id IS NULL OR private.can_read_org(organization_id));
CREATE POLICY "equipment_org_manage" ON public.equipment_catalog FOR ALL TO authenticated
  USING (private.is_org_manager(auth.uid(), organization_id) OR private.is_super_admin(auth.uid()))
  WITH CHECK (private.is_org_member(auth.uid(), organization_id) OR private.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view tags" ON public.tags;
DROP POLICY IF EXISTS "Admins manage tags" ON public.tags;
DROP POLICY IF EXISTS "Authenticated can view tags" ON public.tags;
CREATE POLICY "tags_org_select" ON public.tags FOR SELECT TO authenticated
  USING (organization_id IS NULL OR private.can_read_org(organization_id));
CREATE POLICY "tags_org_manage" ON public.tags FOR ALL TO authenticated
  USING (private.is_org_manager(auth.uid(), organization_id) OR private.is_super_admin(auth.uid()))
  WITH CHECK (private.is_org_member(auth.uid(), organization_id) OR private.is_super_admin(auth.uid()));
