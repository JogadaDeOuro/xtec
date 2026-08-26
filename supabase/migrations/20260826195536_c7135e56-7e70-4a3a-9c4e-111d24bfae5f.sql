
CREATE OR REPLACE FUNCTION public.accept_proposal_public(_token uuid, _document text, _garantia boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.proposals%ROWTYPE;
  c public.clients%ROWTYPE;
  v_doc text;
  v_gar numeric := 0;
  v_contract_id uuid;
  v_signing text;
  v_stage_id uuid;
  v_track text;
  v_owner uuid;
  v_names text[] := ARRAY['Aprovação do Projeto','Vistoria Técnica','Compra de Materiais','Entrega de Materiais','Instalação Estrutural','Instalação Elétrica','Comissionamento','Vistoria da Concessionária','Ativação do Sistema'];
  i int;
BEGIN
  SELECT * INTO p FROM public.proposals WHERE public_token = _token;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','not_found'); END IF;

  v_doc := regexp_replace(coalesce(_document,''), '\D', '', 'g');
  IF length(v_doc) NOT IN (11,14) THEN RETURN jsonb_build_object('error','invalid_document'); END IF;

  SELECT * INTO c FROM public.clients WHERE id = p.client_id;
  IF FOUND AND coalesce(regexp_replace(coalesce(c.document,''), '\D', '', 'g'),'') <> ''
     AND regexp_replace(c.document, '\D', '', 'g') <> v_doc THEN
    RETURN jsonb_build_object('error','document_mismatch');
  END IF;

  v_gar := CASE WHEN coalesce(_garantia,false) THEN round(p.valor_sistema * 0.08) ELSE 0 END;

  UPDATE public.proposals
     SET status = 'aceita',
         accepted_at = coalesce(accepted_at, now()),
         garantia_estendida = coalesce(_garantia,false),
         garantia_estendida_valor = v_gar,
         updated_at = now()
   WHERE id = p.id;

  SELECT id, signing_token INTO v_contract_id, v_signing
    FROM public.contracts WHERE proposal_id = p.id::text ORDER BY created_at LIMIT 1;

  IF v_contract_id IS NULL THEN
    v_signing := encode(extensions.gen_random_bytes(16), 'hex');
    INSERT INTO public.contracts (
      proposal_id, client_id, client_name, client_document, client_email, client_phone,
      client_address, client_city, client_state, system_type, potencia_kwp, valor,
      condicao_pagamento, status, signing_token, user_id, garantia_estendida, garantia_estendida_valor
    ) VALUES (
      p.id::text, p.client_id, p.client_name, coalesce(c.document, _document), c.email, c.phone,
      c.address, c.city, c.state, p.system_type, p.potencia_kwp, p.valor_sistema + v_gar,
      p.condicao_pagamento, 'enviado', v_signing, p.user_id, coalesce(_garantia,false), v_gar
    ) RETURNING id INTO v_contract_id;
  ELSIF v_signing IS NULL THEN
    v_signing := encode(extensions.gen_random_bytes(16), 'hex');
    UPDATE public.contracts SET signing_token = v_signing WHERE id = v_contract_id;
  END IF;

  IF p.client_id IS NOT NULL THEN
    SELECT id, tracking_token INTO v_stage_id, v_track
      FROM public.project_stages WHERE client_id = p.client_id ORDER BY created_at LIMIT 1;
    IF v_stage_id IS NULL THEN
      v_owner := coalesce(p.user_id, c.user_id);
      IF v_owner IS NOT NULL THEN
        INSERT INTO public.project_stages (client_id, user_id)
        VALUES (p.client_id, v_owner)
        RETURNING id, tracking_token INTO v_stage_id, v_track;
        FOR i IN 1..array_length(v_names,1) LOOP
          INSERT INTO public.stage_items (project_stage_id, name, position, status)
          VALUES (v_stage_id, v_names[i], i - 1, 'pendente');
        END LOOP;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'contract_id', v_contract_id,
    'signing_token', v_signing,
    'tracking_token', v_track,
    'garantia_estendida_valor', v_gar
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_proposal_public(uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_proposal_public(uuid, text, boolean) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_client_portal(_document text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc text;
  c public.clients%ROWTYPE;
  v_result jsonb;
BEGIN
  v_doc := regexp_replace(coalesce(_document,''), '\D', '', 'g');
  IF length(v_doc) NOT IN (11,14) THEN RETURN jsonb_build_object('error','invalid_document'); END IF;

  SELECT * INTO c FROM public.clients
   WHERE regexp_replace(coalesce(document,''), '\D', '', 'g') = v_doc
   ORDER BY created_at LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','not_found'); END IF;

  SELECT jsonb_build_object(
    'client', jsonb_build_object('id', c.id, 'name', c.name, 'city', c.city, 'state', c.state),
    'proposals', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id, 'numero', p.numero, 'public_token', p.public_token, 'status', p.status,
        'system_type', p.system_type, 'potencia_kwp', p.potencia_kwp, 'valor_sistema', p.valor_sistema,
        'garantia_estendida', p.garantia_estendida, 'garantia_estendida_valor', p.garantia_estendida_valor,
        'created_at', p.created_at
      ) ORDER BY p.created_at DESC)
      FROM public.proposals p WHERE p.client_id = c.id
    ), '[]'::jsonb),
    'contracts', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', k.id, 'status', k.status, 'valor', k.valor, 'signing_token', k.signing_token,
        'signed_at', k.signed_at, 'created_at', k.created_at,
        'signatures', coalesce((SELECT jsonb_agg(s.signer_type) FROM public.contract_signatures s WHERE s.contract_id = k.id), '[]'::jsonb)
      ) ORDER BY k.created_at DESC)
      FROM public.contracts k WHERE k.client_id = c.id
    ), '[]'::jsonb),
    'tracking_token', (SELECT ps.tracking_token FROM public.project_stages ps WHERE ps.client_id = c.id ORDER BY ps.created_at LIMIT 1),
    'stages', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'name', si.name, 'status', si.status, 'position', si.position,
        'data_prevista', si.data_prevista, 'data_real', si.data_real, 'observacoes', si.observacoes
      ) ORDER BY si.position)
      FROM public.stage_items si
      WHERE si.project_stage_id = (SELECT ps.id FROM public.project_stages ps WHERE ps.client_id = c.id ORDER BY ps.created_at LIMIT 1)
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_portal(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_portal(text) TO anon, authenticated;
