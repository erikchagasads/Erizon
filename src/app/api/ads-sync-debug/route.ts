// src/app/api/ads-sync-debug/route.ts
// ⚠️  ROTA DE DIAGNÓSTICO — remova após resolver o bug
// Acesse: GET /api/ads-sync-debug
// Retorna um relatório detalhado de cada etapa do sync

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function limparToken(raw: string): string {
  const sem_espacos = raw.trim().replace(/\s+/g, "");
  const match = sem_espacos.match(/EAA[A-Za-z0-9]+/);
  return match ? match[0] : sem_espacos;
}

export async function GET() {
  const log: Record<string, unknown> = {};

  try {
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

    // ── ETAPA 1: Autenticação ──────────────────────────────────────────────────
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    log["1_auth"] = {
      ok: !!user && !userError,
      user_id: user?.id ?? null,
      error: userError?.message ?? null,
    };
    if (!user) {
      return NextResponse.json({ ...log, fatal: "Não autenticado" });
    }

    // ── ETAPA 2: Busca de token ────────────────────────────────────────────────
    let rawToken: string | null = null;

    const { data: config, error: configErr } = await supabase
      .from("user_configs")
      .select("meta_access_token")
      .eq("user_id", user.id)
      .maybeSingle();
    rawToken = config?.meta_access_token ?? null;

    log["2_token_user_configs"] = {
      row_found: !!config,
      token_present: !!rawToken,
      token_preview: rawToken ? rawToken.slice(0, 12) + "…" : null,
      error: configErr?.message ?? null,
    };

    if (!rawToken) {
      const { data: settings, error: settingsErr } = await supabase
        .from("user_settings")
        .select("meta_access_token")
        .eq("user_id", user.id)
        .maybeSingle();
      rawToken = settings?.meta_access_token ?? null;

      log["2b_token_user_settings"] = {
        row_found: !!settings,
        token_present: !!rawToken,
        token_preview: rawToken ? rawToken.slice(0, 12) + "…" : null,
        error: settingsErr?.message ?? null,
      };
    }

    if (!rawToken) {
      return NextResponse.json({
        ...log,
        fatal: "Token Meta não encontrado em user_configs nem user_settings",
        fix: "Vá em Configurações e salve o Meta Access Token",
      });
    }

    const accessToken = limparToken(rawToken);
    log["2c_token_limpo"] = {
      preview: accessToken.slice(0, 12) + "…",
      comprimento: accessToken.length,
      parece_valido: accessToken.startsWith("EAA"),
    };

    // ── ETAPA 3: Busca de clientes (sem filtro ativo) ─────────────────────────
    const { data: todosClientes, error: todosErr } = await supabase
      .from("clientes")
      .select("id, nome, meta_account_id, ativo")
      .eq("user_id", user.id);

    log["3_todos_clientes"] = {
      total: todosClientes?.length ?? 0,
      error: todosErr?.message ?? null,
      lista: (todosClientes ?? []).map(c => ({
        id: c.id,
        nome: c.nome,
        ativo: c.ativo,
        meta_account_id: c.meta_account_id ?? "⚠️ VAZIO",
      })),
    };

    // ── ETAPA 4: Clientes que passariam no filtro original (ativo=true) ────────
    const { data: clientesFiltrados, error: filtErr } = await supabase
      .from("clientes")
      .select("id, nome, meta_account_id, ativo")
      .eq("user_id", user.id)
      .eq("ativo", true)
      .not("meta_account_id", "is", null);

    log["4_clientes_filtro_original"] = {
      total: clientesFiltrados?.length ?? 0,
      error: filtErr?.message ?? null,
      diagnostico: clientesFiltrados?.length === 0
        ? "⚠️ NENHUM cliente passou no filtro ativo=true — causa provável do bug"
        : "✅ Clientes encontrados",
      lista: (clientesFiltrados ?? []).map(c => ({
        id: c.id,
        nome: c.nome,
        ativo: c.ativo,
        meta_account_id: c.meta_account_id,
      })),
    };

    // ── ETAPA 5: Clientes com correção (neq ativo false) ──────────────────────
    const { data: clientesCorrigidos, error: corrErr } = await supabase
      .from("clientes")
      .select("id, nome, meta_account_id, ativo")
      .eq("user_id", user.id)
      .neq("ativo", false)
      .not("meta_account_id", "is", null);

    log["5_clientes_filtro_corrigido"] = {
      total: clientesCorrigidos?.length ?? 0,
      error: corrErr?.message ?? null,
      diagnostico: clientesCorrigidos?.length === 0
        ? "⚠️ Ainda sem clientes — verifique meta_account_id"
        : "✅ Clientes encontrados com filtro corrigido",
      lista: (clientesCorrigidos ?? []).map(c => ({
        id: c.id,
        nome: c.nome,
        ativo: c.ativo,
        meta_account_id: c.meta_account_id,
      })),
    };

    // ── ETAPA 6: Teste real na Meta API (primeiro cliente disponível) ─────────
    const clienteParaTeste = clientesCorrigidos?.[0] ?? todosClientes?.find(c => c.meta_account_id);

    if (clienteParaTeste?.meta_account_id) {
      const accountId = clienteParaTeste.meta_account_id;
      const fbUrl = `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=id,name,effective_status&limit=5&access_token=${accessToken}`;

      try {
        const fbRes = await fetch(fbUrl, { cache: "no-store" });
        const ct = fbRes.headers.get("content-type") ?? "";
        const fbData = await fbRes.json();

        log["6_meta_api_teste"] = {
          cliente: clienteParaTeste.nome,
          account_id: accountId,
          http_status: fbRes.status,
          content_type: ct,
          meta_error: fbData.error ?? null,
          campanhas_retornadas: fbData.data?.length ?? 0,
          primeiras_campanhas: (fbData.data ?? []).slice(0, 3).map((c: { id: string; name: string; effective_status: string }) => ({
            id: c.id,
            nome: c.name,
            status: c.effective_status,
          })),
          diagnostico: fbData.error
            ? `❌ Erro Meta código ${fbData.error.code}: ${fbData.error.message}`
            : fbData.data?.length === 0
            ? "⚠️ Meta retornou 0 campanhas para essa conta"
            : `✅ Meta retornou ${fbData.data?.length} campanhas`,
        };
      } catch (fetchErr) {
        log["6_meta_api_teste"] = {
          cliente: clienteParaTeste.nome,
          account_id: accountId,
          erro_fetch: fetchErr instanceof Error ? fetchErr.message : "Erro desconhecido",
          diagnostico: "❌ Falha na requisição HTTP para a Meta",
        };
      }
    } else {
      log["6_meta_api_teste"] = {
        diagnostico: "⏭️ Pulado — nenhum cliente com meta_account_id disponível",
      };
    }

    // ── ETAPA 7: Estado atual da tabela metricas_ads ──────────────────────────
    const { data: metricasExistentes, error: metricasErr } = await supabase
      .from("metricas_ads")
      .select("id, nome_campanha, status, cliente_id, data_atualizacao")
      .eq("user_id", user.id)
      .order("data_atualizacao", { ascending: false })
      .limit(5);

    log["7_metricas_ads_existentes"] = {
      total_encontrado: metricasExistentes?.length ?? 0,
      error: metricasErr?.message ?? null,
      ultimas: (metricasExistentes ?? []).map(m => ({
        nome: m.nome_campanha,
        status: m.status,
        cliente_id: m.cliente_id,
        atualizado: m.data_atualizacao,
      })),
    };

    // ── RESUMO FINAL ──────────────────────────────────────────────────────────
    const problemas: string[] = [];

    if (!log["2_token_user_configs"] || !(log["2_token_user_configs"] as Record<string, unknown>)["token_present"]) {
      if (!rawToken) problemas.push("❌ Token Meta não configurado");
    }
    if (!(log["2c_token_limpo"] as Record<string, unknown>)?.["parece_valido"]) {
      problemas.push("❌ Token não começa com EAA — pode estar inválido");
    }
    if ((log["3_todos_clientes"] as Record<string, unknown>)?.["total"] === 0) {
      problemas.push("❌ Nenhum cliente cadastrado para esse usuário");
    }
    if (
      (log["4_clientes_filtro_original"] as Record<string, unknown>)?.["total"] === 0 &&
      (log["3_todos_clientes"] as Record<string, unknown>)?.["total"] as number > 0
    ) {
      problemas.push("⚠️ Clientes existem mas campo 'ativo' não é true — CAUSA DO BUG");
    }
    const semAccountId = ((log["3_todos_clientes"] as Record<string, unknown>)?.["lista"] as Array<{ meta_account_id: string }> ?? [])
      .filter(c => c.meta_account_id === "⚠️ VAZIO");
    if (semAccountId.length > 0) {
      problemas.push(`⚠️ ${semAccountId.length} cliente(s) sem meta_account_id configurado`);
    }

    log["RESUMO"] = {
      problemas_encontrados: problemas.length,
      lista_problemas: problemas,
      status_geral: problemas.length === 0 ? "✅ Tudo parece OK — bug pode ser no upsert" : "❌ Problemas encontrados",
    };

    return NextResponse.json(log, { status: 200 });

  } catch (error: unknown) {
    return NextResponse.json({
      ...log,
      fatal: error instanceof Error ? error.message : "Erro interno",
    }, { status: 500 });
  }
}