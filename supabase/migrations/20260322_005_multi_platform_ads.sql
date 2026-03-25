-- ── Multi-platform Ads Migration ─────────────────────────────────────────────
-- Adiciona suporte a Google Ads, TikTok Ads e LinkedIn Ads

-- ── Tokens OAuth por plataforma em user_settings ──────────────────────────────
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS google_ads_access_token   text,
  ADD COLUMN IF NOT EXISTS google_ads_refresh_token  text,
  ADD COLUMN IF NOT EXISTS google_ads_customer_id    text,
  ADD COLUMN IF NOT EXISTS google_ads_developer_token text,
  ADD COLUMN IF NOT EXISTS tiktok_ads_access_token   text,
  ADD COLUMN IF NOT EXISTS tiktok_ads_advertiser_id  text,
  ADD COLUMN IF NOT EXISTS linkedin_ads_access_token text,
  ADD COLUMN IF NOT EXISTS linkedin_ads_refresh_token text,
  ADD COLUMN IF NOT EXISTS linkedin_ads_account_id   text;

-- ── Coluna plataforma em metricas_ads ─────────────────────────────────────────
ALTER TABLE metricas_ads
  ADD COLUMN IF NOT EXISTS plataforma text not null default 'meta'
    check (plataforma in ('meta', 'google', 'tiktok', 'linkedin'));

-- Índice para filtrar por plataforma
CREATE INDEX IF NOT EXISTS idx_metricas_ads_plataforma
  ON metricas_ads(user_id, plataforma);

-- Remove duplicatas: mantém apenas a linha mais recente por (user_id, nome_campanha, plataforma)
DELETE FROM metricas_ads
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, nome_campanha, plataforma
        ORDER BY data_atualizacao DESC NULLS LAST, id DESC
      ) AS rn
    FROM metricas_ads
  ) ranked
  WHERE rn > 1
);

-- Índice composto para evitar duplicatas por plataforma (sem cliente)
CREATE UNIQUE INDEX IF NOT EXISTS idx_metricas_ads_unique_platform
  ON metricas_ads(user_id, nome_campanha, plataforma)
  WHERE cliente_id IS NULL;

-- Índice composto para evitar duplicatas por plataforma (com cliente)
CREATE UNIQUE INDEX IF NOT EXISTS idx_metricas_ads_unique_platform_cliente
  ON metricas_ads(user_id, nome_campanha, plataforma, cliente_id)
  WHERE cliente_id IS NOT NULL;
