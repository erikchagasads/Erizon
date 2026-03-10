/**
 * src/connectors/commerce/CommerceRealConnector.ts
 *
 * Conector real para plataformas de e-commerce:
 *  - Shopify (REST Admin API v2024-01)
 *  - Hotmart (Subscriptions + Sales API v2)
 *
 * Detecta automaticamente a plataforma pelo campo `provider` da credencial.
 */

import { ExternalOrderRecord, IntegrationCredential } from "@/types/erizon";
import { CommerceConnector } from "@/connectors/commerce/types";

const SHOPIFY_API_VERSION = "2024-01";

// ─── Shopify ──────────────────────────────────────────────────────────────────

async function fetchShopifyOrders(credential: IntegrationCredential): Promise<ExternalOrderRecord[]> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  if (!domain) throw new Error("SHOPIFY_STORE_DOMAIN não configurado");

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const url = `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&created_at_min=${since}&limit=250`;

  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": credential.accessToken,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Shopify API error ${res.status}: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  const orders: Array<{
    id: number;
    created_at: string;
    total_price: string;
    total_discounts: string;
    total_tax: string;
    refunds: Array<{ refund_line_items: Array<{ subtotal: string }> }>;
    line_items: Array<{ price: string; quantity: number }>;
  }> = data.orders ?? [];

  const meta = (credential.metadata as Record<string, string>) ?? {};

  return orders.map((order): ExternalOrderRecord => {
    const gross = parseFloat(order.total_price ?? "0");
    const refunds = order.refunds?.reduce((acc, ref) => {
      return acc + ref.refund_line_items.reduce((a, li) => a + parseFloat(li.subtotal ?? "0"), 0);
    }, 0) ?? 0;
    const fees = gross * 0.022; // Shopify Payments fee aproximado
    const productCost = gross * (meta.productCostRate ? parseFloat(meta.productCostRate) : 0.3);

    return {
      orderId: `shopify-${order.id}`,
      clientId: meta.clientId ?? credential.workspaceId,
      platform: "Shopify",
      date: order.created_at,
      grossRevenue: gross,
      refunds,
      fees,
      logistics: gross * 0.08, // estimativa padrão
      productCost,
    };
  });
}

// ─── Hotmart ──────────────────────────────────────────────────────────────────

async function fetchHotmartOrders(credential: IntegrationCredential): Promise<ExternalOrderRecord[]> {
  const clientId = process.env.HOTMART_CLIENT_ID;
  const clientSecret = process.env.HOTMART_CLIENT_SECRET;
  const basicToken = process.env.HOTMART_BASIC_TOKEN;

  if (!clientId || !clientSecret || !basicToken) {
    throw new Error("HOTMART_CLIENT_ID, HOTMART_CLIENT_SECRET e HOTMART_BASIC_TOKEN obrigatórios");
  }

  // Autenticação via client_credentials
  const authRes = await fetch("https://api-sec-vlc.hotmart.com/security/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });

  if (!authRes.ok) throw new Error(`Hotmart auth error: ${authRes.status}`);
  const auth = await authRes.json();
  const token = auth.access_token as string;

  // Busca vendas dos últimos 30 dias
  const since = Date.now() - 30 * 86_400_000;
  const url = `https://developers.hotmart.com/payments/api/v1/sales/summary?start_date=${since}&max_results=500`;

  const salesRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!salesRes.ok) throw new Error(`Hotmart sales error: ${salesRes.status}`);
  const sales = await salesRes.json();
  const items: Array<{
    transaction: string;
    purchase: { approved_date: number; price: { value: number }; payment: { refusal_reason?: string } };
    product: { id: number };
  }> = sales.items ?? [];

  const meta = (credential.metadata as Record<string, string>) ?? {};

  return items.map((item): ExternalOrderRecord => {
    const gross = item.purchase.price.value;
    const isRefunded = !!item.purchase.payment.refusal_reason;
    return {
      orderId: item.transaction,
      clientId: meta.clientId ?? credential.workspaceId,
      platform: "Hotmart",
      date: new Date(item.purchase.approved_date).toISOString(),
      grossRevenue: isRefunded ? 0 : gross,
      refunds: isRefunded ? gross : 0,
      fees: gross * 0.099, // Hotmart fee padrão ~9.9%
      logistics: 0, // digital
      productCost: gross * (meta.productCostRate ? parseFloat(meta.productCostRate) : 0.1),
    };
  });
}

// ─── Conector unificado ───────────────────────────────────────────────────────

export class CommerceRealConnector implements CommerceConnector {
  async pullOrders(credential: IntegrationCredential): Promise<ExternalOrderRecord[]> {
    switch (credential.provider) {
      case "shopify":
        return fetchShopifyOrders(credential);
      case "hotmart":
        return fetchHotmartOrders(credential);
      default:
        throw new Error(`Provider de commerce não suportado: ${credential.provider}`);
    }
  }
}
