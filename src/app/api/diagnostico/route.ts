import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const dados = await req.json();

    const linhas = [
      ["Nome", dados.nome],
      ["Empresa", dados.empresa || "—"],
      ["Instagram", dados.instagram ? `@${dados.instagram}` : "—"],
      ["Nicho", dados.nicho],
      ["Desafio principal", dados.desafio],
      ["Como capta clientes hoje", dados.captacao],
      ["Ticket médio", dados.ticket],
      ["Investimento mensal em tráfego", dados.investimento],
      ["Presença digital", dados.presenca],
      ["Maturidade em marketing digital", dados.maturidade],
      ["Observações", dados.observacoes || "—"],
    ];

    const tabela = linhas
      .map(
        ([campo, valor]) => `
        <tr>
          <td style="padding:10px 16px;color:#a78bfa;font-size:13px;font-weight:600;white-space:nowrap;border-bottom:1px solid #1e1b4b">${campo}</td>
          <td style="padding:10px 16px;color:#f1f5f9;font-size:14px;border-bottom:1px solid #1e1b4b">${valor}</td>
        </tr>`
      )
      .join("");

    await resend.emails.send({
      from: "Diagnóstico Erizon <diagnostico@erizonai.com.br>",
      to: "erikchagas@erizonai.com.br",
      subject: `Novo diagnóstico: ${dados.nome}${dados.empresa ? ` — ${dados.empresa}` : ""}`,
      html: `
        <div style="font-family:Inter,sans-serif;background:#080810;padding:40px 20px;min-height:100vh">
          <div style="max-width:560px;margin:0 auto">
            <div style="margin-bottom:32px">
              <span style="background:#4c1d95;color:#c4b5fd;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:4px 12px;border-radius:99px">Novo Lead</span>
            </div>
            <h1 style="color:#ffffff;font-size:24px;font-weight:900;margin:0 0 4px">${dados.nome}</h1>
            ${dados.empresa ? `<p style="color:#7c3aed;font-size:15px;margin:0 0 32px">${dados.empresa}</p>` : `<div style="margin-bottom:32px"></div>`}

            <table style="width:100%;border-collapse:collapse;background:#0f0f1a;border-radius:16px;overflow:hidden">
              ${tabela}
            </table>

            <p style="color:#3b3b5c;font-size:12px;text-align:center;margin-top:40px">
              Erizon · Diagnóstico Estratégico
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[diagnostico]", e);
    return NextResponse.json({ erro: "Falha ao enviar." }, { status: 500 });
  }
}
