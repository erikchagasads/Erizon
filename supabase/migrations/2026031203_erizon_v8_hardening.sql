create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists integration_credentials (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  platform text not null,
  credential_key text not null,
  encrypted_value text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, platform, credential_key)
);

create table if not exists workspace_benchmarks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  metric_name text not null,
  metric_value numeric(14,4) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, client_id, metric_name)
);

create unique index if not exists uq_anomaly_dedupe
  on anomaly_events(workspace_id, campaign_id, event_type, metric_name, severity, title);

create unique index if not exists uq_risk_dedupe
  on risk_events(workspace_id, campaign_id, risk_type, severity, title);

create unique index if not exists uq_opportunity_dedupe
  on opportunity_events(workspace_id, campaign_id, opportunity_type, title);
