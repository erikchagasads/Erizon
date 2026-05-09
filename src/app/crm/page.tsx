import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export default async function CrmRootPage() {
  // Tenta verificar se o usuário está autenticado como gestor
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gestor autenticado → vai para o dashboard
  if (user) {
    redirect("/crm/dashboard");
  }

  // Não autenticado → mostra a tela pública de entrada para clientes
  const { default: Image } = await import("next/image");

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6">
        <section className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center shadow-2xl shadow-black/40">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <Image src="/logo-erizon.svg" alt="Erizon" width={34} height={34} priority />
          </div>
          <h1 className="text-xl font-semibold text-white">CRM Erizon</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/65">
            Acesse o link enviado pelo seu gestor para entrar no CRM.
          </p>
        </section>
      </div>
    </main>
  );
}
