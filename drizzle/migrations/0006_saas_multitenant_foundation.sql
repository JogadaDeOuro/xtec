-- =========================================================
-- SaaS multi-tenant foundation (additive, non destructive)
-- =========================================================

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  document text,
  email text,
  phone text,
  status text NOT NULL DEFAULT 'active',
  owner_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;

CREATE TABLE public.platform_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.platform_roles TO authenticated;
GRANT ALL ON public.platform_roles TO service_role;

CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  billing_interval text NOT NULL DEFAULT 'month',
  active boolean NOT NULL DEFAULT false,
  public boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;

-- limit_value NULL = ilimitado; period: total | week | month
CREATE TABLE public.plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_code text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  limit_value integer,
  period text NOT NULL DEFAULT 'total',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, feature_code)
);
GRANT SELECT ON public.plan_features TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_features TO authenticated;
GRANT ALL ON public.plan_features TO service_role;

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  next_billing_at timestamptz,
  canceled_at timestamptz,
  grace_until timestamptz,
  restricted_at timestamptz,
  payment_provider text,
  external_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

CREATE TABLE public.organization_feature_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature_code text NOT NULL,
  enabled boolean,
  limit_value integer,
  unlimited boolean NOT NULL DEFAULT false,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_org_overrides ON public.organization_feature_overrides(organization_id, feature_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_feature_overrides TO authenticated;
GRANT ALL ON public.organization_feature_overrides TO service_role;

CREATE TABLE public.billing_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_date date,
  paid_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  method text,
  external_id text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_records TO authenticated;
GRANT ALL ON public.billing_records TO service_role;

CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  action text NOT NULL,
  organization_id uuid,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

-- =========================================================
-- Helper functions (private schema, SECURITY DEFINER)
-- =========================================================

CREATE OR REPLACE FUNCTION private.is_super_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_roles WHERE user_id = _uid AND role = 'super_admin');
$$;
REVOKE EXECUTE ON FUNCTION private.is_super_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.is_super_admin(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_org_member(_uid uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _uid AND organization_id = _org
  );
$$;
REVOKE EXECUTE ON FUNCTION private.is_org_member(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.is_org_member(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.current_org(_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = _uid ORDER BY created_at LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION private.current_org(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.current_org(uuid) TO authenticated, service_role;

-- =========================================================
-- Seed: planos oficiais
-- =========================================================
INSERT INTO public.plans (code, name, description, price, billing_interval, active, public, sort_order)
VALUES
  ('free', 'Gratuito', 'Para começar a organizar a operação solar.', 0, 'month', true, true, 1),
  ('pro', 'Profissional', 'Mais volume comercial e equipe. Em definição.', 0, 'month', false, false, 2),
  ('enterprise', 'Empresarial', 'Recursos avançados, WhatsApp e automações. Em definição.', 0, 'month', false, false, 3);

INSERT INTO public.plan_features (plan_id, feature_code, enabled, limit_value, period)
SELECT p.id, f.code, f.enabled, f.lim, f.period
FROM public.plans p
CROSS JOIN LATERAL (VALUES
  ('crm', true, NULL::integer, 'total'),
  ('proposals', true, NULL, 'total'),
  ('contracts', true, NULL, 'total'),
  ('post_sale', true, NULL, 'total'),
  ('reports', true, NULL, 'total'),
  ('max_clients', true, 10, 'total'),
  ('proposals_per_week', true, 1, 'week'),
  ('contracts_per_week', true, 1, 'week'),
  ('max_users', true, 2, 'total'),
  ('team_members', true, NULL, 'total'),
  ('custom_branding', false, NULL, 'total'),
  ('whatsapp', false, NULL, 'total'),
  ('whatsapp_numbers', false, 0, 'total'),
  ('whatsapp_automation', false, NULL, 'total'),
  ('whatsapp_ai', false, NULL, 'total'),
  ('ai', false, NULL, 'total')
) AS f(code, enabled, lim, period)
WHERE p.code = 'free';

INSERT INTO public.plan_features (plan_id, feature_code, enabled, limit_value, period)
SELECT p.id, f.code, f.enabled, f.lim, f.period
FROM public.plans p
CROSS JOIN LATERAL (VALUES
  ('crm', true, NULL::integer, 'total'),
  ('proposals', true, NULL, 'total'),
  ('contracts', true, NULL, 'total'),
  ('post_sale', true, NULL, 'total'),
  ('reports', true, NULL, 'total'),
  ('max_clients', true, NULL, 'total'),
  ('proposals_per_week', true, NULL, 'week'),
  ('contracts_per_week', true, NULL, 'week'),
  ('max_users', true, NULL, 'total'),
  ('team_members', true, NULL, 'total'),
  ('custom_branding', true, NULL, 'total'),
  ('whatsapp', true, NULL, 'total'),
  ('whatsapp_numbers', true, NULL, 'total'),
  ('whatsapp_automation', true, NULL, 'total'),
  ('whatsapp_ai', true, NULL, 'total'),
  ('ai', true, NULL, 'total')
) AS f(code, enabled, lim, period)
WHERE p.code IN ('pro', 'enterprise');

INSERT INTO public.platform_settings (key, value)
VALUES ('default_grace_period_days', '7'::jsonb);

-- =========================================================
-- Organização inicial INFORSOL + vínculo dos usuários atuais
-- =========================================================
DO $$
DECLARE
  v_org uuid;
  v_owner uuid;
BEGIN
  SELECT id INTO v_owner FROM auth.users WHERE lower(email) = 'stfxfp@gmail.com' LIMIT 1;
  IF v_owner IS NULL THEN
    SELECT id INTO v_owner FROM auth.users ORDER BY created_at LIMIT 1;
  END IF;

  INSERT INTO public.organizations (name, legal_name, status, owner_user_id)
  VALUES ('INFORSOL', 'INFORSOL', 'active', v_owner)
  RETURNING id INTO v_org;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  SELECT v_org, u.id,
         CASE WHEN u.id = v_owner THEN 'owner'
              WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin') THEN 'admin'
              ELSE 'vendedor' END
  FROM auth.users u
  ON CONFLICT DO NOTHING;

  IF v_owner IS NOT NULL THEN
    INSERT INTO public.platform_roles (user_id, role) VALUES (v_owner, 'super_admin')
    ON CONFLICT DO NOTHING;
  END IF;

  -- assinatura interna ilimitada da INFORSOL (plano empresarial, sem cobrança)
  INSERT INTO public.subscriptions (organization_id, plan_id, status, payment_provider)
  SELECT v_org, p.id, 'active', 'internal' FROM public.plans p WHERE p.code = 'enterprise';

  PERFORM set_config('solarflow.bootstrap_org', v_org::text, false);
END $$;

-- =========================================================
-- organization_id nas tabelas de dados + backfill
-- =========================================================
ALTER TABLE public.clients             ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.proposals           ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.contracts           ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.project_stages      ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.stage_items         ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.notifications       ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.proposal_settings   ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.proposal_templates  ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.contract_templates  ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.equipment_catalog   ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.tags                ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.contract_signatures ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

UPDATE public.clients             SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1) WHERE organization_id IS NULL;
UPDATE public.proposals           SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1) WHERE organization_id IS NULL;
UPDATE public.contracts           SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1) WHERE organization_id IS NULL;
UPDATE public.project_stages      SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1) WHERE organization_id IS NULL;
UPDATE public.stage_items         SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1) WHERE organization_id IS NULL;
UPDATE public.notifications       SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1) WHERE organization_id IS NULL;
UPDATE public.proposal_settings   SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1) WHERE organization_id IS NULL;
UPDATE public.proposal_templates  SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1) WHERE organization_id IS NULL;
UPDATE public.contract_templates  SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1) WHERE organization_id IS NULL;
UPDATE public.equipment_catalog   SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1) WHERE organization_id IS NULL;
UPDATE public.tags                SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1) WHERE organization_id IS NULL;
UPDATE public.contract_signatures SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1) WHERE organization_id IS NULL;

CREATE INDEX idx_clients_org ON public.clients(organization_id);
CREATE INDEX idx_proposals_org ON public.proposals(organization_id);
CREATE INDEX idx_contracts_org ON public.contracts(organization_id);
CREATE INDEX idx_project_stages_org ON public.project_stages(organization_id);
CREATE INDEX idx_stage_items_org ON public.stage_items(organization_id);

-- preenche organization_id automaticamente em novos registros
CREATE OR REPLACE FUNCTION public.set_organization_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := private.current_org(auth.uid());
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER set_org_clients             BEFORE INSERT ON public.clients             FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();
CREATE TRIGGER set_org_proposals           BEFORE INSERT ON public.proposals           FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();
CREATE TRIGGER set_org_contracts           BEFORE INSERT ON public.contracts           FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();
CREATE TRIGGER set_org_project_stages      BEFORE INSERT ON public.project_stages      FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();
CREATE TRIGGER set_org_notifications       BEFORE INSERT ON public.notifications       FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();
CREATE TRIGGER set_org_proposal_settings   BEFORE INSERT ON public.proposal_settings   FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();
CREATE TRIGGER set_org_proposal_templates  BEFORE INSERT ON public.proposal_templates  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();
CREATE TRIGGER set_org_contract_templates  BEFORE INSERT ON public.contract_templates  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();
CREATE TRIGGER set_org_equipment_catalog   BEFORE INSERT ON public.equipment_catalog   FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();
CREATE TRIGGER set_org_tags                BEFORE INSERT ON public.tags                FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();

-- stage_items / contract_signatures herdam do pai
CREATE OR REPLACE FUNCTION public.set_stage_item_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id FROM public.project_stages WHERE id = NEW.project_stage_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER set_org_stage_items BEFORE INSERT ON public.stage_items FOR EACH ROW EXECUTE FUNCTION public.set_stage_item_org();

CREATE OR REPLACE FUNCTION public.set_signature_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id FROM public.contracts WHERE id = NEW.contract_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER set_org_contract_signatures BEFORE INSERT ON public.contract_signatures FOR EACH ROW EXECUTE FUNCTION public.set_signature_org();
