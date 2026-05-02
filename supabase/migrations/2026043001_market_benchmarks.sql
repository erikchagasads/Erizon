-- Benchmarks externos curados com fonte auditavel.
-- Esta tabela NAO deve receber numeros inventados pelo app.
-- Cada linha precisa representar uma fonte externa, periodo e recorte claros.

create table if not exists market_benchmarks (
  id uuid primary key default gen_random_uuid(),
  niche text not null,
  campaign_type text not null default 'all',
  platform text not null default 'meta',
  country text not null default 'BR',
  period_start date,
  period_end date,

  cpl_p25 numeric,
  cpl_p50 numeric,
  cpl_p75 numeric,
  roas_p25 numeric,
  roas_p50 numeric,
  roas_p75 numeric,
  ctr_p25 numeric,
  ctr_p50 numeric,
  ctr_p75 numeric,
  cpm_p25 numeric,
  cpm_p50 numeric,
  cpm_p75 numeric,
  cpc_p25 numeric,
  cpc_p50 numeric,
  cpc_p75 numeric,
  frequency_p50 numeric,

  sample_size int,
  source_name text not null,
  source_url text,
  source_note text,
  confidence numeric not null default 0.6 check (confidence >= 0 and confidence <= 1),
  imported_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_market_benchmarks_lookup
  on market_benchmarks(niche, campaign_type, platform, country, updated_at desc);

create index if not exists idx_market_benchmarks_source
  on market_benchmarks(source_name, period_end desc);

alter table market_benchmarks enable row level security;

drop policy if exists "Authenticated users can read market benchmarks" on market_benchmarks;
create policy "Authenticated users can read market benchmarks"
  on market_benchmarks
  for select
  using (auth.uid() is not null);

drop policy if exists "Only service role can write market benchmarks" on market_benchmarks;
create policy "Only service role can write market benchmarks"
  on market_benchmarks
  for all
  using (false)
  with check (false);

create table if not exists campaign_niche_overrides (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  campaign_metric_id uuid,
  meta_campaign_id text,
  niche text not null,
  campaign_type text,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, campaign_metric_id)
);

create index if not exists idx_campaign_niche_overrides_workspace
  on campaign_niche_overrides(workspace_id, updated_at desc);

alter table campaign_niche_overrides enable row level security;

drop policy if exists "Workspace users can read niche overrides" on campaign_niche_overrides;
create policy "Workspace users can read niche overrides"
  on campaign_niche_overrides
  for select
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

drop policy if exists "Workspace users can manage niche overrides" on campaign_niche_overrides;
create policy "Workspace users can manage niche overrides"
  on campaign_niche_overrides
  for all
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  )
  with check (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );
