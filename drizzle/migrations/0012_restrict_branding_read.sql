DROP POLICY IF EXISTS "Branding files are publicly readable" ON storage.objects;
CREATE POLICY "Admins can read branding" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'branding' AND private.has_role(auth.uid(), 'admin'::app_role));