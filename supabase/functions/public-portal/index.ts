import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^[A-Za-z0-9-]{8,128}$/;
const DOCUMENT_RE = /^\d{11}$|^\d{14}$/;

type PublicAction =
  | 'get-proposal'
  | 'accept-proposal'
  | 'get-client-portal'
  | 'get-contract'
  | 'sign-contract'
  | 'get-tracking';

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Método não permitido' }, 405);

  try {
    const length = Number(req.headers.get('content-length') || '0');
    if (length > 32_768) return response({ error: 'Requisição inválida' }, 413);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return response({ error: 'Requisição inválida' }, 400);

    const action = body.action as PublicAction;
    const args = body.args && typeof body.args === 'object' ? body.args : {};
    const client = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    let result: { data: unknown; error: { message?: string } | null };

    if (action === 'get-proposal') {
      const token = text(args.token, 36);
      if (!UUID_RE.test(token)) return response({ error: 'Token inválido' }, 400);
      result = await client.rpc('get_public_proposal', { _token: token });
    } else if (action === 'accept-proposal') {
      const token = text(args.token, 36);
      const document = text(args.document, 14).replace(/\D/g, '');
      const condition = args.condition == null ? null : text(args.condition, 300);
      if (!UUID_RE.test(token) || !DOCUMENT_RE.test(document)) return response({ error: 'Dados inválidos' }, 400);
      result = await client.rpc('accept_proposal_public', {
        _token: token,
        _document: document,
        _garantia: args.warranty === true,
        _condicao: condition || null,
      });
    } else if (action === 'get-client-portal') {
      const document = text(args.document, 14).replace(/\D/g, '');
      if (!DOCUMENT_RE.test(document)) return response({ error: 'Documento inválido' }, 400);
      result = await client.rpc('get_client_portal', { _document: document });
    } else if (action === 'get-contract') {
      const token = text(args.token, 128);
      if (!TOKEN_RE.test(token)) return response({ error: 'Token inválido' }, 400);
      result = await client.rpc('get_contract_for_signing', { _token: token });
    } else if (action === 'get-tracking') {
      const token = text(args.token, 128);
      if (!TOKEN_RE.test(token)) return response({ error: 'Token inválido' }, 400);
      result = await client.rpc('get_public_tracking', { _token: token });
    } else if (action === 'sign-contract') {
      const token = text(args.token, 128);
      const name = text(args.name, 200);
      const document = text(args.document, 32);
      const email = text(args.email, 200);
      if (!TOKEN_RE.test(token) || name.length < 2 || !DOCUMENT_RE.test(document.replace(/\D/g, '')) || !/^\S+@\S+\.\S+$/.test(email)) {
        return response({ error: 'Dados inválidos' }, 400);
      }
      result = await client.rpc('sign_contract_public', {
        _token: token,
        _name: name,
        _document: document,
        _email: email,
        _ip: text(args.ip, 100),
        _location: text(args.location, 200),
        _user_agent: text(args.userAgent, 500),
        _hash: text(args.hash, 100),
        _signature_font: text(args.signatureFont, 100),
      });
    } else {
      return response({ error: 'Ação inválida' }, 400);
    }

    if (result.error) {
      console.error('Public portal action failed', action, result.error.message);
      return response({ error: 'Não foi possível concluir a solicitação' }, 400);
    }
    return response({ data: result.data });
  } catch (error) {
    console.error('Public portal unexpected error', error instanceof Error ? error.message : 'unknown');
    return response({ error: 'Não foi possível concluir a solicitação' }, 500);
  }
});