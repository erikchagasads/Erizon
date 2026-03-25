// src/app/api/ai-criativo/route.ts — v3 (Groq Vision)
// Usa Groq (gratuito) com llama-4-scout para análise de criativos.
// Busca criativo via Meta API → baixa imagem/thumbnail → analisa com Groq Vision.
// Cache 24h em metricas_ads.analise_criativo

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// ─── Meta API ────────────────────────────────────────────────────────────────

async function buscarImagemDoCriativo(
  token: string,
  campaignId: string
): Promise<{ url: string; tipo: "imagem" | "video" } | null> {
  const url = `https://graph.facebook.com/v19.0/${campaignId}/ads?fields=creative{id,image_url,thumbnail_url,video_id,object_story_spec}&limit=3&access_token=${token}`;
  try {
    const res  = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (data.error || !data.data?.length) return null;
    const creative = data.data[0]?.creative;
    if (!creative) return null;
    if (creative.image_url)     return { url: creative.image_url,     tipo: "imagem" };
    if (creative.thumbnail_url) return { url: creative.thumbnail_url, tipo: "video"  };
    if (creative.video_id) {
      const vRes  = await fetch(`https://graph.facebook.com/v19.0/${creative.video_id}?fields=thumbnails&access_token=${token}`, { cache: "no-store" });
      const vData = await vRes.json();
      const thumb = vData.thumbnails?.data?.[0]?.uri;
      if (thumb) return { url: thumb, tipo: "video" };
    }
    const spec    = creative.object_story_spec;
    const imgSpec = spec?.link_data?.image_url || spec?.photo_data?.url;
    if (imgSpec) return { url: imgSpec, tipo: "imagem" };
    return null;
  } catch { return null; }
}

async function buscarImagemBase64(
  imageUrl: string
): Promise<{ data: string; mediaType: string } | null> {
  try {
    const res = await fetch(imageUrl, { cache: "no-store" });
    if (!res.ok) return null;
    const ct        = res.headers.get("content-type") || "image/jpeg";
    const mediaType = ct.split(";")[0].trim();
    const buffer    = await res.arrayBuffer();
    return { data: Buffer.from(buffer).toString("base64"), mediaType };
  } catch { return null; }
}

// ─── Groq Vision ─────────────────────────────────────────────────────────────

interface AnaliseCriativo {
  score: number;
  tipo_criativo: "imagem" | "video";
  hook: string;
  pontos_fortes: string[];
  problemas: string[];
  sugestoes: string[];
  resumo: string;
  analisado_em: string;
}

async function analisarComGroq(
  imageBase64: string,
  mediaType: string,
  tipo: "imagem" | "video",
  nome: string,
  ctr: number,
  cpl: number,
  leads: number,
  gasto: number
): Promise<AnaliseCriativo> {
  const ctx = `Campanha: "${nome}" | CTR: ${ctr.toFixed(2)}% | CPL: R$${cpl.toFixed(2)} | Leads: ${leads} | Gasto: R$${gasto.toFixed(2)} | Tipo: ${tipo === "video" ? "thumbnail de vídeo" : "imagem estática"}`;

  const prompt = `Você é especialista em criativos para Meta Ads no mercado brasileiro.

Contexto da campanha: ${ctx}

Analise este criativo e retorne APENAS JSON válido, sem markdown, sem explicações:

{
  "score": <número 0-100>,
  "hook": "<o que chama atenção nos primeiros 3 segundos>",
  "pontos_fortes": ["<ponto 1>", "<ponto 2>", "<ponto 3>"],
  "problemas": ["<problema 1>", "<problema 2>"],
  "sugestoes": ["<sugestão acionável 1>", "<sugestão 2>", "<sugestão 3>"],
  "resumo": "<diagnóstico direto em 1-2 frases — por que está performando assim>"
}

Critérios do score: hook visual (25pts) + clareza da mensagem (25pts) + qualidade visual (20pts) + adequação ao público BR (15pts) + CTA visível (15pts).
${(ctr < 0.8 || cpl > 60) ? "ATENÇÃO: métricas ruins — explique no resumo o que no criativo pode estar causando isso." : ""}`;

  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    max_tokens: 800,
    temperature: 0.3,
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const texto = response.choices[0]?.message?.content ?? "{}";

  try {
    const p = JSON.parse(texto.replace(/```json|```/g, "").trim());
    return {
      score:         Math.min(100, Math.max(0, Number(p.score) || 50)),
      tipo_criativo: tipo,
      hook:          p.hook          || "Não identificado",
      pontos_fortes: Array.isArray(p.pontos_fortes) ? p.pontos_fortes : [],
      problemas:     Array.isArray(p.problemas)     ? p.problemas     : [],
      sugestoes:     Array.isArray(p.sugestoes)     ? p.sugestoes     : [],
      resumo:        p.resumo        || "",
      analisado_em:  new Date().toISOString(),
    };
  } catch {
    return {
      score: 50, tipo_criativo: tipo,
      hook: "Erro na análise", pontos_fortes: [], problemas: [], sugestoes: [],
      resumo: "Não foi possível processar a análise.",
      analisado_em: new Date().toISOString(),
    };
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(values) { values.forEach(({ name, value, options }) => { try { cookieStore.set(name, value, options); } catch {} }); },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { campanha_id } = await req.json();
    if (!campanha_id) return NextResponse.json({ error: "campanha_id obrigatório." }, { status: 400 });

    const { data: campanha } = await supabase
      .from("metricas_ads")
      .select("id, nome_campanha, meta_campaign_id, gasto_total, contatos, ctr, analise_criativo")
      .eq("id", campanha_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!campanha) return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });

    // Cache 24h
    if (campanha.analise_criativo) {
      const analise = campanha.analise_criativo as AnaliseCriativo;
      if (Date.now() - new Date(analise.analisado_em).getTime() < 86_400_000) {
        return NextResponse.json({ ok: true, analise, cached: true });
      }
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: settings } = await supabaseAdmin
      .from("user_settings")
      .select("meta_access_token")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!settings?.meta_access_token) {
      return NextResponse.json({ error: "Token Meta não configurado." }, { status: 400 });
    }

    const imagemInfo = await buscarImagemDoCriativo(settings.meta_access_token, campanha.meta_campaign_id);
    if (!imagemInfo) {
      return NextResponse.json({ error: "Criativo não encontrado. Verifique as permissões do token (ads_read)." }, { status: 422 });
    }

    const imgBase64 = await buscarImagemBase64(imagemInfo.url);
    if (!imgBase64) {
      return NextResponse.json({ error: "Não foi possível baixar a imagem do criativo." }, { status: 422 });
    }

    const cpl     = campanha.contatos > 0 ? campanha.gasto_total / campanha.contatos : 0;
    const analise = await analisarComGroq(
      imgBase64.data, imgBase64.mediaType, imagemInfo.tipo,
      campanha.nome_campanha, campanha.ctr ?? 0, cpl,
      campanha.contatos ?? 0, campanha.gasto_total ?? 0
    );

    await supabase
      .from("metricas_ads")
      .update({ analise_criativo: analise })
      .eq("id", campanha_id)
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true, analise, cached: false });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno.";
    console.error("[ai-criativo]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}