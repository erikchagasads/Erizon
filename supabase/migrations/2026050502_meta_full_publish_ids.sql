-- IDs gerados pela publicacao completa no Meta Ads.

alter table if exists public.metricas_ads
  add column if not exists meta_adset_id text,
  add column if not exists meta_creative_id text,
  add column if not exists meta_ad_id text,
  add column if not exists meta_page_id text,
  add column if not exists meta_pixel_id text;

create index if not exists idx_metricas_ads_meta_adset
  on public.metricas_ads(user_id, meta_adset_id)
  where meta_adset_id is not null;

create index if not exists idx_metricas_ads_meta_ad
  on public.metricas_ads(user_id, meta_ad_id)
  where meta_ad_id is not null;
