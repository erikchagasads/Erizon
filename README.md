<div align="center">
  <h1>⚡ Erizon</h1>
  <p><strong>AI Marketing Operating System para gestores de tráfego brasileiros</strong></p>
  <p>
    <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" />
    <img src="https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript" />
    <img src="https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase" />
    <img src="https://img.shields.io/badge/Groq-LLaMA_3.3_70B-orange" />
    <img src="https://img.shields.io/badge/Autopilot-simulation_mode-yellow" />
  </p>
</div>

---

## O que é o Erizon

O Erizon é um SaaS B2B para gestores de tráfego e agências brasileiras que gerenciam campanhas Meta Ads. Ele transforma dados de campanhas em decisões acionáveis via engines determinísticos de IA — sem depender de "feeling".

**Principais módulos:**
- **Pulse** — painel de saúde em tempo real com score de campanha e alertas
- **Copiloto AI** — agente conversacional com memória persistente (Groq LLaMA 3.3 70B)
- **Autopilot** — regras de escala/pausa com modo shadow (simulation) e execução real
- **Risk Radar** — detecção proativa de saturação, campanhas zumbi e elevação de CPA
- **Creative Lab** — análise de criativos com benchmarks de mercado por nicho
- **Portal Cliente** — relatório financeiro white-label com lucro real por cliente
- **CRM de Leads** — rastreamento de leads inbound via WhatsApp/webhook

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 App Router + TypeScript strict + Tailwind CSS |
| Backend | Next.js API Routes (serverless) |
| Banco | Supabase (PostgreSQL + Auth + RLS) |
| AI | Groq API — LLaMA 3.3 70B Versatile |
| Integrações | Meta Graph API, GA4 Data API, Shopify REST, Hotmart OAuth |
| Notificações | Telegram Bot API |
| Billing | Stripe Subscriptions |
| Deploy | Vercel (crons nativos) |

---

## Arquitetura

```
src/
├── app/                    # Pages + API Routes (Next.js App Router)
│   ├── api/                # 27 rotas de API
│   ├── pulse/              # Dashboard principal
│   ├── dados/              # Campanhas + decisões
│   ├── leads/              # CRM de leads
│   ├── studio/             # Copiloto AI
│   └── settings/           # Configurações + BM accounts
│
├── core/                   # 8 engines determinísticos (sem LLM)
│   ├── decision-engine.ts      # Score de saúde + recomendações
│   ├── profit-engine.ts        # Lucro real descontando todos os custos
│   ├── risk-engine.ts          # Flags de risco (saturação, zumbi, CPA)
│   ├── autopilot-engine.ts     # Avaliação de regras de autopilot
│   ├── autopilot-governance.ts # Guardrails de segurança (simulation/live)
│   ├── decision-validation.ts  # Validação de qualidade de dados
│   ├── creative-engine.ts      # Score de criativo vs benchmark
│   └── network-intelligence.ts # Comparação com mercado por nicho
│
├── connectors/             # Integrações externas por provider
│   ├── meta-ads/           # Meta Graph API com validação de token
│   ├── ga4/                # Google Analytics 4 (JWT service account)
│   └── commerce/           # Shopify REST + Hotmart OAuth
│
├── ingestion/              # Pipeline de normalização de dados
│   └── pipelines/
│       └── operating-sync-pipeline.ts
│
├── repositories/           # Camada de acesso ao Supabase
│   ├── supabase-operating-repository.ts
│   └── mock-operating-repository.ts
│
├── services/               # Orquestração de casos de uso
│   └── operating-system-service.ts
│
├── workers/                # Jobs assíncronos
│   ├── ads-sync.ts
│   ├── autopilot-runner.ts
│   └── network-pattern-analyzer.ts
│
├── lib/                    # Utilitários compartilhados
│   ├── validate.ts         # Schema validation (Zod-compatible)
│   ├── schemas.ts          # Schemas de todas as rotas de API
│   ├── auth-guard.ts       # Middleware de autenticação
│   ├── rate-limiter.ts     # Rate limiting por user_id
│   ├── supabase.ts         # Cliente browser (singleton)
│   └── supabase-server.ts  # Cliente server (service role, singleton)
│
└── __tests__/              # 86 casos de teste
    ├── core/               # profit, decision, autopilot, risk, validation
    └── connectors/         # MetaAdsRealConnector (fetch mock)
```

---

## Setup local

### 1. Pré-requisitos

- Node.js 18+
- Conta Supabase (gratuita)
- Chave Groq (gratuita em console.groq.com)
- App Meta for Developers (para sync real — opcional no início)

### 2. Clonar e instalar

```bash
git clone https://github.com/seu-usuario/erizon.git
cd erizon
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
# Edite .env.local com seus valores reais
```

Variáveis **obrigatórias** para o app subir:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
GROQ_API_KEY=
```

### 4. Criar o banco de dados

No Supabase Dashboard → SQL Editor, execute o arquivo:

```
erizon_schema_completo.sql
```

Isso cria 28 tabelas, índices, RLS, triggers e seed de benchmarks de mercado.

### 5. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:3000`, crie uma conta e faça login.

---

## Fluxo de dados

```
Meta Ads API
    │
    ▼
MetaAdsRealConnector.pullCampaigns()
    │  (normaliza spend, impressions, frequency via adsets)
    ▼
operating-sync-pipeline.ts
    │  (enriquece com GA4 revenue + histórico previous*)
    ▼
Supabase: campaign_snapshots + profit_snapshots
    │
    ▼
decision-engine → score + recomendações
risk-engine     → flags de risco
profit-engine   → lucro real por campanha
    │
    ▼
Pulse Dashboard + Alertas Telegram
```

---

## Conectar Meta Ads

1. Acesse `/settings`
2. Adicione uma conta BM (Business Manager)
3. Cole o Access Token e o Ad Account ID (`act_XXXXXXXX`)
4. Clique em **Salvar e sincronizar**

O token é validado via `/debug_token` da Graph API antes de salvar.

---

## Autopilot

O Autopilot opera em dois modos controlados pela env `ERIZON_AUTOPILOT_MODE`:

| Modo | Comportamento |
|---|---|
| `simulation` | Avalia regras e registra decisões, mas **não executa** na Meta API |
| `live` | Executa ações reais (aumento/redução de budget, pausa) |

**Recomendação:** manter em `simulation` até validar os guardrails com dados reais.

---

## Rodar testes

```bash
npm run test            # executa todos os 86 casos
npm run test:watch      # modo watch
npm run test:coverage   # relatório de cobertura
```

Cobertura atual: engines de decisão, profit, risk, autopilot-governance, validação e conector Meta.

---

## Deploy (Vercel)

```bash
vercel --prod
```

Configure as variáveis de ambiente no painel Vercel (Settings → Environment Variables).

Os crons são configurados automaticamente via `vercel.json`:
- `0 8 * * *` → `/api/check-alerts` (alertas diários 08:00 BRT)
- `0 5 * * *` → `/api/snapshot-diario` (snapshot financeiro 05:00 BRT)

---

## Variáveis de ambiente

Veja `.env.example` para a lista completa com descrições.

**Regra de segurança:** `SUPABASE_SERVICE_ROLE_KEY` e `GROQ_API_KEY` nunca devem ser expostas no browser. Todas as chamadas que usam essas chaves estão em Server Components ou API Routes.

---

## Licença

Proprietário — todos os direitos reservados.
