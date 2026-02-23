// /app/api/billing/webhook/route.ts
// Stripe webhook — sincroniza eventos de assinatura com Supabase
//
// Configure no Stripe Dashboard:
//   Endpoint: https://seuapp.com/api/billing/webhook
//   Eventos: customer.subscription.created, updated, deleted
//            checkout.session.completed
//            invoice.payment_failed

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const runtime = "nodejs"; // precisa de raw body

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function planoFromPriceId(priceId: string): string {
  if (priceId === process.env.STRIPE_PRICE_GESTOR)  return "gestor";
  if (priceId === process.env.STRIPE_PRICE_AGENCIA) return "agencia";
  return "desconhecido";
}

export async function POST(req: Request) {
  const body      = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Sem signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Signature inválida";
    console.error("[webhook] Stripe signature error:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const admin = getAdmin();

  try {
    switch (event.type) {

      // ── Checkout completado (trial iniciado ou pago direto) ──────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId  = session.metadata?.supabase_user_id;
        const plano   = session.metadata?.plano ?? "gestor";

        if (!userId) break;

        await admin.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          plano,
          status: "trialing",
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        console.log(`[webhook] Checkout completo: user=${userId} plano=${plano}`);
        break;
      }

      // ── Assinatura criada / atualizada ────────────────────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub    = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;

        if (!userId) {
          // Busca pelo customer_id
          const { data } = await admin
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", sub.customer as string)
            .maybeSingle();
          if (!data?.user_id) break;
        }

        const targetUserId = userId ?? (
          await admin
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", sub.customer as string)
            .maybeSingle()
        ).data?.user_id;

        if (!targetUserId) break;

        const priceId = sub.items.data[0]?.price.id ?? "";
        const plano   = sub.metadata?.plano ?? planoFromPriceId(priceId);

        await admin.from("subscriptions").upsert({
          user_id: targetUserId,
          stripe_customer_id: sub.customer as string,
          stripe_subscription_id: sub.id,
          plano,
          status: sub.status,
          trial_end: sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : null,
          // Na API 2026-01-28.clover, current_period_end fica em cada item
          current_period_end: sub.items.data[0]?.current_period_end
            ? new Date((sub.items.data[0].current_period_end as number) * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        console.log(`[webhook] Subscription ${event.type}: user=${targetUserId} status=${sub.status}`);
        break;
      }

      // ── Assinatura cancelada / expirada ───────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        await admin
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);

        console.log(`[webhook] Subscription cancelada: ${sub.id}`);
        break;
      }

      // ── Pagamento falhou ──────────────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        // Na API 2026-01-28.clover, o subscription ID fica em subscription_details
        const subId = (invoice as unknown as Record<string, unknown>).subscription_details
          ? ((invoice as unknown as Record<string, unknown>).subscription_details as Record<string, unknown>)?.subscription as string | null
          : (invoice as unknown as Record<string, unknown>).subscription as string | null;

        if (subId) {
          await admin
            .from("subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subId);

          console.log(`[webhook] Pagamento falhou: sub=${subId}`);
        }
        break;
      }

      default:
        // Ignora outros eventos
        break;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("[webhook] Erro ao processar:", event.type, msg);
    // Retorna 200 para evitar retry do Stripe em erros não críticos
  }

  return NextResponse.json({ received: true });
}