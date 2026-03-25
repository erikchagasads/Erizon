-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003: Objective-aware benchmarks
-- Extends workspace_benchmarks to store one row per objective,
-- enabling per-objective KPI thresholds.
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop old single-row-per-workspace constraint and add objective column
alter table workspace_benchmarks
  drop constraint if exists workspace_benchmarks_workspace_id_key;

alter table workspace_benchmarks
  add column if not exists objective text
    check (objective in (
      'LEADS','SALES','TRAFFIC','AWARENESS',
      'ENGAGEMENT','APP_PROMOTION','UNKNOWN'
    ));

-- Add new KPI columns for objectives beyond LEADS
alter table workspace_benchmarks
  add column if not exists benchmark_cpm       numeric(14,4),
  add column if not exists benchmark_cpc       numeric(14,4),
  add column if not exists benchmark_frequency numeric(6,2);

-- New constraint: one row per workspace + objective
create unique index if not exists uniq_workspace_benchmarks_objective
  on workspace_benchmarks(workspace_id, objective)
  where objective is not null;

-- Seed default objective benchmarks for LEADS (backward compatible)
-- Existing rows with no objective are treated as LEADS defaults
update workspace_benchmarks
  set objective = 'LEADS'
  where objective is null;

-- Add campaign.objective to snapshot query view for convenience
create or replace view campaign_snapshots_with_objective as
  select
    s.*,
    c.objective        as campaign_objective,
    c.name             as campaign_name
  from campaign_snapshots_daily s
  join campaigns c on c.id = s.campaign_id;

-- Index to speed up objective-filtered queries
create index if not exists idx_campaigns_objective
  on campaigns(objective)
  where objective is not null;
