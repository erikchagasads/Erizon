-- Adiciona campo whatsapp na tabela clientes
-- Usado pelo webhook para redirecionar o lead direto ao WhatsApp do cliente

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS whatsapp text;

-- Também adiciona mensagem personalizada opcional
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS whatsapp_mensagem text;
