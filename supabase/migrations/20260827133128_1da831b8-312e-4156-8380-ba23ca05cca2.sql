ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS finalidade text NOT NULL DEFAULT 'consumo',
  ADD COLUMN IF NOT EXISTS desagio_pct numeric NOT NULL DEFAULT 0;