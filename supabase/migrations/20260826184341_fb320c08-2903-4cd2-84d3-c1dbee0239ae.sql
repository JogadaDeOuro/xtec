
-- 1. Remove overly permissive anon policies
DROP POLICY IF EXISTS "Anon can view signatures" ON public.contract_signatures;
DROP POLICY IF EXISTS "Anon can insert client signatures via token" ON public.contract_signatures;
DROP POLICY IF EXISTS "Anon can view contracts by token" ON public.contracts;
DROP POLICY IF EXISTS "Anon can update contracts for signing" ON public.contracts;
DROP POLICY IF EXISTS "Public can view by tracking_token" ON public.project_stages;
DROP POLICY IF EXISTS "Public can view stage_items by project" ON public.stage_items;

REVOKE ALL ON public.contracts FROM anon;
REVOKE ALL ON public.contract_signatures FROM anon;
REVOKE ALL ON public.project_stages FROM anon;
REVOKE ALL ON public.stage_items FROM anon;

-- 2. Token-scoped public access via RPCs
CREATE OR REPLACE FUNCTION public.get_contract_for_signing(_token text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'id', c.id,
    'client_name', c.client_name,
    'client_document', c.client_document,
    'system_type', c.system_type,
    'potencia_kwp', c.potencia_kwp,
    'valor', c.valor,
    'condicao_pagamento', c.condicao_pagamento,
    'status', c.status,
    'signatures', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('signer_type', s.signer_type))
      FROM public.contract_signatures s WHERE s.contract_id = c.id
    ), '[]'::jsonb)
  )
  FROM public.contracts c
  WHERE c.signing_token IS NOT NULL
    AND _token IS NOT NULL
    AND c.signing_token = _token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.sign_contract_public(
  _token text,
  _name text,
  _document text,
  _email text,
  _ip text,
  _location text,
  _user_agent text,
  _hash text,
  _signature_font text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  c public.contracts%ROWTYPE;
  has_empresa boolean;
  new_status text;
BEGIN
  IF _token IS NULL OR length(trim(_token)) = 0 THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;
  IF _name IS NULL OR length(trim(_name)) < 2 OR length(_name) > 200 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;
  IF _document IS NULL OR length(regexp_replace(_document, '\D', '', 'g')) NOT IN (11, 14) THEN
    RAISE EXCEPTION 'invalid_document';
  END IF;
  IF _email IS NULL OR _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(_email) > 200 THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  SELECT * INTO c FROM public.contracts
   WHERE signing_token IS NOT NULL AND signing_token = _token LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'contract_not_found';
  END IF;

  IF EXISTS (SELECT 1 FROM public.contract_signatures s
              WHERE s.contract_id = c.id AND s.signer_type = 'cliente') THEN
    RAISE EXCEPTION 'already_signed';
  END IF;

  INSERT INTO public.contract_signatures (
    contract_id, signer_type, name, document, email, signed_at,
    ip, location, user_agent, hash, signature_font
  ) VALUES (
    c.id, 'cliente', trim(_name), trim(_document), trim(_email), now(),
    left(COALESCE(_ip, ''), 100), left(COALESCE(_location, ''), 200),
    left(COALESCE(_user_agent, ''), 500), left(COALESCE(_hash, ''), 100),
    left(COALESCE(_signature_font, ''), 100)
  );

  has_empresa := EXISTS (SELECT 1 FROM public.contract_signatures s
                          WHERE s.contract_id = c.id AND s.signer_type = 'empresa');
  new_status := CASE WHEN has_empresa THEN 'assinado' ELSE 'enviado' END;

  UPDATE public.contracts
     SET status = new_status,
         signed_at = CASE WHEN new_status = 'assinado' THEN now() ELSE signed_at END
   WHERE id = c.id;

  RETURN jsonb_build_object('contract_id', c.id, 'status', new_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_tracking(_token text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'client_name', COALESCE(cl.name, 'Projeto'),
    'items', COALESCE((
      SELECT jsonb_agg(to_jsonb(i) ORDER BY i.position)
      FROM public.stage_items i WHERE i.project_stage_id = ps.id
    ), '[]'::jsonb)
  )
  FROM public.project_stages ps
  LEFT JOIN public.clients cl ON cl.id = ps.client_id
  WHERE ps.tracking_token IS NOT NULL
    AND _token IS NOT NULL
    AND ps.tracking_token = _token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_contract_for_signing(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sign_contract_public(text,text,text,text,text,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_tracking(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_contract_for_signing(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_contract_public(text,text,text,text,text,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_tracking(text) TO anon, authenticated;

-- 3. Revoke execute on internal SECURITY DEFINER / trigger functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_stage_item_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.get_public_proposal(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_proposal(uuid) TO anon, authenticated;
