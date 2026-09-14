CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
CREATE POLICY "Owners and admins can view clients" ON public.clients FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Authenticated users can view contracts" ON public.contracts;
CREATE POLICY "Owners and admins can view contracts" ON public.contracts FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Authenticated users can view signatures" ON public.contract_signatures;
CREATE POLICY "Contract owners and admins can view signatures" ON public.contract_signatures FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_signatures.contract_id AND (c.user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))));
DROP POLICY IF EXISTS "Anyone can view proposal settings" ON public.proposal_settings;
REVOKE ALL ON public.proposal_settings FROM anon;
GRANT SELECT ON public.proposal_settings TO authenticated;
GRANT ALL ON public.proposal_settings TO service_role;
CREATE POLICY "Authenticated users can view proposal settings" ON public.proposal_settings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can view project_stages" ON public.project_stages;
CREATE POLICY "Owners and admins can view project_stages" ON public.project_stages FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Authenticated users can view stage_items" ON public.stage_items;
CREATE POLICY "Project owners and admins can view stage_items" ON public.stage_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.project_stages ps WHERE ps.id = stage_items.project_stage_id AND (ps.user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))));

ALTER POLICY "Admins can delete clients" ON public.clients USING (private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Admins manage contract templates" ON public.contract_templates USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Admins can delete contracts" ON public.contracts USING (private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Admins manage equipment" ON public.equipment_catalog USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Admins can delete profiles" ON public.profiles USING (private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Admins can view all profiles" ON public.profiles USING (private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Admins can delete project_stages" ON public.project_stages USING (private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Admins manage proposal settings" ON public.proposal_settings USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Admins manage templates" ON public.proposal_templates USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Admins can delete stage_items" ON public.stage_items USING (private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Admins can manage tags" ON public.tags USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Admins can manage page permissions" ON public.user_page_permissions USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Admins can delete roles" ON public.user_roles USING (private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Admins can insert roles" ON public.user_roles WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Admins can update roles" ON public.user_roles USING (private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Admins can view all roles" ON public.user_roles USING (private.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON FUNCTION public.accept_proposal_public(uuid, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accept_proposal_public(uuid, text, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_client_portal(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_contract_for_signing(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_proposal(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_tracking(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sign_contract_public(text, text, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_proposal_public(uuid, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.accept_proposal_public(uuid, text, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_client_portal(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_contract_for_signing(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_public_proposal(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_public_tracking(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sign_contract_public(text, text, text, text, text, text, text, text, text) TO service_role;