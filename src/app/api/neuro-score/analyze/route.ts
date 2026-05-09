import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NeuroScoreService } from "@/services/neuro-score-service";

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { user } = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = (await req.json()) as {
      imageBase64: string;
      imageMimeType: "image/jpeg" | "image/png" | "image/webp";
      nicho: string;
      objetivo: "conversao" | "trafego" | "engajamento" | "leads";
      clienteId?: string;
      campanhaId?: string;
      benchmarkCtrP50?: number;
      benchmarkCplP50?: number;
    };

    if (!body.imageBase64 || !body.nicho || !body.objetivo) {
      return NextResponse.json(
        { error: "imageBase64, nicho e objetivo são obrigatórios" },
        { status: 400 }
      );
    }

    const billingRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/billing`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
    });
    const billing = (await billingRes.json()) as { plano: string; ativo: boolean };
    const planoOk = billing.ativo && ["command", "agency", "agencia"].includes(billing.plano);
    if (!planoOk) {
      return NextResponse.json({ error: "Plano Command necessário", upgrade: true }, { status: 403 });
    }

    const imageHash = crypto
      .createHash("sha256")
      .update(body.imageBase64.slice(0, 10000))
      .digest("hex");

    const service = new NeuroScoreService();
    const result = await service.analyze({
      userId: user.id,
      workspaceId: user.id,
      clienteId: body.clienteId,
      campanhaId: body.campanhaId,
      imageBase64: body.imageBase64,
      imageMimeType: body.imageMimeType,
      imageHash,
      nicho: body.nicho,
      objetivo: body.objetivo,
      benchmarkCtrP50: body.benchmarkCtrP50,
      benchmarkCplP50: body.benchmarkCplP50,
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    console.error("[neuro-score/analyze]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
