create or replace function erizon_workspace_pulse_totals(p_workspace_id uuid)
returns table (
  spend numeric,
  revenue numeric,
  profit numeric,
  active_campaigns bigint
)
language sql
as $$
  select
    coalesce(sum(spend), 0) as spend,
    coalesce(sum(revenue), 0) as revenue,
    coalesce(sum(revenue) - sum(spend), 0) as profit,
    count(distinct campaign_id) as active_campaigns
  from campaign_snapshots_daily
  where workspace_id = p_workspace_id;
$$;
