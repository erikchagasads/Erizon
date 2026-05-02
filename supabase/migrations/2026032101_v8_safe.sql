-- ── V8 Safe Migration ─────────────────────────────────────────────────────────
-- Apenas tabelas que ainda NÃO existem no banco.
-- Tabelas já criadas em migrações anteriores foram removidas deste arquivo:
--   campaign_snapshots_daily  → 20260312_002_erizon_v7_hardening.sql
--   timeline_events           → 20260312_001_erizon_v7_core.sql
--   anomaly_events            → 20260312_001_erizon_v7_core.sql
--   risk_events               → 20260312_001_erizon_v7_core.sql
--   autopilot_execution_logs  → 20260312_001_erizon_v7_core.sql
--   user_mfa_config           → 20260313_003_mfa_otp.sql
--   agente_memoria            → 20260320_agente_feedback_memoria.sql
--   agente_feedback           → 20260320_agente_feedback_memoria.sql

-- ── pending_decisions ─────────────────────────────────────────────────────────
create table if not exists pending_decisions (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         text not null,
  campaign_id          text,
  campaign_name        text,
  action_type          text not null check (action_type in ('pause','resume','scale_budget','reduce_budget','alert')),
  title                text not null,
  rationale            text not null,
  estimated_impact_brl numeric(12,2) default 0,
  confidence           text not null default 'medium' check (confidence in ('low','medium','high')),
  status               text not null default 'pending'
                       check (status in ('pending','approved','rejected','executed','expired')),
  meta_payload         jsonb,
  created_at           timestamptz not null default now(),
  expires_at           timestamptz not null default now() + interval '24 hours',
  decided_at           timestamptz,
  decided_by           uuid references auth.users(id),
  execution_result     jsonb
);

create index if not exists idx_pending_decisions_ws_status
  on pending_decisions(workspace_id, status, created_at desc);

create index if not exists idx_pending_decisions_expires
  on pending_decisions(expires_at) where status = 'pending';

alter table pending_decisions enable row level security;

drop policy if exists "pending_decisions_all" on pending_decisions;
create policy "pending_decisions_all" on pending_decisions for all using (true) with check (true);


-- ── autopilot_config ──────────────────────────────────────────────────────────
create table if not exists autopilot_config (
  workspace_id          text primary key,
  autopilot_enabled     boolean not null default false,
  auto_pause            boolean not null default false,
  auto_resume           boolean not null default false,
  auto_scale_budget     boolean not null default false,
  auto_reduce_budget    boolean not null default false,
  shield_max_spend_brl  numeric(10,2) default 500,
  max_auto_actions_day  int not null default 3,
  updated_at            timestamptz not null default now(),
  updated_by            uuid references auth.users(id)
);

alter table autopilot_config enable row level security;

drop policy if exists "autopilot_config_all" on autopilot_config;
create policy "autopilot_config_all" on autopilot_config for all using (true) with check (true);


-- ── profit_dna_snapshots ──────────────────────────────────────────────────────
create table if not exists profit_dna_snapshots (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          text not null,
  client_id             text not null,
  computed_at           timestamptz not null default now(),
  best_days_of_week     jsonb default '[]',
  best_hours            jsonb default '[]',
  worst_days_of_week    jsonb default '[]',
  best_formats          jsonb default '[]',
  best_hooks            jsonb default '[]',
  top_copies            jsonb default '[]',
  best_audiences        jsonb default '[]',
  golden_audience       text,
  cpl_p25               numeric,
  cpl_median            numeric,
  roas_p25              numeric,
  roas_median           numeric,
  frequency_sweet_spot  numeric,
  avg_budget_winner     numeric,
  avg_campaign_duration int,
  seasonality_patterns  jsonb default '{}',
  narrative             text,
  key_learnings         jsonb default '[]',
  n_campaigns_analyzed  int default 0,
  n_snapshots_analyzed  int default 0,
  confidence_score      numeric default 0,
  period_start          date,
  period_end            date,
  unique (workspace_id, client_id)
);

create index if not exists idx_profit_dna_workspace on profit_dna_snapshots(workspace_id);

alter table profit_dna_snapshots enable row level security;

drop policy if exists "profit_dna_all" on profit_dna_snapshots;
create policy "profit_dna_all" on profit_dna_snapshots for all using (true) with check (true);


-- ── network_weekly_insights ───────────────────────────────────────────────────
create table if not exists network_weekly_insights (
  id              uuid primary key default gen_random_uuid(),
  nicho           text not null,
  semana_inicio   date not null,
  cpl_p25         numeric,
  cpl_p50         numeric,
  cpl_p75         numeric,
  cpl_min         numeric,
  cpl_max         numeric,
  roas_p25        numeric,
  roas_p50        numeric,
  roas_p75        numeric,
  ctr_p25         numeric,
  ctr_p50         numeric,
  ctr_p75         numeric,
  frequency_p50   numeric,
  n_workspaces    int default 0,
  n_campaigns     int default 0,
  total_spend_brl numeric,
  top_pattern     text,
  market_trend    text check (market_trend in ('rising','stable','falling')),
  trend_note      text,
  computed_at     timestamptz not null default now(),
  unique (nicho, semana_inicio)
);

create index if not exists idx_nwi_nicho_semana on network_weekly_insights(nicho, semana_inicio desc);


-- ── network_participation ─────────────────────────────────────────────────────
create table if not exists network_participation (
  workspace_id  text primary key,
  opted_in      boolean not null default true,
  updated_at    timestamptz not null default now()
);

alter table network_participation enable row level security;

drop policy if exists "network_participation_all" on network_participation;
create policy "network_participation_all" on network_participation for all using (true) with check (true);


-- ── preflight_scores ──────────────────────────────────────────────────────────
create table if not exists preflight_scores (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      text not null,
  client_id         text,
  campaign_name     text,
  score             int not null check (score between 0 and 100),
  risks             jsonb default '[]',
  estimated_cpl_min numeric,
  estimated_cpl_max numeric,
  estimated_roas    numeric,
  input_snapshot    jsonb default '{}',
  created_at        timestamptz not null default now()
);

create index if not exists idx_preflight_workspace on preflight_scores(workspace_id, created_at desc);

alter table preflight_scores enable row level security;

drop policy if exists "preflight_scores_all" on preflight_scores;
create policy "preflight_scores_all" on preflight_scores for all using (true) with check (true);


-- ── budget_simulations ────────────────────────────────────────────────────────
create table if not exists budget_simulations (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          text not null,
  budget_total          numeric not null,
  alocacao_input        jsonb not null,
  alocacao_output       jsonb not null,
  impacto_estimado_brl  numeric,
  applied_at            timestamptz,
  created_at            timestamptz not null default now()
);

alter table budget_simulations enable row level security;

drop policy if exists "budget_simulations_all" on budget_simulations;
create policy "budget_simulations_all" on budget_simulations for all using (true) with check (true);


-- ── campaign_briefs ───────────────────────────────────────────────────────────
create table if not exists campaign_briefs (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        text not null,
  client_id           text,
  brief_text          text not null,
  parsed_brief        jsonb default '{}',
  generated_structure jsonb default '{}',
  status              text not null default 'draft' check (status in ('draft','applied','archived')),
  created_at          timestamptz not null default now()
);

alter table campaign_briefs enable row level security;

drop policy if exists "campaign_briefs_all" on campaign_briefs;
create policy "campaign_briefs_all" on campaign_briefs for all using (true) with check (true);


-- ── predictive_anomaly_alerts ─────────────────────────────────────────────────
create table if not exists predictive_anomaly_alerts (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            text not null,
  campaign_id             text not null,
  campaign_name           text,
  alert_type              text not null check (alert_type in (
    'creative_fatigue', 'cpl_spike', 'roas_degradation', 'budget_exhaustion', 'frequency_overload'
  )),
  confidence              numeric not null check (confidence between 0 and 1),
  predicted_at            timestamptz not null default now(),
  predicted_window_hours  int not null default 48,
  predicted_metric        text,
  predicted_delta_pct     numeric,
  preventive_action       text,
  status                  text not null default 'pending' check (status in ('pending','confirmed','dismissed','expired')),
  resolved_at             timestamptz,
  was_accurate            boolean
);

create index if not exists idx_pred_anomaly_workspace on predictive_anomaly_alerts(workspace_id, predicted_at desc);
create index if not exists idx_pred_anomaly_status on predictive_anomaly_alerts(workspace_id, status);

alter table predictive_anomaly_alerts enable row level security;

drop policy if exists "predictive_anomaly_alerts_all" on predictive_anomaly_alerts;
create policy "predictive_anomaly_alerts_all" on predictive_anomaly_alerts for all using (true) with check (true);


-- notification_log já existe com schema diferente (20260311_analise_criativo.sql) — skipped

-- ── mfa_otp_pending ───────────────────────────────────────────────────────────
create table if not exists mfa_otp_pending (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  otp_code    text not null,
  expires_at  timestamptz not null default now() + interval '5 minutes',
  used        boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id)
);

alter table mfa_otp_pending enable row level security;

drop policy if exists "mfa_otp_owner" on mfa_otp_pending;
create policy "mfa_otp_owner" on mfa_otp_pending for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── expire function ───────────────────────────────────────────────────────────
create or replace function expire_pending_decisions()
returns void language plpgsql security definer as $$
begin
  update pending_decisions
  set status = 'expired'
  where status = 'pending'
    and expires_at < now();
end;
$$;


-- ── campaign_perf_snapshots ───────────────────────────────────────────────────
-- Série temporal leve para o predictive anomaly engine (workspace_id como text)
-- NOTA: diferente de campaign_snapshots_daily (v7, usa UUIDs com FK)
create table if not exists campaign_perf_snapshots (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  text not null,
  campaign_id   text not null,
  snapshot_date date not null,
  spend         numeric default 0,
  roas          numeric default 0,
  cpl           numeric default 0,
  ctr           numeric default 0,
  frequency     numeric default 0,
  leads         int default 0,
  clicks        int default 0,
  revenue       numeric default 0,
  created_at    timestamptz not null default now(),
  unique (workspace_id, campaign_id, snapshot_date)
);

create index if not exists idx_camp_perf_ws_date
  on campaign_perf_snapshots(workspace_id, snapshot_date desc);

create index if not exists idx_camp_perf_campaign
  on campaign_perf_snapshots(campaign_id, snapshot_date desc);

alter table campaign_perf_snapshots enable row level security;

drop policy if exists "campaign_perf_snapshots_all" on campaign_perf_snapshots;
create policy "campaign_perf_snapshots_all" on campaign_perf_snapshots for all using (true) with check (true);
