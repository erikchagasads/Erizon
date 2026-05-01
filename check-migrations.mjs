#!/usr/bin/env node
/**
 * check-migrations.mjs — Erizon AI
 * Verifica se todas as tabelas usadas no código existem no Supabase.
 *
 * USO:
 *   node scripts/check-migrations.mjs
 *   node scripts/check-migrations.mjs --supabase   (consulta o banco real via API)
 *   node scripts/check-migrations.mjs --fix         (gera SQL das tabelas faltando)
 *
 * Requer: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

// ── Cores no terminal ─────────────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  bold:  "\x1b[1m",
  dim:   "\x1b[2m",
  red:   "\x1b[31m",
  green: "\x1b[32m",
  yellow:"\x1b[33m",
  blue:  "\x1b[34m",
  cyan:  "\x1b[36m",
  white: "\x1b[37m",
  gray:  "\x1b[90m",
};
const ok    = (s) => `${C.green}✓${C.reset} ${s}`;
const fail  = (s) => `${C.red}✗${C.reset} ${s}`;
const warn  = (s) => `${C.yellow}⚠${C.reset} ${s}`;
const info  = (s) => `${C.cyan}→${C.reset} ${s}`;
const bold  = (s) => `${C.bold}${s}${C.reset}`;
const dim   = (s) => `${C.dim}${s}${C.reset}`;

// ── Argumentos ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const MODE_SUPABASE = args.includes("--supabase");
const MODE_FIX      = args.includes("--fix");
const MODE_VERBOSE  = args.includes("--verbose") || args.includes("-v");

// ── 1. Tabelas declaradas nas migrations locais ───────────────────────────────
function getMigrationTables() {
  const migDir = path.join(ROOT, "supabase", "migrations");
  if (!fs.existsSync(migDir)) {
    console.error(fail("Pasta supabase/migrations não encontrada."));
    process.exit(1);
  }

  const tables = new Map(); // tableName -> fileName
  const files = fs.readdirSync(migDir)
    .filter(f => f.endsWith(".sql"))
    .sort();

  const CREATE_RE = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi;

  for (const file of files) {
    const content = fs.readFileSync(path.join(migDir, file), "utf8").toLowerCase();
    let m;
    while ((m = CREATE_RE.exec(content)) !== null) {
      const name = m[1].replace(/^public\./, "");
      if (!tables.has(name)) {
        tables.set(name, file);
      }
    }
  }

  return { tables, files };
}

// ── 2. Tabelas referenciadas no código (.from("tabela")) ──────────────────────
function getCodeTables() {
  const srcDir = path.join(ROOT, "src");
  const tables = new Map(); // tableName -> [files...]
  const IGNORE = new Set(["if", "not", "exists", "table", "public"]);

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      if (entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;

      const content = fs.readFileSync(full, "utf8");
      const FROM_RE = /\.from\(\s*["']([a-zA-Z_][a-zA-Z0-9_]*)["']/g;
      let m;
      while ((m = FROM_RE.exec(content)) !== null) {
        const name = m[1].toLowerCase();
        if (IGNORE.has(name)) continue;
        if (!tables.has(name)) tables.set(name, []);
        const rel = path.relative(ROOT, full);
        if (!tables.get(name).includes(rel)) {
          tables.get(name).push(rel);
        }
      }
    }
  }

  walk(srcDir);
  return tables;
}

// ── 3. Consultar Supabase real via REST ───────────────────────────────────────
async function getSupabaseTables() {
  // Ler .env.local
  const envFile = path.join(ROOT, ".env.local");
  const envVars = {};
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
      const [k, ...rest] = line.split("=");
      if (k && rest.length) envVars[k.trim()] = rest.join("=").trim();
    }
  }

  const url = envVars["NEXT_PUBLIC_SUPABASE_URL"] || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = envVars["SUPABASE_SERVICE_ROLE_KEY"] || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error(fail("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no .env.local"));
    process.exit(1);
  }

  console.log(info(`Conectando ao Supabase: ${url.replace(/https?:\/\//, "").split(".")[0]}...`));

  // Usa a API do Supabase para listar tabelas do schema public
  const res = await fetch(
    `${url}/rest/v1/rpc/get_public_tables`,
    { headers: { "apikey": key, "Authorization": `Bearer ${key}` } }
  ).catch(() => null);

  // Se a função RPC não existir, usa information_schema via SQL
  const res2 = await fetch(
    `${url}/rest/v1/?apikey=${key}`,
    {
      method: "HEAD",
      headers: { "apikey": key, "Authorization": `Bearer ${key}` }
    }
  ).catch(() => null);

  // Tenta via PostgREST introspection
  const schemaRes = await fetch(`${url}/rest/v1/`, {
    headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Accept": "application/json" }
  }).catch(() => null);

  if (!schemaRes || !schemaRes.ok) {
    console.error(fail("Não foi possível conectar ao Supabase. Verifique a URL e a service role key."));
    process.exit(1);
  }

  // PostgREST retorna a lista de endpoints = tabelas expostas
  const schema = await schemaRes.json().catch(() => ({ definitions: {} }));
  const exposed = new Set(Object.keys(schema.definitions || schema.paths || {}));

  // Também consulta information_schema via SQL
  const sqlRes = await fetch(`${url}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: JSON.stringify({ query: "select table_name from information_schema.tables where table_schema = 'public' order by table_name" }),
  }).catch(() => null);

  // Fallback: query direta via Supabase admin
  const adminRes = await fetch(
    `${url}/rest/v1/information_schema.tables?table_schema=eq.public&select=table_name`,
    {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Accept": "application/json",
      }
    }
  ).catch(() => null);

  let remoteTables = new Set();

  if (adminRes && adminRes.ok) {
    const rows = await adminRes.json().catch(() => []);
    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (row.table_name) remoteTables.add(row.table_name);
      }
    }
  }

  // Merge com PostgREST
  for (const t of exposed) remoteTables.add(t);

  if (remoteTables.size === 0) {
    // Último fallback: listar via endpoint direto
    const tablesRes = await fetch(`${url}/rest/v1/`, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}` }
    }).catch(() => null);
    
    console.warn(warn("Não foi possível listar tabelas via API. Use --fix para gerar SQL de verificação."));
    return null;
  }

  return remoteTables;
}

// ── 4. Gerar SQL de verificação ───────────────────────────────────────────────
function generateCheckSQL(missing) {
  const lines = [
    "-- Verificação de tabelas ausentes — gerado por check-migrations.mjs",
    "-- Cole no SQL Editor do Supabase Dashboard e execute",
    "",
    "SELECT",
    "  t.table_name,",
    "  CASE WHEN t.table_name IS NOT NULL THEN '✓ existe' ELSE '✗ ausente' END as status",
    "FROM (VALUES",
    ...missing.map((t, i) => `  ('${t}')${i < missing.length - 1 ? "," : ""}`),
    ") AS expected(table_name)",
    "LEFT JOIN information_schema.tables t",
    "  ON t.table_name = expected.table_name",
    "  AND t.table_schema = 'public'",
    "ORDER BY t.table_name NULLS LAST;",
    "",
    "-- Para ver TODAS as tabelas do seu banco:",
    "-- SELECT table_name FROM information_schema.tables",
    "-- WHERE table_schema = 'public' ORDER BY table_name;",
  ];
  return lines.join("\n");
}

// ── 5. Gerar SQL de criação das tabelas legadas faltando ──────────────────────
function generateFixSQL(missing) {
  // Templates para as tabelas legadas conhecidas do projeto Erizon
  const templates = {
    subscriptions: `
create table if not exists subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  plano                   text not null default 'pro'
                            check (plano in ('core','pro','command','trial')),
  status                  text not null default 'trialing'
                            check (status in ('trialing','active','past_due','canceled','incomplete','paused')),
  stripe_customer_id      text,
  stripe_subscription_id  text,
  trial_end               timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (user_id)
);
alter table subscriptions enable row level security;
drop policy if exists "subscriptions_own" on subscriptions;
create policy "subscriptions_own" on subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);`,

    clientes: `
create table if not exists clientes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  workspace_id  uuid references workspaces(id) on delete cascade,
  nome          text not null,
  nome_cliente  text,
  cor           text,
  niche         text,
  meta_account_id text,
  status        text not null default 'ativo',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table clientes enable row level security;
drop policy if exists "clientes_own" on clientes;
create policy "clientes_own" on clientes for all using (auth.uid() = user_id);`,

    agente_memoria: `
create table if not exists agente_memoria (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  workspace_id  text,
  resumo_contexto text,
  preferencias  jsonb default '{}',
  historico     jsonb default '[]',
  updated_at    timestamptz not null default now()
);
alter table agente_memoria enable row level security;
drop policy if exists "agente_memoria_own" on agente_memoria;
create policy "agente_memoria_own" on agente_memoria for all using (auth.uid() = user_id);`,

    user_settings: `
create table if not exists user_settings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade unique,
  settings   jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table user_settings enable row level security;
drop policy if exists "user_settings_own" on user_settings;
create policy "user_settings_own" on user_settings for all using (auth.uid() = user_id);`,

    user_configs: `
create table if not exists user_configs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade unique,
  configs    jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table user_configs enable row level security;
drop policy if exists "user_configs_own" on user_configs;
create policy "user_configs_own" on user_configs for all using (auth.uid() = user_id);`,

    trusted_devices: `
create table if not exists trusted_devices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  device_id   text not null,
  device_name text,
  last_seen   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (user_id, device_id)
);
alter table trusted_devices enable row level security;
drop policy if exists "trusted_devices_own" on trusted_devices;
create policy "trusted_devices_own" on trusted_devices for all using (auth.uid() = user_id);`,

    ai_rate_limits: `
create table if not exists ai_rate_limits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null,
  calls      int not null default 0,
  window_start timestamptz not null default now(),
  unique (user_id, endpoint)
);
alter table ai_rate_limits enable row level security;
drop policy if exists "ai_rate_limits_own" on ai_rate_limits;
create policy "ai_rate_limits_own" on ai_rate_limits for all using (auth.uid() = user_id);`,

    decisoes_historico: `
create table if not exists decisoes_historico (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  text not null,
  campanha_id   text,
  campanha_nome text,
  acao          text not null,
  motivo        text,
  resultado     jsonb,
  criado_em     timestamptz not null default now()
);
alter table decisoes_historico enable row level security;
drop policy if exists "decisoes_historico_all" on decisoes_historico;
create policy "decisoes_historico_all" on decisoes_historico for all using (true);`,

    agente_alertas: `
create table if not exists agente_alertas (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  text not null,
  user_id       uuid references auth.users(id) on delete cascade,
  titulo        text not null,
  mensagem      text,
  tipo          text not null default 'info' check (tipo in ('info','warning','error','success')),
  lido          boolean not null default false,
  criado_em     timestamptz not null default now()
);
alter table agente_alertas enable row level security;
drop policy if exists "agente_alertas_all" on agente_alertas;
create policy "agente_alertas_all" on agente_alertas for all using (true);`,
  };

  const known = missing.filter(t => templates[t]);
  const unknown = missing.filter(t => !templates[t]);

  let sql = "-- ═══════════════════════════════════════════════════════════════\n";
  sql += "-- FIX: Migrations faltando — gerado por check-migrations.mjs\n";
  sql += "-- Cole no SQL Editor do Supabase Dashboard\n";
  sql += "-- ═══════════════════════════════════════════════════════════════\n\n";

  for (const t of known) {
    sql += `-- ── ${t} ──────────────────────────────────────────────────────────\n`;
    sql += templates[t].trim() + "\n\n";
  }

  if (unknown.length > 0) {
    sql += "\n-- ── TABELAS SEM TEMPLATE (verifique manualmente) ─────────────────\n";
    sql += "-- As tabelas abaixo existem no código mas não têm template automático.\n";
    sql += "-- Provavelmente são tabelas legadas que existem no banco remoto.\n";
    sql += "-- Verifique via: SELECT * FROM information_schema.tables WHERE table_name IN (...)\n\n";
    sql += `-- ${unknown.join(", ")}\n`;
  }

  return sql;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n" + bold("═══════════════════════════════════════════════════════"));
  console.log(bold("  Erizon AI — Verificação de Migrations Supabase"));
  console.log(bold("═══════════════════════════════════════════════════════") + "\n");

  // 1. Migrations locais
  const { tables: migrationTables, files } = getMigrationTables();
  console.log(info(`${files.length} arquivos .sql analisados`));
  console.log(info(`${migrationTables.size} tabelas declaradas nas migrations locais\n`));

  // 2. Código
  const codeTables = getCodeTables();
  console.log(info(`${codeTables.size} tabelas referenciadas no código (.from(...))\n`));

  // 3. Calcular diff
  const IGNORE_TABLES = new Set(["if"]); // falso-positivos conhecidos
  const codeSet = new Set([...codeTables.keys()].filter(t => !IGNORE_TABLES.has(t)));
  const migSet  = new Set([...migrationTables.keys()]);

  const missingMigration  = [...codeSet].filter(t => !migSet.has(t)).sort();
  const onlyInMigration   = [...migSet].filter(t => !codeSet.has(t) && !IGNORE_TABLES.has(t)).sort();
  const ok_tables         = [...codeSet].filter(t => migSet.has(t)).sort();

  // 4. Resultado local
  console.log(bold("─── Tabelas OK (migration + código) ───────────────────────"));
  if (MODE_VERBOSE) {
    for (const t of ok_tables) {
      console.log("  " + ok(dim(t)));
    }
  } else {
    console.log(`  ${C.green}${ok_tables.length} tabelas OK${C.reset}`);
  }

  console.log("\n" + bold("─── Tabelas SEM migration local ────────────────────────"));
  if (missingMigration.length === 0) {
    console.log("  " + ok("Nenhuma tabela faltando!"));
  } else {
    for (const t of missingMigration) {
      const usedIn = codeTables.get(t) || [];
      const fileList = usedIn.slice(0, 2).join(", ") + (usedIn.length > 2 ? ` +${usedIn.length - 2}` : "");
      console.log(`  ${fail(C.bold + t + C.reset)}  ${dim("← " + fileList)}`);
    }
  }

  if (onlyInMigration.length > 0) {
    console.log("\n" + bold("─── Só na migration (não usadas no código) ─────────────"));
    for (const t of onlyInMigration) {
      console.log(`  ${warn(dim(t))}`);
    }
  }

  // 5. Consultar Supabase real
  let remoteTables = null;
  if (MODE_SUPABASE) {
    console.log("\n" + bold("─── Verificando banco Supabase real ────────────────────"));
    remoteTables = await getSupabaseTables();

    if (remoteTables) {
      console.log(info(`${remoteTables.size} tabelas encontradas no Supabase\n`));

      const missingRemote = missingMigration.filter(t => !remoteTables.has(t));
      const existsRemote  = missingMigration.filter(t => remoteTables.has(t));

      if (existsRemote.length > 0) {
        console.log(bold("  Faltam migration local, MAS existem no Supabase remoto:"));
        for (const t of existsRemote) {
          console.log(`    ${warn(t)} ${dim("← existe no banco, falta migration local")}`);
        }
        console.log(dim("  → Rode: supabase db diff --linked --schema public"));
      }

      if (missingRemote.length > 0) {
        console.log("\n" + bold(`  ${C.red}CRÍTICO: Faltam tanto migration quanto banco remoto:${C.reset}`));
        for (const t of missingRemote) {
          console.log(`    ${fail(t)}`);
        }
        console.log(dim("  → Use --fix para gerar o SQL de criação"));
      }
    }
  }

  // 6. Gerar arquivos de saída
  const outDir = path.join(ROOT, "scripts");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // SQL de verificação (sempre gera)
  const checkSQL = generateCheckSQL(missingMigration);
  const checkPath = path.join(outDir, "check-tables.sql");
  fs.writeFileSync(checkPath, checkSQL);
  console.log("\n" + info(`SQL de verificação salvo em: ${C.cyan}scripts/check-tables.sql${C.reset}`));
  console.log(dim("  → Cole no SQL Editor do Supabase Dashboard para verificar quais existem no banco"));

  // SQL de fix
  if (MODE_FIX || missingMigration.length > 0) {
    const fixSQL = generateFixSQL(missingMigration);
    const fixPath = path.join(outDir, "fix-missing-tables.sql");
    fs.writeFileSync(fixPath, fixSQL);
    console.log(info(`SQL de correção salvo em: ${C.cyan}scripts/fix-missing-tables.sql${C.reset}`));
    console.log(dim("  → Cole no SQL Editor para criar as tabelas faltando"));
  }

  // 7. Resumo final
  console.log("\n" + bold("═══════════════════════════════════════════════════════"));
  const status = missingMigration.length === 0
    ? `${C.green}${C.bold}✓ TUDO OK${C.reset}`
    : `${C.red}${C.bold}✗ ${missingMigration.length} TABELAS SEM MIGRATION${C.reset}`;
  console.log(`  Status: ${status}`);
  console.log(`  OK: ${C.green}${ok_tables.length}${C.reset}  |  Faltando: ${C.red}${missingMigration.length}${C.reset}  |  Só migration: ${C.yellow}${onlyInMigration.length}${C.reset}`);
  console.log(bold("═══════════════════════════════════════════════════════") + "\n");

  if (missingMigration.length > 0) {
    console.log(bold("Próximos passos:"));
    console.log(`  1. Abra o ${C.cyan}Supabase Dashboard → SQL Editor${C.reset}`);
    console.log(`  2. Cole e execute: ${C.cyan}scripts/check-tables.sql${C.reset} — veja quais já existem`);
    console.log(`  3. Para as que faltam: cole ${C.cyan}scripts/fix-missing-tables.sql${C.reset}`);
    console.log(`  4. Ou use o CLI: ${C.cyan}supabase db push${C.reset} após adicionar as migrations\n`);
  }

  process.exit(missingMigration.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(fail("Erro inesperado: " + err.message));
  process.exit(1);
});
