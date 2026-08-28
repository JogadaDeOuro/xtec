import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TEMPLATE_VERSION = '2026.08.1';
const ENGINE = 'server-chromium';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Limite simples de frequência por usuário (por isolate). */
const hits = new Map<string, number[]>();
function rateLimited(userId: string): boolean {
  const now = Date.now();
  const list = (hits.get(userId) ?? []).filter(t => now - t < 60_000);
  list.push(now);
  hits.set(userId, list);
  return list.length > 10;
}

/** Só aceitamos origens da própria aplicação — evita SSRF. */
function safeOrigin(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  if (!/(^|\.)lovable\.app$/.test(u.hostname) && !/(^|\.)lovableproject\.com$/.test(u.hostname)) return null;
  return `${u.protocol}//${u.host}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('BROWSERLESS_API_KEY');
    if (!apiKey) {
      return json({ error: 'PDF server-side não configurado' }, 503);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Não autenticado' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: 'Não autenticado' }, 401);
    if (rateLimited(user.id)) return json({ error: 'Muitas gerações em sequência. Aguarde um instante.' }, 429);

    const body = await req.json().catch(() => ({}));
    const proposalId = body?.proposalId;
    if (typeof proposalId !== 'string' || !UUID_RE.test(proposalId)) {
      return json({ error: 'proposalId inválido' }, 400);
    }
    // O Chromium remoto só pode renderizar o domínio público publicado
    // (o host de preview é protegido e devolveria a tela de login).
    const requested = safeOrigin(body?.origin);
    if (!requested) return json({ error: 'Origem não permitida' }, 400);
    const published = safeOrigin(Deno.env.get('PDF_BASE_URL') ?? '') ?? 'https://inforsol-app.lovable.app';
    const origin = /^id-preview--/.test(new URL(requested).hostname) ? published : requested;

    // RLS decide o acesso: se a linha não voltar, o usuário não pode ver esta proposta.
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('id, numero, public_token, versao, client_name')
      .eq('id', proposalId)
      .maybeSingle();
    if (error) return json({ error: 'Falha ao consultar a proposta' }, 500);
    if (!proposal) return json({ error: 'Proposta não encontrada ou sem permissão' }, 404);

    const printUrl = `${origin}/proposta/${proposal.public_token}/print`;

    const started = Date.now();
    const res = await fetch(`https://production-sfo.browserless.io/pdf?token=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: printUrl,
        gotoOptions: { waitUntil: 'networkidle2', timeout: 60_000 },
        waitForFunction: {
          fn: 'async () => window.__PROPOSAL_PDF_READY__ === true',
          timeout: 45_000,
        },
        options: {
          format: 'A4',
          landscape: false,
          printBackground: true,
          preferCSSPageSize: true,
          scale: 1,
          displayHeaderFooter: false,
          margin: { top: '0', right: '0', bottom: '0', left: '0' },
        },
      }),
    });

    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300);
      console.error('browserless falhou', res.status, detail);
      return json({ error: 'Falha na geração server-side do PDF', status: res.status }, 502);
    }

    const pdf = new Uint8Array(await res.arrayBuffer());
    if (pdf.length < 1000 || String.fromCharCode(...pdf.slice(0, 4)) !== '%PDF') {
      return json({ error: 'Resposta inválida do renderizador' }, 502);
    }

    console.log(JSON.stringify({
      evt: 'proposal_pdf_generated', engine: ENGINE, template: TEMPLATE_VERSION,
      proposalId: proposal.id, numero: proposal.numero, versao: proposal.versao,
      bytes: pdf.length, ms: Date.now() - started, userId: user.id,
    }));

    const nome = `Proposta-${String(proposal.numero ?? '').replace(/\W+/g, '') || 'Inforsol'}.pdf`;
    return new Response(pdf, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nome}"`,
        'X-Pdf-Engine': ENGINE,
        'X-Pdf-Template-Version': TEMPLATE_VERSION,
      },
    });
  } catch (e) {
    console.error('erro inesperado', e instanceof Error ? e.message : e);
    return json({ error: 'Erro inesperado ao gerar o PDF' }, 500);
  }
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
