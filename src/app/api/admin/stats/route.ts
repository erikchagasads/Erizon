import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  // 1. Valida sessão
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // 2. Só você pode acessar
  if (!ADMIN_EMAIL || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  // 3. Usa service role para ler dados de todos os usuários
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Total de usuários registrados
  const { count: totalUsuarios } = await admin
    .from("user_configs")
    .select("*", { count: "exact", head: true });

  // Usuários ativos nos últimos 7 dias (tiveram sync recente)
  const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: usuariosAtivos7d } = await admin
    .from("user_configs")
    .select("*", { count: "exact", head: true })
    .gte("ultimo_sync", seteDiasAtras);

  // Usuários ativos nos últimos 30 dias
  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: usuariosAtivos30d } = await admin
    .from("user_configs")
    .select("*", { count: "exact", head: true })
    .gte("ultimo_sync", trintaDiasAtras);

  // Total de BMs conectadas (ativas)
  const { count: totalBMs } = await admin
    .from("bm_accounts")
    .select("*", { count: "exact", head: true })
    .eq("ativo", true);

  // Total de BMs (incluindo inativas)
  const { count: totalBMsAll } = await admin
    .from("bm_accounts")
    .select("*", { count: "exact", head: true });

  // Usuários com onboarding completo
  const { count: onboardingCompleto } = await admin
    .from("user_configs")
    .select("*", { count: "exact", head: true })
    .eq("onboarding_completo", true);

  // Usuários com Telegram configurado
  const { count: comTelegram } = await admin
    .from("user_configs")
    .select("*", { count: "exact", head: true })
    .not("telegram_chat_id", "is", null);

  // Lista dos últimos 20 usuários com suas BMs
  const { data: ultimosUsuarios } = await admin
    .from("user_configs")
    .select("user_id, ultimo_sync, onboarding_completo, telegram_chat_id, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  // Para cada usuário, busca quantas BMs tem
  const usuariosComBMs = await Promise.all(
    (ultimosUsuarios ?? []).map(async (u) => {
      const { count: bms } = await admin
        .from("bm_accounts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", u.user_id)
        .eq("ativo", true);

      // Busca email via auth.users (service role)
      const { data: authUser } = await admin.auth.admin.getUserById(u.user_id);

      return {
        userId: u.user_id,
        email: authUser?.user?.email ?? "—",
        bmsAtivas: bms ?? 0,
        ultimoSync: u.ultimo_sync,
        onboardingCompleto: u.onboarding_completo,
        temTelegram: !!u.telegram_chat_id,
        criadoEm: u.created_at,
      };
    })
  );

  return NextResponse.json({
    totais: {
      usuarios: totalUsuarios ?? 0,
      ativos7d: usuariosAtivos7d ?? 0,
      ativos30d: usuariosAtivos30d ?? 0,
      bmsAtivas: totalBMs ?? 0,
      bmsTotal: totalBMsAll ?? 0,
      onboardingCompleto: onboardingCompleto ?? 0,
      comTelegram: comTelegram ?? 0,
    },
    ultimosUsuarios: usuariosComBMs,
  });
}
