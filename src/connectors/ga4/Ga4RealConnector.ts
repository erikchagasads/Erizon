/**
 * src/connectors/ga4/Ga4RealConnector.ts
 *
 * Conector real para o Google Analytics 4 via Data API.
 * Usa Service Account (Google Client Email + Private Key) para autenticação JWT.
 *
 * Documentação: https://developers.google.com/analytics/devguides/reporting/data/v1
 */

import { IntegrationCredential } from "@/types/erizon";
import { Ga4Connector, Ga4RevenueRecord } from "@/connectors/ga4/types";

const GA4_API_BASE = "https://analyticsdata.googleapis.com/v1beta";

// ─── JWT para Service Account ─────────────────────────────────────────────────

async function buildJwt(clientEmail: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");

  const signingInput = `${encode(header)}.${encode(payload)}`;

  // Limpa o PEM para uso no TextEncoder
  const pemClean = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");

  const keyBytes = Buffer.from(pemClean, "base64");

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    Buffer.from(signingInput)
  );

  const signatureB64 = Buffer.from(signature).toString("base64url");
  return `${signingInput}.${signatureB64}`;
}

async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const jwt = await buildJwt(clientEmail, privateKey);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const json = await res.json();
  if (!json.access_token) {
    throw new Error(`GA4 auth error: ${json.error_description ?? JSON.stringify(json)}`);
  }
  return json.access_token as string;
}

// ─── Conector real ────────────────────────────────────────────────────────────

export class Ga4RealConnector implements Ga4Connector {
  async pullRevenue(credential: IntegrationCredential): Promise<Ga4RevenueRecord[]> {
    const propertyId = process.env.GA4_PROPERTY_ID;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

    if (!propertyId || !clientEmail || !privateKey) {
      throw new Error("GA4_PROPERTY_ID, GOOGLE_CLIENT_EMAIL e GOOGLE_PRIVATE_KEY obrigatórios");
    }

    const token = await getAccessToken(clientEmail, privateKey);

    const body = {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [
        { name: "sessionCampaignName" },
        { name: "date" },
      ],
      metrics: [
        { name: "purchaseRevenue" },
        { name: "transactions" },
      ],
      limit: 500,
    };

    const res = await fetch(`${GA4_API_BASE}/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`GA4 API error ${res.status}: ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    const rows: Array<{ dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> }> =
      data.rows ?? [];

    // Extrai clientId do metadata da credencial
    const meta = (credential.metadata as Record<string, string>) ?? {};

    return rows.map((row): Ga4RevenueRecord => ({
      clientId: meta.clientId ?? credential.workspaceId,
      campaignId: row.dimensionValues[0]?.value ?? "unknown",
      date: row.dimensionValues[1]?.value ?? new Date().toISOString(),
      revenue: parseFloat(row.metricValues[0]?.value ?? "0"),
    }));
  }
}
