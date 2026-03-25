// app/share/portal/[clienteId]/page.tsx
// Página pública do cliente — acessível sem login via link compartilhado.
// Exibe: investimento, leads, CPL, campanhas ativas.
// NÃO exibe: margem, receita, dados internos.

"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Target, DollarSign, TrendingUp, BarChart3,
  Loader2, AlertTriangle, Shield, Users, CheckCircle, ChevronRight,
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

interface LeadRecente {
  nome: string;
  estagio: string;
  campanha_nome: string | null;
  plataforma: string | null;
  created_at: string;
}

interface LeadsData {
  total: number;
  por_estagio: { novo: number; contato: number; proposta: number; fechado: number; perdido: number };
  total_fechado: number;
  taxa_fechamento: number;
  recentes: LeadRecente[];
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
  crm_token?: string | null;
}

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (v: number) => v.toLocaleString("pt-BR");
const fmtPct = (v: number) => `${v.toFixed(2)}%`;

function PortalPublicoInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const clienteId = params?.clienteId as string;
  const crmTokenParam = searchParams?.get('crm');

  const [data, setData]       = useState<PortalData | null>(null);
  const [leads, setLeads]     = useState<LeadsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro]       = useState<string | null>(null);

  // crm_token vem da API ou do query param
  const crmToken = crmTokenParam ?? data?.crm_token ?? null;

  useEffect(() => {
    if (!clienteId) return;
    Promise.all([
      fetch(`/api/cliente-publico/${clienteId}`),
      fetch(`/api/cliente-publico/${clienteId}/leads`),
    ])
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(async ([r1, r2]) => {
        if (!r1.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const j = await r1.json() as any;
          throw new Error(j.error ?? "Não encontrado");
        }
        const [d, l] = await Promise.all([r1.json(), r2.ok ? r2.json() : null]);
        setData(d as PortalData);
        if (l) setLeads(l as LeadsData);
      })
      .catch((e: Error) => setErro(e.message))
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


            {/* Botão CRM do cliente */}
            {crmToken && (
              <a
                href={`/crm/cliente/${crmToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full bg-indigo-500/10 border border-indigo-500/25 rounded-2xl px-5 py-4 hover:bg-indigo-500/15 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <Users size={16} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Acessar meu CRM</p>
                    <p className="text-[11px] text-white/40">Veja seus leads, mova pelo pipeline e registre fechamentos</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-white/30 group-hover:text-white/60 transition-colors" />
              </a>
            )}

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
                          <span className="text-[11px] text-white/30">{fmtBRL(c.gasto_total)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pipeline de leads */}
            {leads && leads.total > 0 && (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Pipeline de Leads</h2>
                    <p className="text-[11px] text-white/30 mt-0.5">{leads.total} leads · {leads.taxa_fechamento}% taxa de fechamento</p>
                  </div>
                  {leads.total_fechado > 0 && (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                      <CheckCircle size={14} />
                      {fmtBRL(leads.total_fechado)}
                    </div>
                  )}
                </div>

                {/* Barra de estágios */}
                <div className="px-5 py-4 grid grid-cols-5 gap-2">
                  {[
                    { key: "novo",     label: "Novos",    cor: "#6366f1" },
                    { key: "contato",  label: "Contato",  cor: "#f59e0b" },
                    { key: "proposta", label: "Proposta", cor: "#3b82f6" },
                    { key: "fechado",  label: "Fechados", cor: "#10b981" },
                    { key: "perdido",  label: "Perdidos", cor: "#ef4444" },
                  ].map(e => {
                    const count = leads.por_estagio[e.key as keyof typeof leads.por_estagio];
                    return (
                      <div key={e.key} className="text-center">
                        <div
                          className="text-lg font-bold"
                          style={{ color: e.cor }}
                        >{count}</div>
                        <div className="text-[10px] text-white/30 mt-0.5">{e.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Leads recentes */}
                {leads.recentes.length > 0 && (
                  <div className="border-t border-white/[0.05] divide-y divide-white/[0.04]">
                    {leads.recentes.map((l, i) => {
                      const ESTAGIO_COR: Record<string, string> = {
                        novo: "#6366f1", contato: "#f59e0b", proposta: "#3b82f6",
                        fechado: "#10b981", perdido: "#ef4444",
                      };
                      const ESTAGIO_LABEL: Record<string, string> = {
                        novo: "Novo", contato: "Contato", proposta: "Proposta",
                        fechado: "Fechado", perdido: "Perdido",
                      };
                      return (
                        <div key={i} className="px-5 py-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                              style={{ background: ESTAGIO_COR[l.estagio] + "33", color: ESTAGIO_COR[l.estagio] }}
                            >
                              {l.nome.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-white/80 truncate">{l.nome}</p>
                              {l.campanha_nome && (
                                <p className="text-[10px] text-white/30 truncate">via {l.campanha_nome}</p>
                              )}
                            </div>
                          </div>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
                            style={{
                              background: ESTAGIO_COR[l.estagio] + "22",
                              color: ESTAGIO_COR[l.estagio],
                            }}
                          >
                            {ESTAGIO_LABEL[l.estagio]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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

export default function PortalPublico() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#040406] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PortalPublicoInner />
    </Suspense>
  );
}
