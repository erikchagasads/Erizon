// /app/api/billing/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const PRICE_MAP: Record<string, string> = {
  core:    process.env.STRIPE_PRICE_CORE    ?? "",
  pro:     process.env.STRIPE_PRICE_PRO     ?? "",
  command: process.env.STRIPE_PRICE_COMMAND  ?? "",
};

function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ── Helper: valida e retorna customer_id limpo ────────────────────────────────
// Se o customer_id salvo no banco não existir no Stripe (ex: era de test mode),
// limpa o banco e retorna null para que o fluxo recrie o customer.
async function resolveCustomerId(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  savedCustomerId: string | null | undefined
): Promise<string | null> {
  if (!savedCustomerId) return null;

  try {
    const customer = await stripe.customers.retrieve(savedCustomerId);
    // Se foi deletado no Stripe
    if ((customer as Stripe.DeletedCustomer).deleted) {
      await admin.from("subscriptions").update({ stripe_customer_id: null }).eq("user_id", userId);
      return null;
    }
    return savedCustomerId;
  } catch (e: unknown) {
    // Customer não existe nesse ambiente (ex: era de test mode, agora é live)
    const err = e as { code?: string; statusCode?: number };
    if (err?.code === "resource_missing" || err?.statusCode === 404) {
      console.warn(`[billing] Customer ${savedCustomerId} inválido para esse ambiente. Limpando...`);
      await admin.from("subscriptions").update({
        stripe_customer_id: null,
        stripe_subscription_id: null,
        status: "incomplete",
      }).eq("user_id", userId);
      return null;
    }
    throw e;
  }
}

// ── POST /api/billing ─────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { action, plano } = await req.json();

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const admin = getAdminClient();

    // ── Checkout ──────────────────────────────────────────────────────────────
    if (action === "checkout") {
      const priceId = PRICE_MAP[plano];
      if (!priceId) return NextResponse.json({ error: "Plano inválido" }, { status: 400 });

      const { data: sub } = await admin
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      // Valida se o customer ainda existe no ambiente atual
      let customerId = await resolveCustomerId(admin, user.id, sub?.stripe_customer_id);

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id },
        });
        customerId = customer.id;
        await admin.from("subscriptions").upsert(
          { user_id: user.id, stripe_customer_id: customerId, status: "incomplete", plano },
          { onConflict: "user_id" }
        );
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          trial_period_days: 7,
          metadata: { supabase_user_id: user.id, plano },
        },
        success_url: `${APP_URL}/onboarding?billing=success&plano=${plano}`,
        cancel_url:  `${APP_URL}/billing?billing=canceled`,
        metadata: { supabase_user_id: user.id, plano },
        allow_promotion_codes: true,
        locale: "pt-BR",
      });

      return NextResponse.json({ url: session.url });
    }

    // ── Portal ────────────────────────────────────────────────────────────────
    if (action === "portal") {
      const { data: sub } = await admin
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const customerId = await resolveCustomerId(admin, user.id, sub?.stripe_customer_id);

      if (!customerId) {
        return NextResponse.json(
          { error: "Nenhuma assinatura encontrada. Assine um plano primeiro." },
          { status: 404 }
        );
      }

      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${APP_URL}/settings`,
      });

      return NextResponse.json({ url: portal.url });
    }

    // ── Cancel ────────────────────────────────────────────────────────────────
    if (action === "cancel") {
      const { data: sub } = await admin
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!sub?.stripe_subscription_id) {
        return NextResponse.json({ error: "Assinatura não encontrada" }, { status: 404 });
      }

      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Action inválida" }, { status: 400 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("[billing]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── GET /api/billing ──────────────────────────────────────────────────────────
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ativo: false });

    const admin = getAdminClient();
    const { data } = await admin
      .from("subscriptions")
      .select("plano, status, trial_end, current_period_end, stripe_customer_id, stripe_subscription_id, cancel_at_period_end")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) return NextResponse.json({ ativo: false, plano: null, status: null });

    // Se o customer_id salvo é de outro ambiente, limpa silenciosamente
    if (data.stripe_customer_id) {
      const validCustomerId = await resolveCustomerId(admin, user.id, data.stripe_customer_id);
      if (!validCustomerId) {
        // Customer inválido — trata como sem assinatura
        return NextResponse.json({ ativo: false, plano: null, status: null });
      }
    }

    const ativo = ["active", "trialing"].includes(data.status ?? "");

    return NextResponse.json({
      ativo,
      plano: data.plano,
      status: data.status,
      trial_ends_at: data.trial_end,
      current_period_end: data.current_period_end,
      cancel_at_period_end: data.cancel_at_period_end ?? false,
    });

  } catch (err) {
    console.error("[billing GET]", err);
    return NextResponse.json({ ativo: false });
  }
}
