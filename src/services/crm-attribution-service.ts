import { createServerClient } from "@supabase/ssr";
import { logger } from "@/lib/observability/logger";

/**
 * Serviço de atribuição do CRM.
 * Quando um lead fecha, registra o outcome na prediction_feedback
 * e computa ROI da campanha.
 */
export class CrmAttributionService {
  /**
   * Chamado quando lead muda para estágio 'fechado'.
   * Conecta o valor real do deal ao feedback loop da campanha.
   */
  async onLeadClosed(params: {
    supabase: ReturnType<typeof createServerClient>;
    leadId: string;
    userId: string;
    valorFechado: number;
  }): Promise<void> {
    const { supabase, leadId, userId, valorFechado } = params;
    try {
      // 1. Buscar dados do lead
      const { data: lead } = await supabase
        .from("crm_leads")
        .select("id, campanha_id, campanha_nome, cliente_id, nome")
        .eq("id", leadId)
        .eq("user_id", userId)
        .single();

      if (!lead?.campanha_id) return;

      // 2. Registrar outcome em prediction_feedback (se existir predição)
      const { data: predictions } = await supabase
        .from("prediction_feedback")
        .select("id, predicted_value, predicted_metric")
        .eq("campaign_id", lead.campanha_id)
        .is("actual_value", null)
        .limit(1);

      if (predictions?.length) {
        await supabase
          .from("prediction_feedback")
          .update({
            actual_value: valorFechado,
            actual_measured_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", predictions[0].id);
      }

      // 3. Registrar conversão na tabela de audit trail (se existir)
      await supabase.from("decision_audit_trail").update({
        outcome_actual_value: valorFechado,
        outcome_measured_at: new Date().toISOString(),
        outcome_success: true,
        updated_at: new Date().toISOString(),
      })
      .eq("campaign_id", lead.campanha_id)
      .eq("execution_status", "done");

      logger.info("Lead closed attribution recorded", {
        lead_id: leadId,
        campanha_id: lead.campanha_id,
        valor_fechado: valorFechado,
      });
    } catch (err) {
      logger.warn("crm attribution failed", { error: err, leadId });
    }
  }

  /**
   * Calcula ROI de cada campanha com base nos leads fechados.
   */
  async computeCampaignROI(params: {
    supabase: ReturnType<typeof createServerClient>;
    userId: string;
    clienteId?: string;
  }): Promise<CampaignROI[]> {
    const { supabase, userId, clienteId } = params;
    try {
      let query = supabase
        .from("crm_leads")
        .select("campanha_id, campanha_nome, plataforma, estagio, valor_fechado, created_at")
        .eq("user_id", userId);

      if (clienteId) query = query.eq("cliente_id", clienteId);

      const { data: leads } = await query;
      if (!leads?.length) return [];

      // Agrupar por campanha
      const grouped: Record<string, CampaignROI> = {};

      for (const lead of leads) {
        const key = lead.campanha_id ?? lead.campanha_nome ?? "sem-campanha";
        if (!grouped[key]) {
          grouped[key] = {
            campanha_id: lead.campanha_id,
            campanha_nome: lead.campanha_nome ?? "Sem campanha",
            plataforma: lead.plataforma ?? "manual",
            total_leads: 0,
            leads_fechados: 0,
            leads_perdidos: 0,
            valor_total: 0,
            taxa_conversao: 0,
          };
        }
        grouped[key].total_leads++;
        if (lead.estagio === "fechado") {
          grouped[key].leads_fechados++;
          grouped[key].valor_total += lead.valor_fechado ?? 0;
        }
        if (lead.estagio === "perdido") {
          grouped[key].leads_perdidos++;
        }
      }

      return Object.values(grouped)
        .map(c => ({
          ...c,
          taxa_conversao: c.total_leads > 0
            ? Math.round((c.leads_fechados / c.total_leads) * 100)
            : 0,
        }))
        .sort((a, b) => b.valor_total - a.valor_total);
    } catch (err) {
      logger.error("computeCampaignROI error", { error: err });
      return [];
    }
  }
}

export interface CampaignROI {
  campanha_id: string | null;
  campanha_nome: string;
  plataforma: string;
  total_leads: number;
  leads_fechados: number;
  leads_perdidos: number;
  valor_total: number;
  taxa_conversao: number;
}

export const crmAttributionService = new CrmAttributionService();
