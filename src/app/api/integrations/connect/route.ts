
import { NextRequest, NextResponse } from "next/server";
import { IntegrationAuthService } from "@/services/integration-auth-service";
import { IntegrationConnectSchema } from "@/lib/schemas";
import { validationError } from "@/lib/validate";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const result = IntegrationConnectSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(validationError(result), { status: 422 });
  }

  const service = new IntegrationAuthService();
  const connected = await service.connectProvider(result.data);
  return NextResponse.json(connected);
}
