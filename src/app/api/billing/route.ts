// /app/api/billing/route.ts
// Stripe billing — checkout, portal de cliente e verificação de acesso
//
// Variáveis necessárias no .env:
//   STRIPE_SECRET_KEY=sk_live_...
//   STRIPE_WEBHOOK_SECRET=whsec_...
//   STRIPE_PRICE_GESTOR=price_...
//   STRIPE_PRICE_AGENCIA=price_...
//   NEXT_PUBLIC_APP_URL=https://seuapp.com
//
// Tabela Supabase necessária:
//   CREATE TABLE subscriptions (
//     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//     user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
//     stripe_customer_id text,
//     stripe_subscription_id text,
//     plano text, -- 'gestor' | 'agencia' | 'enterprise'
//     status text, -- 'trialing' | 'active' | 'past_due' | 'canceled'
//     trial_end timestamptz,
//     current_period_end timestamptz,
//     created_at timestamptz DEFAULT now(),
//     updated_at timestamptz DEFAULT now()
//   );

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const PRICE_MAP: Record<string, string> = {
  gestor:  process.env.STRIPE_PRICE_GESTOR  ?? "",
  agencia: process.env.STRIPE_PRICE_AGENCIA ?? "",
};

// Admin client para escrever na tabela subscriptions (bypass RLS)
function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ── POST /api/billing ─────────────────────────────────────────────────────────
// action: "checkout" | "portal"
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
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // ── Checkout: cria sessão de pagamento ──────────────────────────────────
    if (action === "checkout") {
      const priceId = PRICE_MAP[plano];
      if (!priceId) {
        return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
      }

      // Busca ou cria customer Stripe
      const admin = getAdminClient();
      const { data: sub } = await admin
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      let customerId = sub?.stripe_customer_id;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id },
        });
        customerId = customer.id;

        // Salva o customer_id mesmo antes do pagamento
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
        success_url: `${APP_URL}/dados?billing=success`,
        cancel_url:  `${APP_URL}/?billing=canceled`,
        metadata: { supabase_user_id: user.id, plano },
        allow_promotion_codes: true,
        locale: "pt-BR",
      });

      return NextResponse.json({ url: session.url });
    }

    // ── Portal: abre portal do cliente para gerenciar assinatura ───────────
    if (action === "portal") {
      const admin = getAdminClient();
      const { data: sub } = await admin
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!sub?.stripe_customer_id) {
        return NextResponse.json({ error: "Assinatura não encontrada" }, { status: 404 });
      }

      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: `${APP_URL}/settings`,
      });

      return NextResponse.json({ url: portal.url });
    }

    return NextResponse.json({ error: "Action inválida" }, { status: 400 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("[billing]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── GET /api/billing — verifica status da assinatura do usuário logado ────────
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
      .select("plano, status, trial_end, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) return NextResponse.json({ ativo: false, plano: null });

    const ativo = ["active", "trialing"].includes(data.status ?? "");
    const emTrial = data.status === "trialing";

    return NextResponse.json({
      ativo,
      emTrial,
      plano: data.plano,
      status: data.status,
      trialEnd: data.trial_end,
      periodoFim: data.current_period_end,
    });

  } catch {
    return NextResponse.json({ ativo: false });
  }
}