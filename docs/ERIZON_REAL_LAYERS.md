
# Erizon — versão real por 7 frentes

## O que foi adicionado
1. **Conectores reais por provider**
   - `src/connectors/meta-ads`
   - `src/connectors/ga4`
   - `src/connectors/commerce`

2. **Ingestão + normalização**
   - `src/ingestion/normalizers`
   - `src/ingestion/pipelines/operating-sync-pipeline.ts`

3. **Persistência de snapshots**
   - `src/repositories/supabase-operating-repository.ts`
   - `supabase/migrations/20260310_erizon_operating_system.sql`

4. **Auth + credenciais**
   - `src/repositories/integration-credential-repository.ts`
   - `src/services/integration-auth-service.ts`
   - `src/app/api/integrations/connect/route.ts`

5. **Validação do motor de decisão**
   - `src/core/decision-validation.ts`

6. **Governança do Autopilot**
   - `src/core/autopilot-governance.ts`
   - logs em `autopilot_execution_logs`

7. **Troca do mock por Supabase**
   - `src/services/operating-system-service.ts`
   - `src/app/api/operacao-real/route.ts`
   - `src/app/api/integrations/status/route.ts`

## Como ligar suas APIs
- cadastre credenciais via `POST /api/integrations/connect`
- defina envs do Supabase e providers
- rode a migration no Supabase
- troque os conectores mock pelos conectores reais

## Rotas novas
- `GET /api/operacao-real?workspaceId=ws-erizon&source=supabase`
- `GET /api/integrations/status?workspaceId=ws-erizon&source=supabase`
- `POST /api/integrations/connect`
