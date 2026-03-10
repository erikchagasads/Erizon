/**
 * schemas.ts — Schemas de validação para todas as rotas de API da Erizon
 * Usa o validador nativo em src/lib/validate.ts (compatível com Zod)
 */

import { z } from "@/lib/validate";

// ─── Integrations ─────────────────────────────────────────────────────────────

export const IntegrationConnectSchema = z.object({
  workspaceId: z.string().nonempty("workspaceId obrigatório"),
  provider: z.enum(["meta_ads", "ga4", "shopify", "hotmart", "crm"] as const),
  externalAccountId: z.string().nonempty("externalAccountId obrigatório"),
  accessToken: z.string().min(10, "accessToken muito curto"),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  metadata: z.object({}).optional(),
});

// ─── Agente / Copiloto ────────────────────────────────────────────────────────

export const AgenteMessageSchema = z.object({
  mensagem: z.string().nonempty("mensagem obrigatória").max(2000, "mensagem muito longa"),
  historico: z.array(
    z.object({
      role: z.enum(["user", "assistant"] as const),
      content: z.string(),
    })
  ).optional(),
  clienteId: z.string().optional(),
});

// ─── AI routes ────────────────────────────────────────────────────────────────

export const AiAnalystSchema = z.object({
  campanhas: z.array(z.object({
    nome: z.string(),
    gasto: z.number().min(0),
    leads: z.number().min(0),
    cpl: z.number().min(0),
    ctr: z.number().min(0),
    status: z.string(),
  })).optional(),
  pergunta: z.string().nonempty().max(1000),
});

export const AiCopywriterSchema = z.object({
  produto: z.string().nonempty("produto obrigatório"),
  nicho: z.string().nonempty("nicho obrigatório"),
  objetivo: z.enum(["lead", "compra", "remarketing"] as const),
  formato: z.enum(["UGC", "Estático", "Storytelling", "Demo"] as const).optional(),
  hookType: z.enum(["Pergunta", "Prova social", "Oferta", "Autoridade"] as const).optional(),
  instrucoes: z.string().optional(),
});

export const AiReportSchema = z.object({
  clienteId: z.string().nonempty(),
  periodo: z.enum(["7d", "14d", "30d"] as const).optional(),
  incluirRecomendacoes: z.boolean().optional(),
});

export const AiRoteiristSchema = z.object({
  produto: z.string().nonempty(),
  duracao: z.enum(["0-8s", "9-12s", "13-20s", "20s+"] as const),
  hook: z.string().nonempty(),
  cta: z.string().optional(),
  formato: z.enum(["UGC", "Storytelling", "Demo"] as const).optional(),
});

// ─── Meta Actions ─────────────────────────────────────────────────────────────

export const MetaActionSchema = z.object({
  campanha_id: z.string().nonempty("campanha_id obrigatório"),
  acao: z.enum(["pausar", "ativar", "aumentar_orcamento", "reduzir_orcamento"] as const),
  valor: z.number().min(0).max(100).optional(), // porcentagem para ajuste de orçamento
  motivo: z.string().optional(),
});

export const MetaValidateSchema = z.object({
  access_token: z.string().min(10, "token muito curto"),
  account_id: z.string().nonempty("account_id obrigatório"),
});

// ─── Telegram Alert ───────────────────────────────────────────────────────────

export const TelegramAlertSchema = z.object({
  chat_id: z.string().nonempty(),
  mensagem: z.string().nonempty().max(4096),
  parse_mode: z.enum(["Markdown", "HTML"] as const).optional(),
});

// ─── Clientes ─────────────────────────────────────────────────────────────────

export const ClienteSchema = z.object({
  nome: z.string().nonempty("nome obrigatório").max(120),
  meta_account_id: z.string().optional(),
  nicho: z.string().optional(),
  cpl_alvo: z.number().min(0).optional(),
  ativo: z.boolean().optional(),
});

// ─── Campanhas vincular ───────────────────────────────────────────────────────

export const CampanhaVincularSchema = z.object({
  campanha_id: z.string().nonempty(),
  cliente_id: z.string().nonempty(),
});

// ─── Snapshot / Autopilot ─────────────────────────────────────────────────────

export const SnapshotQuerySchema = z.object({
  workspaceId: z.string().optional(),
  source: z.enum(["mock", "supabase"] as const).optional(),
});

// ─── Relatorio PDF ────────────────────────────────────────────────────────────

export const RelatorioPdfSchema = z.object({
  clienteId: z.string().nonempty(),
  periodo: z.enum(["7d", "14d", "30d", "90d"] as const).optional(),
  formato: z.enum(["executivo", "completo"] as const).optional(),
});
