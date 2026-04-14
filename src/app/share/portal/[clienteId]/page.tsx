"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Target,
  DollarSign,
  TrendingUp,
  BarChart3,
  Loader2,
  AlertTriangle,
  Shield,
  Users,
  CheckCircle,
  ChevronRight,
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
  period?: {
    current: { spend: number; leads: number; cpl: number | null };
    previous: { spend: number; leads: number; cpl: number | null };
    changes: { spend: number; leads: number; cpl: number };
  };
  summary?: {
    headline: string;
    owner_copy: string;
    celebration: string | null;
  };
  momentum?: {
    average_score: number;
    strong_campaigns: number;
    needs_attention: number;
  };
  benchmarks?: {
    cpl_median: number | null;
    roas_median: number | null;
    confidence_score: number | null;
  };
}

const fmtBRL = (value: number) =>
  `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (value: number) => value.toLocaleString("pt-BR");
const fmtPct = (value: number) => `${value.toFixed(2)}%`;

function PortalPublicoInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const clienteId = params?.clienteId as string;
  const crmTokenParam = searchParams?.get("crm");

  const [data, setData] = useState<PortalData | null>(null);
  const [leads, setLeads] = useState<LeadsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const crmToken = crmTokenParam ?? data?.crm_token ?? null;

  useEffect(() => {
    if (!clienteId) return;

    Promise.all([
      fetch(`/api/cliente-publico/${clienteId}`),
      fetch(`/api/cliente-publico/${clienteId}/leads`),
    ])
      .then(async ([r1, r2]) => {
        if (!r1.ok) {
          const payload = await r1.json();
          throw new Error(payload.error ?? "Nao encontrado");
        }
        const [portalData, leadsData] = await Promise.all([r1.json(), r2.ok ? r2.json() : null]);
        setData(portalData as PortalData);
        if (leadsData) setLeads(leadsData as LeadsData);
      })
      .catch((error: Error) => setErro(error.message))
      .finally(() => setLoading(false));
  }, [clienteId]);

  const atualizado = data?.ultima_atualizacao
    ? new Date(data.ultima_atualizacao).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="min-h-screen bg-[#040406] text-white">
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            {data && (
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: data.cor }}
              >
                {data.nome.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-semibold text-white">{data ? data.nome : "Portal do Cliente"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-white/25">
            <Shield size={11} />
            Powered by Erizon
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={24} className="animate-spin text-purple-400" />
          </div>
        ) : erro ? (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <AlertTriangle size={32} className="text-red-400/60" />
            <p className="text-sm text-white/40">Este portal nao esta disponivel.</p>
            <p className="text-xs text-white/20">{erro}</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">{data.nome}</h1>
              {atualizado && <p className="mt-1 text-[12px] text-white/30">Dados atualizados em {atualizado}</p>}
            </div>

            {data.summary && (
              <div className="rounded-[24px] border border-white/[0.06] bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.2),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-300/80">Resumo do periodo</p>
                <h2 className="mt-2 text-[24px] font-black text-white">{data.summary.headline}</h2>
                <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-white/65">{data.summary.owner_copy}</p>
                {data.summary.celebration && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300">
                    <CheckCircle size={13} />
                    {data.summary.celebration}
                  </div>
                )}
              </div>
            )}

            {crmToken && (
              <a
                href={`/crm/cliente/${crmToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-full items-center justify-between rounded-2xl border border-indigo-500/25 bg-indigo-500/10 px-5 py-4 transition-colors hover:bg-indigo-500/15"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20">
                    <Users size={16} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Acessar meu CRM</p>
                    <p className="text-[11px] text-white/40">Veja seus leads, mova pelo pipeline e registre fechamentos</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-white/30 transition-colors group-hover:text-white/60" />
              </a>
            )}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { icon: DollarSign, label: "Investimento", value: fmtBRL(data.gasto_total) },
                { icon: Target, label: "Total de leads", value: fmtNum(data.total_leads) },
                { icon: TrendingUp, label: "CPL medio", value: data.cpl_medio > 0 ? fmtBRL(data.cpl_medio) : "-" },
                { icon: BarChart3, label: "Campanhas ativas", value: String(data.campanhas_ativas) },
              ].map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="rounded-lg bg-purple-500/10 p-1.5">
                      <metric.icon size={12} className="text-purple-400" />
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-white/35">{metric.label}</span>
                  </div>
                  <p className="text-xl font-bold text-white">{metric.value}</p>
                </div>
              ))}
            </div>

            {data.period && (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">vs periodo anterior</p>
                  <p className="mt-2 text-[23px] font-black text-white">
                    {data.period.changes.leads > 0 ? "+" : ""}
                    {data.period.changes.leads}%
                  </p>
                  <p className="mt-1 text-[11px] text-white/45">volume de leads</p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">custo por lead</p>
                  <p className="mt-2 text-[23px] font-black text-white">
                    {data.period.changes.cpl > 0 ? "+" : ""}
                    {data.period.changes.cpl}%
                  </p>
                  <p className="mt-1 text-[11px] text-white/45">como mudou no periodo</p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">qualidade geral</p>
                  <p className="mt-2 text-[23px] font-black text-white">{data.momentum?.average_score ?? 0}/100</p>
                  <p className="mt-1 text-[11px] text-white/45">score medio das campanhas</p>
                </div>
              </div>
            )}

            {(data.momentum || data.benchmarks) && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.05] p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-300/80">o que esta funcionando</p>
                  <p className="mt-2 text-[20px] font-black text-white">{data.momentum?.strong_campaigns ?? 0} campanhas fortes</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-white/60">
                    {data.momentum?.needs_attention
                      ? `${data.momentum.needs_attention} ainda precisam de ajuste para melhorar o ritmo.`
                      : "Nenhuma campanha forte em risco agora."}
                  </p>
                </div>
                <div className="rounded-2xl border border-indigo-500/15 bg-indigo-500/[0.05] p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-indigo-200/80">comparativo visual</p>
                  <p className="mt-2 text-[20px] font-black text-white">
                    {data.benchmarks?.cpl_median
                      ? `CPL historico R$ ${fmtNum(Math.round(data.benchmarks.cpl_median))}`
                      : "Benchmark interno em formacao"}
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-white/60">
                    {data.benchmarks?.roas_median
                      ? `ROAS mediano ${data.benchmarks.roas_median.toFixed(2)}x nas janelas anteriores.`
                      : "Quanto mais historico voce acumula, mais preciso fica o espelho de evolucao."}
                  </p>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <div className="border-b border-white/[0.05] px-5 py-4">
                <h2 className="text-sm font-semibold text-white">Campanhas ativas</h2>
                <p className="mt-0.5 text-[11px] text-white/30">Visao operacional das campanhas em andamento</p>
              </div>

              {data.campanhas.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-sm text-white/30">Nenhuma campanha ativa no momento.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {data.campanhas.map((campanha, index) => (
                    <div key={`${campanha.nome_campanha}-${index}`} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">{campanha.nome_campanha}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-3">
                            <span className="text-[11px] text-white/40">{fmtBRL(campanha.gasto_total)} investido</span>
                            <span className="text-white/15">·</span>
                            <span className="text-[11px] text-white/40">{fmtNum(campanha.total_leads)} leads</span>
                            {campanha.total_leads > 0 && (
                              <>
                                <span className="text-white/15">·</span>
                                <span className="text-[11px] text-white/40">CPL {fmtBRL(campanha.cpl)}</span>
                              </>
                            )}
                            <span className="text-white/15">·</span>
                            <span className="text-[11px] text-white/40">CTR {fmtPct(campanha.ctr)}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] font-semibold text-white/70">{campanha.score}/100</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/35">{campanha.recomendacao}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {leads && leads.total > 0 && (
              <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Pipeline de Leads</h2>
                    <p className="mt-0.5 text-[11px] text-white/30">
                      {leads.total} leads · {leads.taxa_fechamento}% taxa de fechamento
                    </p>
                  </div>
                  {leads.total_fechado > 0 && (
                    <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-400">
                      <CheckCircle size={14} />
                      {fmtBRL(leads.total_fechado)}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-2 px-5 py-4">
                  {[
                    { key: "novo", label: "Novos", color: "#6366f1" },
                    { key: "contato", label: "Contato", color: "#f59e0b" },
                    { key: "proposta", label: "Proposta", color: "#3b82f6" },
                    { key: "fechado", label: "Fechados", color: "#10b981" },
                    { key: "perdido", label: "Perdidos", color: "#ef4444" },
                  ].map((stage) => {
                    const count = leads.por_estagio[stage.key as keyof typeof leads.por_estagio];
                    return (
                      <div key={stage.key} className="text-center">
                        <div className="text-lg font-bold" style={{ color: stage.color }}>{count}</div>
                        <div className="mt-0.5 text-[10px] text-white/30">{stage.label}</div>
                      </div>
                    );
                  })}
                </div>

                {leads.recentes.length > 0 && (
                  <div className="divide-y divide-white/[0.04] border-t border-white/[0.05]">
                    {leads.recentes.map((lead, index) => {
                      const stageColor: Record<string, string> = {
                        novo: "#6366f1",
                        contato: "#f59e0b",
                        proposta: "#3b82f6",
                        fechado: "#10b981",
                        perdido: "#ef4444",
                      };
                      const stageLabel: Record<string, string> = {
                        novo: "Novo",
                        contato: "Contato",
                        proposta: "Proposta",
                        fechado: "Fechado",
                        perdido: "Perdido",
                      };

                      return (
                        <div key={`${lead.nome}-${index}`} className="flex items-center justify-between gap-4 px-5 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                              style={{ background: `${stageColor[lead.estagio]}33`, color: stageColor[lead.estagio] }}
                            >
                              {lead.nome.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm text-white/80">{lead.nome}</p>
                              {lead.campanha_nome && <p className="truncate text-[10px] text-white/30">via {lead.campanha_nome}</p>}
                            </div>
                          </div>
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[10px]"
                            style={{ background: `${stageColor[lead.estagio]}22`, color: stageColor[lead.estagio] }}
                          >
                            {stageLabel[lead.estagio]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
              <Shield size={13} className="mt-0.5 shrink-0 text-white/20" />
              <p className="text-[11px] leading-relaxed text-white/25">
                Este portal exibe dados operacionais de investimento, leads e CTR. Informacoes de margem e receita nao sao compartilhadas.
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#040406] flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
        </div>
      }
    >
      <PortalPublicoInner />
    </Suspense>
  );
}
