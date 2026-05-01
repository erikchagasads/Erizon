-- Verificação de tabelas ausentes — gerado por check-migrations.mjs
-- Cole no SQL Editor do Supabase Dashboard e execute

SELECT
  t.table_name,
  CASE WHEN t.table_name IS NOT NULL THEN '✓ existe' ELSE '✗ ausente' END as status
FROM (VALUES
  ('agente_alertas'),
  ('agente_memoria'),
  ('ai_rate_limits'),
  ('autopilot_configs'),
  ('bm_accounts'),
  ('campanhas'),
  ('campanhas_crm'),
  ('clientes'),
  ('corretores'),
  ('daily_snapshots'),
  ('decisoes_historico'),
  ('leads'),
  ('metricas_ads'),
  ('metricas_snapshot_diario'),
  ('trusted_devices'),
  ('user_configs'),
  ('user_settings')
) AS expected(table_name)
LEFT JOIN information_schema.tables t
  ON t.table_name = expected.table_name
  AND t.table_schema = 'public'
ORDER BY t.table_name NULLS LAST;

-- Para ver TODAS as tabelas do seu banco:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' ORDER BY table_name;