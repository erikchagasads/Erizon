import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin-auth";
import {
  CRITICAL_DATABASE_TABLES,
  EXPECTED_DATABASE_TABLES,
  MIGRATION_CREATED_TABLES,
  TABLES_USED_WITHOUT_CREATE_MIGRATION,
} from "@/lib/database-health";

type TableCheck = {
  table: string;
  exists: boolean;
  count: number | null;
  error: string | null;
};

async function checkTable(db: ReturnType<typeof createServerSupabase>, table: string): Promise<TableCheck> {
  const { count, error } = await db
    .from(table)
    .select("*", { count: "exact", head: true });

  return {
    table,
    exists: !error,
    count: error ? null : count ?? 0,
    error: error?.message ?? null,
  };
}

function statusFrom(missingCritical: string[], missingExpected: string[]) {
  if (missingCritical.length > 0) return "Erro";
  if (missingExpected.length > 0 || TABLES_USED_WITHOUT_CREATE_MIGRATION.length > 0) return "Atenção";
  return "OK";
}

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.user) return auth.response;

  const db = createServerSupabase();
  const checks = await Promise.all(EXPECTED_DATABASE_TABLES.map((table) => checkTable(db, table)));
  const foundTables = checks.filter((item) => item.exists).map((item) => item.table);
  const missingTables = checks.filter((item) => !item.exists).map((item) => item.table);
  const criticalCounts = checks
    .filter((item) => (CRITICAL_DATABASE_TABLES as readonly string[]).includes(item.table))
    .reduce<Record<string, number | null>>((acc, item) => {
      acc[item.table] = item.count;
      return acc;
    }, {});

  const missingCriticalTables = missingTables.filter((table) =>
    (CRITICAL_DATABASE_TABLES as readonly string[]).includes(table)
  );

  const dailyCount = criticalCounts.campaign_snapshots_daily ?? 0;
  const perfCount = criticalCounts.campaign_perf_snapshots ?? 0;
  const blogUsesFallback = perfCount > 0 && dailyCount === 0;

  const recommendations = [
    ...TABLES_USED_WITHOUT_CREATE_MIGRATION.map((table) =>
      `Criar ou importar migration para a tabela usada no código: ${table}.`
    ),
    ...(blogUsesFallback
      ? ["O cron atual alimenta campaign_perf_snapshots; o Blog Inteligente está usando essa tabela como fallback seguro."]
      : []),
    ...(missingCriticalTables.length
      ? [`Corrigir tabelas críticas ausentes antes de produção: ${missingCriticalTables.join(", ")}.`]
      : []),
  ];

  return NextResponse.json({
    status: statusFrom(missingCriticalTables, missingTables),
    generated_at: new Date().toISOString(),
    expected_tables: EXPECTED_DATABASE_TABLES,
    migration_created_tables: MIGRATION_CREATED_TABLES,
    found_tables: foundTables,
    missing_tables: missingTables,
    tables_used_without_create_migration: TABLES_USED_WITHOUT_CREATE_MIGRATION,
    counts: criticalCounts,
    critical_migrations: {
      intelligent_blog: {
        required_tables: [
          "blog_posts",
          "blog_market_sources",
          "blog_generation_logs",
          "blog_newsletter_subscribers",
          "blog_newsletter_deliveries",
          "anonymous_campaign_insights",
          "blog_settings",
        ],
        missing_tables: missingTables.filter((table) =>
          [
            "blog_posts",
            "blog_market_sources",
            "blog_generation_logs",
            "blog_newsletter_subscribers",
            "blog_newsletter_deliveries",
            "anonymous_campaign_insights",
            "blog_settings",
          ].includes(table)
        ),
      },
    },
    intelligent_blog: {
      reads_primary_table: "campaign_snapshots_daily",
      reads_fallback_table: "campaign_perf_snapshots",
      primary_count: dailyCount,
      fallback_count: perfCount,
      status: dailyCount > 0 || perfCount > 0 ? "OK" : "Atenção",
      alert: blogUsesFallback
        ? "O cron está populando campaign_perf_snapshots e a tabela campaign_snapshots_daily está vazia. O blog usa fallback seguro, sem dados simulados."
        : dailyCount > 0
          ? "O blog tem dados reais na tabela oficial campaign_snapshots_daily."
          : "Nenhum snapshot real encontrado para estudos anônimos e relatórios.",
    },
    checks,
    recommendations,
  });
}

