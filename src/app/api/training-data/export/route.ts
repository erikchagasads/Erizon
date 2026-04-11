// GET /api/training-data/export?format=jsonl&quality=silver&workspaceId=xxx
// Exporta exemplos de treino para fine-tuning do modelo Erizon.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { TrainingDataService } from "@/services/training-data-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") ?? "jsonl";
    const quality = (searchParams.get("quality") ?? "silver") as "gold" | "silver" | "bronze";
    const workspaceId = searchParams.get("workspaceId") ?? undefined;

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
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const svc = new TrainingDataService(supabase);

    if (format === "stats") {
      const stats = await svc.getStats(workspaceId);
      return NextResponse.json(stats);
    }

    const jsonl = await svc.exportJSONL(workspaceId, quality);
    const filename = `erizon-training-${quality}-${new Date().toISOString().split("T")[0]}.jsonl`;

    return new NextResponse(jsonl, {
      headers: {
        "Content-Type": "application/jsonl",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro" }, { status: 500 });
  }
}
