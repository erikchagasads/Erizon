import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/observability/logger";
import { ExplainableDecision } from "./explainability-service";

export interface AuditTrailEntry {
  id: string;
  workspace_id: string;
  decision_id: string;
  campaign_id: string;
  input_snapshot: Record<string, unknown>;
  input_rules: Record<string, unknown>[];
  reasoning_anomaly_score?: number;
  reasoning_confidence?: number;
  reasoning_factors?: Array<{ factor: string; score: number }>;
  decision_action: string;
  decision_impact_estimated: number;
  decision_explanation?: ExplainableDecision;
  approval_status: 'pending' | 'approved' | 'rejected' | 'auto';
  approval_by_user_id?: string;
  approval_at?: Date;
  approval_notes?: string;
  execution_status: 'pending' | 'executing' | 'done' | 'failed';
  execution_started_at?: Date;
  execution_completed_at?: Date;
  execution_error?: string;
  outcome_actual_value?: number;
  outcome_measured_at?: Date;
  outcome_success?: boolean;
  created_at: Date;
  updated_at: Date;
}

export class AuditTrailService {
  /**
   * Registrar decisão COM contexto completo
   */
  async logDecision(params: {
    workspace_id: string;
    decision_id: string;
    campaign_id: string;
    campaign_snapshot: Record<string, unknown>;
    applied_rules: Record<string, unknown>[];
    anomaly_analysis?: {
      score: number;
      factors: Array<{ factor: string; score: number }>;
    };
    reasoning: {
      anomaly_score: number;
      confidence: number;
      factors: Array<{ factor: string; score: number }>;
    };
    decision: {
      action: string;
      impact_estimated: number;
    };
    explanation?: ExplainableDecision;
    auto_approved: boolean;
  }): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('decision_audit_trail')
        .insert([
          {
            workspace_id: params.workspace_id,
            decision_id: params.decision_id,
            campaign_id: params.campaign_id,
            input_snapshot: params.campaign_snapshot,
            input_rules: params.applied_rules,
            reasoning_anomaly_score: params.reasoning.anomaly_score,
            reasoning_confidence: params.reasoning.confidence,
            reasoning_factors: params.reasoning.factors,
            decision_action: params.decision.action,
            decision_impact_estimated: params.decision.impact_estimated,
            decision_explanation: params.explanation,
            approval_status: params.auto_approved ? 'auto' : 'pending',
            execution_status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select('id')
        .single();

      if (error) {
        logger.error('Failed to log decision audit trail', { error, params });
        throw error;
      }

      logger.info('Decision audit trail logged', {
        audit_id: data.id,
        campaign_id: params.campaign_id,
        action: params.decision.action,
      });

      return data.id;
    } catch (error) {
      logger.error('logDecision error', { error, params });
      throw error;
    }
  }

  /**
   * Aprovar ou rejeitar decisão
   */
  async approveDecision(params: {
    audit_trail_id: string;
    approved: boolean;
    user_id: string;
    notes?: string;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('decision_audit_trail')
        .update({
          approval_status: params.approved ? 'approved' : 'rejected',
          approval_by_user_id: params.user_id,
          approval_at: new Date().toISOString(),
          approval_notes: params.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.audit_trail_id);

      if (error) {
        throw error;
      }

      logger.info('Decision approval recorded', {
        audit_id: params.audit_trail_id,
        status: params.approved ? 'approved' : 'rejected',
      });
    } catch (error) {
      logger.error('approveDecision error', { error, params });
      throw error;
    }
  }

  /**
   * Registrar que execução começou
   */
  async markExecutionStarted(audit_trail_id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('decision_audit_trail')
        .update({
          execution_status: 'executing',
          execution_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', audit_trail_id);

      if (error) throw error;

      logger.info('Execution started', { audit_id: audit_trail_id });
    } catch (error) {
      logger.error('markExecutionStarted error', { error, audit_trail_id });
      throw error;
    }
  }

  /**
   * Registrar conclusão bem-sucedida
   */
  async markExecutionCompleted(params: {
    audit_trail_id: string;
    success: boolean;
    error?: string;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('decision_audit_trail')
        .update({
          execution_status: params.success ? 'done' : 'failed',
          execution_completed_at: new Date().toISOString(),
          execution_error: params.error,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.audit_trail_id);

      if (error) throw error;

      logger.info('Execution completed', {
        audit_id: params.audit_trail_id,
        success: params.success,
        error: params.error,
      });
    } catch (error) {
      logger.error('markExecutionCompleted error', { error, params });
      throw error;
    }
  }

  /**
   * Registrar outcome real
   */
  async recordOutcome(params: {
    audit_trail_id: string;
    actual_value: number;
    success: boolean;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('decision_audit_trail')
        .update({
          outcome_actual_value: params.actual_value,
          outcome_measured_at: new Date().toISOString(),
          outcome_success: params.success,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.audit_trail_id);

      if (error) throw error;

      logger.info('Outcome recorded', {
        audit_id: params.audit_trail_id,
        actual_value: params.actual_value,
        success: params.success,
      });
    } catch (error) {
      logger.error('recordOutcome error', { error, params });
      throw error;
    }
  }

  /**
   * Obter trilha completa de uma decisão
   */
  async getDecisionTrail(audit_trail_id: string): Promise<AuditTrailEntry | null> {
    try {
      const { data, error } = await supabase
        .from('decision_audit_trail')
        .select('*')
        .eq('id', audit_trail_id)
        .single();

      if (error) {
        logger.warn('Audit trail not found', { audit_trail_id });
        return null;
      }

      return this.formatTrailForResponse(data);
    } catch (error) {
      logger.error('getDecisionTrail error', { error, audit_trail_id });
      return null;
    }
  }

  /**
   * Listar decisões de uma campanha
   */
  async listDecisionTrails(params: {
    campaign_id: string;
    limit?: number;
  }): Promise<AuditTrailEntry[]> {
    try {
      const limit = params.limit || 50;

      const { data, error } = await supabase
        .from('decision_audit_trail')
        .select('*')
        .eq('campaign_id', params.campaign_id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Failed to list decision trails', { error, params });
        return [];
      }

      return (data || []).map((d) => this.formatTrailForResponse(d));
    } catch (error) {
      logger.error('listDecisionTrails error', { error, params });
      return [];
    }
  }

  /**
   * Buscar todas decisões pendentes de aprovação
   */
  async listPendingApprovals(workspace_id: string): Promise<AuditTrailEntry[]> {
    try {
      const { data, error } = await supabase
        .from('decision_audit_trail')
        .select('*')
        .eq('workspace_id', workspace_id)
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        logger.error('Failed to list pending approvals', { error });
        return [];
      }

      return (data || []).map((d) => this.formatTrailForResponse(d));
    } catch (error) {
      logger.error('listPendingApprovals error', { error, workspace_id });
      return [];
    }
  }

  /**
   * Formatar dados para resposta
   */
  private formatTrailForResponse(data: Record<string, unknown>): AuditTrailEntry {
    return {
      id: String(data.id),
      workspace_id: String(data.workspace_id),
      decision_id: String(data.decision_id),
      campaign_id: String(data.campaign_id),
      input_snapshot: (data.input_snapshot as Record<string, unknown>) ?? {},
      input_rules: (data.input_rules as Record<string, unknown>[]) ?? [],
      reasoning_anomaly_score: data.reasoning_anomaly_score as number | undefined,
      reasoning_confidence: data.reasoning_confidence as number | undefined,
      reasoning_factors: data.reasoning_factors as Array<{ factor: string; score: number }> | undefined,
      decision_action: String(data.decision_action),
      decision_impact_estimated: Number(data.decision_impact_estimated ?? 0),
      decision_explanation: data.decision_explanation as ExplainableDecision | undefined,
      approval_status: data.approval_status as AuditTrailEntry["approval_status"],
      approval_by_user_id: data.approval_by_user_id as string | undefined,
      approval_at: data.approval_at ? new Date(String(data.approval_at)) : undefined,
      approval_notes: data.approval_notes as string | undefined,
      execution_status: data.execution_status as AuditTrailEntry["execution_status"],
      execution_started_at: data.execution_started_at
        ? new Date(String(data.execution_started_at))
        : undefined,
      execution_completed_at: data.execution_completed_at
        ? new Date(String(data.execution_completed_at))
        : undefined,
      execution_error: data.execution_error as string | undefined,
      outcome_actual_value: data.outcome_actual_value as number | undefined,
      outcome_measured_at: data.outcome_measured_at
        ? new Date(String(data.outcome_measured_at))
        : undefined,
      outcome_success: data.outcome_success as boolean | undefined,
      created_at: new Date(String(data.created_at)),
      updated_at: new Date(String(data.updated_at)),
    };
  }
}

export const auditTrailService = new AuditTrailService();
