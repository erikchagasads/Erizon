-- ═══════════════════════════════════════════════════════════════
-- FIX: Migrations faltando — gerado por check-migrations.mjs
-- Cole no SQL Editor do Supabase Dashboard
-- ═══════════════════════════════════════════════════════════════

-- ── agente_alertas ──────────────────────────────────────────────────────────
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
create policy "agente_alertas_all" on agente_alertas for all using (true);

-- ── agente_memoria ──────────────────────────────────────────────────────────
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
create policy "agente_memoria_own" on agente_memoria for all using (auth.uid() = user_id);

-- ── ai_rate_limits ──────────────────────────────────────────────────────────
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
create policy "ai_rate_limits_own" on ai_rate_limits for all using (auth.uid() = user_id);

-- ── clientes ──────────────────────────────────────────────────────────
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
create policy "clientes_own" on clientes for all using (auth.uid() = user_id);

-- ── decisoes_historico ──────────────────────────────────────────────────────────
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
create policy "decisoes_historico_all" on decisoes_historico for all using (true);

-- ── trusted_devices ──────────────────────────────────────────────────────────
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
create policy "trusted_devices_own" on trusted_devices for all using (auth.uid() = user_id);

-- ── user_configs ──────────────────────────────────────────────────────────
create table if not exists user_configs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade unique,
  configs    jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table user_configs enable row level security;
drop policy if exists "user_configs_own" on user_configs;
create policy "user_configs_own" on user_configs for all using (auth.uid() = user_id);

-- ── user_settings ──────────────────────────────────────────────────────────
create table if not exists user_settings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade unique,
  settings   jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table user_settings enable row level security;
drop policy if exists "user_settings_own" on user_settings;
create policy "user_settings_own" on user_settings for all using (auth.uid() = user_id);


-- ── TABELAS SEM TEMPLATE (verifique manualmente) ─────────────────
-- As tabelas abaixo existem no código mas não têm template automático.
-- Provavelmente são tabelas legadas que existem no banco remoto.
-- Verifique via: SELECT * FROM information_schema.tables WHERE table_name IN (...)

-- autopilot_configs, bm_accounts, campanhas, campanhas_crm, corretores, daily_snapshots, leads, metricas_ads, metricas_snapshot_diario
