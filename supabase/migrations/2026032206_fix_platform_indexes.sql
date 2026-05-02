-- Fix: remove partial unique indexes que conflitam com o Meta sync
-- Meta usa meta_campaign_id como chave de upsert; os índices parciais por nome_campanha+plataforma
-- conflitam quando a mesma campanha aparece em múltiplas contas BM.
-- Deduplicação por plataforma é feita na camada de aplicação (DELETE + INSERT).

DROP INDEX IF EXISTS idx_metricas_ads_unique_platform;
DROP INDEX IF EXISTS idx_metricas_ads_unique_platform_cliente;

-- Garante índice de performance (sem uniqueness) para filtro por plataforma
CREATE INDEX IF NOT EXISTS idx_metricas_ads_plataforma
  ON metricas_ads(user_id, plataforma);
