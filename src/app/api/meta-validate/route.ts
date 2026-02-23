// app/api/meta-validate/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { token, accountId } = await request.json();

    if (!token || !accountId) {
      return NextResponse.json(
        { error: { message: "Token e Account ID são obrigatórios." } },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${accountId.trim()}?fields=name,account_status&access_token=${token.trim()}`
    );

    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { error: { message: "Erro interno ao validar." } },
      { status: 500 }
    );
  }
}