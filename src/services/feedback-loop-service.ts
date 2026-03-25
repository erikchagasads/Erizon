import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/observability/logger";

export interface PredictionFeedback {
  id: string;
  workspace_id: string;
  decision_id: string;
  campaign_id: string;
  predicted_metric: 'roas' | 'ctr' | 'cpl' | 'frequency';
  predicted_value: number;
  predicted_confidence: number;
  actual_value?: number;
  error_pct?: number;
  confidence_adjustment?: number;
  created_at: Date;
}

export interface ModelConfidence {
  global: number;
  by_metric: Record<string, number>;
  accuracy_last_100: number;
}

export class FeedbackLoopService {
  /**
   * Registrar uma predição ANTES de executar
   */
  async recordPrediction(params: {
    workspace_id: string;
    decision_id: string;
    campaign_id: string;
    predicted_metric: 'roas' | 'ctr' | 'cpl' | 'frequency';
    predicted_value: number;
    predicted_confidence: number;
  }): Promise<PredictionFeedback> {
    try {
      const { data, error } = await supabase
        .from('prediction_feedback')
        .insert([
          {
            workspace_id: params.workspace_id,
            decision_id: params.decision_id,
            campaign_id: params.campaign_id,
            predicted_metric: params.predicted_metric,
            predicted_value: params.predicted_value,
            predicted_confidence: params.predicted_confidence,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        logger.error('Failed to record prediction', { error, params });
        throw error;
      }

      logger.info('Prediction recorded', { feedback_id: data.id });
      return data as PredictionFeedback;
    } catch (error) {
      logger.error('recordPrediction error', { error, params });
      throw error;
    }
  }

  /**
   * Registrar OUTCOME real (após 24-48h da execução)
   */
  async recordOutcome(params: {
    prediction_id: string;
    actual_value: number;
  }): Promise<{
    feedback: PredictionFeedback;
    confidence_adjustment: number;
    should_retrain: boolean;
  }> {
    try {
      // 1. Buscar predição original
      const { data: feedbackData, error: fetchError } = await supabase
        .from('prediction_feedback')
        .select('*')
        .eq('id', params.prediction_id)
        .single();

      if (fetchError || !feedbackData) {
        throw new Error(`Prediction ${params.prediction_id} not found`);
      }

      // 2. Calcular erro e novo confidence
      const error_pct =
        Math.abs(
          (feedbackData.predicted_value - params.actual_value) /
            params.actual_value
        ) * 100;

      let confidence_adjustment = 0;
      let should_retrain = false;

      if (error_pct < 10) {
        // Acertou! Aumentar confiança
        confidence_adjustment = +0.08;
        should_retrain = false;
      } else if (error_pct < 25) {
        // Razoável
        confidence_adjustment = +0.02;
        should_retrain = false;
      } else if (error_pct < 50) {
        // Errou bastante
        confidence_adjustment = -0.05;
        should_retrain = true;
      } else {
        // Erro crítico
        confidence_adjustment = -0.12;
        should_retrain = true;
      }

      // 3. Atualizar feedback com outcome
      const { data: updated, error: updateError } = await supabase
        .from('prediction_feedback')
        .update({
          actual_value: params.actual_value,
          actual_measured_at: new Date().toISOString(),
          confidence_adjustment,
          model_iteration_triggered: should_retrain,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.prediction_id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      logger.info('Prediction outcome recorded', {
        prediction_id: params.prediction_id,
        error_pct: error_pct.toFixed(2),
        confidence_adjustment,
        should_retrain,
      });

      return {
        feedback: updated as PredictionFeedback,
        confidence_adjustment,
        should_retrain,
      };
    } catch (error) {
      logger.error('recordOutcome error', { error, params });
      throw error;
    }
  }

  /**
   * Obter confiança atual do modelo
   */
  async getModelConfidence(workspace_id: string): Promise<ModelConfidence> {
    try {
      // 1. Último 100 feedbacks com outcome
      const { data: recentFeedback, error } = await supabase
        .from('prediction_feedback')
        .select('predicted_metric, error_pct, predicted_confidence')
        .eq('workspace_id', workspace_id)
        .not('actual_value', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !recentFeedback?.length) {
        // Default confidence
        return {
          global: 0.6,
          by_metric: {
            roas: 0.6,
            ctr: 0.65,
            cpl: 0.55,
            frequency: 0.7,
          },
          accuracy_last_100: 0,
        };
      }

      // 2. Calcular acurácia (% de erros < 15%)
      const accurate = recentFeedback.filter(
        (f) => (f.error_pct || 0) < 15
      ).length;
      const accuracy = (accurate / recentFeedback.length) * 100;

      // 3. Por métrica
      const by_metric: Record<string, number> = {};
      const metrics = new Set(
        recentFeedback.map((f) => f.predicted_metric)
      );

      for (const metric of metrics as Set<string>) {
        const metricFeedback = recentFeedback.filter(
          (f) => f.predicted_metric === metric
        );
        const metricAccurate = metricFeedback.filter(
          (f) => (f.error_pct || 0) < 15
        ).length;
        by_metric[metric] = (metricAccurate / metricFeedback.length) * 100;
      }

      const global_confidence = Math.min(
        0.95,
        0.5 + accuracy / 200
      );

      logger.info('Model confidence calculated', {
        workspace_id,
        global: global_confidence.toFixed(3),
        accuracy: accuracy.toFixed(1),
      });

      return {
        global: global_confidence,
        by_metric,
        accuracy_last_100: accuracy,
      };
    } catch (error) {
      logger.error('getModelConfidence error', { error, workspace_id });
      throw error;
    }
  }

  /**
   * Buscar valor real da métrica para campanha
   */
  async fetchActualMetricValue(
    campaign_id: string,
    metric: string
  ): Promise<number | null> {
    try {
      // Buscar snapshot mais recente
      const { data: snapshot, error } = await supabase
        .from('daily_snapshots')
        .select(metric)
        .eq('campaign_id', campaign_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        logger.warn('Snapshot not found', { campaign_id, metric });
        return null;
      }

      return snapshot?.[metric] || null;
    } catch (error) {
      logger.error('fetchActualMetricValue error', { error, campaign_id });
      return null;
    }
  }

  /**
   * Cron job: A cada 24h, buscar feedbacks de 7 dias atrás
   * e registrar outcomes
   */
  async processOutstandingPredictions(workspace_id?: string): Promise<{
    processed: number;
    retraining_triggered: number;
    errors: number;
  }> {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);

      let query = supabase
        .from('prediction_feedback')
        .select('id, campaign_id, decision_id, predicted_metric')
        .is('actual_value', null)
        .lt('created_at', cutoff.toISOString());

      if (workspace_id) {
        query = query.eq('workspace_id', workspace_id);
      }

      const { data: outstanding, error } = await query;

      if (error) {
        logger.error('Failed to fetch outstanding predictions', { error });
        return { processed: 0, retraining_triggered: 0, errors: 1 };
      }

      let processed = 0;
      let retraining_triggered = 0;
      let errors = 0;

      for (const prediction of outstanding || []) {
        try {
          const actualValue = await this.fetchActualMetricValue(
            prediction.campaign_id,
            prediction.predicted_metric
          );

          if (actualValue !== null) {
            const result = await this.recordOutcome({
              prediction_id: prediction.id,
              actual_value: actualValue,
            });

            processed++;
            if (result.should_retrain) {
              retraining_triggered++;
            }
          }
        } catch (err) {
          logger.error('Error processing prediction', {
            prediction_id: prediction.id,
            error: err,
          });
          errors++;
        }
      }

      logger.info('Outstanding predictions processed', {
        processed,
        retraining_triggered,
        errors,
      });

      return { processed, retraining_triggered, errors };
    } catch (error) {
      logger.error('processOutstandingPredictions error', { error });
      return { processed: 0, retraining_triggered: 0, errors: 1 };
    }
  }
}

export const feedbackLoopService = new FeedbackLoopService();
