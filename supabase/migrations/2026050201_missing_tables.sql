-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260502_001_missing_tables.sql
-- Tabelas usadas no código Erizon que não tinham migration local.
-- Schema inferido diretamente do código-fonte (selects, inserts, upserts).
-- Cole no SQL Editor do Supabase OU rode: supabase db push
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 1. user_settings ─────────────────────────────────────────────────────────
-- Tokens OAuth de todas as plataformas de anúncios por usuário.
-- Usada em: meta-ads/callback, google-ads/callback, tiktok-ads/callback,
--           linkedin-ads/callback, ads-sync, ai-criativo, settings/api-key

create table if not exists user_settings (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,

  -- Meta Ads
  meta_access_token           text,
  meta_ad_account_id          text,

  -- Google Ads
  google_ads_access_token     text,
  google_ads_refresh_token    text,
  google_ads_developer_token  text,

  -- TikTok Ads
  tiktok_ads_access_token     text,
  tiktok_ads_advertiser_id    text,

  -- LinkedIn Ads
  linkedin_ads_access_token   text,
  linkedin_ads_refresh_token  text,
  linkedin_ads_account_id     text,

  -- API key interna
  api_key                     text,

  updated_at                  timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_user_settings_user on user_settings(user_id);

alter table user_settings enable row level security;
drop policy if exists "user_settings_own" on user_settings;
create policy "user_settings_own" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── 2. user_configs ──────────────────────────────────────────────────────────
-- Configurações de onboarding, telegram e preferências por usuário.
-- Usada em: OnboardingChecklist, BannerStatus, admin/stats

create table if not exists user_configs (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,

  -- Onboarding
  onboarding_steps        jsonb not null default '{}',
  onboarding_fechado      boolean not null default false,

  -- Negócio
  ticket_medio_global     numeric(12,2),
  telegram_chat_id        text,

  -- Controle de sync
  ultimo_sync             timestamptz,

  updated_at              timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_user_configs_user on user_configs(user_id);

alter table user_configs enable row level security;
drop policy if exists "user_configs_own" on user_configs;
create policy "user_configs_own" on user_configs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── 3. clientes ──────────────────────────────────────────────────────────────
-- Clientes cadastrados pelo gestor/agência.
-- Usada em: crm/webhook, ads-sync, crm-cliente/auth, benchmark-market-intelligence

create table if not exists clientes (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  workspace_id        uuid references workspaces(id) on delete set null,

  nome                text not null,
  nome_cliente        text,
  email               text,
  whatsapp            text,
  whatsapp_mensagem   text,

  -- Identidade visual
  cor                 text,
  logo_url            text,

  -- Segmentação
  niche               text,
  facebook_pixel_id   text,
  meta_account_id     text,

  -- Status
  status              text not null default 'ativo'
                        check (status in ('ativo', 'inativo', 'pausado')),

  -- Token para portal do cliente (crm_cliente_auth usa isso)
  crm_token           text unique default gen_random_uuid()::text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_clientes_user    on clientes(user_id);
alter table clientes
  add column if not exists crm_token text unique default gen_random_uuid()::text;
update clientes set crm_token = gen_random_uuid()::text where crm_token is null;
create index if not exists idx_clientes_crm_token on clientes(crm_token) where crm_token is not null;

alter table clientes enable row level security;
drop policy if exists "clientes_own" on clientes;
create policy "clientes_own" on clientes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── 4. metricas_ads ──────────────────────────────────────────────────────────
-- Snapshot de métricas por campanha, sincronizado pelo ads-sync.
-- Usada em: network-intelligence, benchmark-market-intelligence, risk-radar, OnboardingChecklist

create table if not exists metricas_ads (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  workspace_id        text,

  -- Identificação da campanha
  campanha_id         text,
  nome_campanha       text,
  plataforma          text not null default 'meta'
                        check (plataforma in ('meta','google','tiktok','linkedin','outros')),

  -- Métricas financeiras
  gasto_total         numeric(14,2) not null default 0,
  receita_estimada    numeric(14,2) not null default 0,
  roas                numeric(8,4),
  cpl                 numeric(10,2),
  ctr                 numeric(8,4),

  -- Volumes
  contatos            int not null default 0,
  impressoes          bigint not null default 0,
  cliques             int not null default 0,

  -- Estado
  status              text not null default 'ativo'
                        check (status in ('ativo','pausado','encerrado','rascunho')),

  data_atualizacao    timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

alter table metricas_ads
  add column if not exists workspace_id text,
  add column if not exists campanha_id text,
  add column if not exists nome_campanha text,
  add column if not exists plataforma text not null default 'meta',
  add column if not exists gasto_total numeric(14,2) not null default 0,
  add column if not exists receita_estimada numeric(14,2) not null default 0,
  add column if not exists roas numeric(8,4),
  add column if not exists cpl numeric(10,2),
  add column if not exists ctr numeric(8,4),
  add column if not exists contatos int not null default 0,
  add column if not exists impressoes bigint not null default 0,
  add column if not exists cliques int not null default 0,
  add column if not exists status text not null default 'ativo',
  add column if not exists data_atualizacao timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_metricas_ads_user     on metricas_ads(user_id);
create index if not exists idx_metricas_ads_status   on metricas_ads(user_id, status);
create index if not exists idx_metricas_ads_camp     on metricas_ads(campanha_id) where campanha_id is not null;

alter table metricas_ads enable row level security;
drop policy if exists "metricas_ads_own" on metricas_ads;
create policy "metricas_ads_own" on metricas_ads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── 5. metricas_snapshot_diario ──────────────────────────────────────────────
-- Snapshot diário consolidado por usuário para histórico e analytics.
-- Usada em: useHistorico, snapshot/route, check-degradacao, analytics

create table if not exists metricas_snapshot_diario (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  data_snapshot       date not null,

  -- Financeiro
  gasto_total         numeric(14,2) not null default 0,
  receita_total       numeric(14,2) not null default 0,
  lucro_total         numeric(14,2) not null default 0,
  roas_global         numeric(8,4),
  margem_global       numeric(8,4),

  -- Leads / CPL
  cpl_medio           numeric(10,2),
  cpl_ontem           numeric(10,2),
  cpl_semana          numeric(10,2),
  total_leads         int not null default 0,
  leads_ontem         int not null default 0,

  -- CTR
  ctr_ontem           numeric(8,4),
  ctr_semana          numeric(8,4),

  -- Campanhas
  total_campanhas     int not null default 0,
  campanha_id         text,
  campanha_nome       text,

  -- Volume
  impressoes          bigint not null default 0,
  gasto_ontem         numeric(14,2),

  created_at          timestamptz not null default now(),
  unique (user_id, data_snapshot)
);

alter table metricas_snapshot_diario
  add column if not exists data_snapshot date,
  add column if not exists roas_medio numeric(8,4),
  add column if not exists cpl_medio numeric(10,2),
  add column if not exists ctr_medio numeric(8,4),
  add column if not exists gasto_total numeric(14,2) not null default 0,
  add column if not exists receita_total numeric(14,2) not null default 0,
  add column if not exists contatos_total int not null default 0,
  add column if not exists campanhas_ativas int not null default 0,
  add column if not exists melhor_campanha_id text,
  add column if not exists melhor_campanha_nome text,
  add column if not exists pior_campanha_id text,
  add column if not exists pior_campanha_nome text,
  add column if not exists impressoes bigint not null default 0,
  add column if not exists gasto_ontem numeric(14,2),
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_snapshot_diario_user_date
  on metricas_snapshot_diario(user_id, data_snapshot desc);

alter table metricas_snapshot_diario enable row level security;
drop policy if exists "metricas_snapshot_own" on metricas_snapshot_diario;
create policy "metricas_snapshot_own" on metricas_snapshot_diario
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── 6. agente_memoria ────────────────────────────────────────────────────────
-- Memória consolidada do copiloto por usuário.
-- Usada em: agente/route, agente/feedback, agente/worker

create table if not exists agente_memoria (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  workspace_id        text,

  -- Contexto acumulado
  resumo_contexto     text,
  preferencias        jsonb not null default '{}',
  historico           jsonb not null default '[]',

  -- Métricas do agente
  total_interacoes    int not null default 0,
  ultimo_topico       text,

  updated_at          timestamptz not null default now(),
  unique (user_id)
);

alter table agente_memoria
  add column if not exists workspace_id text,
  add column if not exists resumo_contexto text,
  add column if not exists preferencias jsonb not null default '{}',
  add column if not exists historico jsonb not null default '[]',
  add column if not exists total_interacoes int not null default 0,
  add column if not exists ultimo_topico text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_agente_memoria_user on agente_memoria(user_id);

alter table agente_memoria enable row level security;
drop policy if exists "agente_memoria_own" on agente_memoria;
create policy "agente_memoria_own" on agente_memoria
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── 7. agente_alertas ────────────────────────────────────────────────────────
-- Alertas gerados pelo agente para o usuário.
-- Usada em: agente/worker, agente/memoria

create table if not exists agente_alertas (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  text not null,
  user_id       uuid references auth.users(id) on delete cascade,

  titulo        text not null,
  mensagem      text,
  tipo          text not null default 'info'
                  check (tipo in ('info', 'warning', 'error', 'success')),
  prioridade    text not null default 'normal'
                  check (prioridade in ('baixa', 'normal', 'alta', 'critica')),

  lido          boolean not null default false,
  lido_em       timestamptz,

  criado_em     timestamptz not null default now()
);

alter table agente_alertas
  add column if not exists workspace_id text,
  add column if not exists titulo text,
  add column if not exists mensagem text,
  add column if not exists tipo text not null default 'info',
  add column if not exists prioridade text not null default 'normal',
  add column if not exists lido boolean not null default false,
  add column if not exists lido_em timestamptz,
  add column if not exists criado_em timestamptz not null default now();

create index if not exists idx_agente_alertas_workspace
  on agente_alertas(workspace_id, criado_em desc);
create index if not exists idx_agente_alertas_user_nao_lido
  on agente_alertas(user_id, lido) where lido = false;

alter table agente_alertas enable row level security;
drop policy if exists "agente_alertas_own" on agente_alertas;
create policy "agente_alertas_own" on agente_alertas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── 8. trusted_devices ───────────────────────────────────────────────────────
-- Dispositivos confiáveis para skip de MFA no login.
-- Usada em: login/page

create table if not exists trusted_devices (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,

  device_id     text not null,
  device_name   text,
  user_agent    text,
  ip_address    text,

  last_seen     timestamptz not null default now(),
  created_at    timestamptz not null default now(),

  unique (user_id, device_id)
);

alter table trusted_devices
  add column if not exists device_id text,
  add column if not exists device_name text,
  add column if not exists user_agent text,
  add column if not exists ip_address text,
  add column if not exists last_seen timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_trusted_devices_user on trusted_devices(user_id);

alter table trusted_devices enable row level security;
drop policy if exists "trusted_devices_own" on trusted_devices;
create policy "trusted_devices_own" on trusted_devices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── 9. ai_rate_limits ────────────────────────────────────────────────────────
-- Controle de rate limit por usuário/endpoint para chamadas de IA.
-- Usada em: api/ai/route

create table if not exists ai_rate_limits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  endpoint      text not null,
  calls         int not null default 0,
  window_start  timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table ai_rate_limits
  add column if not exists endpoint text,
  add column if not exists calls int not null default 0,
  add column if not exists window_start timestamptz not null default now();

create index if not exists idx_ai_rate_limits_user on ai_rate_limits(user_id);

alter table ai_rate_limits enable row level security;
drop policy if exists "ai_rate_limits_own" on ai_rate_limits;
create policy "ai_rate_limits_own" on ai_rate_limits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── 10. decisoes_historico ───────────────────────────────────────────────────
-- Histórico de decisões tomadas pelo autopilot e confirmadas pelo usuário.
-- Usada em: PainelDecisoes, crm/dashboard, useMetricas, automacoes

create table if not exists decisoes_historico (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  workspace_id    text,
  campanha_id     text,
  campanha_nome   text,

  acao            text not null
                    check (acao in ('pausa','escala','ajuste','criativo','outro')),
  motivo          text,
  resultado       jsonb,
  -- { roas_antes, roas_depois, cpl_antes, cpl_depois, economia, status }

  status          text not null default 'executada'
                    check (status in ('executada','revertida','ignorada','pendente')),

  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

alter table decisoes_historico
  add column if not exists workspace_id text,
  add column if not exists campanha_id text,
  add column if not exists campanha_nome text,
  add column if not exists acao text not null default 'outro',
  add column if not exists motivo text,
  add column if not exists resultado jsonb,
  add column if not exists status text not null default 'executada',
  add column if not exists criado_em timestamptz not null default now(),
  add column if not exists atualizado_em timestamptz not null default now();

create index if not exists idx_decisoes_user
  on decisoes_historico(user_id, criado_em desc);
create index if not exists idx_decisoes_workspace
  on decisoes_historico(workspace_id, criado_em desc);

alter table decisoes_historico enable row level security;
drop policy if exists "decisoes_historico_own" on decisoes_historico;
create policy "decisoes_historico_own" on decisoes_historico
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── 11. autopilot_configs ────────────────────────────────────────────────────
-- Configurações do autopilot por workspace (limite de ações por dia etc).
-- Usada em: meta-actions/route

create table if not exists autopilot_configs (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  workspace_id            text,

  max_auto_actions_day    int not null default 5,
  modo                    text not null default 'sugestao'
                            check (modo in ('sugestao','automatico','hibrido')),
  ativo                   boolean not null default true,

  -- Thresholds
  roas_minimo             numeric(6,3) default 1.0,
  cpl_maximo              numeric(10,2),
  score_pausa             int default 30,
  score_escala            int default 80,

  updated_at              timestamptz not null default now(),
  unique (user_id)
);

alter table autopilot_configs
  add column if not exists workspace_id text,
  add column if not exists max_auto_actions_day int not null default 5,
  add column if not exists modo text not null default 'sugestao',
  add column if not exists ativo boolean not null default true,
  add column if not exists roas_minimo numeric(6,3) default 1.0,
  add column if not exists cpl_maximo numeric(10,2),
  add column if not exists score_pausa int default 30,
  add column if not exists score_escala int default 80,
  add column if not exists updated_at timestamptz not null default now();

alter table autopilot_configs enable row level security;
drop policy if exists "autopilot_configs_own" on autopilot_configs;
create policy "autopilot_configs_own" on autopilot_configs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── 12. bm_accounts ──────────────────────────────────────────────────────────
-- Business Manager accounts do Meta vinculados ao usuário.
-- Usada em: OnboardingChecklist, admin/stats, ads-sync

create table if not exists bm_accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,

  bm_id           text not null,
  bm_name         text,
  access_token    text,
  ad_account_ids  text[] not null default '{}',

  status          text not null default 'ativo'
                    check (status in ('ativo','inativo','erro')),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, bm_id)
);

alter table bm_accounts
  add column if not exists bm_id text,
  add column if not exists bm_name text,
  add column if not exists access_token text,
  add column if not exists ad_account_ids text[] not null default '{}',
  add column if not exists status text not null default 'ativo',
  add column if not exists criado_em timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_bm_accounts_user on bm_accounts(user_id);

alter table bm_accounts enable row level security;
drop policy if exists "bm_accounts_own" on bm_accounts;
create policy "bm_accounts_own" on bm_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── 13. leads ────────────────────────────────────────────────────────────────
-- Leads capturados pelas landing pages das campanhas.
-- Usada em: leads/webhook, lp/[codigo]

create table if not exists leads (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete set null,
  gestor_id           uuid references auth.users(id) on delete set null,
  campanha_id         uuid,
  campanha_nome       text,

  -- Dados do lead
  nome                text,
  email               text,
  telefone            text,
  mensagem_original   text,

  -- Origem
  canal               text not null default 'landing_page'
                        check (canal in ('landing_page','whatsapp','webhook','manual','outro')),
  utm_source          text,
  utm_medium          text,
  utm_campaign        text,

  -- Estado
  status              text not null default 'novo'
                        check (status in ('novo','contatado','qualificado','convertido','perdido')),

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table leads
  add column if not exists gestor_id uuid references auth.users(id) on delete set null,
  add column if not exists campanha_id uuid,
  add column if not exists campanha_nome text,
  add column if not exists nome text,
  add column if not exists email text,
  add column if not exists telefone text,
  add column if not exists mensagem_original text,
  add column if not exists canal text not null default 'landing_page',
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists status text not null default 'novo',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_leads_user       on leads(user_id, created_at desc);
create index if not exists idx_leads_campanha   on leads(campanha_id) where campanha_id is not null;
create index if not exists idx_leads_status     on leads(status);

alter table leads enable row level security;
drop policy if exists "leads_own" on leads;
create policy "leads_own" on leads
  for all using (auth.uid() = user_id or auth.uid() = gestor_id);


-- ── 14. campanhas ────────────────────────────────────────────────────────────
-- Campanhas internas (distintas de campaigns que é o sync das plataformas).
-- Usada em: campanhas-vincular/route

create table if not exists campanhas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  workspace_id    text,
  cliente_id      uuid references clientes(id) on delete set null,

  nome            text not null,
  descricao       text,
  plataforma      text not null default 'meta'
                    check (plataforma in ('meta','google','tiktok','linkedin','outros')),
  external_id     text,

  -- Financeiro
  orcamento_diario  numeric(12,2),
  gasto_total       numeric(14,2) not null default 0,

  -- Estado
  status          text not null default 'ativa'
                    check (status in ('ativa','pausada','encerrada','rascunho')),

  -- Corretor responsável (imóveis/CRM)
  corretor_id     uuid references auth.users(id) on delete set null,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table campanhas
  add column if not exists workspace_id text,
  add column if not exists cliente_id uuid references clientes(id) on delete set null,
  add column if not exists nome text,
  add column if not exists descricao text,
  add column if not exists plataforma text not null default 'meta',
  add column if not exists external_id text,
  add column if not exists orcamento_diario numeric(12,2),
  add column if not exists gasto_total numeric(14,2) not null default 0,
  add column if not exists status text not null default 'ativa',
  add column if not exists corretor_id uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_campanhas_user   on campanhas(user_id);
create index if not exists idx_campanhas_status on campanhas(status);

alter table campanhas enable row level security;
drop policy if exists "campanhas_own" on campanhas;
create policy "campanhas_own" on campanhas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── 15. campanhas_crm ────────────────────────────────────────────────────────
-- Campanhas CRM vinculadas às landing pages.
-- Usada em: lp/[codigo]

create table if not exists campanhas_crm (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  codigo              text unique not null,

  nome                text not null,
  descricao           text,
  corretor_id         uuid references auth.users(id) on delete set null,
  cliente_id          uuid references clientes(id) on delete set null,

  -- Config da LP
  titulo_lp           text,
  subtitulo_lp        text,
  cta_lp              text,
  cor_primaria        text,

  ativo               boolean not null default true,
  created_at          timestamptz not null default now()
);

alter table campanhas_crm
  add column if not exists codigo text,
  add column if not exists nome text,
  add column if not exists descricao text,
  add column if not exists corretor_id uuid references auth.users(id) on delete set null,
  add column if not exists cliente_id uuid references clientes(id) on delete set null,
  add column if not exists titulo_lp text,
  add column if not exists subtitulo_lp text,
  add column if not exists cta_lp text,
  add column if not exists cor_primaria text,
  add column if not exists ativo boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_campanhas_crm_codigo  on campanhas_crm(codigo);
create index if not exists idx_campanhas_crm_user    on campanhas_crm(user_id);

alter table campanhas_crm enable row level security;
drop policy if exists "campanhas_crm_own" on campanhas_crm;
create policy "campanhas_crm_own" on campanhas_crm
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── 16. corretores ───────────────────────────────────────────────────────────
-- Corretores vinculados a um gestor/agência (módulo CRM imóveis).
-- Usada em: corretores/route

create table if not exists corretores (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  -- user_id = gestor que criou o corretor

  nome          text not null,
  email         text,
  whatsapp      text,
  creci         text,

  ativo         boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table corretores
  add column if not exists nome text,
  add column if not exists email text,
  add column if not exists whatsapp text,
  add column if not exists creci text,
  add column if not exists ativo boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_corretores_user on corretores(user_id);

alter table corretores enable row level security;
drop policy if exists "corretores_own" on corretores;
create policy "corretores_own" on corretores
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── 17. daily_snapshots ──────────────────────────────────────────────────────
-- Snapshots diários usados pelo feedback-loop-service.
-- Usada em: feedback-loop-service

create table if not exists daily_snapshots (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  workspace_id    text,
  data            date not null,

  metricas        jsonb not null default '{}',
  -- { roas, cpl, ctr, spend, leads, score_medio }

  fonte           text not null default 'auto'
                    check (fonte in ('auto', 'manual', 'sync')),

  created_at      timestamptz not null default now(),
  unique (user_id, data)
);

alter table daily_snapshots
  add column if not exists workspace_id text,
  add column if not exists data date,
  add column if not exists metricas jsonb not null default '{}',
  add column if not exists fonte text not null default 'auto',
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_daily_snapshots_user_data
  on daily_snapshots(user_id, data desc);

alter table daily_snapshots enable row level security;
drop policy if exists "daily_snapshots_own" on daily_snapshots;
create policy "daily_snapshots_own" on daily_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- FIM DA MIGRATION
-- Após rodar, execute para confirmar:
--
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;
-- ═══════════════════════════════════════════════════════════════════════════════
