CREATE TABLE public.proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text,
  user_id uuid,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  system_type text NOT NULL DEFAULT 'on-grid',
  potencia_kwp numeric NOT NULL DEFAULT 0,
  valor_sistema numeric NOT NULL DEFAULT 0,
  producao_estimada numeric NOT NULL DEFAULT 0,
  economia_mensal numeric NOT NULL DEFAULT 0,
  economia_anual numeric NOT NULL DEFAULT 0,
  payback_anos numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'rascunho',
  condicao_pagamento text,
  desconto numeric NOT NULL DEFAULT 0,
  margem numeric NOT NULL DEFAULT 0,
  comissao numeric NOT NULL DEFAULT 0,
  consumo_medio numeric NOT NULL DEFAULT 0,
  garantia_estendida boolean NOT NULL DEFAULT false,
  garantia_estendida_valor numeric NOT NULL DEFAULT 0,
  viewed_at timestamp with time zone,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view proposals" ON public.proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert proposals" ON public.proposals FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update proposals" ON public.proposals FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete proposals" ON public.proposals FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_proposals_client_id ON public.proposals(client_id);
CREATE INDEX idx_proposals_created_at ON public.proposals(created_at DESC);