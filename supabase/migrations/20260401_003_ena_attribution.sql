-- ─────────────────────────────────────────────────────────────────────────────
-- ENA Attribution — Fase 3
-- Touchpoints de atribuição (click → lead → venda) e ROAS preditivo
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Tabela de touchpoints da jornada do lead
CREATE TABLE IF NOT EXISTS attribution_touchpoints (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id        uuid        REFERENCES clients(id),
  campaign_id      uuid        REFERENCES campaigns(id),
  -- UTM
  utm_source       text,
  utm_medium       text,
  utm_campaign     text,
  utm_content      text,
  utm_term         text,
  -- Estágio da jornada
  stage            text        NOT NULL CHECK (stage IN ('click','lead','qualified','sale','churned')),
  -- Identidade anonimizada
  contact_hash     text,       -- SHA-256 do telefone/email — sem PII
  contact_channel  text,       -- 'whatsapp', 'form', 'direct'
  -- Timing
  occurred_at      timestamptz NOT NULL DEFAULT now(),
  -- Valor monetário (só para stage='sale')
  sale_value       numeric(14,2),
  -- Referência ao lead se disponível
  lead_id          uuid,
  -- Contexto adicional
  metadata         jsonb
);

CREATE INDEX IF NOT EXISTS idx_attribution_workspace
  ON attribution_touchpoints (workspace_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_attribution_campaign
  ON attribution_touchpoints (campaign_id, stage);
CREATE INDEX IF NOT EXISTS idx_attribution_contact
  ON attribution_touchpoints (workspace_id, contact_hash);

-- RLS
ALTER TABLE attribution_touchpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read attribution"
  ON attribution_touchpoints FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "service role can write attribution"
  ON attribution_touchpoints FOR ALL
  USING (auth.role() = 'service_role');

-- 2. Tabela de snapshots de ROAS preditivo
CREATE TABLE IF NOT EXISTS predictive_roas_snapshots (
  id                         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id               uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id                uuid        REFERENCES campaigns(id),
  computed_date              date        NOT NULL,
  horizon_days               int         NOT NULL DEFAULT 7,
  predicted_roas             numeric(10,4),
  confidence_band_low        numeric(10,4),
  confidence_band_high       numeric(10,4),
  model_inputs               jsonb,
  narrative                  text,
  actual_roas_when_resolved  numeric(10,4),
  UNIQUE (workspace_id, campaign_id, computed_date)
);

CREATE INDEX IF NOT EXISTS idx_pred_roas_workspace
  ON predictive_roas_snapshots (workspace_id, computed_date DESC);

ALTER TABLE predictive_roas_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read pred roas"
  ON predictive_roas_snapshots FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "service role can write pred roas"
  ON predictive_roas_snapshots FOR ALL
  USING (auth.role() = 'service_role');
