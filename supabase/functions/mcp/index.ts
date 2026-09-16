import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.0';

const PROTOCOL_VERSION = '2025-06-18';
const SERVER_INFO = { name: 'inforsol-propostas-contratos', version: '1.0.0' };
const MAX_BODY_BYTES = 64 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_ORIGINS = new Set([
  'https://solarflow.inforsol.group',
  'https://inforsol-app.lovable.app',
]);
const rateLimits = new Map<string, { count: number; resetAt: number }>();

type RpcId = string | number | null;
type JsonRpcRequest = { jsonrpc?: string; id?: RpcId; method?: string; params?: Record<string, unknown> };

const tools = [
  {
    name: 'listar_clientes',
    description: 'Lista clientes acessíveis ao usuário autenticado, com filtros opcionais.',
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: {
        busca: { type: 'string', description: 'Parte do nome, telefone ou WhatsApp.' },
        status: { type: 'string', description: 'Status exato do cliente.' },
        responsavel_id: { type: 'string', description: 'UUID do responsável; útil para administradores.' },
        limite: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
      },
    },
  },
  {
    name: 'consultar_cliente',
    description: 'Consulta os dados de um cliente pelo UUID, respeitando as permissões do usuário.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['cliente_id'],
      properties: { cliente_id: { type: 'string', format: 'uuid' } },
    },
  },
  {
    name: 'listar_propostas',
    description: 'Lista propostas acessíveis ao usuário, com filtros por cliente, número ou status.',
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: {
        cliente_id: { type: 'string', format: 'uuid' }, numero: { type: 'string' }, status: { type: 'string' },
        limite: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
      },
    },
  },
  {
    name: 'consultar_proposta',
    description: 'Consulta o resumo comercial de uma proposta pelo UUID.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['proposta_id'],
      properties: { proposta_id: { type: 'string', format: 'uuid' } },
    },
  },
  {
    name: 'listar_contratos',
    description: 'Lista contratos acessíveis ao usuário, com filtros por cliente e status.',
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: {
        cliente_id: { type: 'string', format: 'uuid' }, status: { type: 'string' },
        limite: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
      },
    },
  },
  {
    name: 'consultar_contrato',
    description: 'Consulta o resumo e o estado de assinatura de um contrato pelo UUID.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['contrato_id'],
      properties: { contrato_id: { type: 'string', format: 'uuid' } },
    },
  },
  {
    name: 'consultar_etapas',
    description: 'Consulta o andamento e os itens de execução de um projeto acessível ao usuário.',
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: { cliente_id: { type: 'string', format: 'uuid' }, projeto_id: { type: 'string', format: 'uuid' } },
    },
  },
] as const;

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://solarflow.inforsol.group',
    'Access-Control-Allow-Headers': 'authorization, content-type, mcp-protocol-version, mcp-session-id',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Expose-Headers': 'WWW-Authenticate, MCP-Protocol-Version',
    'Vary': 'Origin',
  };
}

function rpcResult(id: RpcId, result: unknown, headers: HeadersInit) {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
    status: 200, headers: { ...headers, 'Content-Type': 'application/json', 'MCP-Protocol-Version': PROTOCOL_VERSION },
  });
}

function rpcError(id: RpcId, code: number, message: string, status: number, headers: HeadersInit) {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }), {
    status, headers: { ...headers, 'Content-Type': 'application/json', 'MCP-Protocol-Version': PROTOCOL_VERSION },
  });
}

function toolText(value: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }], structuredContent: value };
}

function getString(args: Record<string, unknown>, key: string, max = 200) {
  const value = args[key];
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function getUuid(args: Record<string, unknown>, key: string, required = false) {
  const value = getString(args, key, 36);
  if (!value && !required) return '';
  if (!UUID_RE.test(value)) throw new Error(`${key} inválido`);
  return value;
}

function getLimit(args: Record<string, unknown>) {
  const value = typeof args.limite === 'number' ? Math.trunc(args.limite) : 20;
  return Math.max(1, Math.min(50, value));
}

function isRateLimited(userId: string) {
  const now = Date.now();
  const current = rateLimits.get(userId);
  if (!current || current.resetAt <= now) {
    rateLimits.set(userId, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 60;
}

async function callTool(client: ReturnType<typeof createClient>, name: string, args: Record<string, unknown>) {
  if (name === 'listar_clientes') {
    let query = client.from('clients')
      .select('id,name,phone,whatsapp,email,city,state,client_type,status,vendedor,tags,created_at,updated_at,user_id')
      .order('updated_at', { ascending: false }).limit(getLimit(args));
    const busca = getString(args, 'busca', 100).replace(/[%(),]/g, '');
    const status = getString(args, 'status', 40);
    const responsavelId = getUuid(args, 'responsavel_id');
    if (busca) query = query.or(`name.ilike.%${busca}%,phone.ilike.%${busca}%,whatsapp.ilike.%${busca}%`);
    if (status) query = query.eq('status', status);
    if (responsavelId) query = query.eq('user_id', responsavelId);
    const { data, error } = await query;
    if (error) throw error;
    return { clientes: data ?? [], total_retornado: data?.length ?? 0 };
  }

  if (name === 'consultar_cliente') {
    const id = getUuid(args, 'cliente_id', true);
    const { data, error } = await client.from('clients')
      .select('id,name,document,phone,whatsapp,email,address,city,state,project_location,concessionaria,consumo_medio,client_type,status,vendedor,origem,tags,notes,created_at,updated_at,user_id')
      .eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Cliente não encontrado ou sem permissão');
    return data;
  }

  if (name === 'listar_propostas') {
    let query = client.from('proposals')
      .select('id,numero,versao,client_id,client_name,status,tipo,system_type,potencia_kwp,valor_sistema,garantia_estendida_valor,created_at,updated_at,accepted_at,user_id')
      .order('updated_at', { ascending: false }).limit(getLimit(args));
    const clientId = getUuid(args, 'cliente_id');
    const numero = getString(args, 'numero', 50);
    const status = getString(args, 'status', 40);
    if (clientId) query = query.eq('client_id', clientId);
    if (numero) query = query.ilike('numero', `%${numero.replace(/[%(),]/g, '')}%`);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return { propostas: data ?? [], total_retornado: data?.length ?? 0 };
  }

  if (name === 'consultar_proposta') {
    const id = getUuid(args, 'proposta_id', true);
    const { data, error } = await client.from('proposals')
      .select('id,numero,versao,client_id,client_name,status,tipo,system_type,finalidade,consumo_medio,potencia_kwp,num_modulos,area_m2,producao_estimada,economia_mensal,economia_anual,payback_anos,valor_sistema,desconto,garantia_estendida,garantia_estendida_valor,condicao_pagamento,condicoes_alternativas,consultor,created_at,updated_at,viewed_at,accepted_at,user_id')
      .eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Proposta não encontrada ou sem permissão');
    return data;
  }

  if (name === 'listar_contratos') {
    let query = client.from('contracts')
      .select('id,client_id,proposal_id,client_name,status,system_type,potencia_kwp,valor,garantia_estendida,garantia_estendida_valor,created_at,updated_at,signed_at,user_id')
      .order('updated_at', { ascending: false }).limit(getLimit(args));
    const clientId = getUuid(args, 'cliente_id');
    const status = getString(args, 'status', 40);
    if (clientId) query = query.eq('client_id', clientId);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return { contratos: data ?? [], total_retornado: data?.length ?? 0 };
  }

  if (name === 'consultar_contrato') {
    const id = getUuid(args, 'contrato_id', true);
    const { data, error } = await client.from('contracts')
      .select('id,client_id,proposal_id,client_name,client_document,client_email,client_phone,client_address,client_city,client_state,status,system_type,potencia_kwp,valor,condicao_pagamento,garantia_estendida,garantia_estendida_valor,created_at,updated_at,signed_at,user_id')
      .eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Contrato não encontrado ou sem permissão');
    return data;
  }

  if (name === 'consultar_etapas') {
    const clientId = getUuid(args, 'cliente_id');
    const projectId = getUuid(args, 'projeto_id');
    if (!clientId && !projectId) throw new Error('Informe cliente_id ou projeto_id');
    let query = client.from('project_stages')
      .select('id,client_id,created_at,updated_at,user_id').order('updated_at', { ascending: false }).limit(20);
    if (projectId) query = query.eq('id', projectId);
    if (clientId) query = query.eq('client_id', clientId);
    const { data: projects, error } = await query;
    if (error) throw error;
    const ids = (projects ?? []).map((project) => project.id);
    if (ids.length === 0) return { projetos: [] };
    const [{ data: items, error: itemsError }, { data: clients, error: clientsError }] = await Promise.all([
      client.from('stage_items').select('id,project_stage_id,name,position,status,data_prevista,data_real,responsavel,observacoes,created_at').in('project_stage_id', ids).order('position'),
      client.from('clients').select('id,name,status').in('id', (projects ?? []).map((project) => project.client_id)),
    ]);
    if (itemsError) throw itemsError;
    if (clientsError) throw clientsError;
    return {
      projetos: (projects ?? []).map((project) => ({
        ...project,
        cliente: (clients ?? []).find((candidate) => candidate.id === project.client_id) ?? null,
        etapas: (items ?? []).filter((item) => item.project_stage_id === project.id),
      })),
    };
  }

  throw new Error('Ferramenta desconhecida');
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const url = new URL(req.url);
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const resourceUrl = `${supabaseUrl}/functions/v1/mcp`;
  const authBase = `${supabaseUrl}/auth/v1`;

  if (req.method === 'GET' && url.pathname.endsWith('/.well-known/oauth-protected-resource')) {
    return new Response(JSON.stringify({ resource: resourceUrl, authorization_servers: [authBase], bearer_methods_supported: ['header'] }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  if (req.method !== 'POST') return rpcError(null, -32600, 'Método não permitido', 405, cors);

  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) return rpcError(null, -32600, 'Requisição muito grande', 413, cors);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Autenticação necessária' }), {
      status: 401,
      headers: {
        ...cors,
        'Content-Type': 'application/json',
        'WWW-Authenticate': `Bearer resource_metadata="${resourceUrl}/.well-known/oauth-protected-resource"`,
      },
    });
  }

  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) return rpcError(null, -32603, 'Servidor não configurado', 500, cors);
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) return rpcError(null, -32001, 'Sessão inválida ou expirada', 401, cors);
  if (isRateLimited(userData.user.id)) return rpcError(null, -32029, 'Muitas solicitações. Aguarde um minuto.', 429, cors);

  const request = await req.json().catch(() => null) as JsonRpcRequest | null;
  if (!request || request.jsonrpc !== '2.0' || typeof request.method !== 'string') {
    return rpcError(request?.id ?? null, -32600, 'Requisição JSON-RPC inválida', 400, cors);
  }

  if (request.method === 'initialize') {
    return rpcResult(request.id ?? null, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: SERVER_INFO,
      instructions: 'Ferramentas somente leitura do Inforsol. O acesso respeita as permissões do usuário autenticado.',
    }, cors);
  }
  if (request.method === 'notifications/initialized') return new Response(null, { status: 202, headers: cors });
  if (request.method === 'ping') return rpcResult(request.id ?? null, {}, cors);
  if (request.method === 'tools/list') return rpcResult(request.id ?? null, { tools }, cors);

  if (request.method === 'tools/call') {
    const name = typeof request.params?.name === 'string' ? request.params.name : '';
    const args = request.params?.arguments && typeof request.params.arguments === 'object'
      ? request.params.arguments as Record<string, unknown> : {};
    try {
      const result = await callTool(client, name, args);
      console.log(JSON.stringify({ event: 'mcp_tool_called', tool: name, user_id: userData.user.id }));
      return rpcResult(request.id ?? null, toolText(result), cors);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível consultar os dados';
      console.error(JSON.stringify({ event: 'mcp_tool_failed', tool: name, user_id: userData.user.id, message }));
      return rpcResult(request.id ?? null, { content: [{ type: 'text', text: message }], isError: true }, cors);
    }
  }

  return rpcError(request.id ?? null, -32601, 'Método não encontrado', 404, cors);
});