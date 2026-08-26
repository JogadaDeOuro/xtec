ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS condicoes_alternativas text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.accept_proposal_public(_token uuid, _document text, _garantia boolean, _condicao text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_cond text;
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

  -- condição escolhida pelo cliente (apenas se estiver entre as ofertadas)
  v_cond := p.condicao_pagamento;
  IF _condicao IS NOT NULL AND length(trim(_condicao)) > 0
     AND (trim(_condicao) = coalesce(p.condicao_pagamento,'') OR trim(_condicao) = ANY(coalesce(p.condicoes_alternativas, '{}'))) THEN
    v_cond := trim(_condicao);
  END IF;

  v_gar := CASE WHEN coalesce(_garantia,false) THEN round(p.valor_sistema * 0.08) ELSE 0 END;

  UPDATE public.proposals
     SET status = 'aceita',
         accepted_at = coalesce(accepted_at, now()),
         garantia_estendida = coalesce(_garantia,false),
         garantia_estendida_valor = v_gar,
         condicao_pagamento = v_cond,
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
      v_cond, 'enviado', v_signing, p.user_id, coalesce(_garantia,false), v_gar
    ) RETURNING id INTO v_contract_id;
  ELSE
    UPDATE public.contracts SET condicao_pagamento = v_cond WHERE id = v_contract_id;
    IF v_signing IS NULL THEN
      v_signing := encode(extensions.gen_random_bytes(16), 'hex');
      UPDATE public.contracts SET signing_token = v_signing WHERE id = v_contract_id;
    END IF;
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
    'condicao_pagamento', v_cond,
    'garantia_estendida_valor', v_gar
  );
END;
$function$;