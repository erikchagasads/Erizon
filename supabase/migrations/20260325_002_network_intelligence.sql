-- Migration: Network Intelligence — benchmarks coletivos anônimos por nicho

create table if not exists network_weekly_insights (
  id              uuid primary key default gen_random_uuid(),
  nicho           text not null,
  semana_inicio   date not null,

  -- CPL por percentil (anônimo, agregado)
  cpl_p25         numeric,
  cpl_p50         numeric,
  cpl_p75         numeric,
  cpl_min         numeric,
  cpl_max         numeric,

  -- ROAS por percentil
  roas_p25        numeric,
  roas_p50        numeric,
  roas_p75        numeric,

  -- CTR por percentil
  ctr_p25         numeric,
  ctr_p50         numeric,
  ctr_p75         numeric,

  -- Frequência
  frequency_p50   numeric,

  -- Meta da semana
  n_workspaces    int default 0,          -- nunca exposto ao frontend individualmente
  n_campaigns     int default 0,
  total_spend_brl numeric,                -- spend total agregado (anônimo)

  -- Padrão dos top performers
  top_pattern     text,                   -- "Criativos de depoimento + público 28-45 + orçamento R$80-150/dia"
  market_trend    text check (market_trend in ('rising','stable','falling')),
  trend_note      text,                   -- "CPL subiu 18% vs semana anterior — possível saturação"

  computed_at     timestamptz not null default now(),

  unique (nicho, semana_inicio)
);

create index if not exists idx_nwi_nicho_semana on network_weekly_insights(nicho, semana_inicio desc);

-- Tabela de opt-in/opt-out da rede (workspace pode sair)
create table if not exists network_participation (
  workspace_id  uuid primary key references workspaces(id) on delete cascade,
  opted_in      boolean not null default true,
  updated_at    timestamptz not null default now()
);

alter table network_participation enable row level security;
create policy "Workspace gerencia própria participação"
  on network_participation for all
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

-- Preflight scores
create table if not exists preflight_scores (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references workspaces(id) on delete cascade,
  client_id         text,
  campaign_name     text,
  score             int not null check (score between 0 and 100),
  risks             jsonb default '[]',   -- [{severity, label, recommendation}]
  estimated_cpl_min numeric,
  estimated_cpl_max numeric,
  estimated_roas    numeric,
  input_snapshot    jsonb default '{}',  -- o que foi analisado
  created_at        timestamptz not null default now()
);

create index if not exists idx_preflight_workspace on preflight_scores(workspace_id, created_at desc);

alter table preflight_scores enable row level security;
create policy "Workspace acessa próprios preflights"
  on preflight_scores for all
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

-- Budget simulations
create table if not exists budget_simulations (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references workspaces(id) on delete cascade,
  budget_total          numeric not null,
  alocacao_input        jsonb not null,    -- [{client_id, budget_atual, roas_historico}]
  alocacao_output       jsonb not null,    -- [{client_id, budget_otimo, delta, impacto_brl}]
  impacto_estimado_brl  numeric,
  applied_at            timestamptz,
  created_at            timestamptz not null default now()
);

alter table budget_simulations enable row level security;
create policy "Workspace acessa próprias simulações"
  on budget_simulations for all
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

-- Campaign briefs (Brief-to-Campaign)
create table if not exists campaign_briefs (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references workspaces(id) on delete cascade,
  client_id           text,
  brief_text          text not null,
  parsed_brief        jsonb default '{}',
  generated_structure jsonb default '{}',
  status              text not null default 'draft' check (status in ('draft','applied','archived')),
  created_at          timestamptz not null default now()
);

alter table campaign_briefs enable row level security;
create policy "Workspace acessa próprios briefs"
  on campaign_briefs for all
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

-- Predictive anomaly alerts
create table if not exists predictive_anomaly_alerts (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null references workspaces(id) on delete cascade,
  campaign_id             text not null,
  campaign_name           text,
  alert_type              text not null check (alert_type in (
    'creative_fatigue', 'cpl_spike', 'roas_degradation', 'budget_exhaustion', 'frequency_overload'
  )),
  confidence              numeric not null check (confidence between 0 and 1),
  predicted_at            timestamptz not null default now(),
  predicted_window_hours  int not null default 48,
  predicted_metric        text,
  predicted_delta_pct     numeric,
  preventive_action       text,
  status                  text not null default 'pending' check (status in ('pending','confirmed','dismissed','expired')),
  resolved_at             timestamptz,
  was_accurate            boolean,

  unique (workspace_id, campaign_id, alert_type, predicted_at::date)
);

create index if not exists idx_pred_anomaly_workspace on predictive_anomaly_alerts(workspace_id, predicted_at desc);
create index if not exists idx_pred_anomaly_status on predictive_anomaly_alerts(workspace_id, status);

alter table predictive_anomaly_alerts enable row level security;
create policy "Workspace acessa próprios alertas preditivos"
  on predictive_anomaly_alerts for all
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

-- Telegram copilot sessions
create table if not exists telegram_copilot_sessions (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  chat_id       text not null,
  workspace_id  uuid references workspaces(id) on delete cascade,
  ativo         boolean not null default true,
  estado        jsonb default '{}',      -- estado da conversa (awaiting_confirmation, etc)
  ultimo_contato timestamptz,
  briefing_hora int default 7,           -- hora do briefing matinal (0-23)
  updated_at    timestamptz not null default now()
);

alter table telegram_copilot_sessions enable row level security;
create policy "Usuário gerencia própria sessão Telegram"
  on telegram_copilot_sessions for all
  using (auth.uid() = user_id);
