-- Real Meta publication audit + BM account compatibility.

alter table if exists public.metricas_ads
  add column if not exists meta_publish_requested_at timestamptz,
  add column if not exists meta_publish_result jsonb not null default '{}'::jsonb,
  add column if not exists meta_publish_error text;

alter table if exists public.bm_accounts
  add column if not exists nome text,
  add column if not exists ad_account_id text,
  add column if not exists ativo boolean not null default true;

update public.bm_accounts
set
  nome = coalesce(nome, bm_name),
  ad_account_id = coalesce(ad_account_id, ad_account_ids[1]),
  ativo = coalesce(ativo, status = 'ativo', true)
where nome is null
   or ad_account_id is null
   or ativo is null;

create index if not exists idx_metricas_ads_meta_publish
  on public.metricas_ads(user_id, meta_campaign_id)
  where meta_campaign_id is not null;
