/**
 * Telegram Copilot Service
 * Gestão de campanhas pelo Telegram — briefing matinal + aprovação de decisões.
 */
import { createServerSupabase } from "@/lib/supabase/server";
import { CockpitService } from "@/services/cockpit-service";

const TELEGRAM_API = "https://api.telegram.org";

type TelegramMessage = {
  message_id: number;
  chat: { id: number; first_name?: string };
  text?: string;
};

type TelegramCallbackQuery = {
  id: string;
  from: { id: number; first_name?: string };
  message?: { message_id: number; chat: { id: number } };
  data?: string;  // payload: "approve:DECISION_ID" | "reject:DECISION_ID" | "status"
};

export class TelegramCopilotService {
  private db = createServerSupabase();
  private token = process.env.TELEGRAM_BOT_TOKEN!;

  // ── Envio de mensagens ───────────────────────────────────────────────────

  private async sendMessage(chatId: string | number, text: string, options?: {
    parse_mode?: string;
    reply_markup?: object;
  }) {
    const res = await fetch(`${TELEGRAM_API}/bot${this.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", ...options }),
    });
    return res.json();
  }

  private async answerCallback(callbackId: string, text?: string) {
    await fetch(`${TELEGRAM_API}/bot${this.token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackId, text }),
    });
  }

  // ── Briefing matinal ─────────────────────────────────────────────────────

  async sendMorningBriefing(userId: string): Promise<void> {
    const session = await this.getSession(userId);
    if (!session?.ativo || !session.chat_id || !session.workspace_id) return;

    const cockpit = new CockpitService(this.db);
    const [state, networkPos] = await Promise.all([
      cockpit.getState(session.workspace_id),
      this.getNetworkPosition(session.workspace_id),
    ]);

    const { pending } = state;

    // Monta o briefing
    const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    let text = `🌅 *Bom dia! Erizon — ${now}*\n\n`;

    // Posição na rede
    if (networkPos) {
      text += `🌐 *Rede (${networkPos.nicho}):* ${networkPos.insight}\n\n`;
    }

    if (pending.length === 0) {
      text += `✅ *Nenhuma ação pendente* — portfólio saudável.\n\n`;
      text += `📱 Acesse o painel para detalhes: /status`;
    } else {
      text += `⚡ *${pending.length} decisão${pending.length > 1 ? "ões" : ""} aguardando sua aprovação:*\n\n`;

      // Lista as primeiras 3 decisões
      const toShow = pending.slice(0, 3);
      for (let i = 0; i < toShow.length; i++) {
        const d = toShow[i];
        const emoji = d.action_type === "pause" ? "⏸️" : d.action_type === "scale_budget" ? "📈" : "🔄";
        text += `${i + 1}. ${emoji} *${d.campaign_name}*\n`;
        text += `   ${d.title}\n`;
        if (d.estimated_impact_brl) {
          text += `   Impacto: R$${Math.abs(Math.round(d.estimated_impact_brl))}/mês\n`;
        }
        text += "\n";
      }

      if (pending.length > 3) text += `_...e mais ${pending.length - 3} decisões no painel._\n\n`;
      text += `Responda com o número para decidir ou acesse o painel.`;
    }

    // Inline keyboard para as primeiras 3 decisões
    const inlineKeyboard = pending.slice(0, 3).flatMap((d, i) => [{
      text: `${i + 1}. ✅ Aprovar`,
      callback_data: `approve:${d.id}`,
    }, {
      text: `${i + 1}. ❌ Ignorar`,
      callback_data: `reject:${d.id}`,
    }]);

    const replyMarkup = pending.length > 0 ? {
      inline_keyboard: inlineKeyboard.reduce((rows: object[][], btn, i) => {
        if (i % 2 === 0) rows.push([btn]);
        else rows[rows.length - 1].push(btn);
        return rows;
      }, []),
    } : undefined;

    await this.sendMessage(session.chat_id, text, { reply_markup: replyMarkup });

    // Atualiza último contato
    await this.db.from("telegram_copilot_sessions")
      .update({ ultimo_contato: new Date().toISOString() })
      .eq("user_id", userId);
  }

  // ── Processamento de webhook ─────────────────────────────────────────────

  async processWebhook(body: {
    message?: TelegramMessage;
    callback_query?: TelegramCallbackQuery;
  }): Promise<void> {
    // Callback de botão inline (aprovar/rejeitar)
    if (body.callback_query) {
      await this.handleCallback(body.callback_query);
      return;
    }

    // Mensagem de texto
    if (body.message?.text) {
      await this.handleMessage(body.message);
    }
  }

  private async handleCallback(cb: TelegramCallbackQuery) {
    const chatId = cb.message?.chat.id ?? cb.from.id;
    const data   = cb.data ?? "";

    // Resolve userId pelo chat_id
    const session = await this.getSessionByChatId(String(chatId));
    if (!session) {
      await this.answerCallback(cb.id, "Sessão não encontrada.");
      return;
    }

    const [action, decisionId] = data.split(":");
    const cockpit = new CockpitService(this.db);

    if (action === "approve" && decisionId) {
      try {
        await cockpit.approve(decisionId, session.user_id, "");
        await this.answerCallback(cb.id, "✅ Aprovado!");
        await this.sendMessage(chatId, "✅ Decisão aprovada. Acesse o painel para executar via Meta Ads.");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_err) {
        await this.answerCallback(cb.id, "Erro ao aprovar.");
        await this.sendMessage(chatId, "❌ Erro ao aprovar a ação. Verifique no painel.");
      }
    } else if (action === "reject" && decisionId) {
      await cockpit.reject(decisionId, session.user_id);
      await this.answerCallback(cb.id, "❌ Ignorado.");
      await this.sendMessage(chatId, "❌ Decisão ignorada.");
    } else if (data === "status") {
      await this.sendStatus(chatId, session.workspace_id);
    }
  }

  private async handleMessage(msg: TelegramMessage) {
    const chatId = msg.chat.id;
    const text   = msg.text?.trim() ?? "";

    // Verifica se é o comando /start ou /conectar
    if (text.startsWith("/start")) {
      await this.sendMessage(chatId,
        `👋 Olá! Sou o Copiloto Erizon.\n\nPara ativar o briefing matinal, acesse as configurações do Erizon → Notificações → WhatsApp/Telegram e informe o seu Chat ID: \`${chatId}\`\n\nFunções disponíveis:\n/status — Resumo do portfólio\n/decisoes — Decisões pendentes`
      );
      return;
    }

    if (text === "/status") {
      const session = await this.getSessionByChatId(String(chatId));
      if (session) await this.sendStatus(chatId, session.workspace_id);
      else await this.sendMessage(chatId, "⚠️ Conta não conectada. Configure nas notificações do Erizon.");
      return;
    }

    if (text === "/decisoes") {
      const session = await this.getSessionByChatId(String(chatId));
      if (!session) {
        await this.sendMessage(chatId, "⚠️ Conta não conectada.");
        return;
      }
      const cockpit = new CockpitService(this.db);
      const state = await cockpit.getState(session.workspace_id);
      if (!state.pending.length) {
        await this.sendMessage(chatId, "✅ Nenhuma decisão pendente.");
        return;
      }
      await this.sendMorningBriefing(session.user_id);
      return;
    }

    // Resposta numérica (1, 2, 3) — futuro: seleciona decisão pelo número
    const num = parseInt(text);
    if (!isNaN(num) && num >= 1 && num <= 3) {
      await this.sendMessage(chatId, `Use os botões nas mensagens anteriores para aprovar ou ignorar as decisões. Ou acesse o painel Erizon.`);
    }
  }

  private async sendStatus(chatId: number, workspaceId: string) {
    const cockpit = new CockpitService(this.db);
    const state = await cockpit.getState(workspaceId);
    const { pending, mode } = state;

    const modeEmoji = mode === "ALERTA" ? "🚨" : mode === "DECISÃO" ? "⚡" : "✅";
    let text = `${modeEmoji} *Status do portfólio: ${mode}*\n\n`;
    text += `📋 Decisões pendentes: ${pending.length}\n`;
    if (state.total_impact_brl > 0) {
      text += `💰 Impacto estimado: R$${Math.round(state.total_impact_brl).toLocaleString("pt-BR")}/mês\n`;
    }

    await this.sendMessage(chatId, text, {
      reply_markup: {
        inline_keyboard: [[{ text: "📋 Ver decisões", callback_data: "status" }]],
      },
    });
  }

  // ── Notificações de funil ────────────────────────────────────────────────

  async notificarEventoFunil(params: {
    chatId: string | number;
    eventType: string;
    value?: number | null;
    platform?: string | null;
    campaign?: string | null;
    customerEmail?: string | null;
  }): Promise<void> {
    if (!this.token) {
      console.warn("[telegram-copilot] TELEGRAM_BOT_TOKEN não configurado — notificação ignorada.");
      return;
    }

    const { chatId, eventType, value, platform, campaign, customerEmail } = params;

    let text = "";

    // Mascara e-mail: cli****@gmail.com
    const maskedEmail = customerEmail
      ? customerEmail.replace(/^(.{3}).*(@.+)$/, "$1****$2")
      : null;

    switch (eventType) {
      case "purchase": {
        const valueStr = value != null
          ? `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
          : "";
        text = `🛒 *Nova Compra*${valueStr ? ` — ${valueStr}` : ""}\n`;
        if (platform) text += `Plataforma: ${platform}\n`;
        if (campaign) text += `Campanha: ${campaign}\n`;
        if (maskedEmail) text += `Cliente: ${maskedEmail}\n`;
        break;
      }
      case "abandoned_cart": {
        text = `⚠️ *Carrinho Abandonado*\n`;
        if (platform) text += `Plataforma: ${platform}\n`;
        if (maskedEmail) text += `Cliente: ${maskedEmail}\n`;
        if (campaign) text += `Campanha: ${campaign}\n`;
        break;
      }
      case "lead": {
        text = `🎯 *Novo Lead*\n`;
        if (platform) text += `Plataforma: ${platform}\n`;
        if (maskedEmail) text += `E-mail: ${maskedEmail}\n`;
        if (campaign) text += `Campanha: ${campaign}\n`;
        break;
      }
      case "refund": {
        const valueStr = value != null
          ? `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
          : "";
        text = `↩️ *Reembolso*${valueStr ? ` — ${valueStr}` : ""}\n`;
        if (platform) text += `Plataforma: ${platform}\n`;
        if (campaign) text += `Campanha: ${campaign}\n`;
        break;
      }
      case "subscription": {
        text = `🔔 *Nova Assinatura*\n`;
        if (platform) text += `Plataforma: ${platform}\n`;
        if (maskedEmail) text += `Cliente: ${maskedEmail}\n`;
        break;
      }
      case "subscription_cancel": {
        text = `🔕 *Assinatura Cancelada*\n`;
        if (platform) text += `Plataforma: ${platform}\n`;
        if (maskedEmail) text += `Cliente: ${maskedEmail}\n`;
        break;
      }
      case "appointment": {
        text = `📅 *Novo Agendamento*\n`;
        if (platform) text += `Plataforma: ${platform}\n`;
        if (maskedEmail) text += `Cliente: ${maskedEmail}\n`;
        break;
      }
      default: {
        const label = eventType.charAt(0).toUpperCase() + eventType.slice(1).replace(/_/g, " ");
        text = `📌 *${label}*\n`;
        if (platform) text += `Plataforma: ${platform}\n`;
        if (campaign) text += `Campanha: ${campaign}\n`;
        if (maskedEmail) text += `Cliente: ${maskedEmail}\n`;
      }
    }

    await this.sendMessage(chatId, text.trimEnd());
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async getSession(userId: string) {
    const { data } = await this.db
      .from("telegram_copilot_sessions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return data;
  }

  private async getSessionByChatId(chatId: string) {
    const { data } = await this.db
      .from("telegram_copilot_sessions")
      .select("*")
      .eq("chat_id", chatId)
      .eq("ativo", true)
      .maybeSingle();
    return data;
  }

  private async getNetworkPosition(workspaceId: string) {
    try {
      const { NetworkIntelligenceService } = await import("@/services/network-intelligence-service");
      const svc = new NetworkIntelligenceService();
      return svc.getWorkspacePosition(workspaceId);
    } catch { return null; }
  }
}
