// ─────────────────────────────────────────────────────────────────────────────
// IRE Engine — Índice de Real Eficiência
//
// Fórmula proprietária Erizon:
//   IRE = (40% × NormROAS) + (25% × NormQuality) + (20% × NormDecision) + (15% × NormWaste)
//
// Todos os cálculos são funções puras (sem I/O), testáveis isoladamente.
// ─────────────────────────────────────────────────────────────────────────────

import type { SnapshotWithObjective } from "@/repositories/supabase/snapshot-repository";
import type { IREResult, WasteBreakdown, WasteCampaign, IREConfidence } from "@/types/erizon-ena";
import { normalizeObjective, resolveBenchmarks } from "@/core/objective-engine";

// ─── Pesos da fórmula ────────────────────────────────────────────────────────
const W_ROAS     = 0.40;
const W_QUALITY  = 0.25;
const W_DECISION = 0.20;
const W_WASTE    = 0.15;

// ─── Benchmarks default portfolio (usados quando sem override de workspace) ──
const DEFAULT_BENCHMARK_ROAS = 3.0;
const DEFAULT_BENCHMARK_CTR  = 1.5;
const DEFAULT_BENCHMARK_CPL  = 20;

// ─── Thresholds de desperdício ────────────────────────────────────────────────
const ZOMBIE_MIN_SPEND    = 150;   // R$ mínimo de gasto para considerar zombie
const ZOMBIE_MIN_DAYS     = 3;     // dias ativos mínimos antes de classificar zombie
const SATURATED_FREQ      = 4.0;   // frequência acima disso = saturação
const SATURATED_CTR_DROP  = 0.20;  // queda de CTR acima disso junto com freq alta = saturado
const CANNIBAL_MIN_CPL    = 1.0;   // múltiplo do benchmark CPL para considerar canibal

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Detecção de desperdício ─────────────────────────────────────────────────

/**
 * Detecta campanhas zombie, saturadas e canibais.
 * Zombie:    gasto alto + zero leads/purchases há dias
 * Saturada:  frequência > 4 + CTR caindo > 20%
 * Canibal:   2+ campanhas do mesmo objetivo com CPL acima do benchmark
 */
export function detectWaste(snapshots: SnapshotWithObjective[]): WasteBreakdown {
  const wasteCampaigns: WasteCampaign[] = [];
  let zombieSpend    = 0;
  let saturatedSpend = 0;
  let cannibalSpend  = 0;
  const totalSpend   = snapshots.reduce((s, c) => s + c.spend, 0);

  // Agrupa por campanha (pega o snapshot mais recente de cada uma)
  const byCampaign = new Map<string, SnapshotWithObjective[]>();
  for (const snap of snapshots) {
    const list = byCampaign.get(snap.campaign_id) ?? [];
    list.push(snap);
    byCampaign.set(snap.campaign_id, list);
  }

  // Índice de campanhas por objetivo para detecção de canibais
  const byObjective = new Map<string, SnapshotWithObjective[]>();

  for (const [campaignId, snaps] of byCampaign) {
    // Mais recente primeiro
    const sorted = snaps.sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date));
    const latest = sorted[0];
    const obj    = latest.objective ?? "UNKNOWN";

    const list = byObjective.get(obj) ?? [];
    list.push(latest);
    byObjective.set(obj, list);

    // ── Zombie: gastou bastante, não gerou leads nem compras ────────────────
    const daysActive = sorted.length; // proxy: quantos dias de snapshot temos
    if (
      latest.spend >= ZOMBIE_MIN_SPEND &&
      daysActive >= ZOMBIE_MIN_DAYS &&
      latest.leads === 0 &&
      latest.purchases === 0
    ) {
      const objective = normalizeObjective(obj);
      // Só classifica zombie para campanhas de captação (não awareness/tráfego puro)
      if (objective !== "AWARENESS" && objective !== "TRAFFIC") {
        zombieSpend += latest.spend;
        wasteCampaigns.push({ id: campaignId, nome: campaignId, type: "zombie", spend: latest.spend });
      }
    }

    // ── Saturada: frequência alta + queda de CTR ────────────────────────────
    if (sorted.length >= 2) {
      const prev = sorted[1];
      const ctrDrop = prev.ctr > 0 ? (prev.ctr - latest.ctr) / prev.ctr : 0;
      if (latest.frequency >= SATURATED_FREQ && ctrDrop >= SATURATED_CTR_DROP) {
        // Não duplicar com zombie
        const alreadyWaste = wasteCampaigns.find(w => w.id === campaignId);
        if (!alreadyWaste) {
          saturatedSpend += latest.spend;
          wasteCampaigns.push({ id: campaignId, nome: campaignId, type: "saturated", spend: latest.spend });
        }
      }
    }
  }

  // ── Canibais: 2+ campanhas do mesmo objetivo com CPL acima do benchmark ───
  for (const [obj, snaps] of byObjective) {
    if (snaps.length < 2) continue;
    const objective   = normalizeObjective(obj);
    const benchmarks  = resolveBenchmarks(objective);
    const benchCpl    = benchmarks.benchmarkCpl ?? DEFAULT_BENCHMARK_CPL;

    const aboveBenchmark = snaps.filter(s => s.cpl > benchCpl * CANNIBAL_MIN_CPL && s.spend > 0);
    if (aboveBenchmark.length >= 2) {
      for (const s of aboveBenchmark) {
        const alreadyWaste = wasteCampaigns.find(w => w.id === s.campaign_id);
        if (!alreadyWaste) {
          cannibalSpend += s.spend;
          wasteCampaigns.push({ id: s.campaign_id, nome: s.campaign_id, type: "cannibal", spend: s.spend });
        }
      }
    }
  }

  const wasteSpend = zombieSpend + saturatedSpend + cannibalSpend;
  const wasteIndex = totalSpend > 0 ? clamp(wasteSpend / totalSpend) : 0;

  return { zombieSpend, saturatedSpend, cannibalSpend, totalSpend, wasteIndex, wasteSpend, campaigns: wasteCampaigns };
}

// ─── NormROAS ────────────────────────────────────────────────────────────────

function calcNormRoas(snapshots: SnapshotWithObjective[]): number {
  const totalSpend   = snapshots.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = snapshots.reduce((s, c) => s + c.revenue, 0);
  if (totalSpend <= 0) return 0;

  const roasActual = totalRevenue / totalSpend;
  // Saturamos em 1.5× o benchmark — quem está acima disso já está no máximo
  return clamp(roasActual / (DEFAULT_BENCHMARK_ROAS * 1.5));
}

// ─── NormQuality ─────────────────────────────────────────────────────────────

function calcNormQuality(snapshots: SnapshotWithObjective[]): number {
  if (snapshots.length === 0) return 0;

  // Só considerar campanhas com gasto significativo
  const active = snapshots.filter(s => s.spend > 0);
  if (active.length === 0) return 0;

  const totalSpend = active.reduce((s, c) => s + c.spend, 0);

  // Média ponderada por gasto de cada signal
  let ctrScore  = 0;
  let freqScore = 0;
  let cplScore  = 0;

  for (const s of active) {
    const weight = totalSpend > 0 ? s.spend / totalSpend : 1 / active.length;
    const obj    = normalizeObjective(s.objective);
    const bench  = resolveBenchmarks(obj);
    const bCtr   = bench.benchmarkCtr ?? DEFAULT_BENCHMARK_CTR;
    const bCpl   = bench.benchmarkCpl ?? DEFAULT_BENCHMARK_CPL;

    // CTR: queremos pelo menos o benchmark
    ctrScore += clamp(s.ctr / bCtr) * weight;

    // Frequência: penaliza acima de 2.5 (saturação começa antes do threshold de waste)
    const freqPenalty = Math.max(0, (s.frequency - 2.5) / 2.5);
    freqScore += clamp(1 - freqPenalty) * weight;

    // CPL: quanto menor melhor (inverso normalizado)
    const cplRatio = s.cpl > 0 && bCpl > 0 ? clamp(bCpl / s.cpl) : 0.5;
    cplScore += cplRatio * weight;
  }

  return clamp((ctrScore + freqScore + cplScore) / 3);
}

// ─── NormDecision ────────────────────────────────────────────────────────────

/**
 * Taxa histórica de acerto das decisões.
 * Enquanto não há histórico suficiente, retorna 0.5 (neutro).
 */
export function calcNormDecision(decisionScore: number): number {
  return clamp(decisionScore);
}

// ─── NormWaste ────────────────────────────────────────────────────────────────

function calcNormWaste(wasteIndex: number): number {
  return clamp(1 - wasteIndex);
}

// ─── Label e cor ──────────────────────────────────────────────────────────────

function resolveLabel(score: number): { ireLabel: string; ireColor: "emerald" | "amber" | "red" } {
  if (score >= 75) return { ireLabel: "Eficiência Alta",   ireColor: "emerald" };
  if (score >= 50) return { ireLabel: "Eficiência Média",  ireColor: "amber"   };
  if (score >= 30) return { ireLabel: "Atenção",           ireColor: "amber"   };
  return             { ireLabel: "Crítico",              ireColor: "red"     };
}

function resolveConfidence(snapshots: SnapshotWithObjective[]): IREConfidence {
  const uniqueCampaigns = new Set(snapshots.map(s => s.campaign_id)).size;
  const uniqueDays      = new Set(snapshots.map(s => s.snapshot_date)).size;
  if (uniqueDays >= 7 && uniqueCampaigns >= 3) return "high";
  if (uniqueDays >= 3) return "medium";
  return "low";
}

function resolveWasteMessage(waste: WasteBreakdown): string {
  if (waste.wasteSpend <= 0) return "Nenhum desperdício detectado.";
  const pct = Math.round(waste.wasteIndex * 100);
  const brl = waste.wasteSpend.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return `R$ ${brl} desperdiçados (${pct}% do budget) — ${waste.campaigns.length} campanha${waste.campaigns.length !== 1 ? "s" : ""} ineficiente${waste.campaigns.length !== 1 ? "s" : ""}.`;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export type IREInput = {
  snapshots: SnapshotWithObjective[];
  decisionScore: number; // 0-1, vem do histórico de autopilot_suggestions
};

export function calcIRE(input: IREInput): IREResult {
  const { snapshots, decisionScore } = input;

  const wasteBreakdown = detectWaste(snapshots);

  const normRoas     = calcNormRoas(snapshots);
  const normQuality  = calcNormQuality(snapshots);
  const normDecision = calcNormDecision(decisionScore);
  const normWaste    = calcNormWaste(wasteBreakdown.wasteIndex);

  const raw = (W_ROAS * normRoas) + (W_QUALITY * normQuality) + (W_DECISION * normDecision) + (W_WASTE * normWaste);
  const ireScore = Math.round(clamp(raw) * 100);

  const confidence   = resolveConfidence(snapshots);
  const label        = resolveLabel(ireScore);
  const wasteMessage = resolveWasteMessage(wasteBreakdown);

  return {
    ireScore,
    normRoas,
    normQuality,
    normDecision,
    normWaste,
    wasteBreakdown,
    confidence,
    wasteMessage,
    ...label,
  };
}
