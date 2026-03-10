"use client";

// src/components/dados/PainelDecisoes.tsx — v2
// Histórico de decisões com:
// - Filtros por tipo (pausar / escalar / todas)
// - Campo para registrar resultado posterior
// - Prova de ROI da ferramenta (impacto acumulado)
// - Export CSV do histórico

import { useState, useMemo } from "react";
import { History, TrendingUp, PauseCircle, Filter, Download, CheckCircle2, MessageSquare } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import type { CampanhaEnriquecida, DecisaoHistorico } from "@/app/analytics/types";

interface Props {
  decisoes: DecisaoHistorico[];
  campanhas: CampanhaEnriquecida[];
}

type FiltroTipo = "todas" | "pausa" | "escala" | "outro";

export default function PainelDecisoes({ decisoes, campanhas }: Props) {
  const [filtro, setFiltro] = useState<FiltroTipo>("todas");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [resultado, setResultado] = useState("");
  const [salvando, setSalvando] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const decisoesFiltradas = useMemo(() => {
    return decisoes.filter(d => {
      const a = d.acao.toLowerCase();
      if (filtro === "pausa")  return a.includes("paus");
      if (filtro === "escala") return a.includes("escal");
      if (filtro === "outro")  return !a.includes("paus") && !a.includes("escal");
      return true;
    });
  }, [decisoes, filtro]);

  // Calcula impacto acumulado estimado
  const impactoAcumulado = useMemo(() => {
    let total = 0;
    decisoes.forEach(d => {
      const match = d.impacto?.match(/R\$?([\d.,]+)/);
      if (match) {
        const val = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
        if (!isNaN(val)) total += val;
      }
    });
    return total;
  }, [decisoes]);

  async function salvarResultado(decisaoId: string) {
    if (!resultado.trim()) return;
    setSalvando(true);
    try {
      await supabase
        .from("decisoes_historico")
        .update({ resultado_real: resultado.trim() })
        .eq("id", decisaoId);
      setEditandoId(null);
      setResultado("");
    } catch {}
    setSalvando(false);
  }

  function exportarCSV() {
    const linhas = [
      ["Data", "Ação", "Campanha", "Impacto estimado", "Resultado real"].join(","),
      ...decisoes.map(d => [
        `"${d.data}"`,
        `"${d.acao}"`,
        `"${d.campanha_nome || d.campanha}"`,
        `"${d.impacto}"`,
        `"${(d as any).resultado_real || ""}"`,
      ].join(","))
    ];
    const blob = new Blob([linhas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `erizon-decisoes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (decisoes.length === 0) return (
    <div className="text-center py-16">
      <History size={24} className="text-white/10 mx-auto mb-3" />
      <p className="text-white/20 text-sm">Nenhuma decisão registrada ainda.</p>
      <p className="text-white/10 text-xs mt-1">As decisões tomadas nas campanhas aparecem aqui.</p>
    </div>
  );

  return (
    <div>
      {/* ROI da ferramenta */}
      {impactoAcumulado > 0 && (
        <div className="mb-5 px-5 py-4 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/15 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1">Impacto acumulado estimado</p>
            <p className="text-[20px] font-black font-mono text-emerald-400">
              R${impactoAcumulado.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[11px] text-white/20 mt-0.5">protegidos ou gerados nas últimas {decisoes.length} decisões</p>
          </div>
          <CheckCircle2 size={28} className="text-emerald-400/20 shrink-0" />
        </div>
      )}

      {/* Header com filtros e export */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1 bg-[#0f0f11] border border-white/[0.05] p-1 rounded-xl">
          {(["todas", "pausa", "escala", "outro"] as FiltroTipo[]).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${filtro === f ? "bg-white/[0.07] text-white" : "text-white/25 hover:text-white/50"}`}>
              {f === "todas" ? "Todas" : f === "pausa" ? "🛑 Pausas" : f === "escala" ? "🚀 Escalas" : "⚡ Outros"}
            </button>
          ))}
        </div>
        <button onClick={exportarCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.07] text-[11px] text-white/30 hover:text-white hover:border-white/15 transition-all">
          <Download size={12} /> Exportar
        </button>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {decisoesFiltradas.map((d, i) => {
          const isPausa  = d.acao.toLowerCase().includes("paus");
          const isEscala = d.acao.toLowerCase().includes("escal");
          const cor      = isPausa ? "text-red-400" : isEscala ? "text-emerald-400" : "text-amber-400";
          const icon     = isPausa ? "🛑" : isEscala ? "🚀" : "⚡";
          const temId    = !!(d as any).id;
          const resReal  = (d as any).resultado_real;

          return (
            <div key={i}
              className="p-4 rounded-xl border border-white/[0.04] hover:border-white/[0.07] transition-all">
              <div className="flex items-start gap-3">
                <span className="text-[14px] shrink-0 mt-0.5">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/20 font-mono">{d.data}</span>
                      <p className="text-[12px] font-semibold text-white/70 truncate">{d.acao}</p>
                    </div>
                    <span className={`text-[11px] font-semibold shrink-0 ${cor}`}>{d.impacto}</span>
                  </div>
                  <p className="text-[11px] text-white/30 truncate mb-2">
                    {d.campanha_nome || d.campanha}
                    {d.score_snapshot && <span className="ml-2 text-white/15">Score {d.score_snapshot}</span>}
                  </p>

                  {/* Resultado real registrado */}
                  {resReal && (
                    <div className="flex items-start gap-1.5 text-[11px] text-emerald-400/70">
                      <CheckCircle2 size={10} className="shrink-0 mt-0.5" />
                      <span>{resReal}</span>
                    </div>
                  )}

                  {/* Botão registrar resultado */}
                  {temId && !resReal && editandoId !== d.id && (
                    <button onClick={() => { setEditandoId((d as any).id); setResultado(""); }}
                      className="flex items-center gap-1 text-[10px] text-white/20 hover:text-purple-400 transition-colors mt-1">
                      <MessageSquare size={10} /> Registrar resultado real
                    </button>
                  )}

                  {editandoId === (d as any).id && (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        value={resultado}
                        onChange={e => setResultado(e.target.value)}
                        placeholder="Ex: CPL caiu 40% após pausa, conta estabilizou..."
                        className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-white/20"
                      />
                      <button onClick={() => salvarResultado((d as any).id)} disabled={salvando}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-[11px] font-semibold text-white transition-all disabled:opacity-50">
                        {salvando ? "..." : "Salvar"}
                      </button>
                      <button onClick={() => setEditandoId(null)}
                        className="px-2 py-1.5 rounded-lg text-[11px] text-white/20 hover:text-white transition-colors">
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}