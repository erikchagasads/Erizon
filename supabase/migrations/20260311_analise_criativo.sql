-- Adiciona campo analise_criativo na tabela metricas_ads
ALTER TABLE metricas_ads
  ADD COLUMN IF NOT EXISTS analise_criativo jsonb DEFAULT NULL;

-- Index para buscar campanhas que já foram analisadas
CREATE INDEX IF NOT EXISTS idx_metricas_ads_analise_criativo
  ON metricas_ads USING gin (analise_criativo)
  WHERE analise_criativo IS NOT NULL;

-- Tabela notification_log (se ainda não existir — fix do check-alerts)
CREATE TABLE IF NOT EXISTS notification_log (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL,
  campaign_id text NOT NULL,
  tipo        text NOT NULL,
  criado_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_campaign_date
  ON notification_log (campaign_id, criado_at);
