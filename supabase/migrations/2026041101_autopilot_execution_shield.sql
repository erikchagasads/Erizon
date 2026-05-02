-- Migration: Autopilot Execution Shield + Audit Log
-- Registra cada execução real do autopilot e controla limite de ações por dia.

-- ── Tabela de logs de execução ────────────────────────────────────────────────
create table if not exists autopilot_execution_logs (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid references workspaces(id) on delete cascade,
  user_id         uuid not null,
  decision_id     uuid references pending_decisions(id) on delete set null,
  campaign_id     text,
  action          text not null,         -- PAUSE | RESUME | SCALE_BUDGET | REDUCE_BUDGET | UPDATE_BUDGET
  success         boolean not null default false,
  payload         jsonb default '{}',    -- o que foi enviado ao Meta
  result          jsonb,                 -- resposta crua do Meta
  error_message   text,
  executed_at     timestamptz not null default now()
);

create index if not exists idx_exec_logs_workspace_date
  on autopilot_execution_logs (workspace_id, executed_at desc);

create index if not exists idx_exec_logs_campaign
  on autopilot_execution_logs (campaign_id, executed_at desc);

-- ── Coluna max_auto_actions_day na tabela de config ──────────────────────────
alter table autopilot_configs
  add column if not exists max_auto_actions_day int not null default 20,
  add column if not exists auto_scale_budget boolean not null default false,
  add column if not exists auto_reduce_budget boolean not null default false,
  add column if not exists shield_max_scale_pct int not null default 30,   -- máximo % de escala por ação
  add column if not exists shield_min_roas numeric not null default 1.5;   -- ROAS mínimo para escalar

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table autopilot_execution_logs enable row level security;

create policy "workspace members can read logs"
  on autopilot_execution_logs for select
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
    or user_id = auth.uid()
  );

create policy "service role inserts logs"
  on autopilot_execution_logs for insert
  with check (true);

-- ── Função: contagem de ações hoje por workspace ──────────────────────────────
create or replace function autopilot_actions_today(p_workspace_id uuid)
returns int
language sql stable
as $$
  select count(*)::int
  from autopilot_execution_logs
  where workspace_id = p_workspace_id
    and success = true
    and executed_at >= date_trunc('day', now() at time zone 'utc');
$$;
