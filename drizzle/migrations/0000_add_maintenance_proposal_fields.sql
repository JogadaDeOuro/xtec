ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'usina',
  ADD COLUMN IF NOT EXISTS area_m2 numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_por_modulo numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manutencao_itens text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS origem_tipo text,
  ADD COLUMN IF NOT EXISTS origem_ref text;