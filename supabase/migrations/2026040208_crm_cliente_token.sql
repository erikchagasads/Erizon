-- ── CRM Token de Acesso do Cliente ───────────────────────────────────────────
-- Cada cliente recebe um token único para acessar seu CRM externo.
-- O token é gerado automaticamente e pode ser regenerado pelo gestor.

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS crm_token text unique default gen_random_uuid()::text;

-- Garante que clientes existentes tenham um token
UPDATE clientes SET crm_token = gen_random_uuid()::text WHERE crm_token IS NULL;

-- Índice para lookup rápido por token
CREATE INDEX IF NOT EXISTS idx_clientes_crm_token ON clientes(crm_token);

-- Adiciona coluna de telefone e email nos leads (se não existir)
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS email    text;
