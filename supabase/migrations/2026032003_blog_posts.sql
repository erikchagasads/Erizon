-- Migration: tabela de posts do blog gerados por IA
-- supabase/migrations/20260320_blog_posts.sql

CREATE TABLE IF NOT EXISTS blog_posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  title         text NOT NULL,
  description   text NOT NULL,
  content       text NOT NULL,           -- HTML ou Markdown
  category      text NOT NULL DEFAULT 'Estratégia',
  tags          text[] DEFAULT '{}',
  author        text NOT NULL DEFAULT 'Equipe Erizon',
  read_time     text NOT NULL DEFAULT '5 min',
  published     boolean NOT NULL DEFAULT true,
  featured      boolean NOT NULL DEFAULT false,
  views         int NOT NULL DEFAULT 0,
  gerado_por_ia boolean NOT NULL DEFAULT true,
  publicado_em  timestamptz NOT NULL DEFAULT now(),
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug       ON blog_posts (slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published  ON blog_posts (published, publicado_em DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category   ON blog_posts (category);

-- RLS — posts são públicos para leitura, só service role escreve
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY blog_posts_read ON blog_posts
  FOR SELECT USING (published = true);

-- Permite escrita via service role (cron job)
-- A API de geração usa SUPABASE_SERVICE_ROLE_KEY
