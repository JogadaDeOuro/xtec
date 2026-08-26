ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS tarifa_kwh numeric NOT NULL DEFAULT 0.85,
  ADD COLUMN IF NOT EXISTS num_modulos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS potencia_modulo_w integer NOT NULL DEFAULT 700,
  ADD COLUMN IF NOT EXISTS consultor text,
  ADD COLUMN IF NOT EXISTS versao integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS doc_config jsonb;

CREATE TABLE IF NOT EXISTS public.proposal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'default',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS proposal_settings_scope_idx ON public.proposal_settings(scope);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_settings TO authenticated;
GRANT SELECT ON public.proposal_settings TO anon;
GRANT ALL ON public.proposal_settings TO service_role;
ALTER TABLE public.proposal_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view proposal settings" ON public.proposal_settings;
CREATE POLICY "Anyone can view proposal settings" ON public.proposal_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage proposal settings" ON public.proposal_settings;
CREATE POLICY "Admins manage proposal settings" ON public.proposal_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.proposal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_templates TO authenticated;
GRANT SELECT ON public.proposal_templates TO anon;
GRANT ALL ON public.proposal_templates TO service_role;
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view templates" ON public.proposal_templates;
CREATE POLICY "Anyone can view templates" ON public.proposal_templates FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage templates" ON public.proposal_templates;
CREATE POLICY "Admins manage templates" ON public.proposal_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.equipment_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'modulo',
  manufacturer text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  potencia_w numeric NOT NULL DEFAULT 0,
  description text DEFAULT '',
  image_url text,
  datasheet_url text,
  warranty_defect_years integer NOT NULL DEFAULT 0,
  warranty_performance_years integer NOT NULL DEFAULT 0,
  efficiency numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_catalog TO authenticated;
GRANT SELECT ON public.equipment_catalog TO anon;
GRANT ALL ON public.equipment_catalog TO service_role;
ALTER TABLE public.equipment_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view equipment" ON public.equipment_catalog;
CREATE POLICY "Anyone can view equipment" ON public.equipment_catalog FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage equipment" ON public.equipment_catalog;
CREATE POLICY "Admins manage equipment" ON public.equipment_catalog FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS proposal_settings_updated_at ON public.proposal_settings;
CREATE TRIGGER proposal_settings_updated_at BEFORE UPDATE ON public.proposal_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS proposal_templates_updated_at ON public.proposal_templates;
CREATE TRIGGER proposal_templates_updated_at BEFORE UPDATE ON public.proposal_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS equipment_catalog_updated_at ON public.equipment_catalog;
CREATE TRIGGER equipment_catalog_updated_at BEFORE UPDATE ON public.equipment_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP POLICY IF EXISTS "Branding files are publicly readable" ON storage.objects;
CREATE POLICY "Branding files are publicly readable" ON storage.objects FOR SELECT
  USING (bucket_id = 'branding');
DROP POLICY IF EXISTS "Authenticated can upload branding" ON storage.objects;
CREATE POLICY "Authenticated can upload branding" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding');
DROP POLICY IF EXISTS "Authenticated can update branding" ON storage.objects;
CREATE POLICY "Authenticated can update branding" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'branding');
DROP POLICY IF EXISTS "Authenticated can delete branding" ON storage.objects;
CREATE POLICY "Authenticated can delete branding" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'branding');