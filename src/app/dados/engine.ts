// src/app/dados/engine.ts
// Funções puras de cálculo — sem dependências de React.
// Importadas tanto pela page quanto pelos componentes.

import type { Campanha, Metricas, ScoreBadge, Alerta, CTA, Periodo } from "./types";

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtBRL0 = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ─── Score ────────────────────────────────────────────────────────────────────
export function calcScore(cpl: number, ctr: number, pctGasto: number, resultado: number): number {
  let s = 100;
  if (cpl > 80) s -= 35; else if (cpl > 40) s -= 20; else if (cpl > 20) s -= 8;
  if (ctr === 0) s -= 20; else if (ctr < 0.8) s -= 18; else if (ctr < 1.5) s -= 8;
  if (pctGasto > 95) s -= 15; else if (pctGasto > 85) s -= 8;
  if (resultado === 0) s -= 25;
  return Math.max(0, Math.min(100, Math.round(s)));
}

export function badgeDoScore(score: number): ScoreBadge {
  if (score >= 80) return { label: "Escalar",  color: "text-emerald-400", textRing: "#10b981", glow: true  };
  if (score >= 60) return { label: "Saudável", color: "text-sky-400",     textRing: "#0ea5e9", glow: false };
  if (score >= 40) return { label: "Atenção",  color: "text-amber-400",   textRing: "#f59e0b", glow: false };
  return               { label: "Risco",    color: "text-red-400",     textRing: "#ef4444", glow: false };
}

export function ctaDoScore(score: number, alertas: Alerta[]): CTA | null {
  if (score >= 80) return { label: "Escalar 20%", acao: "escalar", color: "text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10" };
  if (alertas.some(a => a.texto.includes("criativo"))) return { label: "Testar novo criativo", acao: "criativo", color: "text-amber-400 border-amber-500/20 hover:bg-amber-500/10" };
  if (score < 40) return { label: "Pausar campanha", acao: "pausar", color: "text-red-400 border-red-500/20 hover:bg-red-500/10" };
  if (score < 60) return { label: "Revisar segmentação", acao: "segmentacao", color: "text-amber-400 border-amber-500/20 hover:bg-amber-500/10" };
  return null;
}

export function gerarAlertas(cpl: number, ctr: number, pctGasto: number, resultado: number): Alerta[] {
  const a: Alerta[] = [];
  if (ctr > 0 && ctr < 0.8) a.push({ tipo: "warning", texto: "CTR baixo — criativo pode estar saturado" });
  if (cpl > 80)              a.push({ tipo: "danger",  texto: "CPL elevado — revisar segmentação" });
  if (pctGasto > 90)         a.push({ tipo: "warning", texto: `Budget ${pctGasto.toFixed(0)}% utilizado` });
  if (resultado === 0)       a.push({ tipo: "danger",  texto: "Nenhum resultado neste período" });
  if (ctr >= 2.5 && cpl < 30) a.push({ tipo: "success", texto: "Alta eficiência — pronta para escala" });
  return a.slice(0, 2);
}

export function calcMetricas(c: Campanha, ticket = 450, conv = 0.04): Metricas {
  const investimento = c.gasto_total ?? 0;
  const resultado    = c.contatos ?? 0;
  const impressoes   = c.impressoes ?? 0;
  const alcance      = c.alcance ?? 0;
  const cliques      = c.cliques ?? 0;

  let ctr = 0, ctrReal = false;
  if (cliques > 0 && impressoes > 0) { ctr = (cliques / impressoes) * 100; ctrReal = true; }
  else if (c.ctr && c.ctr > 0)       { ctr = c.ctr; ctrReal = true; }

  const freq     = alcance > 0 && impressoes > 0 ? impressoes / alcance : (c.frequencia ?? 0);
  const cpm      = impressoes > 0 ? (investimento / impressoes) * 1000 : 0;
  const cpl      = resultado > 0 ? investimento / resultado : 0;
  const receita  = resultado * conv * ticket;
  const lucro    = receita - investimento;
  const margem   = receita > 0 ? lucro / receita : 0;
  const pctGasto = c.orcamento > 0 ? Math.min((investimento / c.orcamento) * 100, 100) : 0;

  const score      = calcScore(cpl, ctr, pctGasto, resultado);
  const scoreBadge = badgeDoScore(score);
  const alertas    = gerarAlertas(cpl, ctr, pctGasto, resultado);
  const cta        = ctaDoScore(score, alertas);

  return { investimento, resultado, lucro, margem, cpl, ctr, ctrReal, freq, cpm, pctGasto, score, scoreBadge, alertas, cta };
}

export function calcularConfianca(diasAtivo: number, gasto: number, leads: number): number {
  let conf = 50;
  if (diasAtivo >= 14) conf += 20; else if (diasAtivo >= 7) conf += 10;
  if (gasto > 500) conf += 10; else if (gasto > 200) conf += 5;
  if (leads > 20) conf += 10; else if (leads > 5) conf += 5;
  return Math.min(97, Math.max(60, conf));
}

export function dentroDoperiodo(dataStr: string, periodo: Periodo): boolean {
  if (!dataStr) return true;
  const data = new Date(dataStr);
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);

  if (periodo === "hoje") {
    const i = new Date(); i.setHours(0, 0, 0, 0); return data >= i;
  }
  if (periodo === "7d") {
    const i = new Date(); i.setDate(hoje.getDate() - 6); i.setHours(0, 0, 0, 0); return data >= i;
  }
  if (periodo === "30d") {
    const i = new Date(); i.setDate(hoje.getDate() - 29); i.setHours(0, 0, 0, 0); return data >= i;
  }
  if (periodo === "mes") {
    const i = new Date(hoje.getFullYear(), hoje.getMonth(), 1); return data >= i;
  }
  return true;
}