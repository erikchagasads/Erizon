-- Migration: sistema de feedback e memória por cliente para os agentes IA
-- Arquivo: supabase/migrations/20260320_agente_feedback_memoria.sql

-- ── Tabela: feedback dos agentes ─────────────────────────────────────────────
-- Registra avaliações do gestor sobre respostas de qualquer agente

CREATE TABLE IF NOT EXISTS agente_feedback (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agente        text NOT NULL, -- 'agente', 'analista', 'copywriter', 'roteirista', 'geral'
  avaliacao     text NOT NULL CHECK (avaliacao IN ('positivo', 'negativo')),
  motivo        text DEFAULT NULL, -- 'funcionou', 'nao_converteu', 'cpl_melhorou', 'criativo_aprovado', etc.
  contexto      jsonb DEFAULT NULL, -- snapshot do que foi avaliado (campanha, copy, roteiro)
  cliente_id    uuid DEFAULT NULL REFERENCES clientes(id) ON DELETE SET NULL,
  sessao_id     text DEFAULT NULL, -- agrupa feedbacks da mesma sessão
  criado_em     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agente_feedback_user    ON agente_feedback (user_id, agente);
CREATE INDEX IF NOT EXISTS idx_agente_feedback_cliente ON agente_feedback (user_id, cliente_id);
ALTER TABLE agente_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY agente_feedback_policy ON agente_feedback
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Tabela: memória por cliente ───────────────────────────────────────────────
-- Perfil evolutivo de cada cliente — atualizado automaticamente com o uso

CREATE TABLE IF NOT EXISTS agente_memoria_cliente (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id          uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,

  -- Perfil do cliente
  nicho               text DEFAULT NULL,         -- 'imobiliário', 'estética', 'e-commerce', etc.
  descricao           text DEFAULT NULL,         -- resumo livre do cliente/negócio
  publico_alvo        text DEFAULT NULL,         -- descrição do ICP

  -- Benchmarks históricos do cliente
  cpl_historico       numeric DEFAULT NULL,      -- CPL médio histórico
  cpl_alvo            numeric DEFAULT NULL,      -- meta de CPL
  roas_historico      numeric DEFAULT NULL,      -- ROAS médio histórico
  roas_alvo           numeric DEFAULT NULL,      -- meta de ROAS
  ticket_medio        numeric DEFAULT NULL,      -- ticket médio do produto/serviço
  budget_mensal       numeric DEFAULT NULL,      -- budget mensal aproximado

  -- Aprendizados de copy e criativos
  copies_aprovadas    jsonb DEFAULT '[]'::jsonb, -- [{texto, tipo, motivo, data}]
  copies_reprovadas   jsonb DEFAULT '[]'::jsonb, -- [{texto, tipo, motivo, data}]
  ganchos_aprovados   jsonb DEFAULT '[]'::jsonb, -- [{gancho, motivo, data}]
  formatos_que_convertem text DEFAULT NULL,      -- 'Reels, carrossel'
  angulos_que_funcionam  text DEFAULT NULL,      -- 'dor, autoridade, antes/depois'

  -- Aprendizados de análise
  acoes_aprovadas     jsonb DEFAULT '[]'::jsonb, -- ações recomendadas que funcionaram
  acoes_reprovadas    jsonb DEFAULT '[]'::jsonb, -- ações que não funcionaram
  padroes_observados  text DEFAULT NULL,         -- padrões identificados nas campanhas

  -- Controle
  total_feedbacks     int DEFAULT 0,
  ultima_interacao    timestamptz DEFAULT now(),
  criado_em           timestamptz DEFAULT now(),
  atualizado_em       timestamptz DEFAULT now(),

  UNIQUE (user_id, cliente_id)
);

CREATE INDEX IF NOT EXISTS idx_memoria_cliente_user    ON agente_memoria_cliente (user_id);
CREATE INDEX IF NOT EXISTS idx_memoria_cliente_cliente ON agente_memoria_cliente (user_id, cliente_id);
ALTER TABLE agente_memoria_cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY memoria_cliente_policy ON agente_memoria_cliente
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Adicionar coluna sessao_id na agente_memoria (memória global) ─────────────
ALTER TABLE agente_memoria ADD COLUMN IF NOT EXISTS
  feedback_positivos int DEFAULT 0;
ALTER TABLE agente_memoria ADD COLUMN IF NOT EXISTS
  feedback_negativos int DEFAULT 0;
ALTER TABLE agente_memoria ADD COLUMN IF NOT EXISTS
  ultimo_feedback_em timestamptz DEFAULT NULL;
