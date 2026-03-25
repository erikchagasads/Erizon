-- ─────────────────────────────────────────────────────────────────────────────
-- ENA Foundation — Fase 1
-- Erizon Neural Attribution: tabelas e colunas base para I.R.E. Score
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Adicionar colunas de decisão e outcome nas sugestões do autopilot
ALTER TABLE autopilot_suggestions
  ADD COLUMN IF NOT EXISTS decided_at          timestamptz,
  ADD COLUMN IF NOT EXISTS decided_by          uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS decision            text CHECK (decision IN ('applied','dismissed','deferred')),
  ADD COLUMN IF NOT EXISTS outcome_7d          text CHECK (outcome_7d  IN ('improved','degraded','neutral','pending')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS outcome_14d         text CHECK (outcome_14d IN ('improved','degraded','neutral','pending')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS outcome_30d         text CHECK (outcome_30d IN ('improved','degraded','neutral','pending')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS metric_before       jsonb,
  ADD COLUMN IF NOT EXISTS metric_after_7d     jsonb,
  ADD COLUMN IF NOT EXISTS metric_after_14d    jsonb,
  ADD COLUMN IF NOT EXISTS metric_after_30d    jsonb,
  ADD COLUMN IF NOT EXISTS campaign_snapshot_date date;

-- 2. Tabela de histórico diário do I.R.E. por workspace
CREATE TABLE IF NOT EXISTS ena_ire_daily (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  snapshot_date     date        NOT NULL,
  ire_score         numeric(5,2) NOT NULL DEFAULT 0,
  norm_roas         numeric(7,4),
  norm_quality      numeric(7,4),
  norm_decision     numeric(7,4),
  norm_waste        numeric(7,4),
  waste_index       numeric(7,4),
  waste_breakdown   jsonb,
  decision_score    numeric(7,4),
  total_spend       numeric(14,2),
  total_revenue     numeric(14,2),
  active_campaigns  int,
  computed_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_ena_ire_workspace_date
  ON ena_ire_daily (workspace_id, snapshot_date DESC);

-- RLS: workspace members podem ler apenas seu próprio histórico
ALTER TABLE ena_ire_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read ire"
  ON ena_ire_daily FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "service role can write ire"
  ON ena_ire_daily FOR ALL
  USING (auth.role() = 'service_role');
