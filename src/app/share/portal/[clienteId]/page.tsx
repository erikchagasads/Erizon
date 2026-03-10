// app/share/portal/[clienteId]/page.tsx
// Página pública do cliente — acessível sem login via link compartilhado.
// Exibe: investimento, leads, CPL, campanhas ativas.
// NÃO exibe: margem, receita, dados internos.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Target, DollarSign, TrendingUp, BarChart3,
  Loader2, AlertTriangle, Shield,
} from "lucide-react";

interface Campanha {
  nome_campanha: string;
  status: string;
  gasto_total: number;
  total_leads: number;
  cpl: number;
  ctr: number;
  score: number;
  recomendacao: string;
}

interface PortalData {
  nome: string;
  cor: string;
  campanhas: Campanha[];
  total_leads: number;
  gasto_total: number;
  cpl_medio: number;
  campanhas_ativas: number;
  ultima_atualizacao: string | null;
}

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (v: number) => v.toLocaleString("pt-BR");
const fmtPct = (v: number) => `${v.toFixed(2)}%`;

function scoreColor(s: number) {
  if (s >= 75) return "text-emerald-400";
  if (s >= 50) return "text-yellow-400";
  return "text-red-400";
}

function recBadge(r: string) {
  const m: Record<string, string> = {
    Escalar:   "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    Manter:    "bg-blue-500/15 text-blue-400 border-blue-500/20",
    Otimizar:  "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    Pausar:    "bg-red-500/15 text-red-400 border-red-500/20",
    Maturando: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  };
  return m[r] ?? "bg-white/5 text-white/40 border-white/10";
}

export default function PortalPublico() {
  const params = useParams();
  const clienteId = params?.clienteId as string;

  const [data, setData]       = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro]       = useState<string | null>(null);

  useEffect(() => {
    if (!clienteId) return;
    fetch(`/api/cliente-publico/${clienteId}`)
      .then(r => r.ok ? r.json() : r.json().then((j: any) => Promise.reject(j.error ?? "Não encontrado")))
      .then(setData)
      .catch((e: string) => setErro(e))
      .finally(() => setLoading(false));
  }, [clienteId]);

  const atualizado = data?.ultima_atualizacao
    ? new Date(data.ultima_atualizacao).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <div className="min-h-screen bg-[#040406] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {data && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: data.cor }}>
                {data.nome.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-semibold text-white">
              {data ? data.nome : "Portal do Cliente"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-white/25">
            <Shield size={11} />
            Powered by Erizon
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={24} className="animate-spin text-purple-400" />
          </div>
        ) : erro ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <AlertTriangle size={32} className="text-red-400/60" />
            <p className="text-white/40 text-sm">Este portal não está disponível.</p>
            <p className="text-white/20 text-xs">{erro}</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Título */}
            <div>
              <h1 className="text-2xl font-bold text-white">{data.nome}</h1>
              {atualizado && (
                <p className="text-[12px] text-white/30 mt-1">Dados atualizados em {atualizado}</p>
              )}
            </div>

            {/* Cards de métricas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: DollarSign, label: "Investimento", value: fmtBRL(data.gasto_total) },
                { icon: Target,     label: "Total de leads", value: fmtNum(data.total_leads) },
                { icon: TrendingUp, label: "CPL médio", value: data.cpl_medio > 0 ? fmtBRL(data.cpl_medio) : "—" },
                { icon: BarChart3,  label: "Campanhas ativas", value: String(data.campanhas_ativas) },
              ].map(m => (
                <div key={m.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/10">
                      <m.icon size={12} className="text-purple-400" />
                    </div>
                    <span className="text-[10px] text-white/35 uppercase tracking-wider">{m.label}</span>
                  </div>
                  <p className="text-xl font-bold text-white">{m.value}</p>
                </div>
              ))}
            </div>

            {/* Tabela de campanhas */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <h2 className="text-sm font-semibold text-white">Campanhas ativas</h2>
                <p className="text-[11px] text-white/30 mt-0.5">Visão operacional das campanhas em andamento</p>
              </div>

              {data.campanhas.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-white/30 text-sm">Nenhuma campanha ativa no momento.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {data.campanhas.map((c, i) => (
                    <div key={i} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{c.nome_campanha}</p>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-[11px] text-white/40">{fmtBRL(c.gasto_total)} investido</span>
                            <span className="text-white/15">·</span>
                            <span className="text-[11px] text-white/40">{fmtNum(c.total_leads)} leads</span>
                            {c.total_leads > 0 && (
                              <>
                                <span className="text-white/15">·</span>
                                <span className="text-[11px] text-white/40">CPL {fmtBRL(c.cpl)}</span>
                              </>
                            )}
                            <span className="text-white/15">·</span>
                            <span className="text-[11px] text-white/40">CTR {fmtPct(c.ctr)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-bold ${scoreColor(c.score)}`}>{c.score}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${recBadge(c.recomendacao)}`}>
                            {c.recomendacao}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rodapé de transparência */}
            <div className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
              <Shield size={13} className="text-white/20 mt-0.5 shrink-0" />
              <p className="text-[11px] text-white/25 leading-relaxed">
                Este portal exibe dados operacionais de investimento, leads e CTR. Informações de margem e receita não são compartilhadas.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
