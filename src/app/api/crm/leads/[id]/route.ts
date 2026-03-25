// PATCH /api/crm/leads/[id] — atualiza lead (estagio, valor, anotacao...)
// DELETE /api/crm/leads/[id] — remove lead
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { crmAttributionService } from "@/services/crm-attribution-service";
import { sendEmail } from "@/lib/email/resend";
import { estagioMudouHtml, dealFechadoHtml } from "@/lib/email/templates";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  // Remove campos que não podem ser alterados diretamente
  delete body.id;
  delete body.user_id;
  delete body.created_at;

  const { data, error } = await supabase
    .from("crm_leads")
    .update(body)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });

  // Notificações por email (best-effort)
  if (process.env.RESEND_API_KEY && body.estagio && user.email) {
    if (body.estagio === "fechado" && body.valor_fechado) {
      sendEmail({
        to: user.email,
        subject: `🏆 Deal fechado: ${data.nome}`,
        html: dealFechadoHtml({
          leadNome: data.nome,
          valor: Number(body.valor_fechado),
          campanha: data.campanha_nome ?? undefined,
        }),
      }).catch(() => {});
    } else {
      sendEmail({
        to: user.email,
        subject: `Lead atualizado: ${data.nome} → ${body.estagio}`,
        html: estagioMudouHtml({
          leadNome: data.nome,
          estagioAnterior: data.estagio ?? "—",
          estagioNovo: body.estagio as "novo" | "contato" | "proposta" | "fechado" | "perdido",
          valor: body.valor_fechado ? Number(body.valor_fechado) : undefined,
          anotacao: body.anotacao ? String(body.anotacao) : undefined,
        }),
      }).catch(() => {});
    }
  }

  // Quando lead fecha, disparar atribuição de campanha em background
  if (body.estagio === "fechado" && body.valor_fechado) {
    crmAttributionService.onLeadClosed({
      supabase,
      leadId: id,
      userId: user.id,
      valorFechado: Number(body.valor_fechado),
    }).catch(() => {});
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const { error } = await supabase
    .from("crm_leads")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
