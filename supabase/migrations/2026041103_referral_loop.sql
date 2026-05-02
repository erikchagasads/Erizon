-- Migration: Referral Loop Estruturado
-- Sistema viral de indicação com créditos automáticos e rastreamento por evento.

create table if not exists referrals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  code        text not null unique,
  created_at  timestamptz not null default now()
);

create index if not exists idx_referrals_code on referrals (code);

create table if not exists referral_events (
  id                  uuid primary key default gen_random_uuid(),
  referrer_code       text not null,
  referrer_user_id    uuid references auth.users(id) on delete set null,
  referred_user_id    uuid references auth.users(id) on delete set null,
  event               text not null check (event in ('click','signup','paid')),
  created_at          timestamptz not null default now()
);

create index if not exists idx_referral_events_code  on referral_events (referrer_code, event);
create index if not exists idx_referral_events_user  on referral_events (referrer_user_id, event);

create table if not exists referral_credits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount_brl  numeric not null,
  reason      text,
  status      text not null default 'pending' check (status in ('pending','applied','expired')),
  applied_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_referral_credits_user on referral_credits (user_id, status);

-- RLS
alter table referrals enable row level security;
alter table referral_events enable row level security;
alter table referral_credits enable row level security;

create policy "users read own referral" on referrals for select using (user_id = auth.uid());
create policy "users insert own referral" on referrals for insert with check (user_id = auth.uid());
create policy "service upsert referrals" on referrals for update using (true);

create policy "users read own events" on referral_events for select using (referrer_user_id = auth.uid());
create policy "service insert events" on referral_events for insert with check (true);

create policy "users read own credits" on referral_credits for select using (user_id = auth.uid());
create policy "service manage credits" on referral_credits for all using (true) with check (true);

-- Função: total de créditos disponíveis do usuário
create or replace function referral_available_credits(p_user_id uuid)
returns numeric
language sql stable
as $$
  select coalesce(sum(amount_brl), 0)
  from referral_credits
  where user_id = p_user_id and status = 'pending';
$$;
