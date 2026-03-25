-- ── Cockpit: Fila de decisões + configuração de autopiloto ──────────────────
-- pending_decisions: decisões geradas pelo engine aguardando aprovação do gestor
-- autopilot_config:  configurações por workspace (quais ações podem ser automáticas)

-- ── pending_decisions ────────────────────────────────────────────────────────
create table if not exists pending_decisions (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  campaign_id     text,
  campaign_name   text,

  -- Tipo da ação: pause | resume | scale_budget | reduce_budget | alert
  action_type     text not null check (action_type in ('pause','resume','scale_budget','reduce_budget','alert')),

  title           text not null,
  rationale       text not null,

  -- Impacto estimado em R$ (positivo = ganho, negativo = economia de perda)
  estimated_impact_brl numeric(12,2) default 0,
  confidence      text not null default 'medium' check (confidence in ('low','medium','high')),

  -- Status do ciclo de vida
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected','executed','expired')),

  -- Payload para executar via Meta Ads API se aprovado
  meta_payload    jsonb,

  -- Auditoria
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '24 hours',
  decided_at      timestamptz,
  decided_by      uuid references auth.users(id),
  execution_result jsonb,

  -- Evita duplicatas: mesma campanha + mesmo tipo + ainda pendente
  constraint uq_pending_campaign_action
    unique nulls not distinct (workspace_id, campaign_id, action_type, status)
);

-- Índices
create index if not exists idx_pending_decisions_ws_status
  on pending_decisions(workspace_id, status, created_at desc);

create index if not exists idx_pending_decisions_expires
  on pending_decisions(expires_at) where status = 'pending';

-- RLS
alter table pending_decisions enable row level security;

create policy "workspace members can view decisions"
  on pending_decisions for select
  using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = pending_decisions.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "workspace members can insert decisions"
  on pending_decisions for insert
  with check (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = pending_decisions.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "workspace members can update decisions"
  on pending_decisions for update
  using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = pending_decisions.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Service role bypasses RLS
create policy "service role full access on pending_decisions"
  on pending_decisions for all
  using (auth.role() = 'service_role');


-- ── autopilot_config ─────────────────────────────────────────────────────────
create table if not exists autopilot_config (
  workspace_id          uuid primary key references workspaces(id) on delete cascade,

  -- Liga/desliga o autopilot globalmente
  autopilot_enabled     boolean not null default false,

  -- Por tipo de ação: pode executar automaticamente sem aprovação do gestor?
  auto_pause            boolean not null default false,
  auto_resume           boolean not null default false,
  auto_scale_budget     boolean not null default false,
  auto_reduce_budget    boolean not null default false,

  -- Proteção: não executar automaticamente se gasto acumulado 24h superar esse valor
  shield_max_spend_brl  numeric(10,2) default 500,

  -- Máximo de ações automáticas por dia (proteção extra)
  max_auto_actions_day  int not null default 3,

  -- Auditoria
  updated_at            timestamptz not null default now(),
  updated_by            uuid references auth.users(id)
);

-- RLS
alter table autopilot_config enable row level security;

create policy "workspace members can view config"
  on autopilot_config for select
  using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = autopilot_config.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "workspace members can upsert config"
  on autopilot_config for all
  using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = autopilot_config.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "service role full access on autopilot_config"
  on autopilot_config for all
  using (auth.role() = 'service_role');


-- ── Expirar decisões antigas (chamado via cron ou trigger) ───────────────────
create or replace function expire_pending_decisions()
returns void language plpgsql security definer as $$
begin
  update pending_decisions
  set status = 'expired'
  where status = 'pending'
    and expires_at < now();
end;
$$;
