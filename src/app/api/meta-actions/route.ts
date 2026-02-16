import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { campaignId, action, value } = await req.json();
    const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

    if (!ACCESS_TOKEN) return NextResponse.json({ error: "Token ausente" }, { status: 500 });

    let url = `https://graph.facebook.com/v18.0/${campaignId}`;
    let body: any = {};

    if (action === "PAUSE") {
      body = { status: 'PAUSED' };
    } else if (action === "RESUME") {
      body = { status: 'ACTIVE' };
    } else if (action === "UPDATE_BUDGET") {
      body = { daily_budget: value * 100 }; // Meta usa centavos
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, access_token: ACCESS_TOKEN })
    });

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Falha na execução" }, { status: 500 });
  }
}