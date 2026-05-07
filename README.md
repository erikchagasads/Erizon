# Erizon — Plataforma de Inteligência para Meta Ads

Plataforma de gestão e inteligência de campanhas de anúncios pagos (Meta Ads).

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Supabase** (PostgreSQL + Auth)
- **Meta Ads Graph API v19.0**

## Estrutura

```
src/
  app/api/           # Routes HTTP (Next.js App Router)
  connectors/        # Integrações com plataformas externas
  core/              # Lógica de domínio pura (funções puras, testáveis)
  ingestion/         # Normalizers de dados brutos
  lib/               # Auth, observabilidade, validação, Supabase client
  repositories/      # Acesso ao banco por domínio
  services/          # Orquestração de casos de uso
  types/             # Tipos canônicos do domínio
  workers/           # Jobs assíncronos (cron)
supabase/migrations/ # Schema SQL versionado
```

## Setup

```bash
cp .env.example .env.local
# Preencha NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
npx supabase db push
npm run dev
```

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (server-side apenas) |

> `META_ACCESS_TOKEN` **não é mais necessário no env** — tokens são armazenados por conta de anúncios na tabela `ad_accounts.access_token`.

## APIs

### `POST /api/campaigns/sync`
Dispara sincronização de campanhas do Meta Ads para o workspace.

**Auth:** Bearer token (Supabase JWT) — requer role `owner` ou `admin`

```json
{ "workspaceId": "uuid" }
```

### `POST /api/intelligence/run`
Executa análise de anomalias, riscos e oportunidades.

**Auth:** Bearer token — requer role `owner` ou `admin`

```json
{ "workspaceId": "uuid" }
```

### `POST /api/autopilot/run`
Gera sugestões de otimização para campanhas ativas.

**Auth:** Bearer token — requer role `owner` ou `admin`

```json
{ "workspaceId": "uuid" }
```

### `GET /api/pulse?workspaceId=<uuid>`
Retorna visão consolidada do workspace (totais, anomalias, riscos, oportunidades).

**Auth:** Bearer token — qualquer role

## Segurança

- Autenticação via Supabase Auth (JWT) em todas as rotas
- Autorização por role por operação
- Access tokens de plataformas armazenados no banco, nunca trafegam na API
- Row-Level Security (RLS) habilitado nas tabelas principais
- Validação de input com Zod em todas as rotas

## Testes

```bash
npm test                 # Todos os testes
npm test -- --watch      # Modo watch
npm test -- --coverage   # Cobertura
```

## Workers (cron)

Os jobs em `src/workers/` são projetados para serem chamados por um scheduler externo
(Vercel Cron, pg_cron, BullMQ). Iteram automaticamente sobre todos os workspaces ativos.

```typescript
import { runAdsSyncJob } from "@/workers/ads-sync-runner";
await runAdsSyncJob(); // Sync todos os workspaces ativos
```

## Benchmarks por Workspace

Cada workspace pode ter seus próprios benchmarks via tabela `workspace_benchmarks`.
Se não configurado, o sistema usa defaults conservadores (CTR: 1.5%, CPL: R$ 20).
