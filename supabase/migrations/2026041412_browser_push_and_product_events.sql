create table if not exists browser_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  workspace_id uuid,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  device_label text,
  briefing_hora int not null default 7,
  ativo boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_browser_push_user on browser_push_subscriptions(user_id);
create index if not exists idx_browser_push_workspace on browser_push_subscriptions(workspace_id);
create index if not exists idx_browser_push_active on browser_push_subscriptions(ativo, briefing_hora);

alter table browser_push_subscriptions enable row level security;

create policy "browser_push_subscriptions_own"
  on browser_push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  workspace_id uuid,
  event_name text not null,
  source text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_events_user on product_events(user_id);
create index if not exists idx_product_events_name on product_events(event_name);
create index if not exists idx_product_events_created on product_events(created_at desc);

alter table product_events enable row level security;

create policy "product_events_own"
  on product_events
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
