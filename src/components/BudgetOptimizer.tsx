"use client";
import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Loader2, DollarSign, Zap, X } from "lucide-react";
import type { AllocationResult, ClientAllocation } from "@/core/budget-allocation-engine";

function fmtBRL(v: number) {
  return `R$${Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

function ActionBadge({ acao }: { acao: ClientAllocation["acao"] }) {
  if (acao === "scale") return (
    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
      <TrendingUp size={9} /> Escalar
    </span>
  );
  if (acao === "reduce") return (
    <span className="flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
      <TrendingDown size={9} /> Reduzir
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[9px] font-bold text-white/30 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
      <Minus size={9} /> Manter
    </span>
  );
}

export function BudgetOptimizer({ onClose }: { onClose?: () => void }) {
  const [budgetTotal, setBudgetTotal] = useState("");
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<AllocationResult | null>(null);
  const [erro, setErro]               = useState<string | null>(null);

  async function otimizar() {
    const bt = parseFloat(budgetTotal);
    if (!bt || bt < 100) { setErro("Informe um budget total de pelo menos R$100."); return; }
    setLoading(true); setErro(null); setResult(null);

    const res = await fetch("/api/budget/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budgetTotal: bt }),
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      setErro(data.error ?? "Erro ao calcular alocação.");
    } else {
      setResult(data.result);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0d0d10] border border-white/[0.09] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <DollarSign size={16} className="text-emerald-400" />
            <span className="text-[15px] font-bold">Otimizador de Budget</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-white/25 hover:text-white/50 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {!result ? (
            <div className="space-y-5">
              <p className="text-[12px] text-white/40 leading-relaxed">
                Informe seu budget total diário e o algoritmo calcula a alocação ótima entre seus clientes para maximizar o resultado do portfólio.
              </p>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">
                  Budget total diário (R$)
                </label>
                <input
                  type="number"
                  value={budgetTotal}
                  onChange={e => setBudgetTotal(e.target.value)}
                  placeholder="Ex: 5000"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/40 transition-colors"
                />
              </div>

              {erro && (
                <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {erro}
                </p>
              )}

              <div className="flex items-start gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="w-1 h-1 rounded-full bg-white/20 mt-2 shrink-0" />
                <p className="text-[11px] text-white/30 leading-relaxed">
                  O algoritmo usa o ROAS histórico de cada cliente para calcular o retorno marginal de cada real investido — priorizando clientes com mais headroom de crescimento.
                </p>
              </div>

              <button
                onClick={otimizar}
                disabled={loading || !budgetTotal}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600/80 hover:bg-emerald-500 text-[13px] font-bold text-white transition-all disabled:opacity-40"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                {loading ? "Calculando..." : "Calcular Alocação Ótima"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Impacto total */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Impacto estimado / semana</p>
                  <span className="text-[20px] font-black text-emerald-400">
                    +{fmtBRL(result.impactoTotalBrl)}
                  </span>
                </div>
                <p className="text-[11px] text-white/40 leading-relaxed">{result.resumo}</p>
              </div>

              {/* Alocações por cliente */}
              <div className="space-y-2">
                {result.alocacaoOutput.map(c => (
                  <div key={c.clientId}
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-[13px] font-semibold text-white/80">{c.clientName}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <ActionBadge acao={c.acao} />
                          {c.impactoEstimadoBrl > 0 && (
                            <span className="text-[9px] text-emerald-400 font-semibold">
                              +{fmtBRL(c.impactoEstimadoBrl)}/sem
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[14px] font-bold text-white">{fmtBRL(c.budgetOtimo)}<span className="text-[10px] text-white/30">/dia</span></p>
                        {c.delta !== 0 && (
                          <p className={`text-[11px] font-semibold ${c.delta > 0 ? "text-emerald-400" : "text-amber-400"}`}>
                            {c.delta > 0 ? "+" : ""}{fmtBRL(c.delta)}/dia
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Barra visual */}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[9px] text-white/25 w-14 shrink-0">Atual: {fmtBRL(c.budgetAtual)}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] relative overflow-hidden">
                        <div className="absolute h-full rounded-full bg-white/20"
                          style={{ width: `${Math.min(100, (c.budgetAtual / (c.budgetOtimo * 1.5 || 1)) * 100)}%` }} />
                        <div className={`absolute h-full rounded-full transition-all ${
                          c.acao === "scale" ? "bg-emerald-500" : c.acao === "reduce" ? "bg-amber-500" : "bg-purple-500"
                        }`}
                          style={{ width: `${Math.min(100, (c.budgetOtimo / (c.budgetOtimo * 1.5 || 1)) * 100)}%` }} />
                      </div>
                      <span className="text-[9px] text-white/25 w-14 text-right shrink-0">Ótimo: {fmtBRL(c.budgetOtimo)}</span>
                    </div>

                    <p className="text-[10px] text-white/30 mt-2 leading-relaxed">{c.justificativa}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { setResult(null); setBudgetTotal(""); }}
                className="w-full py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] text-[12px] font-semibold text-white/40 hover:text-white/60 transition-all"
              >
                Nova simulação
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
