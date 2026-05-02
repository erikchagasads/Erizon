-- Migration: Training Data Collection
-- Armazena exemplos de treino para fine-tuning futuro do modelo Erizon.
-- Cada aprovação, rejeição, feedback e predição confirmada vira um exemplo.

create table if not exists training_examples (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid references workspaces(id) on delete cascade,
  source              text not null check (source in ('decision','agente_feedback','prediction_outcome','manual_label')),
  quality             text not null default 'bronze' check (quality in ('gold','silver','bronze')),

  -- Par input/output para fine-tuning
  system_prompt       text not null,
  user_message        text not null,
  ideal_response      text not null,

  -- Rastreabilidade
  decision_id         uuid references pending_decisions(id) on delete set null,
  campaign_id         text,
  action_type         text,
  prediction_metric   text,
  predicted_value     numeric,
  actual_value        numeric,
  outcome             text check (outcome in ('improved','degraded','neutral','pending')),
  human_validated     boolean not null default false,
  validator_id        uuid,

  created_at          timestamptz not null default now()
);

create index if not exists idx_training_workspace_quality
  on training_examples (workspace_id, quality, created_at desc);

create index if not exists idx_training_source
  on training_examples (source, quality);

alter table training_examples enable row level security;

-- Só o próprio workspace vê seus exemplos
create policy "workspace members read training data"
  on training_examples for select
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

create policy "service role manages training data"
  on training_examples for all
  using (true) with check (true);

-- Função: conta exemplos exportáveis (gold + silver)
create or replace function training_exportable_count(p_workspace_id uuid default null)
returns int
language sql stable
as $$
  select count(*)::int
  from training_examples
  where quality in ('gold','silver')
    and (p_workspace_id is null or workspace_id = p_workspace_id);
$$;

-- Função: stats globais de treino (para admin dashboard)
create or replace function training_global_stats()
returns jsonb
language sql stable
as $$
  select jsonb_build_object(
    'total', count(*),
    'gold', count(*) filter (where quality = 'gold'),
    'silver', count(*) filter (where quality = 'silver'),
    'bronze', count(*) filter (where quality = 'bronze'),
    'exportable', count(*) filter (where quality in ('gold','silver')),
    'by_source', jsonb_object_agg(source, cnt)
  )
  from (
    select source, count(*) as cnt
    from training_examples
    group by source
  ) s,
  training_examples t;
$$;
