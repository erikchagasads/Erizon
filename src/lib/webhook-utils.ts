import crypto from "crypto";

/** Verifica assinatura HMAC-SHA256 */
export function verifyHmacSha256(
  payload: string,
  secret: string,
  signature: string,
  prefix = ""
): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const expectedFull = prefix ? `${prefix}${expected}` : expected;
  try {
    return crypto.timingSafeEqual(Buffer.from(expectedFull), Buffer.from(signature));
  } catch {
    return false;
  }
}

/** Verifica assinatura HMAC-SHA256 em base64 */
export function verifyHmacSha256Base64(payload: string, secret: string, signatureB64: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureB64));
  } catch {
    return false;
  }
}

export type WebhookEventNormalized = {
  platform: string;
  event_type: string;
  value: number | null;
  currency: string;
  customer_email: string | null;
  campaign_ref: string | null;
  raw: Record<string, unknown>;
};
