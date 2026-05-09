-- ── neuro_score_analyses ──────────────────────────────────────────────────────
-- Cada análise gerada pelo Neuro Score IA. Fonte de verdade para aprendizado.

create table if not exists neuro_score_analyses (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  workspace_id        text not null,
  cliente_id          uuid references clientes(id) on delete set null,
  campanha_id         uuid references campanhas_ads(id) on delete set null,

  -- Criativo analisado
  -- [GANCHO VÍDEO] media_type distingue imagem de vídeo. Por ora só "image" é processado.
  -- Quando análise de vídeo for ativada, media_type="video" + video_url serão preenchidos;
  -- image_url e image_hash ficam null nesse caso.
  media_type          text not null default 'image' check (media_type in ('image','video')),
  image_url           text,
  image_hash          text,
  video_url           text,
  video_duration_s    integer,
  nicho               text,
  objetivo            text,

  -- Scores (0–100)
  neuro_score         integer not null,
  atencao_score       integer not null,
  emocao_score        integer not null,
  cta_score           integer not null,
  hook_score          integer not null,
  fadiga_score        integer not null,

  -- Análise detalhada
  emocao_dominante    text,
  zonas_atencao       text[],
  pontos_fortes       text[],
  pontos_fracos       text[],
  recomendacoes       jsonb not null default '[]',
  reasoning           text,

  -- Benchmarks usados no momento da análise
  benchmark_ctr_p50   numeric(6,2),
  benchmark_cpl_p50   numeric(10,2),

  -- Outcome real (preenchido pelo cron após 7 dias se tiver campanha vinculada)
  ctr_real            numeric(6,3),
  cpl_real            numeric(10,2),
  roas_real           numeric(6,3),
  outcome_coletado_em timestamptz,

  -- Feedback do gestor
  feedback            text check (feedback in ('positivo','negativo','editado')),
  feedback_nota       text,
  feedback_em         timestamptz,

  -- Controle
  model_version       text not null default 'v1',
  tokens_usados       integer,
  tempo_ms            integer,
  created_at          timestamptz not null default now()
);

create index if not exists idx_neuro_user        on neuro_score_analyses(user_id);
create index if not exists idx_neuro_workspace   on neuro_score_analyses(workspace_id);
create index if not exists idx_neuro_hash        on neuro_score_analyses(image_hash);
create index if not exists idx_neuro_campanha    on neuro_score_analyses(campanha_id) where campanha_id is not null;
create index if not exists idx_neuro_feedback    on neuro_score_analyses(feedback) where feedback is not null;
create index if not exists idx_neuro_media_type  on neuro_score_analyses(media_type);

alter table neuro_score_analyses enable row level security;
create policy "neuro_own" on neuro_score_analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── neuro_score_patterns ──────────────────────────────────────────────────────
-- Padrões aprendidos por nicho. Atualizado pelo cron a cada 50 análises com outcome.

create table if not exists neuro_score_patterns (
  id                  uuid primary key default gen_random_uuid(),
  nicho               text not null,
  objetivo            text not null,
  platform            text not null default 'meta',
  -- [GANCHO VÍDEO] media_type permite padrões separados por tipo de criativo no futuro.
  -- Por ora o cron sempre insere 'image'. Quando vídeo for ativado, haverá linhas 'video'
  -- para o mesmo nicho/objetivo com correlações próprias (hook_vs_retention ganha peso).
  media_type          text not null default 'image' check (media_type in ('image','video')),

  -- Correlações aprendidas (calculadas a partir de analyses com outcome)
  correlacoes         jsonb not null default '{}',
  -- Estrutura:
  -- {
  --   "atencao_vs_ctr":      { "pearson": 0.72, "sample": 134 },
  --   "hook_vs_retention":   { "pearson": 0.68, "sample": 89 },
  --   "fadiga_vs_cpl":       { "pearson": -0.61, "sample": 112 },
  --   "emocoes_vencedoras":  ["urgencia", "curiosidade", "desejo"],
  --   "cta_patterns":        ["CTA visível + contraste alto → +23% CTR"],
  --   "zonas_criticas":      ["rosto_superior_esquerdo", "cta_inferior_direito"]
  -- }

  top_criativos       jsonb not null default '[]',
  -- Últimos 10 analyses com outcome positivo (score alto + CTR real alto)
  -- Usados como few-shot no prompt do modelo

  sample_size         integer not null default 0,
  ultima_atualizacao  timestamptz not null default now(),
  -- [FIX] unique agora inclui media_type para não colidir quando vídeo for ativado
  unique (nicho, objetivo, platform, media_type)
);

-- Sem RLS — leitura pública para o serviço (service role acessa diretamente)
