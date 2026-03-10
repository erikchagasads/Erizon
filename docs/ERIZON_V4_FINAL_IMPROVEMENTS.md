# Erizon — Melhorias v4 Final (Nota 9.2+)

## Resumo das 5 correções aplicadas

### 1. Validação runtime nativa (equivalente ao Zod)
- `src/lib/validate.ts` — validador com API `z.string().nonempty()`, `z.enum()`, `z.object()`, `z.array()`, `safeParse()`
- `src/lib/schemas.ts` — schemas de todas as rotas críticas
- Rotas com validação aplicada:
  - `POST /api/integrations/connect` — IntegrationConnectSchema
  - `POST /api/meta-actions` — MetaActionBodySchema
  - `POST /api/ai-analyst` — AnalystBodySchema
  - Instale `zod@^3.23.8` (listado no package.json) para usar biblioteca canônica

### 2. Cliente Supabase duplicado eliminado
- `src/app/lib/supabase.ts` — agora re-exporta o singleton canônico de `@/lib/supabase`
- Zero instâncias soltas: todos os imports novos devem usar `getSupabase()` de `@/lib/supabase`

### 3. Singleton server-side para Supabase
- `src/lib/supabase-server.ts` — `getSupabaseServerClient()` agora armazena a instância em módulo-level `_serverClient`
- `resetSupabaseServerClient()` disponível para testes e rotação de credenciais

### 4. Connectors reais implementados
- `src/connectors/meta-ads/MetaAdsRealConnector.ts`
  - Validação de token via `/debug_token`
  - Refresh de long-lived token (client_credentials)
  - Paginação via cursor com `maxPages` como proteção
  - Parse robusto de insights: spend, CTR, CPM, CPC, leads, revenue, budget
  - Mensagens de erro amigáveis por código (190, 100, 17, 200)
- `src/connectors/ga4/Ga4RealConnector.ts`
  - Autenticação JWT via Service Account (PKCS8 + RS256)
  - GA4 Data API: `runReport` com dimensões de campanha e receita
- `src/connectors/commerce/CommerceRealConnector.ts`
  - Shopify REST Admin API v2024-01 com paginação
  - Hotmart v1 com OAuth client_credentials + sales summary

### 5. portalSummary com dados reais
- Usa `profitSnapshots` históricos dos últimos 30 dias quando disponíveis
- Fallback para soma de `spendToday/revenueToday` acumulados dos snapshots
- Expõe `periodoReferencia` e `fonte` ("historico_real" vs "snapshot_acumulado")
- Mensagem dinâmica com sinal real do lucro

### 6. Pipeline de sync atualizado
- `OperatingSyncPipeline` agora resolve conectores reais via lazy import
- Pull paralelo de Meta + GA4 + Commerce com `Promise.all`
- Resultado inclui `connectors: { meta, ga4, commerce }` indicando "real" ou "mock"

## Como ativar os conectores reais

```env
# Meta Ads
META_APP_ID=xxx
META_APP_SECRET=xxx

# GA4
GA4_PROPERTY_ID=xxx
GOOGLE_CLIENT_EMAIL=xxx
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Shopify
SHOPIFY_STORE_DOMAIN=sua-loja.myshopify.com

# Hotmart
HOTMART_CLIENT_ID=xxx
HOTMART_CLIENT_SECRET=xxx
HOTMART_BASIC_TOKEN=xxx
```

Registre as credenciais via `POST /api/integrations/connect` com `provider: "meta_ads"`.
