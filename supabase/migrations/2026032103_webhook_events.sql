-- Tabela unificada de eventos de webhook (todas as plataformas)
CREATE TABLE IF NOT EXISTS webhook_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform        TEXT NOT NULL,                          -- hotmart, kirvano, shopify, nuvemshop, universal
  event_type      TEXT NOT NULL,                          -- purchase, abandoned_cart, refund, subscription, etc.
  value           NUMERIC(12,2),                          -- valor da transação em BRL
  currency        TEXT DEFAULT 'BRL',
  customer_email  TEXT,
  campaign_ref    TEXT,                                   -- utm_campaign ou referência da campanha
  cliente_id      UUID REFERENCES clientes(id) ON DELETE SET NULL,
  user_id         UUID,                                   -- proprietário da integração
  raw             JSONB NOT NULL DEFAULT '{}',            -- payload original completo
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id    ON webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_platform   ON webhook_events(platform);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed  ON webhook_events(processed_at DESC);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_events_user_policy ON webhook_events
  FOR ALL USING (auth.uid() = user_id);

-- Chave de integração por plataforma por usuário
CREATE TABLE IF NOT EXISTS webhook_integrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  platform    TEXT NOT NULL,                              -- hotmart, kirvano, shopify, nuvemshop
  secret      TEXT NOT NULL,                              -- HMAC secret configurado na plataforma
  shop_domain TEXT,                                       -- apenas Shopify/Nuvemshop
  ativo       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

ALTER TABLE webhook_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhook_integrations_user_policy ON webhook_integrations
  FOR ALL USING (auth.uid() = user_id);
