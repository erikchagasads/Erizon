-- ─────────────────────────────────────────────────────────────────────────────
-- ENA Feedback Loop — Fase 2
-- Avaliação automática de outcomes das sugestões do autopilot
-- ─────────────────────────────────────────────────────────────────────────────

-- RPC: avalia outcomes de sugestões já decididas
-- Chamada pelo cron do autopilot após cada ciclo
CREATE OR REPLACE FUNCTION ena_evaluate_suggestion_outcomes(p_workspace_id uuid)
RETURNS TABLE (evaluated_count int, improved_count int)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r             record;
  snap          record;
  v_count       int := 0;
  v_improved    int := 0;
  before_cpl    numeric;
  before_roas   numeric;
  outcome_val   text;
BEGIN
  -- Avalia outcome_7d: sugestões decididas há >= 7 dias sem outcome ainda
  FOR r IN
    SELECT s.id, s.campaign_id, s.metric_before, s.decided_at, s.suggestion_type
    FROM   autopilot_suggestions s
    WHERE  s.workspace_id  = p_workspace_id
      AND  s.decision      = 'applied'
      AND  s.outcome_7d    = 'pending'
      AND  s.decided_at   <= now() - interval '7 days'
  LOOP
    SELECT spend, revenue, leads, cpl, roas
    INTO   snap
    FROM   campaign_snapshots_daily
    WHERE  campaign_id   = r.campaign_id
      AND  snapshot_date > r.decided_at::date
    ORDER  BY snapshot_date DESC
    LIMIT  1;

    IF snap IS NULL THEN CONTINUE; END IF;

    before_cpl  := (r.metric_before->>'cpl')::numeric;
    before_roas := (r.metric_before->>'roas')::numeric;
    outcome_val := 'neutral';

    IF r.suggestion_type = 'scale_budget' THEN
      outcome_val := CASE
        WHEN before_roas > 0 AND snap.roas >= before_roas * 1.05 THEN 'improved'
        WHEN before_roas > 0 AND snap.roas <= before_roas * 0.90 THEN 'degraded'
        ELSE 'neutral'
      END;
    ELSE
      outcome_val := CASE
        WHEN before_cpl > 0 AND snap.cpl <= before_cpl * 0.95 THEN 'improved'
        WHEN before_cpl > 0 AND snap.cpl >= before_cpl * 1.10 THEN 'degraded'
        ELSE 'neutral'
      END;
    END IF;

    UPDATE autopilot_suggestions
    SET
      outcome_7d       = outcome_val,
      metric_after_7d  = jsonb_build_object(
        'cpl',   snap.cpl,
        'roas',  snap.roas,
        'spend', snap.spend,
        'leads', snap.leads
      )
    WHERE id = r.id;

    v_count    := v_count + 1;
    IF outcome_val = 'improved' THEN v_improved := v_improved + 1; END IF;
  END LOOP;

  -- Avalia outcome_14d
  FOR r IN
    SELECT s.id, s.campaign_id, s.metric_before, s.decided_at, s.suggestion_type
    FROM   autopilot_suggestions s
    WHERE  s.workspace_id   = p_workspace_id
      AND  s.decision       = 'applied'
      AND  s.outcome_14d    = 'pending'
      AND  s.decided_at    <= now() - interval '14 days'
  LOOP
    SELECT spend, revenue, leads, cpl, roas
    INTO   snap
    FROM   campaign_snapshots_daily
    WHERE  campaign_id   = r.campaign_id
      AND  snapshot_date > r.decided_at::date + interval '7 days'
    ORDER  BY snapshot_date DESC
    LIMIT  1;

    IF snap IS NULL THEN CONTINUE; END IF;

    before_cpl  := (r.metric_before->>'cpl')::numeric;
    before_roas := (r.metric_before->>'roas')::numeric;
    outcome_val := 'neutral';

    IF r.suggestion_type = 'scale_budget' THEN
      outcome_val := CASE
        WHEN before_roas > 0 AND snap.roas >= before_roas * 1.05 THEN 'improved'
        WHEN before_roas > 0 AND snap.roas <= before_roas * 0.90 THEN 'degraded'
        ELSE 'neutral'
      END;
    ELSE
      outcome_val := CASE
        WHEN before_cpl > 0 AND snap.cpl <= before_cpl * 0.95 THEN 'improved'
        WHEN before_cpl > 0 AND snap.cpl >= before_cpl * 1.10 THEN 'degraded'
        ELSE 'neutral'
      END;
    END IF;

    UPDATE autopilot_suggestions
    SET
      outcome_14d       = outcome_val,
      metric_after_14d  = jsonb_build_object(
        'cpl',   snap.cpl,
        'roas',  snap.roas,
        'spend', snap.spend,
        'leads', snap.leads
      )
    WHERE id = r.id;
  END LOOP;

  RETURN QUERY SELECT v_count, v_improved;
END;
$$;
