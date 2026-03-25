import { createServerSupabase } from "@/lib/supabase/server";
import type { AutopilotSuggestion } from "@/types/erizon-v7";

export class AutopilotRepository {
  private db = createServerSupabase();

  async saveSuggestions(
    workspaceId: string,
    campaignId: string,
    suggestions: AutopilotSuggestion[],
    metricBefore?: Record<string, number>,
  ) {
    if (!suggestions.length) return;
    const rows = suggestions.map((item) => ({
      workspace_id:    workspaceId,
      campaign_id:     campaignId,
      suggestion_type: item.suggestionType,
      title:           item.title,
      description:     item.description ?? null,
      priority:        item.priority,
      payload:         item.payload ?? null,
      status:          "pending",
      metric_before:   metricBefore ?? null,
    }));
    const { error } = await this.db.from("autopilot_suggestions").insert(rows);
    if (error) throw error;
  }

  async logExecution(input: {
    workspaceId: string;
    campaignId?: string;
    actionType: string;
    executionStatus: string;
    payload?: Record<string, unknown>;
  }) {
    const { error } = await this.db.from("autopilot_execution_logs").insert({
      workspace_id: input.workspaceId,
      campaign_id: input.campaignId ?? null,
      action_type: input.actionType,
      execution_status: input.executionStatus,
      payload: input.payload ?? null,
    });
    if (error) throw error;
  }
}
