-- Migration: Public API Keys + Request Logging
-- Infraestrutura para a Benchmark API pública (produto externo).

create table if not exists api_keys (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  key_hash        text not null unique,        -- hash da key, nunca plain text
  key_prefix      text not null,               -- "erzk_live_XXXX" para exibição
  plan            text not null default 'free' check (plan in ('free','pro','enterprise')),
  active          boolean not null default true,
  last_used_at    timestamptz,
  requests_total  bigint not null default 0,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz
);

create index if not exists idx_api_keys_user on api_keys (user_id, active);
create index if not exists idx_api_keys_hash on api_keys (key_hash);

create table if not exists api_key_requests (
  id          uuid primary key default gen_random_uuid(),
  key_hash    text not null,
  endpoint    text not null,
  params      jsonb,
  status_code int,
  created_at  timestamptz not null default now()
);

create index if not exists idx_api_requests_key_time on api_key_requests (key_hash, created_at desc);
create index if not exists idx_api_requests_time on api_key_requests (created_at desc);

-- Limpeza automática de requests com mais de 90 dias
create or replace function cleanup_api_requests()
returns void language sql as $$
  delete from api_key_requests where created_at < now() - interval '90 days';
$$;

-- RLS
alter table api_keys enable row level security;
alter table api_key_requests enable row level security;

create policy "users manage own api keys" on api_keys
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "service reads api keys" on api_keys
  for select using (true);

create policy "service inserts requests" on api_key_requests
  for insert with check (true);

create policy "users read own requests" on api_key_requests
  for select using (
    key_hash in (select key_hash from api_keys where user_id = auth.uid())
  );

-- Função: stats de uso da API por usuário
create or replace function api_key_usage_stats(p_user_id uuid)
returns jsonb
language sql stable
as $$
  select jsonb_build_object(
    'total_requests', coalesce(sum(r.cnt), 0),
    'requests_today', coalesce(sum(r.today), 0),
    'active_keys', count(k.id)
  )
  from api_keys k
  left join lateral (
    select
      count(*) as cnt,
      count(*) filter (where created_at >= date_trunc('day', now())) as today
    from api_key_requests
    where key_hash = k.key_hash
  ) r on true
  where k.user_id = p_user_id and k.active = true;
$$;
