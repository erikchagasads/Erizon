"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {
  Loader2, FileText, Download, Star, TrendingUp,
  TrendingDown, Target, Clock, Zap, Award,
  BarChart3, AlertTriangle, CheckCircle2, ChevronRight,
} from "lucide-react";
import type { DNAProfile } from "@/core/profit-dna-engine";

interface Cliente { id: string; nome: string; cor?: string; }

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct = (v: number) => `${(v * 100).toFixed(0)}%`;

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const MES_LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.04] flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-purple-500/10">
          <Icon size={13} className="text-purple-400" />
        </div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "text-emerald-400" : pct >= 40 ? "text-amber-400" : "text-red-400";
  const ringColor = pct >= 70 ? "stroke-emerald-500" : pct >= 40 ? "stroke-amber-500" : "stroke-red-500";
  const circumference = 2 * Math.PI * 28;
  const dashoffset = circumference * (1 - pct / 100);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
          <circle cx="32" cy="32" r="28" fill="none" strokeWidth="4"
            className={ringColor}
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            strokeLinecap="round" />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${color}`}>{pct}%</span>
      </div>
      <span className="text-[10px] text-white/30 text-center leading-tight max-w-[60px]">{label}</span>
    </div>
  );
}

function DNAReport({ dna, clientName }: { dna: DNAProfile; clientName: string }) {
  const now = new Date();
  const mesAno = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const confianca = Math.round(dna.confidenceScore * 100);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-purple-400 uppercase tracking-widest font-semibold mb-1">Relatorio de Inteligencia</p>
            <h2 className="text-xl font-bold text-white">Profit DNA - {clientName}</h2>
            <p className="text-sm text-white/40 mt-1">{mesAno} · {dna.nCampaignsAnalyzed} campanhas · {dna.nSnapshotsAnalyzed} snapshots analisados</p>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10">
            <Star size={11} className="text-purple-400" />
            <span className="text-[11px] text-purple-300 font-semibold">{confianca}% confianca</span>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-5">
          {dna.cplMedian !== null && (
            <div className="text-center">
              <p className="text-xl font-bold text-white">{fmtBRL(dna.cplMedian)}</p>
              <p className="text-[10px] text-white/30 mt-0.5">CPL mediano</p>
            </div>
          )}
          {dna.roasMedian !== null && (
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-400">{dna.roasMedian.toFixed(2)}x</p>
              <p className="text-[10px] text-white/30 mt-0.5">ROAS mediano</p>
            </div>
          )}
          {dna.frequencySweetSpot !== null && (
            <div className="text-center">
              <p className="text-xl font-bold text-amber-400">{dna.frequencySweetSpot.toFixed(1)}</p>
              <p className="text-[10px] text-white/30 mt-0.5">Freq. ideal</p>
            </div>
          )}
          {dna.avgBudgetWinner !== null && (
            <div className="text-center">
              <p className="text-xl font-bold text-white">{fmtBRL(dna.avgBudgetWinner)}</p>
              <p className="text-[10px] text-white/30 mt-0.5">Budget campeao/dia</p>
            </div>
          )}
        </div>
      </div>

      {dna.goldenAudience && (
        <Section title="Publico campeao identificado" icon={Award}>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 shrink-0">
              <Star size={16} className="text-amber-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">{dna.goldenAudience}</p>
              <p className="text-[11px] text-white/30 mt-1">
                Este publico apresentou o melhor equilibrio entre CPL, ROAS e taxa de fechamento nas campanhas analisadas.
              </p>
            </div>
          </div>
        </Section>
      )}

      {dna.bestFormats.length > 0 && (
        <Section title="Formatos que mais convertem" icon={BarChart3}>
          <div className="space-y-3">
            {dna.bestFormats.slice(0, 4).map((f, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    i === 0 ? "bg-amber-500/20 text-amber-400" : "bg-white/[0.04] text-white/30"
                  }`}>{i + 1}</div>
                  <span className="text-sm text-white capitalize">{f.format}</span>
                  <span className="text-[10px] text-white/30">{f.nCampaigns} campanha{f.nCampaigns > 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="text-white/40">CPL medio: <span className="text-white">{fmtBRL(f.avgCpl)}</span></span>
                  <span className="text-emerald-400 font-semibold">{f.avgRoas.toFixed(2)}x ROAS</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {dna.bestDaysOfWeek.length > 0 && (
        <Section title="Dias com maior performance" icon={Clock}>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }, (_, i) => {
              const best = dna.bestDaysOfWeek.find(d => d.day === i);
              const worst = dna.worstDaysOfWeek.find(d => d.day === i);
              const isBest = !!best;
              const isWorst = !!worst && !isBest;
              return (
                <div key={i} className={`rounded-xl p-2 text-center ${
                  isBest ? "bg-emerald-500/15 border border-emerald-500/20"
                  : isWorst ? "bg-red-500/10 border border-red-500/15"
                  : "bg-white/[0.02] border border-white/[0.04]"
                }`}>
                  <p className={`text-[10px] font-semibold ${isBest ? "text-emerald-400" : isWorst ? "text-red-400" : "text-white/30"}`}>
                    {DAY_LABELS[i]}
                  </p>
                  {best && <p className="text-[9px] text-white/40 mt-0.5">{fmtBRL(best.avgCpl)}</p>}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-white/25 mt-2">Verde = melhor CPL · Vermelho = pior CPL</p>
        </Section>
      )}

      {dna.keyLearnings.length > 0 && (
        <Section title="Aprendizados estrategicos" icon={Zap}>
          <div className="space-y-3">
            {dna.keyLearnings.slice(0, 5).map((l, i) => {
              const conf = Math.round(l.confidence * 100);
              const confColor = conf >= 70 ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
                : conf >= 40 ? "text-amber-400 border-amber-500/20 bg-amber-500/5"
                : "text-white/30 border-white/[0.06] bg-white/[0.02]";
              return (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 size={14} className="text-purple-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[13px] text-white/80 leading-relaxed">{l.learning}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold ${confColor}`}>
                        {conf}% confianca
                      </span>
                      <span className="text-[9px] text-white/20">
                        {new Date(l.discoveredAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {dna.seasonalityPatterns.length > 0 && (
        <Section title="Sazonalidade identificada" icon={TrendingUp}>
          <div className="space-y-2">
            {dna.seasonalityPatterns.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <span className="text-sm text-white/60">{MES_LABELS[s.month - 1]}</span>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className={s.cplDeltaPct > 0 ? "text-red-400" : "text-emerald-400"}>
                    CPL {s.cplDeltaPct > 0 ? "+" : ""}{s.cplDeltaPct.toFixed(0)}%
                  </span>
                  <span className={s.roasDeltaPct > 0 ? "text-emerald-400" : "text-red-400"}>
                    ROAS {s.roasDeltaPct > 0 ? "+" : ""}{s.roasDeltaPct.toFixed(0)}%
                  </span>
                  <span className="text-white/30 text-[10px] italic">{s.note}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <FileText size={14} className="text-white/20 mt-0.5 shrink-0" />
        <p className="text-[11px] text-white/30 leading-relaxed">
          Este relatorio e gerado automaticamente pela Erizon com base em {dna.nSnapshotsAnalyzed} snapshots de dados reais.
          Periodo: {dna.periodStart ? new Date(dna.periodStart).toLocaleDateString("pt-BR") : "-"} a{" "}
          {dna.periodEnd ? new Date(dna.periodEnd).toLocaleDateString("pt-BR") : "-"}.
          Compartilhe este documento com seu cliente como prova de inteligencia estrategica acumulada.
        </p>
      </div>
    </div>
  );
}

export default function RelatorioDNAClient() {
  const params = useSearchParams();
  const clienteIdParam = params.get("cliente");

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState(clienteIdParam ?? "");
  const [dna, setDna] = useState<DNAProfile | null>(null);
  const [clienteNome, setClienteNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingC, setLoadingC] = useState(true);

  useEffect(() => {
    fetch("/api/clientes")
      .then(r => r.json())
      .then(json => {
        const payload =
          json && typeof json === "object" && "clientes" in json
            ? asArray<Record<string, unknown>>((json as { clientes?: unknown }).clientes)
            : asArray<Record<string, unknown>>(json);

        const lista: Cliente[] = payload.map((c) => ({
          id: String(c.id ?? ""),
          nome: String(c.nome_cliente ?? c.nome ?? "-"),
          cor: typeof c.cor === "string" ? c.cor : undefined,
        }));
        setClientes(lista);
        if (!clienteId && lista.length > 0) setClienteId(lista[0].id);
      })
      .finally(() => setLoadingC(false));
  }, []);

  useEffect(() => {
    if (!clienteId) return;
    const c = clientes.find(x => x.id === clienteId);
    if (c) setClienteNome(c.nome);
    setLoading(true);
    setDna(null);
    fetch(`/api/clientes/${clienteId}/dna`)
      .then(r => r.json())
      .then(data => { if (data.ok && data.dna) setDna(data.dna); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clienteId, clientes]);

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <Sidebar />
      <div className="md:ml-[60px] pb-20 md:pb-0 min-h-screen bg-[#040406] text-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <p className="text-[11px] text-purple-400 font-semibold uppercase tracking-wider mb-1">Relatorio Premium</p>
              <h1 className="text-2xl font-bold text-white">Profit DNA</h1>
              <p className="text-sm text-white/40 mt-1">
                Inteligencia acumulada do cliente. Entregue mensalmente e justifique seu valor como gestor.
              </p>
            </div>
            {dna && (
              <button onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm font-medium hover:bg-purple-500/20 transition-all">
                <Download size={14} />
                Exportar PDF
              </button>
            )}
          </div>

          {loadingC ? (
            <div className="flex justify-center py-20"><Loader2 size={20} className="animate-spin text-purple-400" /></div>
          ) : (
            <>
              <div className="flex items-center gap-3 flex-wrap mb-6">
                {clientes.map(c => (
                  <button key={c.id} onClick={() => setClienteId(c.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                      clienteId === c.id
                        ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
                        : "border-white/[0.06] bg-white/[0.02] text-white/50 hover:text-white"
                    }`}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor ?? "#6366f1" }} />
                    {c.nome}
                    {clienteId === c.id && <ChevronRight size={13} />}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 size={20} className="animate-spin text-purple-400" />
                  <p className="text-white/30 text-sm">Processando inteligencia acumulada...</p>
                </div>
              ) : !dna ? (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
                  <BarChart3 size={32} className="text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">Sem dados suficientes para gerar o DNA.</p>
                  <p className="text-white/20 text-xs mt-1">Sao necessarios ao menos 7 snapshots de campanha para analise.</p>
                </div>
              ) : (
                <DNAReport dna={dna} clientName={clienteNome} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
