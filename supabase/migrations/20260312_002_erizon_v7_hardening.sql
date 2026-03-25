-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002: Hardening — auth, benchmarks, idempotency constraints, indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Workspace membership (auth model)
create table if not exists workspace_members (
  id          uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id     uuid not null,
  role        text not null check (role in ('owner','admin','analyst','viewer'))
                default 'analyst',
  invited_by  uuid,
  created_at  timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index if not exists idx_workspace_members_user on workspace_members(user_id);

-- 2. Workspace-level benchmarks (replaces hardcoded values)
create table if not exists workspace_benchmarks (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references workspaces(id) on delete cascade unique,
  benchmark_ctr      numeric(10,4) not null default 1.5,
  benchmark_cpl      numeric(14,4) not null default 20,
  benchmark_cpa      numeric(14,4),
  benchmark_roas     numeric(14,4),
  anomaly_threshold  numeric(5,4)  not null default 0.35,
  updated_at         timestamptz   not null default now()
);

-- 3. Access token store (replaces token-in-body security issue)
alter table ad_accounts
  add column if not exists access_token text,
  add column if not exists token_expires_at timestamptz;

-- 4. status column on workspaces (required by worker job query)
alter table workspaces
  add column if not exists status text not null default 'active';

-- 5. Idempotency constraints on intelligence tables
-- anomaly_events: one row per (campaign, date, metric)
alter table anomaly_events
  add column if not exists snapshot_date date;
create unique index if not exists uniq_anomaly_campaign_date_metric
  on anomaly_events(campaign_id, snapshot_date, metric_name)
  where campaign_id is not null and snapshot_date is not null and metric_name is not null;

-- risk_events: one row per (campaign, date, risk_type)
alter table risk_events
  add column if not exists snapshot_date date;
create unique index if not exists uniq_risk_campaign_date_type
  on risk_events(campaign_id, snapshot_date, risk_type)
  where campaign_id is not null and snapshot_date is not null;

-- opportunity_events: one row per (campaign, date, opportunity_type)
alter table opportunity_events
  add column if not exists snapshot_date date;
create unique index if not exists uniq_opportunity_campaign_date_type
  on opportunity_events(campaign_id, snapshot_date, opportunity_type)
  where campaign_id is not null and snapshot_date is not null;

-- 6. Performance indexes for common query patterns
create index if not exists idx_snapshots_workspace_date
  on campaign_snapshots_daily(workspace_id, snapshot_date desc);

create index if not exists idx_campaigns_workspace
  on campaigns(workspace_id);

create index if not exists idx_anomalies_workspace
  on anomaly_events(workspace_id, detected_at desc);

create index if not exists idx_risks_workspace
  on risk_events(workspace_id, created_at desc);

create index if not exists idx_autopilot_suggestions_workspace
  on autopilot_suggestions(workspace_id, created_at desc);

-- 7. RPC for safe workspace daily aggregation (used by PulseService)
create or replace function get_workspace_daily_totals(
  p_workspace_id uuid,
  p_snapshot_date date
)
returns table (
  total_spend    numeric,
  total_revenue  numeric,
  campaign_count bigint
)
language sql
stable
as $$
  select
    coalesce(sum(spend), 0)   as total_spend,
    coalesce(sum(revenue), 0) as total_revenue,
    count(distinct campaign_id) as campaign_count
  from campaign_snapshots_daily
  where workspace_id = p_workspace_id
    and snapshot_date = p_snapshot_date;
$$;

-- 8. Row-Level Security on sensitive tables
alter table workspaces             enable row level security;
alter table workspace_members      enable row level security;
alter table campaigns              enable row level security;
alter table campaign_snapshots_daily enable row level security;
alter table anomaly_events         enable row level security;
alter table risk_events            enable row level security;
alter table opportunity_events     enable row level security;
alter table autopilot_suggestions  enable row level security;

-- Service role bypasses RLS (used server-side only)
-- Client-side access via anon key is locked to own workspace
create policy "workspace_members_own" on workspace_members
  for all using (user_id = auth.uid());

create policy "workspaces_member_access" on workspaces
  for select using (
    exists (
      select 1 from workspace_members
      where workspace_id = workspaces.id and user_id = auth.uid()
    )
  );
