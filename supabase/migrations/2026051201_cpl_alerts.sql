create table if not exists cpl_alerts (
  id uuid default gen_random_uuid() primary key,
  workspace_id text not null,
  campaign_id text not null,
  campaign_name text,
  current_cpl numeric,
  threshold_cpl numeric,
  delta_percent integer,
  triggered_at timestamptz default now()
);

create index if not exists idx_cpl_alerts_workspace_triggered
  on cpl_alerts(workspace_id, triggered_at desc);
