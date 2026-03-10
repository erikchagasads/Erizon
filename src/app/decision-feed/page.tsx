"use client";

// app/decision-feed/page.tsx — Decision Feed
// Fila de decisões prioritárias geradas a partir das campanhas ativas.

import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { getSupabase } from "@/lib/supabase";
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, Pause, ArrowUpRight, Eye } from "lucide-react";

interface Campanha {
  id: string;
  nome_campanha: string;
  gasto_total: number;
  contatos: number;
  receita_estimada: number;
  ctr: number;
  dias_ativo: number;
  status: string;
}

interface Decisao {
  campanhaId: string;
  campanhaNome: string;
  titulo: string;
  motivo: string;
  impacto: string;
  confianca: number;
  prioridade: "Crítica" | "Alta" | "Média";
  tipo: "pausar" | "escalar" | "monitorar";
  gastoDiario: number;
}

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function gerarDecisoes(campanhas: Campanha[]): Decisao[] {
  const decisoes: Decisao[] = [];
  for (const c of campanhas) {
    if (c.gasto_total === 0) continue;
    const roas = c.receita_estimada / c.gasto_total;
    const cpl  = c.contatos > 0 ? c.gasto_total / c.contatos : 999;
    const gastoDiario = c.dias_ativo > 0 ? c.gasto_total / c.dias_ativo : c.gasto_total;
    const conf = Math.min(95, Math.max(50, Math.round(60 + (c.dias_ativo / 30) * 20 + (c.gasto_total / 1000) * 5)));

    if (c.contatos === 0 && c.gasto_total > 100) {
      decisoes.push({ campanhaId: c.id, campanhaNome: c.nome_campanha,
        titulo: `Pausar "${c.nome_campanha}"`,
        motivo: `${fmtBRL(c.gasto_total)} investidos sem nenhum lead em ${c.dias_ativo} dias.`,
        impacto: `Economia de ${fmtBRL(gastoDiario * 30)}/mês se pausada agora.`,
        confianca: conf, prioridade: "Crítica", tipo: "pausar", gastoDiario });
      continue;
    }
    if (roas < 1 && c.gasto_total > 200) {
      decisoes.push({ campanhaId: c.id, campanhaNome: c.nome_campanha,
        titulo: `Pausar "${c.nome_campanha}"`,
        motivo: `ROAS de ${roas.toFixed(2)}× abaixo de 1 — cada R$1 investido retorna ${fmtBRL(roas)}.`,
        impacto: `Pausar evita perda estimada de ${fmtBRL((c.gasto_total - c.receita_estimada) / Math.max(c.dias_ativo, 1) * 30)}/mês.`,
        confianca: conf, prioridade: "Crítica", tipo: "pausar", gastoDiario });
      continue;
    }
    if (roas >= 2.5 && cpl < 80 && c.ctr > 1) {
      decisoes.push({ campanhaId: c.id, campanhaNome: c.nome_campanha,
        titulo: `Escalar "${c.nome_campanha}" em 20%`,
        motivo: `ROAS ${roas.toFixed(2)}× com CPL de ${fmtBRL(cpl)} — campanha com headroom de escala.`,
        impacto: `+${fmtBRL(gastoDiario * 0.2 * roas * 30)}/mês estimado com aumento de 20% no orçamento.`,
        confianca: conf, prioridade: "Alta", tipo: "escalar", gastoDiario });
      continue;
    }
    if (cpl > 100 && c.contatos > 0) {
      decisoes.push({ campanhaId: c.id, campanhaNome: c.nome_campanha,
        titulo: `Revisar criativos de "${c.nome_campanha}"`,
        motivo: `CPL de ${fmtBRL(cpl)} acima do ideal. CTR ${c.ctr.toFixed(2)}% indica oportunidade no criativo.`,
        impacto: `Redução de 30% no CPL poderia gerar ${Math.round(c.contatos * 0.3)} leads extras no mesmo orçamento.`,
        confianca: Math.max(50, conf - 10), prioridade: "Média", tipo: "monitorar", gastoDiario });
    }
  }
  const ordem = { "Crítica": 0, "Alta": 1, "Média": 2 };
  return decisoes.sort((a, b) => ordem[a.prioridade] - ordem[b.prioridade]);
}

const PRIORIDADE_STYLE = {
  "Crítica": { badge: "bg-red-500/15 text-red-400 border-red-500/25", bar: "bg-red-500" },
  "Alta":    { badge: "bg-amber-500/15 text-amber-400 border-amber-500/25", bar: "bg-amber-500" },
  "Média":   { badge: "bg-blue-500/15 text-blue-400 border-blue-500/25", bar: "bg-blue-500" },
};

const TIPO_ICON = {
  pausar:    <Pause size={14} className="text-red-400" />,
  escalar:   <ArrowUpRight size={14} className="text-emerald-400" />,
  monitorar: <Eye size={14} className="text-blue-400" />,
};

export default function DecisionFeedPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("metricas_ads").select("*")
        .eq("user_id", user.id).in("status", ["ATIVO", "ACTIVE", "ATIVA"])
        .order("gasto_total", { ascending: false });
      setCampanhas((data ?? []) as Campanha[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const decisoes = useMemo(() => gerarDecisoes(campanhas), [campanhas]);
  const criticas = decisoes.filter(d => d.prioridade === "Crítica").length;
  const altas    = decisoes.filter(d => d.prioridade === "Alta").length;

  return (
    <>
      <Sidebar />
      <div className="ml-[60px] min-h-screen bg-[#040406] text-white">
        <div className="max-w-4xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="mb-8">
            <p className="text-[11px] text-purple-400 font-semibold uppercase tracking-wider mb-1">Decision Engine</p>
            <h1 className="text-2xl font-bold text-white">Decision Feed</h1>
            <p className="text-sm text-white/40 mt-1">
              Decisões prioritárias geradas automaticamente das suas campanhas ativas.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={20} className="animate-spin text-purple-400" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Resumo */}
              {decisoes.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Críticas", count: criticas, color: "text-red-400" },
                    { label: "Altas", count: altas, color: "text-amber-400" },
                    { label: "Total", count: decisoes.length, color: "text-white" },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                      <p className="text-[11px] text-white/30 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Alerta crítico */}
              {criticas > 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                  <AlertTriangle size={15} className="text-red-400 shrink-0" />
                  <p className="text-sm text-red-300">
                    <span className="font-semibold">{criticas} decisão{criticas > 1 ? "ões" : ""} crítica{criticas > 1 ? "s" : ""}</span> precisam de atenção imediata.
                  </p>
                </div>
              )}

              {/* Lista de decisões */}
              {decisoes.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
                  <p className="text-white/30 text-sm">
                    {campanhas.length === 0
                      ? "Nenhuma campanha ativa. Sincronize em Analytics primeiro."
                      : "✅ Nenhuma ação urgente. Conta em estado saudável."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {decisoes.map((d, i) => {
                    const style = PRIORIDADE_STYLE[d.prioridade];
                    return (
                      <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                        <div className={`h-0.5 ${style.bar}`} />
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {TIPO_ICON[d.tipo]}
                                <p className="text-[11px] text-white/30 truncate">{d.campanhaNome}</p>
                              </div>
                              <h3 className="text-base font-semibold text-white">{d.titulo}</h3>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${style.badge}`}>
                                {d.prioridade}
                              </span>
                              <span className="text-[11px] text-white/25">{d.confianca}%</span>
                            </div>
                          </div>
                          <p className="mt-3 text-sm text-white/55 leading-relaxed">{d.motivo}</p>
                          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15 px-3 py-2">
                            <TrendingUp size={12} className="text-emerald-400 shrink-0" />
                            <p className="text-[12px] text-emerald-400">{d.impacto}</p>
                          </div>
                          <div className="mt-3 rounded-xl bg-purple-500/[0.05] border border-purple-500/15 px-3 py-2">
                            <p className="text-[12px] text-white/60">
                              {d.tipo === "pausar"    && "→ Pausar campanha no Meta Ads Manager"}
                              {d.tipo === "escalar"   && "→ Aumentar orçamento diário em 20% e monitorar por 48h"}
                              {d.tipo === "monitorar" && "→ Revisar criativos e segmentação. Testar nova variação de copy."}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
