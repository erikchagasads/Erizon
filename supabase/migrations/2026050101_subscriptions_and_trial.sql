-- ── Migration: subscriptions + decision_outcomes + morning_brief_logs ─────────
-- Criado em 2026-05-01 para formalizar tabelas usadas no código sem migration.

-- ── 1. subscriptions ──────────────────────────────────────────────────────────
create table if not exists subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  plano                   text not null default 'pro'
                            check (plano in ('core', 'pro', 'command', 'trial')),
  status                  text not null default 'trialing'
                            check (status in (
                              'trialing', 'active', 'past_due',
                              'canceled', 'incomplete', 'paused'
                            )),
  stripe_customer_id      text,
  stripe_subscription_id  text,
  trial_end               timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_subscriptions_user
  on subscriptions(user_id);

create index if not exists idx_subscriptions_stripe_customer
  on subscriptions(stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists idx_subscriptions_stripe_sub
  on subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

-- RLS: cada usuário vê só a própria subscription
alter table subscriptions enable row level security;

drop policy if exists "subscriptions_own" on subscriptions;
create policy "subscriptions_own" on subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Service role bypassa RLS — necessário para billing API e webhooks
-- (o admin client usa SUPABASE_SERVICE_ROLE_KEY, então não precisa de policy extra)


-- ── 2. decision_outcomes (histórico de impacto das decisões do autopilot) ─────
create table if not exists decision_outcomes (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        text not null,
  campanha_id         text,
  campanha_nome       text not null,
  acao                text not null check (acao in ('pausa', 'escala', 'ajuste', 'criativo')),
  sugerido_em         timestamptz not null default now(),
  confirmado_em       timestamptz,
  confirmado_por      uuid references auth.users(id),
  metrica_antes       jsonb not null default '{}',
  -- esperado: { roas, cpl, ctr, score, spend_diario, leads_diario }
  metrica_depois      jsonb,
  economia_estimada   numeric(12,2) default 0,
  ganho_estimado      numeric(12,2) default 0,
  economia_real       numeric(12,2),
  ganho_real          numeric(12,2),
  medido_em           timestamptz,
  status              text not null default 'pendente'
                        check (status in ('pendente', 'medido', 'ignorado'))
);

create index if not exists idx_decision_outcomes_workspace
  on decision_outcomes(workspace_id, sugerido_em desc);

create index if not exists idx_decision_outcomes_medir
  on decision_outcomes(sugerido_em)
  where status = 'pendente' and confirmado_em is not null;

alter table decision_outcomes enable row level security;

drop policy if exists "decision_outcomes_all" on decision_outcomes;
create policy "decision_outcomes_all" on decision_outcomes
  for all using (true) with check (true);


-- ── 3. morning_brief_logs (rastrear envios do brief diário) ───────────────────
create table if not exists morning_brief_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  workspace_id  text,
  enviado_em    timestamptz not null default now(),
  canal         text not null default 'telegram' check (canal in ('telegram', 'push', 'email')),
  status        text not null default 'ok' check (status in ('ok', 'erro', 'sem_dados')),
  resumo        jsonb,
  -- { spend_total, campanhas_ativas, criticas, oportunidades, acao_principal }
  erro_msg      text
);

create index if not exists idx_morning_brief_user_date
  on morning_brief_logs(user_id, enviado_em desc);

alter table morning_brief_logs enable row level security;

drop policy if exists "morning_brief_logs_all" on morning_brief_logs;
create policy "morning_brief_logs_all" on morning_brief_logs
  for all using (true) with check (true);


-- ── 4. weekly_report_logs (rastrear envios do relatório semanal) ──────────────
create table if not exists weekly_report_logs (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  text not null,
  cliente_id    text,
  cliente_email text,
  enviado_em    timestamptz not null default now(),
  status        text not null default 'ok' check (status in ('ok', 'erro', 'sem_dados')),
  erro_msg      text
);

create index if not exists idx_weekly_report_workspace
  on weekly_report_logs(workspace_id, enviado_em desc);

alter table weekly_report_logs enable row level security;

drop policy if exists "weekly_report_logs_all" on weekly_report_logs;
create policy "weekly_report_logs_all" on weekly_report_logs
  for all using (true) with check (true);


-- ── 5. Garantir coluna telegram_chat_id nos workspaces ───────────────────────
alter table workspaces
  add column if not exists telegram_chat_id text,
  add column if not exists telegram_username text,
  add column if not exists niche text;

-- ── 6. Garantir coluna niche + cor nos clientes (tabela legada em pt) ─────────
-- (a tabela clientes existe no banco remoto mas não tem migration local)
-- Aplica apenas se a tabela existir:
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'clientes'
  ) then
    alter table clientes
      add column if not exists niche text,
      add column if not exists cor text;
  end if;
end $$;
