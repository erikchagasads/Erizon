import { NextRequest, NextResponse } from "next/server";
import { benchmarkMarketplaceService } from "@/services/benchmark-marketplace-service";
import { z } from "zod";

const schema = z.object({
  industry: z.string(),
  audience_type: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = schema.parse(body);
    const settings = await benchmarkMarketplaceService.suggestOptimalSettings({
      industry: validated.industry,
      audience_type: validated.audience_type,
    });
    return NextResponse.json(settings);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('POST /api/benchmarks/suggest', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
