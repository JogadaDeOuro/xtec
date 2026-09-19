import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_TYPES = new Set(["company_signed", "client_signed", "fully_signed", "proposal_sent"]);
const TOKEN_RE = /^[A-Za-z0-9-]{8,128}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Requisição inválida" }, 400);

    const type = text(body.type, 40);
    const contractId = text(body.contractId, 64);
    const contractName = text(body.contractName, 200);
    const signerName = text(body.signerName, 200);
    const signerEmail = text(body.signerEmail, 200);
    const signerType = text(body.signerType, 40);
    const signingToken = text(body.signingToken, 128);

    if (!ALLOWED_TYPES.has(type)) return json({ error: "Tipo inválido" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Resolve the target organization: either from the authenticated caller's
    // membership, or from a valid contract signing token (public signing flow).
    let organizationId: string | null = null;

    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: membership } = await admin
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        organizationId = membership?.organization_id ?? null;
      }
    }

    if (!organizationId && TOKEN_RE.test(signingToken)) {
      const { data: contract } = await admin
        .from("contracts")
        .select("organization_id")
        .eq("signing_token", signingToken)
        .limit(1)
        .maybeSingle();
      organizationId = contract?.organization_id ?? null;
    }

    if (!organizationId) return json({ error: "Não autorizado" }, 401);

    // Notify only members of the resolved organization.
    const { data: members } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId);
    const userIds = (members || []).map((m) => m.user_id);

    let title = "";
    let message = "";
    let notifType = "contract_signed";

    if (type === "company_signed") {
      title = "Contrato assinado pela empresa";
      message = `${signerName} assinou o contrato ${contractId} (${contractName}) pela empresa.`;
    } else if (type === "client_signed") {
      title = "Cliente assinou o contrato";
      message = `${signerName} assinou o contrato ${contractId} (${contractName}) como cliente.`;
    } else if (type === "fully_signed") {
      title = "Contrato totalmente assinado! 🎉";
      message = `O contrato ${contractId} (${contractName}) foi assinado por ambas as partes.`;
    } else if (type === "proposal_sent") {
      title = "Nova proposta enviada";
      message = `A proposta para ${contractName} foi enviada ao cliente.`;
      notifType = "proposal_sent";
    }

    if (userIds.length > 0 && title) {
      const notifications = userIds.map((userId) => ({
        user_id: userId,
        title,
        message,
        type: notifType,
        organization_id: organizationId,
        metadata: { contractId, contractName, signerName, signerEmail, signerType },
      }));

      await admin.from("notifications").insert(notifications);
    }

    return json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return json({ error: "Não foi possível concluir a solicitação" }, 500);
  }
});
