"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, MessageSquare, X, Zap } from "lucide-react";

type PredictiveAnomalyAlert = {
  id: string;
  campaign_id?: string | null;
  campaign_name?: string | null;
  alert_type?: string | null;
  confidence?: number | null;
  predicted_metric?: string | null;
  predicted_delta_pct?: number | null;
  predicted_window_hours?: number | null;
  preventive_action?: string | null;
  predicted_at?: string | null;
};

type PredictiveAnomalyResponse = {
  ok?: boolean;
  alerts?: PredictiveAnomalyAlert[];
  error?: string;
};

function formatMetric(metric?: string | null): string {
  const map: Record<string, string> = {
    cpl: "CPL",
    roas: "ROAS",
    ctr: "CTR",
    frequency: "frequência",
    spend: "gasto",
    leads: "leads",
  };
  return metric ? map[metric] ?? metric : "métrica";
}

function getSeverity(alert: PredictiveAnomalyAlert): "critico" | "alto" {
  const confidence = alert.confidence ?? 0;
  const delta = Math.abs(alert.predicted_delta_pct ?? 0);
  return confidence >= 0.78 || delta >= 80 ? "critico" : "alto";
}

function buildPrompt(alert: PredictiveAnomalyAlert): string {
  const metric = formatMetric(alert.predicted_metric);
  const campanha = alert.campaign_name ?? alert.campaign_id ?? "campanha sem nome";
  const delta = alert.predicted_delta_pct != null
    ? `${Math.round(alert.predicted_delta_pct)}%`
    : "variação relevante";
  const janela = alert.predicted_window_hours ?? 24;

  return [
    `Anomalia crítica detectada na campanha "${campanha}".`,
    `Métrica afetada: ${metric}.`,
    `Variação prevista: ${delta} nas próximas ${janela}h.`,
    `Confiança do alerta: ${Math.round((alert.confidence ?? 0) * 100)}%.`,
    alert.preventive_action ? `Ação preventiva sugerida pelo motor: ${alert.preventive_action}.` : "",
    "Explique a causa provável em português claro, verifique os dados disponíveis e me dê um plano de ação seguro.",
  ].filter(Boolean).join("\n");
}

export default function AnomalyAlert() {
  const [alerts, setAlerts] = useState<PredictiveAnomalyAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const activeAlert = useMemo(() => {
    return alerts
      .filter(alert => !dismissed.has(alert.id))
      .sort((a, b) => {
        const severityDiff = (getSeverity(b) === "critico" ? 1 : 0) - (getSeverity(a) === "critico" ? 1 : 0);
        if (severityDiff !== 0) return severityDiff;
        return (b.confidence ?? 0) - (a.confidence ?? 0);
      })[0] ?? null;
  }, [alerts, dismissed]);

  const carregarAlertas = useCallback(async () => {
    try {
      const res = await fetch("/api/intelligence/predict-anomalies", { cache: "no-store" });
      if (!res.ok) return;

      const json = (await res.json()) as PredictiveAnomalyResponse;
      setAlerts(json.alerts ?? []);
    } catch {
      setAlerts([]);
    }
  }, []);

  useEffect(() => {
    void carregarAlertas();
    const interval = window.setInterval(carregarAlertas, 2 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [carregarAlertas]);

  if (!activeAlert) return null;

  const severity = getSeverity(activeAlert);
  const metric = formatMetric(activeAlert.predicted_metric);
  const delta = activeAlert.predicted_delta_pct != null
    ? `${Math.abs(Math.round(activeAlert.predicted_delta_pct))}%`
    : "fora da curva";
  const confidence = Math.round((activeAlert.confidence ?? 0) * 100);
  const campanha = activeAlert.campaign_name ?? "Campanha monitorada";

  function dismiss() {
    if (!activeAlert) return;
    setDismissed(prev => new Set(prev).add(activeAlert.id));
  }

  async function abrirEri() {
    if (!activeAlert) return;
    setLoading(true);
    window.dispatchEvent(new CustomEvent("erizon:open-agent", {
      detail: {
        prompt: buildPrompt(activeAlert),
      },
    }));
    setDismissed(prev => new Set(prev).add(activeAlert.id));
    window.setTimeout(() => setLoading(false), 800);
  }

  return (
    <div className="fixed left-1/2 top-4 z-50 w-[calc(100vw-24px)] max-w-[720px] -translate-x-1/2">
      <div className={`rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${
        severity === "critico"
          ? "border-red-500/25 bg-red-950/70 shadow-red-950/30"
          : "border-amber-500/25 bg-amber-950/70 shadow-amber-950/20"
      }`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            severity === "critico" ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"
          }`}>
            {severity === "critico" ? <AlertTriangle size={18}/> : <Zap size={18}/>}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                severity === "critico" ? "bg-red-400/15 text-red-200" : "bg-amber-400/15 text-amber-200"
              }`}>
                Anomalia {severity === "critico" ? "crítica" : "alta"}
              </span>
              <span className="text-[10px] font-medium text-white/35">{confidence}% confiança</span>
            </div>

            <p className="mt-1 truncate text-[13px] font-semibold text-white">{campanha}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-white/55">
              {metric} com risco de variar {delta}
              {activeAlert.predicted_window_hours ? ` nas próximas ${activeAlert.predicted_window_hours}h` : ""}.
              {activeAlert.preventive_action ? ` ${activeAlert.preventive_action}` : ""}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={abrirEri}
              disabled={loading}
              className="flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-[11px] font-bold text-black transition-all hover:bg-white/90 disabled:opacity-60"
            >
              {loading ? <Loader2 size={13} className="animate-spin"/> : <MessageSquare size={13}/>}
              Entender
            </button>
            <button
              onClick={dismiss}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/40 transition-all hover:bg-white/10 hover:text-white"
              aria-label="Dispensar alerta"
            >
              <X size={14}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
