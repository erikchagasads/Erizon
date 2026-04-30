# Auditoria de Banco de Dados da Erizon AI

Data da auditoria local: 2026-04-30

## Resumo

O projeto tem uma base grande de migrations e muitas rotas usando Supabase. A auditoria local comparou tabelas usadas no código por chamadas `.from("tabela")` com tabelas criadas em `supabase/migrations`.

O Blog Inteligente já está corrigido para usar dados reais de forma segura:

- leitura principal: `campaign_snapshots_daily`
- fallback real: `campaign_perf_snapshots`
- sem fallback de dados simulados
- se não houver dados reais suficientes, a geração é pulada com mensagem clara

## Tabelas OK

Estas tabelas são usadas no código e possuem migration de criação local:

`ad_accounts`, `agente_feedback`, `agente_memoria_cliente`, `anomaly_events`, `anonymous_campaign_insights`, `api_key_requests`, `api_keys`, `attribution_touchpoints`, `automacao_regras`, `autopilot_config`, `autopilot_execution_logs`, `autopilot_rules`, `autopilot_suggestions`, `benchmarks`, `blog_generation_logs`, `blog_market_sources`, `blog_newsletter_deliveries`, `blog_newsletter_subscribers`, `blog_posts`, `blog_settings`, `browser_push_subscriptions`, `budget_simulations`, `campaign_briefs`, `campaign_niche_overrides`, `campaign_perf_snapshots`, `campaign_snapshots`, `campaign_snapshots_daily`, `campaigns`, `cliente_financeiro`, `clients`, `creative_assets`, `crm_cliente_auth`, `crm_cliente_sessions`, `crm_leads`, `decision_audit_trail`, `ena_ire_daily`, `integration_credentials`, `market_benchmarks`, `mfa_otp_pending`, `network_benchmarks`, `network_participation`, `network_weekly_insights`, `notification_log`, `opportunity_events`, `pending_decisions`, `prediction_feedback`, `predictive_anomaly_alerts`, `predictive_roas_snapshots`, `preflight_scores`, `product_events`, `profit_dna_snapshots`, `profit_snapshots`, `referral_credits`, `referral_events`, `referrals`, `risk_events`, `telegram_copilot_sessions`, `timeline_events`, `training_examples`, `training_rejections`, `user_mfa_config`, `webhook_events`, `webhook_integrations`, `whatsapp_copilot_sessions`, `white_label_clientes`, `white_label_configs`, `workspace_benchmarks`, `workspace_integrations`, `workspace_members`, `workspaces`.

## Tabelas Usadas Sem Migration De Criação

Estas tabelas aparecem no código, mas não têm `CREATE TABLE` nas migrations locais auditadas:

`agente_alertas`, `agente_memoria`, `ai_rate_limits`, `autopilot_configs`, `bm_accounts`, `campanhas`, `campanhas_crm`, `clientes`, `corretores`, `daily_snapshots`, `decisoes_historico`, `leads`, `metricas_ads`, `metricas_snapshot_diario`, `subscriptions`, `trusted_devices`, `user_configs`, `user_settings`.

Observação: `white-label-assets` aparece no código como bucket de Storage, não como tabela SQL.

## Migrations Com Risco De Falha

Estas migrations fazem `ALTER TABLE` em tabelas que não são criadas localmente:

- `metricas_ads` em `20260310_erizon_operating_system.sql`
- `clientes` em migrations de CRM/cliente
- `user_settings` em migrations de configurações
- `autopilot_configs` em migrations de autopilot
- `agente_memoria` em migrations de memória/agente

Se essas tabelas já existem no Supabase histórico, o projeto pode funcionar no banco atual. Em um Supabase limpo, há risco de falha até importar ou criar as migrations base dessas tabelas.

## RLS E Políticas

Há migrations antigas com `CREATE POLICY` sem `DROP POLICY IF EXISTS`, especialmente em:

- `20260313_001_automacao_regras.sql`
- `20260313_002_white_label.sql`
- `20260322_004_cockpit_decisions.sql`
- `20260325_001_profit_dna.sql`
- `20260325_002_network_intelligence.sql`
- `20260411_001_autopilot_execution_shield.sql`
- `20260411_002_training_data.sql`
- `20260411_003_referral_loop.sql`
- `20260411_004_public_api_keys.sql`
- `20260414_012_browser_push_and_product_events.sql`

Isso pode gerar erro se a migration for reaplicada em banco parcialmente migrado.

## Blog Inteligente

Status local: corrigido.

O cron atual `/api/cron/daily-snapshot` grava snapshots em `campaign_perf_snapshots`. O Blog Inteligente agora consulta:

1. `campaign_snapshots_daily`
2. `campaign_perf_snapshots` como fallback real

Regras mantidas:

- não cria dados fake
- não inventa notícias
- só gera estudos/relatórios com pelo menos três linhas reais com sinal operacional
- mostra feedback claro no admin quando a geração é pulada
- publicação automática segue desativada por padrão

## Rota De Diagnóstico Criada

Foi criada a rota:

`GET /api/admin/database-health`

Ela retorna:

- tabelas esperadas
- tabelas encontradas
- tabelas ausentes
- contagens das tabelas críticas
- status das tabelas do Blog Inteligente
- alerta se o cron está populando `campaign_perf_snapshots` e `campaign_snapshots_daily` está vazia
- recomendações de correção

## Página Admin Criada

Foi criada a página:

`/admin/database-health`

Ela mostra:

- status geral: OK, Atenção ou Erro
- contagens críticas
- status do Blog Inteligente
- tabelas ausentes
- tabelas usadas sem migration de criação
- recomendações em português do Brasil

## Ajustes Obrigatórios Antes De Produção

- Confirmar no Supabase real se as tabelas legadas existem: `clientes`, `metricas_ads`, `user_configs`, `bm_accounts`, `subscriptions`, `user_settings`, `campanhas`, `decisoes_historico`.
- Se existirem apenas no banco remoto, gerar migrations base com `supabase db diff --linked --schema public`.
- Se não existirem, criar migrations específicas antes de depender dessas rotas em produção.
- Rodar `/admin/database-health` após aplicar migrations.

## Ajustes Recomendados

- Padronizar aos poucos a nomenclatura entre tabelas legadas em português (`clientes`, `campanhas`) e tabelas novas em inglês (`clients`, `campaigns`).
- Adicionar `DROP POLICY IF EXISTS` antes de policies antigas que ainda não usam esse padrão.
- Decidir se `campaign_snapshots_daily` ou `campaign_perf_snapshots` será a fonte oficial de série temporal no longo prazo.

