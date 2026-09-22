ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS manutencao_regime text NOT NULL DEFAULT 'pontual',
  ADD COLUMN IF NOT EXISTS manutencao_visitas_ano integer NOT NULL DEFAULT 1;