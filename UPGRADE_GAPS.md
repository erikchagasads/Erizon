# Erizon — Upgrade: 4 Gaps Críticos

Data: 2026-04-11

## Gap 1 — Execução Autônoma Real (Meta API Write)

### O que foi feito
- **`src/app/api/meta-actions/route.ts`** — reescrito completamente:
  - Novas ações: `SCALE_BUDGET` e `REDUCE_BUDGET` (além de PAUSE, RESUME, UPDATE_BUDGET existentes)
  - Suporte a `adsetId` para execução em nível de conjunto de anúncios
  - Retry automático com backoff (até 3 tentativas) para erros de rede e rate limit
  - **Shield diário**: verifica `max_auto_actions_day` da `autopilot_configs` antes de executar
  - Audit log automático em `autopilot_execution_logs` para cada execução
  - Erros da Meta API traduzidos em mensagens claras (token expirado, permissão, parâmetro)

- **`supabase/migrations/20260411_001_autopilot_execution_shield.sql`**:
  - Tabela `autopilot_execution_logs` com RLS
  - Colunas adicionais em `autopilot_configs`: `max_auto_actions_day`, `auto_scale_budget`, `auto_reduce_budget`, `shield_max_scale_pct`, `shield_min_roas`
  - Função SQL `autopilot_actions_today(workspace_id)`

### Como usar
```typescript
// Escalar budget em 20% via cockpit
await fetch('/api/meta-actions', {
  method: 'POST',
  body: JSON.stringify({
    campaignId: 'meta_campaign_id',
    action: 'SCALE_BUDGET',
    pct: 20,
    workspaceId: 'ws-uuid',
    decisionId: 'decision-uuid',
  })
})

// Pausar adset específico
await fetch('/api/meta-actions', {
  method: 'POST',
  body: JSON.stringify({
    campaignId: 'campaign_id',
    adsetId: 'adset_id',
    action: 'PAUSE',
  })
})
```

---

## Gap 2 — Coleta de Training Data para Fine-tuning

### O que foi feito
- **`src/services/training-data-service.ts`** — novo serviço:
  - `recordFromDecision()` — decisão aprovada/executada vira exemplo de treino
  - `recordFromAgenteFeedback()` — feedback positivo/editado do agente vira exemplo gold/silver
  - `recordFromPredictionOutcome()` — predição com outcome confirmado vira exemplo calibrado
  - `exportJSONL()` — exporta no formato OpenAI fine-tuning (compatível com Anthropic também)
  - `getStats()` — stats de coleta por workspace

- **`src/services/cockpit-service.ts`** — atualizado:
  - Cada aprovação de decisão chama `TrainingDataService.recordFromDecision()` automaticamente
  - Rejeições salvas em `training_rejections` para uso futuro em DPO

- **`src/app/api/agente/feedback/route.ts`** — atualizado:
  - Feedback positivo/editado do agente coleta exemplo de treino automaticamente

- **`src/app/api/training-data/export/route.ts`** — nova rota:
  - `GET /api/training-data/export?format=jsonl&quality=silver` → download do JSONL
  - `GET /api/training-data/export?format=stats` → stats de coleta

- **`supabase/migrations/20260411_002_training_data.sql`** + **`20260411_005_training_rejections.sql`**

### Escala esperada
- Com 100 workspaces ativos: ~500 exemplos/mês (bronze)
- Com 500 workspaces: ~3.000 exemplos/mês, dos quais ~600 gold
- Com 2.000 workspaces: volume suficiente para primeiro fine-tuning proprietário

---

## Gap 3 — Referral Loop Estruturado no Produto

### O que foi feito
- **`src/app/api/referral/route.ts`** — nova API:
  - `GET` → retorna código + link + stats (clicks, signups, conversions, creditBRL)
  - `POST` → registra evento: `click`, `signup`, `paid`
  - Crédito automático de R$10 por conversão paga
  - Notificação Telegram ao referrer na conversão
  - Proteção anti-auto-referral

- **`src/app/api/referral/track/route.ts`** — tracking de cliques com cookie de 30 dias

- **`src/app/referral/page.tsx`** — página completa com:
  - Link copiável
  - Stats em tempo real
  - Mensagem pronta para compartilhar no WhatsApp/Telegram
  - Explicação do programa em 4 passos

- **`src/components/OnboardingChecklist.tsx`** — step "Indicar um gestor" adicionado
- **`src/components/Sidebar.tsx`** — link "Indicações" adicionado

- **`supabase/migrations/20260411_003_referral_loop.sql`**:
  - Tabelas: `referrals`, `referral_events`, `referral_credits`
  - RLS completo
  - Função `referral_available_credits(user_id)`

### Como integrar com Stripe
No webhook de `invoice.paid`, chamar:
```typescript
await fetch('/api/referral', {
  method: 'POST',
  body: JSON.stringify({
    referrerCode: cookieValue, // lido do cookie erizon_ref
    event: 'paid',
    referredUserId: newUserId,
  })
})
```

---

## Gap 4 — Benchmark API como Produto Externo

### O que foi feito
- **`src/app/api/public/benchmarks/route.ts`** — API pública com:
  - Auth por API Key (`x-erizon-key` header ou `?key=` query)
  - Rate limit por plano: free=100/hora, pro=1000/hora, enterprise=10000/hora
  - Filtros: `niche`, `metric` (cpl/roas/ctr/frequency/all), `period` (7d/30d/90d), `platform`, `percentile`
  - Cache com `s-maxage=3600` para reduzir carga no banco
  - Log de requests para billing e analytics

- **`src/app/api/settings/api-key-management/route.ts`** — CRUD de keys:
  - `POST` → cria key (retorna plain text UMA vez, armazena só hash SHA-256)
  - `GET` → lista keys sem revelar valor
  - `DELETE /[id]` → revoga key

- **`src/app/api-keys/page.tsx`** — dashboard de keys com exemplo de uso

- **`supabase/migrations/20260411_004_public_api_keys.sql`**:
  - Tabelas: `api_keys`, `api_key_requests`
  - RLS, limpeza automática após 90 dias
  - Função `api_key_usage_stats(user_id)`

### Exemplo de uso externo
```bash
curl https://app.erizonai.com.br/api/public/benchmarks \
  -H "x-erizon-key: erzk_live_..." \
  -G \
  -d "niche=ecommerce" \
  -d "metric=cpl,roas" \
  -d "period=30d" \
  -d "percentile=p50"
```

---

## Migrations — ordem de execução no Supabase

```
20260411_001_autopilot_execution_shield.sql
20260411_002_training_data.sql
20260411_003_referral_loop.sql
20260411_004_public_api_keys.sql
20260411_005_training_rejections.sql
```

## Variáveis de ambiente necessárias (novas)

Nenhuma nova variável obrigatória — tudo usa o que já estava no `.env.example`.
