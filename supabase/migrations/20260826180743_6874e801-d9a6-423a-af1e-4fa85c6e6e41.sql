ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS public_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS proposals_public_token_idx ON public.proposals(public_token);

CREATE OR REPLACE FUNCTION public.get_public_proposal(_token uuid)
RETURNS SETOF public.proposals
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.proposals WHERE public_token = _token LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_proposal(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_proposal(uuid) TO anon, authenticated;