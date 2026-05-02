-- Migration: adiciona campo campanha_keywords na tabela clientes
-- Permite auto-vínculo de campanhas por nome no sync

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS campanha_keywords text DEFAULT NULL;

COMMENT ON COLUMN clientes.campanha_keywords IS
  'Palavras-chave separadas por vírgula. Campanhas com esses termos no nome são vinculadas automaticamente durante o sync.';
