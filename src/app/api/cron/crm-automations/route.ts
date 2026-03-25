// POST /api/cron/crm-automations
// Cron job diário que:
// 1. Marca como 'perdido' leads sem movimento > 30 dias
// 2. Alerta sobre leads em 'proposta' > 7 dias (via console/log)
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { logger } from "@/lib/observability/logger";
import { sendEmail } from "@/lib/email/resend";
import { propostaVencidaHtml } from "@/lib/email/templates";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Verificar autorização do cron
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const vercelCron = request.headers.get("x-vercel-cron");

  const authorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    vercelCron === "1" || vercelCron === "true";

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const results = { auto_perdido: 0, alertas_proposta: 0, errors: 0 };

  try {
    // 1. Marcar como 'perdido' leads em 'novo' ou 'contato' sem movimento > 30 dias
    const limite30 = new Date();
    limite30.setDate(limite30.getDate() - 30);

    const { data: velhos, error: e1 } = await supabase
      .from("crm_leads")
      .select("id, nome, estagio")
      .in("estagio", ["novo", "contato"])
      .lt("updated_at", limite30.toISOString());

    if (e1) { results.errors++; }
    if (velhos?.length) {
      const ids = velhos.map(l => l.id);
      const { error: e2 } = await supabase
        .from("crm_leads")
        .update({
          estagio: "perdido",
          motivo_perda: "Inatividade > 30 dias (automático)",
          updated_at: new Date().toISOString(),
        })
        .in("id", ids);

      if (e2) results.errors++;
      else results.auto_perdido = velhos.length;
    }

    // 2. Contar e logar leads em 'proposta' > 7 dias (sem mover)
    const limite7 = new Date();
    limite7.setDate(limite7.getDate() - 7);

    const { data: atrasados, error: e3 } = await supabase
      .from("crm_leads")
      .select("id, nome, user_id, cliente_id")
      .eq("estagio", "proposta")
      .lt("updated_at", limite7.toISOString());

    if (e3) results.errors++;
    results.alertas_proposta = atrasados?.length ?? 0;

    if (atrasados?.length) {
      logger.warn("CRM: leads em proposta atrasados", {
        count: atrasados.length,
        ids: atrasados.map(l => l.id),
      });

      // Enviar email de alerta por usuário (agrupa leads do mesmo user)
      if (process.env.RESEND_API_KEY) {
        const porUsuario = new Map<string, typeof atrasados>();
        for (const lead of atrasados) {
          const lista = porUsuario.get(lead.user_id) ?? [];
          lista.push(lead);
          porUsuario.set(lead.user_id, lista);
        }

        const limite7daysAgo = limite7;
        for (const [, leads] of porUsuario) {
          const { data: userRow } = await supabase.auth.admin.getUserById(leads[0].user_id);
          const email = userRow?.user?.email;
          if (!email) continue;

          const diasPorLead = leads.map(l => {
            const updatedAt = new Date((l as Record<string, unknown>).updated_at as string || 0);
            const dias = Math.floor((Date.now() - updatedAt.getTime()) / 86400000);
            return { nome: l.nome, diasSemMovimento: dias };
          });

          void limite7daysAgo; // used above in query
          sendEmail({
            to: email,
            subject: `⚠️ ${leads.length} proposta(s) vencida(s) no CRM`,
            html: propostaVencidaHtml({ leads: diasPorLead }),
          }).catch(() => {});
        }
      }
    }

    logger.info("CRM automations completed", results);

    return NextResponse.json({ ok: true, ...results });
  } catch (err) {
    logger.error("CRM automations cron error", { error: err });
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
