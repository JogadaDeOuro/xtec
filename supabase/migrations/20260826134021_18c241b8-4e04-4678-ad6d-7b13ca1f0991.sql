ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS garantia_estendida boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS garantia_estendida_valor numeric NOT NULL DEFAULT 0;