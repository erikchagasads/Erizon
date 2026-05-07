-- Campaign drafts + preflight lifecycle
-- Keeps planned campaigns inside Erizon until the gestor approves publication.

alter table public.metricas_ads
  add column if not exists cliente_id uuid references public.clientes(id) on delete set null,
  add column if not exists meta_campaign_id text,
  add column if not exists meta_account_id text,
  add column if not exists orcamento numeric(12,2) not null default 0,
  add column if not exists objective text,
  add column if not exists data_inicio timestamptz,
  add column if not exists dias_ativo int not null default 0,
  add column if not exists preflight_status text not null default 'pendente',
  add column if not exists preflight_score int,
  add column if not exists preflight_result jsonb not null default '{}'::jsonb,
  add column if not exists forecast_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists draft_payload jsonb not null default '{}'::jsonb,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists published_at timestamptz;

alter table public.metricas_ads
  drop constraint if exists metricas_ads_status_check;

alter table public.metricas_ads
  add constraint metricas_ads_status_check
  check (
    status in (
      'rascunho',
      'ativo', 'ativa', 'ATIVO', 'ACTIVE', 'ATIVA',
      'pausado', 'pausada', 'PAUSADA', 'PAUSED',
      'encerrado', 'CONCLUIDO', 'DESATIVADO', 'DELETADO', 'ARQUIVADO',
      'ERRO', 'ERROR'
    )
  );

alter table public.metricas_ads
  drop constraint if exists metricas_ads_preflight_status_check;

alter table public.metricas_ads
  add constraint metricas_ads_preflight_status_check
  check (preflight_status in ('pendente', 'avaliada', 'aprovada', 'publicada'));

create index if not exists idx_metricas_ads_drafts_preflight
  on public.metricas_ads(user_id, status, preflight_status, data_atualizacao desc);

create index if not exists idx_metricas_ads_workspace_status
  on public.metricas_ads(workspace_id, status, data_atualizacao desc);

alter table public.preflight_scores
  add column if not exists campaign_id uuid references public.metricas_ads(id) on delete set null,
  add column if not exists forecast_snapshot jsonb not null default '{}'::jsonb;

create index if not exists idx_preflight_campaign
  on public.preflight_scores(campaign_id, created_at desc)
  where campaign_id is not null;
