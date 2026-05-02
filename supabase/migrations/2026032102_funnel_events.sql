-- Camada 1: Eventos de funil completo do Meta Pixel
-- Adiciona colunas de eventos por nicho à tabela metricas_ads

ALTER TABLE metricas_ads
  ADD COLUMN IF NOT EXISTS compras               INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS add_to_cart           INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkout_iniciado     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cadastros             INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visualizacoes_conteudo INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agendamentos          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assinaturas           INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buscas                INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS frequencia            NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_views_p25       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_views_p50       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_views_p75       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_views_p100      INTEGER DEFAULT 0;

COMMENT ON COLUMN metricas_ads.compras IS 'Quantidade de compras finalizadas (purchase event)';
COMMENT ON COLUMN metricas_ads.add_to_cart IS 'Carrinhos adicionados (add_to_cart event)';
COMMENT ON COLUMN metricas_ads.checkout_iniciado IS 'Checkouts iniciados (initiate_checkout event)';
COMMENT ON COLUMN metricas_ads.cadastros IS 'Cadastros completos (complete_registration event)';
COMMENT ON COLUMN metricas_ads.visualizacoes_conteudo IS 'Visualizações de página de produto (view_content event)';
COMMENT ON COLUMN metricas_ads.agendamentos IS 'Agendamentos realizados (schedule event)';
COMMENT ON COLUMN metricas_ads.assinaturas IS 'Assinaturas (subscribe event)';
COMMENT ON COLUMN metricas_ads.buscas IS 'Buscas no site (search event)';
COMMENT ON COLUMN metricas_ads.frequencia IS 'Frequência média de exibição do anúncio';
COMMENT ON COLUMN metricas_ads.video_views_p25 IS 'Vídeos assistidos até 25%';
COMMENT ON COLUMN metricas_ads.video_views_p50 IS 'Vídeos assistidos até 50%';
COMMENT ON COLUMN metricas_ads.video_views_p75 IS 'Vídeos assistidos até 75%';
COMMENT ON COLUMN metricas_ads.video_views_p100 IS 'Vídeos assistidos completos (100%)';
