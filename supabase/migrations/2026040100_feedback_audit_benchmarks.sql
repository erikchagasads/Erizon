-- supabase/migrations/20260401_000_feedback_audit_benchmarks.sql

-- Tabela para feedback de predições
CREATE TABLE IF NOT EXISTS prediction_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Prediction data
  predicted_metric VARCHAR(50) NOT NULL, -- 'roas', 'ctr', 'cpl', 'frequency'
  predicted_value FLOAT NOT NULL,
  predicted_confidence FLOAT NOT NULL DEFAULT 0.5, -- 0-1
  
  -- Actual outcome (filled later)
  actual_value FLOAT,
  actual_measured_at TIMESTAMP,
  
  -- Learning metrics
  error_pct FLOAT,
  confidence_adjustment FLOAT DEFAULT 0,
  model_iteration_triggered BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prediction_feedback_workspace ON prediction_feedback(workspace_id);
CREATE INDEX idx_prediction_feedback_campaign ON prediction_feedback(campaign_id);
CREATE INDEX idx_prediction_feedback_unmeasured ON prediction_feedback(actual_value) 
  WHERE actual_value IS NULL;
CREATE INDEX idx_prediction_feedback_created ON prediction_feedback(created_at);

-- Tabela de audit trail completo de decisões
CREATE TABLE IF NOT EXISTS decision_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Input Context
  input_snapshot JSONB NOT NULL,
  input_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Processing/Reasoning
  reasoning_anomaly_score FLOAT,
  reasoning_confidence FLOAT,
  reasoning_factors JSONB DEFAULT '[]'::jsonb,
  
  -- Decision
  decision_action VARCHAR(100) NOT NULL,
  decision_impact_estimated FLOAT,
  decision_explanation JSONB,
  
  -- Approval
  approval_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'auto'
  approval_by_user_id UUID,
  approval_at TIMESTAMP,
  approval_notes TEXT,
  
  -- Execution
  execution_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'executing', 'done', 'failed'
  execution_started_at TIMESTAMP,
  execution_completed_at TIMESTAMP,
  execution_error TEXT,
  
  -- Outcome
  outcome_actual_value FLOAT,
  outcome_measured_at TIMESTAMP,
  outcome_success BOOLEAN,
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_trail_workspace ON decision_audit_trail(workspace_id);
CREATE INDEX idx_audit_trail_campaign ON decision_audit_trail(campaign_id);
CREATE INDEX idx_audit_trail_approval ON decision_audit_trail(approval_status);
CREATE INDEX idx_audit_trail_execution ON decision_audit_trail(execution_status);
CREATE INDEX idx_audit_trail_created ON decision_audit_trail(created_at);

-- Tabela de benchmarks (padrões anônimos entre clientes)
CREATE TABLE IF NOT EXISTS benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry VARCHAR(100) NOT NULL,
  audience_type VARCHAR(100) NOT NULL,
  
  -- Dados agregados
  data JSONB NOT NULL,
  sample_size INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_benchmark UNIQUE(industry, audience_type)
);

CREATE INDEX idx_benchmarks_industry ON benchmarks(industry);
CREATE INDEX idx_benchmarks_audience ON benchmarks(audience_type);
CREATE INDEX idx_benchmarks_updated ON benchmarks(updated_at);

-- Tabela para histórico de confiança do modelo
CREATE TABLE IF NOT EXISTS model_confidence_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  metric_type VARCHAR(50), -- NULL = global, ou 'roas', 'ctr', 'cpl'
  confidence_score FLOAT NOT NULL,
  accuracy_pct FLOAT,
  sample_size INT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_model_confidence_workspace ON model_confidence_history(workspace_id);
CREATE INDEX idx_model_confidence_metric ON model_confidence_history(metric_type);
CREATE INDEX idx_model_confidence_created ON model_confidence_history(created_at);

-- Habilitar RLS
ALTER TABLE prediction_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_confidence_history ENABLE ROW LEVEL SECURITY;

-- Policies para prediction_feedback
CREATE POLICY "Users can view own workspace feedback"
  ON prediction_feedback
  FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM workspaces 
    WHERE auth.uid() = owner_id
  ));

CREATE POLICY "System can insert feedback"
  ON prediction_feedback
  FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT id FROM workspaces 
    WHERE auth.uid() = owner_id
  ));

-- Policies para audit trail
CREATE POLICY "Users can view own workspace audit trail"
  ON decision_audit_trail
  FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM workspaces 
    WHERE auth.uid() = owner_id
  ));

CREATE POLICY "System can insert audit trail"
  ON decision_audit_trail
  FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT id FROM workspaces 
    WHERE auth.uid() = owner_id
  ));

CREATE POLICY "Users can update own audit trail"
  ON decision_audit_trail
  FOR UPDATE
  USING (workspace_id IN (
    SELECT id FROM workspaces 
    WHERE auth.uid() = owner_id
  ));

-- Policies para benchmarks (público para read, admin para write)
CREATE POLICY "Anyone can read benchmarks"
  ON benchmarks
  FOR SELECT
  USING (true);

CREATE POLICY "Only system can write benchmarks"
  ON benchmarks
  FOR INSERT
  WITH CHECK (false);

-- Policies para model confidence
CREATE POLICY "Users can view own workspace confidence"
  ON model_confidence_history
  FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM workspaces 
    WHERE auth.uid() = owner_id
  ));

CREATE POLICY "System can insert confidence history"
  ON model_confidence_history
  FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT id FROM workspaces 
    WHERE auth.uid() = owner_id
  ));
