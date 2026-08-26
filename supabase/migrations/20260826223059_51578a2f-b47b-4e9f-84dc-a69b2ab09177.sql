CREATE TABLE public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_templates TO authenticated;
GRANT ALL ON public.contract_templates TO service_role;

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view contract templates"
  ON public.contract_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage contract templates"
  ON public.contract_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();