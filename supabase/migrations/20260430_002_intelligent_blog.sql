-- Blog inteligente: revisão humana, anonimização, fontes e logs editoriais.

alter table blog_posts
  add column if not exists excerpt text,
  add column if not exists content_type text not null default 'seo_educational',
  add column if not exists status text not null default 'published',
  add column if not exists author_name text not null default 'Equipe Erizon',
  add column if not exists reading_time text,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists seo_keywords text[] default '{}',
  add column if not exists source_name text,
  add column if not exists source_url text,
  add column if not exists source_published_at timestamptz,
  add column if not exists source_checked_at timestamptz,
  add column if not exists freshness_level text not null default 'Atemporal',
  add column if not exists anonymized boolean not null default false,
  add column if not exists identification_risk_level text not null default 'Baixo',
  add column if not exists identification_risk_notes text,
  add column if not exists campaign_data_summary text,
  add column if not exists internal_data_period_start date,
  add column if not exists internal_data_period_end date,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update blog_posts
set
  excerpt = coalesce(excerpt, description),
  author_name = coalesce(author_name, author, 'Equipe Erizon'),
  reading_time = coalesce(reading_time, read_time, '5 min'),
  seo_title = coalesce(seo_title, title),
  seo_description = coalesce(seo_description, description),
  seo_keywords = coalesce(seo_keywords, tags, '{}'),
  published_at = coalesce(published_at, publicado_em),
  created_at = coalesce(created_at, criado_em),
  updated_at = coalesce(updated_at, atualizado_em),
  status = case when published is true then 'published' else status end;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'blog_posts_status_check'
  ) then
    alter table blog_posts add constraint blog_posts_status_check
      check (status in ('draft','waiting_review','approved','rejected','scheduled','published'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'blog_posts_content_type_check'
  ) then
    alter table blog_posts add constraint blog_posts_content_type_check
      check (content_type in ('seo_educational','anonymous_case_study','market_news','weekly_report','monthly_report','performance_insight'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'blog_posts_risk_check'
  ) then
    alter table blog_posts add constraint blog_posts_risk_check
      check (identification_risk_level in ('Baixo','Médio','Alto'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'blog_posts_freshness_check'
  ) then
    alter table blog_posts add constraint blog_posts_freshness_check
      check (freshness_level in ('Hoje','Esta semana','Este mês','Atemporal','Dados internos'));
  end if;
end $$;

create table if not exists anonymous_campaign_insights (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  account_id uuid,
  anonymized_client_label text not null,
  period_start date,
  period_end date,
  niche_generic text not null,
  region_generic text not null,
  investment_range text not null,
  main_problem text not null,
  detected_signals text[] not null default '{}',
  recommended_actions text[] not null default '{}',
  observed_outcomes text[] not null default '{}',
  anonymized_summary text not null,
  identification_risk_level text not null default 'Baixo' check (identification_risk_level in ('Baixo','Médio','Alto')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists blog_market_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  source_name text not null,
  source_url text not null,
  source_published_at timestamptz,
  checked_at timestamptz not null default now(),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists blog_generation_logs (
  id uuid primary key default gen_random_uuid(),
  blog_post_id uuid references blog_posts(id) on delete set null,
  action text not null,
  status text not null,
  content_type text,
  identification_risk_level text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists blog_newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'active' check (status in ('active','unsubscribed')),
  source text not null default 'blog',
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create table if not exists blog_newsletter_deliveries (
  id uuid primary key default gen_random_uuid(),
  blog_post_id uuid references blog_posts(id) on delete cascade,
  subscriber_id uuid references blog_newsletter_subscribers(id) on delete cascade,
  email text not null,
  status text not null default 'queued' check (status in ('queued','sent','failed')),
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (blog_post_id, subscriber_id)
);

create table if not exists blog_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into blog_settings(key, value)
values ('auto_publish_enabled', 'false'::jsonb)
on conflict (key) do nothing;

create index if not exists idx_blog_posts_review on blog_posts(status, created_at desc);
create index if not exists idx_blog_posts_content_type on blog_posts(content_type);
create index if not exists idx_blog_posts_risk on blog_posts(identification_risk_level);
create index if not exists idx_blog_posts_public_new on blog_posts(status, published_at desc);
create index if not exists idx_blog_generation_logs_post on blog_generation_logs(blog_post_id, created_at desc);
create index if not exists idx_blog_newsletter_subscribers_status on blog_newsletter_subscribers(status, created_at desc);
create index if not exists idx_blog_newsletter_deliveries_post on blog_newsletter_deliveries(blog_post_id, created_at desc);

drop policy if exists blog_posts_read on blog_posts;
create policy blog_posts_read on blog_posts
  for select using (published = true or status = 'published');

alter table anonymous_campaign_insights enable row level security;
alter table blog_market_sources enable row level security;
alter table blog_generation_logs enable row level security;
alter table blog_newsletter_subscribers enable row level security;
alter table blog_newsletter_deliveries enable row level security;
alter table blog_settings enable row level security;

drop policy if exists anonymous_campaign_insights_service on anonymous_campaign_insights;
create policy anonymous_campaign_insights_service on anonymous_campaign_insights for all using (true) with check (true);

drop policy if exists blog_market_sources_service on blog_market_sources;
create policy blog_market_sources_service on blog_market_sources for all using (true) with check (true);

drop policy if exists blog_generation_logs_service on blog_generation_logs;
create policy blog_generation_logs_service on blog_generation_logs for all using (true) with check (true);

drop policy if exists blog_newsletter_subscribers_service on blog_newsletter_subscribers;
create policy blog_newsletter_subscribers_service on blog_newsletter_subscribers for all using (true) with check (true);

drop policy if exists blog_newsletter_deliveries_service on blog_newsletter_deliveries;
create policy blog_newsletter_deliveries_service on blog_newsletter_deliveries for all using (true) with check (true);

drop policy if exists blog_settings_service on blog_settings;
create policy blog_settings_service on blog_settings for all using (true) with check (true);
