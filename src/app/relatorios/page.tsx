"use client";

// app/relatorios/page.tsx — Relatórios por Cliente
// Geração de relatório executivo pré-reunião: métricas reais por cliente.
// O gestor seleciona o cliente, visualiza, e exporta para PDF.

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Loader2, Users,
  DollarSign, Target, TrendingUp, BarChart3,
  CheckCircle2, AlertTriangle, XCircle, Printer,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Cliente {
  id: string;
  nome: string;
  cor?: string;
}

interface CampanhaRelatorio {
  id: string;
  nome: string;
  status: string;
  gasto: number;
  leads: number;
  receita: number;
  cpl: number;
  roas: number;
  ctr: number;
  score: number;
}

interface Totais {
  campanhas: number;
  investimento: number;
  leads: number;
  receita: number;
  cplMedio: number;
  roasMedio: number;
}

interface Relatorio {
  titulo: string;
  cliente: string;
  dataGeracao: string;
  totais: Totais;
  campanhas: CampanhaRelatorio[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtBRL  = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum  = (v: number) => v.toLocaleString("pt-BR");
const fmtX    = (v: number) => `${v.toFixed(2)}x`;
const fmtPct  = (v: number) => `${v.toFixed(2)}%`;

function scoreIcon(score: number) {
  if (score >= 75) return <CheckCircle2 size={13} className="text-emerald-400" />;
  if (score >= 50) return <AlertTriangle size={13} className="text-yellow-400" />;
  return <XCircle size={13} className="text-red-400" />;
}

function scoreLabel(score: number) {
  if (score >= 75) return "Saudável";
  if (score >= 50) return "Atenção";
  return "Crítica";
}

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType; label: string; value: string; sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-purple-500/10">
          <Icon size={13} className="text-purple-400" />
        </div>
        <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="text-[11px] text-white/30 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Relatorio View ───────────────────────────────────────────────────────────
function RelatorioView({ rel }: { rel: Relatorio }) {
  function handlePrint() {
    window.print();
  }

  const top3 = [...rel.campanhas]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const criticas = rel.campanhas.filter(c => c.score < 50);

  return (
    <div className="space-y-6">
      {/* Header do relatório */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">{rel.titulo}</h2>
          <p className="text-[11px] text-white/30 mt-0.5">Gerado em {rel.dataGeracao}</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10 text-sm text-purple-300 hover:bg-purple-500/20 transition-all font-medium"
        >
          <Printer size={13} />
          Imprimir / PDF
        </button>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <SummaryCard icon={BarChart3}   label="Campanhas" value={String(rel.totais.campanhas)} />
        <SummaryCard icon={DollarSign}  label="Investimento" value={fmtBRL(rel.totais.investimento)} />
        <SummaryCard icon={Target}      label="Total leads" value={fmtNum(rel.totais.leads)} />
        <SummaryCard icon={TrendingUp}  label="CPL médio" value={rel.totais.cplMedio > 0 ? fmtBRL(rel.totais.cplMedio) : "—"} />
        <SummaryCard icon={TrendingUp}  label="ROAS médio" value={fmtX(rel.totais.roasMedio)} />
        <SummaryCard icon={DollarSign}  label="Receita estimada" value={fmtBRL(rel.totais.receita)} />
      </div>

      {/* Destaques */}
      {(top3.length > 0 || criticas.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-4">
          {top3.length > 0 && (
            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-5">
              <h3 className="text-sm font-semibold text-emerald-400 mb-3">🏆 Top campanhas</h3>
              <div className="space-y-2">
                {top3.map((c, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[12px] text-white/70 truncate flex-1 mr-3">{c.nome}</span>
                    <span className="text-[11px] text-emerald-400 font-bold shrink-0">Score {c.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {criticas.length > 0 && (
            <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-5">
              <h3 className="text-sm font-semibold text-red-400 mb-3">⚠️ Requerem atenção</h3>
              <div className="space-y-2">
                {criticas.slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[12px] text-white/70 truncate flex-1 mr-3">{c.nome}</span>
                    <span className="text-[11px] text-red-400 font-bold shrink-0">Score {c.score}</span>
                  </div>
                ))}
                {criticas.length > 3 && (
                  <p className="text-[11px] text-red-400/50">+{criticas.length - 3} outras</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabela completa */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05]">
          <h3 className="text-sm font-semibold text-white">Detalhamento por campanha</h3>
        </div>

        {rel.campanhas.length === 0 ? (
          <div className="px-5 py-10 text-center text-white/30 text-sm">Nenhuma campanha encontrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {["Campanha", "Status", "Investimento", "Leads", "CPL", "ROAS", "CTR", "Score"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] text-white/30 font-semibold uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {rel.campanhas.map((c, i) => (
                  <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-white/80 text-[12px] max-w-[180px] block truncate">{c.nome}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        c.status === "ATIVO" || c.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-white/5 text-white/30"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-white/70">{fmtBRL(c.gasto)}</td>
                    <td className="px-4 py-3 text-[12px] text-white/70">{fmtNum(c.leads)}</td>
                    <td className="px-4 py-3 text-[12px] text-white/70">{c.leads > 0 ? fmtBRL(c.cpl) : "—"}</td>
                    <td className="px-4 py-3 text-[12px] text-white/70">{fmtX(c.roas)}</td>
                    <td className="px-4 py-3 text-[12px] text-white/70">{fmtPct(c.ctr)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {scoreIcon(c.score)}
                        <span className={`text-[11px] font-bold ${scoreColor(c.score)}`}>{c.score}</span>
                        <span className="text-[10px] text-white/30">{scoreLabel(c.score)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const [clientes, setClientes]     = useState<Cliente[]>([]);
  const [clienteId, setClienteId]   = useState("");
  const [relatorio, setRelatorio]   = useState<Relatorio | null>(null);
  const [loadingC, setLoadingC]     = useState(true);
  const [loadingR, setLoadingR]     = useState(false);
  const [erro, setErro]             = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clientes")
      .then(r => r.json())
      .then(json => {
        const lista: Cliente[] = (json.clientes ?? json ?? []).map((c: { id: string; nome_cliente?: string; nome?: string; cor?: string }) => ({
          id: c.id,
          nome: c.nome_cliente ?? c.nome ?? "—",
          cor: c.cor,
        }));
        setClientes(lista);
        if (lista.length > 0) setClienteId(lista[0].id);
      })
      .finally(() => setLoadingC(false));
  }, []);

  useEffect(() => {
    if (!clienteId) return;
    async function carregarRelatorio() {
      setLoadingR(true);
      setErro(null);
      setRelatorio(null);
      try {
        const r = await fetch(`/api/relatorio-pdf?cliente_id=${clienteId}`);
        if (!r.ok) throw new Error("Erro");
        const json = await r.json();
        if (json.ok && json.relatorio) setRelatorio(json.relatorio);
        else setErro("Nenhum dado encontrado para este cliente.");
      } catch {
        setErro("Erro ao gerar relatório.");
      } finally {
        setLoadingR(false);
      }
    }
    void carregarRelatorio();
  }, [clienteId]);

  return (
    <>
      <Sidebar />
      <div className="ml-[60px] min-h-screen bg-[#040406] text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="mb-8">
            <p className="text-[11px] text-purple-400 font-semibold uppercase tracking-wider mb-1">Relatórios</p>
            <h1 className="text-2xl font-bold text-white">Relatórios Executivos</h1>
            <p className="text-sm text-white/40 mt-1">
              Métricas consolidadas por cliente para reuniões e apresentações.
            </p>
          </div>

          {loadingC ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={20} className="animate-spin text-purple-400" />
            </div>
          ) : clientes.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
              <Users size={32} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">Nenhum cliente cadastrado.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Seletor de cliente */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-[11px] text-white/30 mb-3 font-medium uppercase tracking-wider">Selecionar cliente</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {clientes.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setClienteId(c.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                        clienteId === c.id
                          ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
                          : "border-white/[0.06] text-white/50 hover:text-white hover:border-white/20"
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor ?? "#6366f1" }} />
                      {c.nome}
                    </button>
                  ))}
                </div>
              </div>

              {loadingR ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={18} className="animate-spin text-purple-400" />
                </div>
              ) : erro ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">{erro}</div>
              ) : relatorio ? (
                <RelatorioView rel={relatorio} />
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          aside, .no-print { display: none !important; }
          .ml-\\[60px\\] { margin-left: 0 !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>
    </>
  );
}
