import { createClient } from "@supabase/supabase-js";
import FormularioLanding from "../../FormularioLanding";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function FormularioClientePage({
  params,
}: {
  params: Promise<{ userId: string; clienteId: string }>;
}) {
  const { userId, clienteId } = await params;

  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("facebook_pixel_id")
    .eq("id", clienteId)
    .eq("user_id", userId)
    .maybeSingle();

  return (
    <FormularioLanding
      userId={userId}
      clienteId={clienteId}
      facebookPixelId={cliente?.facebook_pixel_id ?? null}
      enabled
    />
  );
}
