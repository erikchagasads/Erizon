"use client";

// app/risk-radar/page.tsx — Risk Radar
// Detecção automática de campanhas com degradação, desperdício e risco operacional.

import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { getSupabase } from "@/lib/supabase";
import { Loader2, ShieldAlert, AlertTriangle, TrendingDown, Eye } from "lucide-react";

interface Campanha {
  id: string;
  nome_campanha: string;
  gasto_total: number;
  contatos: number;
  receita_estimada: number;
  ctr: number;
  cpm: number;
  impressoes: number;
  dias_ativo: number;
  status: string;
  orcamento: number;
}

interface RiskFlag {
  id: string;
  campanha: string;
  severidade: "Crítico" | "Alto" | "Moderado";
  diagnostico: string;
  causa: string;
  acao: string;
  gastoDiario: number;
  perdaMensal: number;
}

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function gerarRiscos(campanhas: Campanha[]): RiskFlag[] {
  const flags: RiskFlag[] = [];
  for (const c of campanhas) {
    if (c.gasto_total === 0) continue;
    const roas = c.receita_estimada / c.gasto_total;
    const cpl  = c.contatos > 0 ? c.gasto_total / c.contatos : 999;
    const gastoDiario = c.dias_ativo > 0 ? c.gasto_total / c.dias_ativo : 0;

    if (c.contatos === 0 && c.gasto_total > 100) {
      flags.push({ id: c.id, campanha: c.nome_campanha, severidade: "Crítico",
        diagnostico: "Campanha zumbi — gasto sem conversão",
        causa: `${fmtBRL(c.gasto_total)} investidos em ${c.dias_ativo} dias sem leads. CTR ${c.ctr.toFixed(2)}%.`,
        acao: "Pausar imediatamente e revisar segmentação e criativo.",
        gastoDiario, perdaMensal: gastoDiario * 30 });
      continue;
    }
    if (roas > 0 && roas < 1 && c.gasto_total > 150) {
      flags.push({ id: c.id, campanha: c.nome_campanha, severidade: "Crítico",
        diagnostico: "ROAS abaixo de 1× — operação no prejuízo",
        causa: `Retorno de ${roas.toFixed(2)}× — cada R$1 investido gera ${fmtBRL(roas)} de receita.`,
        acao: "Pausar ou reduzir orçamento em 50% enquanto otimiza criativos.",
        gastoDiario, perdaMensal: (c.gasto_total - c.receita_estimada) / Math.max(c.dias_ativo, 1) * 30 });
      continue;
    }
    if (cpl > 150 && c.contatos > 0) {
      flags.push({ id: c.id, campanha: c.nome_campanha, severidade: "Alto",
        diagnostico: "CPL crítico — custo por lead muito elevado",
        causa: `CPL de ${fmtBRL(cpl)} — meta saudável abaixo de R$80. ${c.contatos} leads em ${c.dias_ativo} dias.`,
        acao: "Revisar público-alvo, criativo e oferta. Testar segmentação mais específica.",
        gastoDiario, perdaMensal: (cpl - 80) * (c.contatos / Math.max(c.dias_ativo, 1)) * 30 });
      continue;
    }
    if (c.ctr > 0 && c.ctr < 0.5 && c.gasto_total > 200) {
      flags.push({ id: c.id, campanha: c.nome_campanha, severidade: "Moderado",
        diagnostico: "CTR baixo — criativo com baixo engajamento",
        causa: `CTR de ${c.ctr.toFixed(2)}% abaixo de 0.5%. Impressões: ${c.impressoes.toLocaleString("pt-BR")}. CPM: ${fmtBRL(c.cpm)}.`,
        acao: "Testar novos criativos com hooks diferentes. Revisar formato e copy.",
        gastoDiario, perdaMensal: 0 });
    }
  }
  const ordem = { "Crítico": 0, "Alto": 1, "Moderado": 2 };
  return flags.sort((a, b) => ordem[a.severidade] - ordem[b.severidade]);
}

const SEV_STYLE = {
  "Crítico":  { badge: "bg-red-500/15 text-red-400 border-red-500/25", bar: "bg-red-500", icon: <AlertTriangle size={14} className="text-red-400" /> },
  "Alto":     { badge: "bg-amber-500/15 text-amber-400 border-amber-500/25", bar: "bg-amber-500", icon: <TrendingDown size={14} className="text-amber-400" /> },
  "Moderado": { badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25", bar: "bg-yellow-400", icon: <Eye size={14} className="text-yellow-400" /> },
};

export default function RiskRadarPage() {
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

  const riscos = useMemo(() => gerarRiscos(campanhas), [campanhas]);
  const criticos = riscos.filter(r => r.severidade === "Crítico").length;
  const perdaTotal = riscos.reduce((s, r) => s + r.perdaMensal, 0);

  return (
    <>
      <Sidebar />
      <div className="ml-[60px] min-h-screen bg-[#040406] text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="mb-8">
            <p className="text-[11px] text-purple-400 font-semibold uppercase tracking-wider mb-1">Risk Radar</p>
            <h1 className="text-2xl font-bold text-white">Mapa de Risco</h1>
            <p className="text-sm text-white/40 mt-1">
              Detecção automática de campanhas com degradação, desperdício e risco operacional.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={20} className="animate-spin text-purple-400" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cards de resumo */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">Riscos detectados</p>
                  <p className={`text-3xl font-bold ${riscos.length > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {riscos.length}
                  </p>
                  <p className="text-[11px] text-white/30 mt-1">{criticos} crítico{criticos !== 1 ? "s" : ""}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">Campanhas monitoradas</p>
                  <p className="text-3xl font-bold text-white">{campanhas.length}</p>
                  <p className="text-[11px] text-white/30 mt-1">ativas no período</p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">Perda mensal estimada</p>
                  <p className={`text-3xl font-bold ${perdaTotal > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {perdaTotal > 0 ? fmtBRL(perdaTotal) : "R$ 0"}
                  </p>
                  <p className="text-[11px] text-white/30 mt-1">se nenhuma ação for tomada</p>
                </div>
              </div>

              {/* Lista de riscos */}
              {riscos.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
                  <ShieldAlert size={32} className="text-emerald-400/40 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">
                    {campanhas.length === 0
                      ? "Nenhuma campanha ativa. Sincronize em Analytics primeiro."
                      : "✅ Nenhum risco crítico detectado. Operação saudável."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {riscos.map(r => {
                    const style = SEV_STYLE[r.severidade];
                    return (
                      <div key={r.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                        <div className={`h-0.5 ${style.bar}`} />
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              {style.icon}
                              <h3 className="text-sm font-semibold text-white leading-tight">{r.campanha}</h3>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${style.badge}`}>
                              {r.severidade}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-white/80 mb-3">{r.diagnostico}</p>
                          <div className="space-y-2">
                            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
                              <p className="text-[9px] uppercase tracking-widest text-white/25 mb-1">Causa</p>
                              <p className="text-[12px] text-white/60 leading-relaxed">{r.causa}</p>
                            </div>
                            <div className="rounded-xl bg-purple-500/[0.05] border border-purple-500/15 p-3">
                              <p className="text-[9px] uppercase tracking-widest text-purple-400/50 mb-1">Ação recomendada</p>
                              <p className="text-[12px] text-white/75 leading-relaxed">{r.acao}</p>
                            </div>
                            {r.perdaMensal > 0 && (
                              <p className="text-[11px] text-red-400/60 px-1">
                                Perda estimada: {fmtBRL(r.perdaMensal)}/mês · {fmtBRL(r.gastoDiario)}/dia
                              </p>
                            )}
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
