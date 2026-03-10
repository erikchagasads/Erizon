
create table if not exists clients (
  id text primary key,
  name text not null,
  niche text not null,
  vertical text not null,
  platform text not null,
  currency text not null,
  average_ticket numeric not null,
  product_cost_rate numeric not null,
  refund_rate numeric not null,
  payment_fee_rate numeric not null,
  logistics_rate numeric not null,
  monthly_target_profit numeric not null
);

create table if not exists campaign_snapshots (
  id text primary key,
  client_id text not null references clients(id),
  name text not null,
  objective text not null,
  channel text not null,
  audience text not null,
  active_days integer not null,
  daily_budget numeric not null,
  spend_today numeric not null,
  impressions integer not null,
  clicks integer not null,
  conversions integer not null,
  revenue_today numeric not null,
  frequency numeric not null,
  cpm numeric not null,
  cpc numeric not null,
  ctr numeric not null,
  cpa numeric not null,
  roas numeric not null,
  last_roas numeric not null,
  last_ctr numeric not null,
  last_cpa numeric not null,
  current_creative_id text not null,
  approved_by_autopilot boolean not null default false,
  snapshot_date timestamptz not null default now()
);

create table if not exists creative_assets (
  id text primary key,
  client_id text not null references clients(id),
  campaign_id text not null,
  name text not null,
  format text not null,
  hook_type text not null,
  duration_seconds integer not null,
  caption_style text not null,
  visual_style text not null,
  ctr numeric not null,
  cpa numeric not null,
  roas numeric not null,
  frequency numeric not null,
  spend numeric not null,
  conversions integer not null
);

create table if not exists network_benchmarks (
  id text primary key,
  niche text not null,
  segment text not null,
  hook_type text not null,
  format text not null,
  duration_band text not null,
  ctr_avg numeric not null,
  cpa_avg numeric not null,
  roas_avg numeric not null,
  profit_roas_avg numeric not null,
  sample_size integer not null
);

create table if not exists autopilot_rules (
  id text primary key,
  name text not null,
  description text not null,
  enabled boolean not null default true,
  requires_approval boolean not null default true,
  condition jsonb not null,
  action jsonb not null
);

create table if not exists timeline_events (
  id text primary key,
  timestamp timestamptz not null,
  actor text not null,
  action text not null,
  detail text not null,
  related_campaign_id text
);

create table if not exists workspace_integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  kind text not null,
  status text not null,
  external_account_id text not null,
  access_token_masked text not null,
  refresh_token_masked text,
  last_synced_at timestamptz,
  unique (workspace_id, kind, external_account_id)
);

create table if not exists integration_credentials (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  provider text not null,
  external_account_id text not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (workspace_id, provider, external_account_id)
);

create table if not exists profit_snapshots (
  id text primary key,
  client_id text not null references clients(id),
  campaign_id text not null,
  snapshot_date timestamptz not null default now(),
  revenue numeric not null,
  ad_spend numeric not null,
  product_cost numeric not null,
  payment_fees numeric not null,
  logistics numeric not null,
  refunds numeric not null,
  net_profit numeric not null,
  margin_pct numeric not null,
  profit_roas numeric not null
);

create table if not exists autopilot_execution_logs (
  id text primary key,
  workspace_id text not null,
  campaign_id text not null,
  action text not null,
  mode text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- Remove constraint duplicada em metricas_ads
-- O id já é PK, não precisa de unique em (user_id, nome_campanha, cliente_id)
ALTER TABLE metricas_ads
  DROP CONSTRAINT IF EXISTS metricas_ads_user_id_nome_campanha_cliente_id_key;
