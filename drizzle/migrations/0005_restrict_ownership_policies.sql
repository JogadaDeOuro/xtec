-- clients: UPDATE restricted to owner or admin
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
CREATE POLICY "Owners and admins can update clients"
ON public.clients FOR UPDATE TO authenticated
USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role));

-- contracts: UPDATE restricted to owner or admin
DROP POLICY IF EXISTS "Authenticated users can update contracts" ON public.contracts;
CREATE POLICY "Owners and admins can update contracts"
ON public.contracts FOR UPDATE TO authenticated
USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role));

-- project_stages: UPDATE restricted to owner or admin
DROP POLICY IF EXISTS "Authenticated users can update project_stages" ON public.project_stages;
CREATE POLICY "Owners and admins can update project_stages"
ON public.project_stages FOR UPDATE TO authenticated
USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role));

-- stage_items: UPDATE restricted to owner of parent stage or admin
DROP POLICY IF EXISTS "Authenticated users can update stage_items" ON public.stage_items;
CREATE POLICY "Project owners and admins can update stage_items"
ON public.stage_items FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.project_stages ps
  WHERE ps.id = stage_items.project_stage_id
    AND ((ps.user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.project_stages ps
  WHERE ps.id = stage_items.project_stage_id
    AND ((ps.user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role))
));

-- proposals: SELECT / UPDATE / DELETE restricted to owner or admin
DROP POLICY IF EXISTS "Authenticated users can view proposals" ON public.proposals;
CREATE POLICY "Owners and admins can view proposals"
ON public.proposals FOR SELECT TO authenticated
USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can update proposals" ON public.proposals;
CREATE POLICY "Owners and admins can update proposals"
ON public.proposals FOR UPDATE TO authenticated
USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can delete proposals" ON public.proposals;
CREATE POLICY "Owners and admins can delete proposals"
ON public.proposals FOR DELETE TO authenticated
USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role));

-- storage: branding writes restricted to admins
DROP POLICY IF EXISTS "Authenticated can upload branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete branding" ON storage.objects;

CREATE POLICY "Admins can upload branding"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'branding' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update branding"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'branding' AND private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'branding' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete branding"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'branding' AND private.has_role(auth.uid(), 'admin'::app_role));