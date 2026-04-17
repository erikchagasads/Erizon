-- Migration: cliente_financeiro
-- Conecta tráfego pago ao faturamento real do cliente.
-- Alimenta ROI, taxa de fechamento e Profit DNA.

CREATE TABLE IF NOT EXISTS cliente_financeiro (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_user_id   UUID NOT NULL,
  cliente_id          UUID NOT NULL,
  receita_gerada      NUMERIC(14,2) NOT NULL DEFAULT 0,
  leads_fechados      INTEGER NOT NULL DEFAULT 0,
  periodo_referencia  TEXT,           -- "2025-04" para agrupamento mensal
  observacao          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cliente_financeiro_cliente
  ON cliente_financeiro (cliente_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cliente_financeiro_workspace
  ON cliente_financeiro (workspace_user_id, created_at DESC);

-- RLS
ALTER TABLE cliente_financeiro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_owner_financeiro" ON cliente_financeiro
  FOR ALL USING (workspace_user_id = auth.uid());

COMMENT ON TABLE cliente_financeiro IS
  'Registros de faturamento real por cliente. Conecta spend de tráfego a receita gerada, alimentando ROI e Profit DNA.';
