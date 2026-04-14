import { createServerSupabase } from "@/lib/supabase/server";
import { CockpitService } from "@/services/cockpit-service";

const DEFAULT_BASE_URL = process.env.EVOLUTION_API_URL ?? "";
const DEFAULT_API_KEY = process.env.EVOLUTION_API_KEY ?? "";

type WhatsAppSession = {
  user_id: string;
  workspace_id: string | null;
  phone_number: string;
  instance_name: string;
  api_base_url: string | null;
  api_key: string;
  ativo: boolean;
  briefing_hora: number | null;
};

export class WhatsAppCopilotService {
  private db = createServerSupabase();

  private normalizePhone(phone: string) {
    return phone.replace(/\D/g, "");
  }

  private resolveBaseUrl(session: WhatsAppSession) {
    return (session.api_base_url || DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  private resolveApiKey(session: WhatsAppSession) {
    return session.api_key || DEFAULT_API_KEY;
  }

  private async trySend(
    url: string,
    apiKey: string,
    payload: Record<string, unknown>
  ) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }

    return { ok: response.ok, status: response.status, data: json };
  }

  async sendText(session: WhatsAppSession, text: string) {
    const baseUrl = this.resolveBaseUrl(session);
    const apiKey = this.resolveApiKey(session);
    const number = this.normalizePhone(session.phone_number);

    if (!baseUrl || !apiKey || !number || !session.instance_name) {
      throw new Error("Configuracao do WhatsApp incompleta.");
    }

    const attempts = [
      {
        url: `${baseUrl}/message/sendText/${session.instance_name}`,
        payload: { number, text, delay: 0 },
      },
      {
        url: `${baseUrl}/message/sendText`,
        payload: { instanceName: session.instance_name, number, text, delay: 0 },
      },
    ];

    let lastError = "Falha ao enviar WhatsApp.";
    for (const attempt of attempts) {
      try {
        const result = await this.trySend(attempt.url, apiKey, attempt.payload);
        if (result.ok) return result.data;
        lastError = typeof result.data === "object" && result.data && "message" in result.data
          ? String((result.data as { message?: string }).message)
          : `HTTP ${result.status}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Erro de rede";
      }
    }

    throw new Error(lastError);
  }

  async sendMorningBriefing(userId: string) {
    const session = await this.getSession(userId);
    if (!session?.ativo || !session.workspace_id) return;

    const cockpit = new CockpitService(this.db);
    const [state, networkPos] = await Promise.all([
      cockpit.getState(session.workspace_id),
      this.getNetworkPosition(session.workspace_id),
    ]);

    const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const lines = [`Bom dia. Erizon ${now}.`, ""];

    if (networkPos?.insight) {
      lines.push(`Mercado (${networkPos.nicho}): ${networkPos.insight}`);
      lines.push("");
    }

    lines.push(`Modo atual: ${state.mode}`);
    lines.push(`Decisoes pendentes: ${state.pending.length}`);
    if (state.total_impact_brl > 0) {
      lines.push(`Impacto potencial: R$${Math.round(state.total_impact_brl).toLocaleString("pt-BR")}/mes`);
    }

    if (state.pending.length > 0) {
      lines.push("");
      lines.push("Top decisoes de hoje:");
      state.pending.slice(0, 3).forEach((decision, index) => {
        const impact = decision.estimated_impact_brl
          ? ` · impacto R$${Math.abs(Math.round(decision.estimated_impact_brl)).toLocaleString("pt-BR")}`
          : "";
        lines.push(`${index + 1}. ${decision.title}${impact}`);
      });
      lines.push("");
      lines.push("Abra o Pulse para aprovar ou ignorar cada uma.");
    } else {
      lines.push("");
      lines.push("Portfolio sem fila travada. Abra o Pulse para revisar benchmark e progresso.");
    }

    await this.sendText(session, lines.join("\n"));
    await this.db
      .from("whatsapp_copilot_sessions")
      .update({ ultimo_contato: new Date().toISOString() })
      .eq("user_id", userId);
  }

  async sendTest(userId: string) {
    const session = await this.getSession(userId);
    if (!session) throw new Error("Sessao WhatsApp nao configurada.");

    return this.sendText(
      session,
      "Erizon ativo.\n\nSeu canal de WhatsApp esta configurado para receber briefings e alertas."
    );
  }

  async getSession(userId: string) {
    const { data } = await this.db
      .from("whatsapp_copilot_sessions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    return data as WhatsAppSession | null;
  }

  private async getNetworkPosition(workspaceId: string) {
    try {
      const { NetworkIntelligenceService } = await import("@/services/network-intelligence-service");
      const svc = new NetworkIntelligenceService();
      return svc.getWorkspacePosition(workspaceId);
    } catch {
      return null;
    }
  }
}
