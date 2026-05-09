import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createServerSupabase } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ClientRow = {
  id: string;
  nome: string | null;
  nome_cliente: string | null;
  whatsapp: string | null;
  whatsapp_mensagem: string | null;
};

function asString(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  const { id: clientId } = await context.params;
  const db = createServerSupabase();

  const { data: client, error } = await db
    .from("clientes")
    .select("id, nome, nome_cliente, whatsapp, whatsapp_mensagem")
    .eq("id", clientId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!client) {
    return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 });
  }

  const typedClient = client as ClientRow;
  const baseAppUrl = trimTrailingSlash(asString(process.env.NEXT_PUBLIC_APP_URL, req.nextUrl.origin));
  const webhookBase = `${baseAppUrl}/api/crm/webhook/${auth.user.id}/${typedClient.id}`;
  const webhookUrl = `${webhookBase}?utm_source=facebook&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}`;
  const landingUrl = `${baseAppUrl}/lp/formulario/${auth.user.id}/${typedClient.id}?utm_source=facebook&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}`;

  return NextResponse.json({
    ok: true,
    webhookBase,
    webhookUrl,
    landingUrl,
    defaults: {
      whatsapp: typedClient.whatsapp,
      whatsappMessage: typedClient.whatsapp_mensagem,
      appendAdReference: true,
    },
    client: {
      id: typedClient.id,
      name: typedClient.nome_cliente ?? typedClient.nome ?? "Cliente",
    },
  });
}
