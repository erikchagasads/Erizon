create extension if not exists pgcrypto;

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  external_ref text,
  name text not null,
  niche text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ad_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  platform text not null,
  platform_account_id text not null,
  name text not null,
  currency text not null default 'BRL',
  timezone text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, platform_account_id)
);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  ad_account_id uuid not null references ad_accounts(id) on delete cascade,
  platform text not null default 'meta',
  platform_campaign_id text not null,
  name text not null,
  objective text,
  configured_status text,
  effective_status text,
  delivery_state text,
  budget_daily numeric(14,2),
  budget_lifetime numeric(14,2),
  start_time timestamptz,
  stop_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, platform_campaign_id)
);

create table if not exists campaign_snapshots_daily (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  ad_account_id uuid not null references ad_accounts(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  snapshot_date date not null,
  spend numeric(14,2) not null default 0,
  impressions bigint not null default 0,
  reach bigint not null default 0,
  clicks bigint not null default 0,
  ctr numeric(10,4) not null default 0,
  cpc numeric(14,4) not null default 0,
  cpm numeric(14,4) not null default 0,
  leads bigint not null default 0,
  purchases bigint not null default 0,
  revenue numeric(14,2) not null default 0,
  cpl numeric(14,4) not null default 0,
  cpa numeric(14,4) not null default 0,
  roas numeric(14,4) not null default 0,
  frequency numeric(10,4) not null default 0,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique (campaign_id, snapshot_date)
);

create table if not exists anomaly_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  event_type text not null,
  severity text not null,
  title text not null,
  description text,
  metric_name text,
  metric_value numeric(14,4),
  baseline_value numeric(14,4),
  detected_at timestamptz not null default now()
);

create table if not exists risk_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  risk_type text not null,
  severity text not null,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists opportunity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  opportunity_type text not null,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists autopilot_suggestions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  suggestion_type text not null,
  title text not null,
  description text,
  priority text not null default 'medium',
  payload jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists autopilot_execution_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  action_type text not null,
  execution_status text not null,
  payload jsonb,
  executed_at timestamptz not null default now()
);

create table if not exists profit_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  snapshot_date date not null,
  spend numeric(14,2) not null default 0,
  revenue numeric(14,2) not null default 0,
  profit numeric(14,2) not null default 0,
  roi numeric(14,4) not null default 0,
  roas numeric(14,4) not null default 0,
  created_at timestamptz not null default now(),
  unique (campaign_id, snapshot_date)
);
