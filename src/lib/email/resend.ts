import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY não configurado");
    _resend = new Resend(apiKey);
  }
  return _resend;
}

export const FROM_EMAIL =
  process.env.FROM_EMAIL ?? "Erizon <noreply@erizon.app>";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  } catch (err) {
    // Email é best-effort: falha silenciosa para não quebrar o fluxo principal
    console.error("[email] falha ao enviar:", err);
  }
}
