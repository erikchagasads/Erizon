-- Migration: Profit DNA — memória estratégica por cliente
-- Aprende padrões de performance ao longo do tempo

create table if not exists profit_dna_snapshots (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references workspaces(id) on delete cascade,
  client_id             text not null,
  computed_at           timestamptz not null default now(),

  -- Padrões temporais
  best_days_of_week     jsonb default '[]',   -- [{day:1,roas:3.2,cpl:45},{...}]
  best_hours            jsonb default '[]',   -- [{hour:19,conversion_rate:0.08},...] (estimado)
  worst_days_of_week    jsonb default '[]',

  -- Padrões de criativo
  best_formats          jsonb default '[]',   -- [{format:"video",avg_roas:3.1},{...}]
  best_hooks            jsonb default '[]',   -- texto livre extraído de campaign names
  top_copies            jsonb default '[]',   -- copies_aprovadas do agente

  -- Padrões de público
  best_audiences        jsonb default '[]',   -- [{label,avg_cpl,avg_roas,n_campaigns}]
  golden_audience       text,                  -- descrição do público campeão

  -- Benchmarks internos do cliente
  cpl_p25               numeric,              -- CPL no quartil 25% (bom)
  cpl_median            numeric,
  roas_p25              numeric,              -- ROAS no quartil 25% (bom = alto)
  roas_median           numeric,
  frequency_sweet_spot  numeric,              -- frequência ótima antes de fadiga
  avg_budget_winner     numeric,              -- orçamento médio de campanhas vencedoras
  avg_campaign_duration int,                  -- duração média em dias

  -- Sazonalidades
  seasonality_patterns  jsonb default '{}',   -- {month_3:{cpl_delta:-15,note:"pre-carnaval"}}

  -- Narrativa gerada por IA
  narrative             text,
  key_learnings         jsonb default '[]',   -- [{learning, confidence, discovered_at}]

  -- Meta
  n_campaigns_analyzed  int default 0,
  n_snapshots_analyzed  int default 0,
  confidence_score      numeric default 0,    -- 0-1, aumenta com mais dados
  period_start          date,
  period_end            date,

  unique (workspace_id, client_id)
);

-- Índices
create index if not exists idx_profit_dna_workspace on profit_dna_snapshots(workspace_id);
create index if not exists idx_profit_dna_client on profit_dna_snapshots(workspace_id, client_id);

-- RLS
alter table profit_dna_snapshots enable row level security;
create policy "Workspace acessa próprio DNA"
  on profit_dna_snapshots for all
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );
