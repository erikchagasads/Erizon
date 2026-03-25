import { NextRequest, NextResponse } from "next/server";
import { benchmarkMarketplaceService } from "@/services/benchmark-marketplace-service";

export async function GET(_request: NextRequest) {
  try {
    const benchmarks = await benchmarkMarketplaceService.listBenchmarks();
    return NextResponse.json(benchmarks);
  } catch (error) {
    console.error('GET /api/benchmarks/list', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
