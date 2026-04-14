"use client";

// app/decision-feed/page.tsx — Decision Feed v2
// Fila de decisões + guia de escala estruturado com passos, intervalos e sinais de alerta.

import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";

import { getSupabase } from "@/lib/supabase";
import { TrendingUp, AlertTriangle, Pause, ArrowUpRight, Eye, ChevronDown, ChevronUp, ShieldCheck, Zap } from "lucide-react";
import { useSessionGuard } from "@/app/hooks/useSessionGuard";

interface Campanha {
  id: string;
  nome_campanha: string;
  gasto_total: number;
  contatos: number;
  receita_estimada: number;
  ctr: number;
  cpm: number;
  dias_ativo: number;
  status: string;
}

interface GuiaEscala {
  percentual: number;
  novoOrcamentoDia: number;
  intervaloSeguro: string;
  riscoAprendizado: "baixo" | "medio" | "alto";
  passos: string[];
  sinaisDeAlerta: string[];
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
  guiaEscala?: GuiaEscala;
}

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function calcularGuiaEscala(gastoDiario: number, roas: number, diasAtivo: number): GuiaEscala {
  // Quanto mais nova a campanha, menor o percentual seguro (preservar aprendizado)
  const percentual = diasAtivo < 14 ? 15 : diasAtivo < 30 ? 20 : 30;
  const novoOrcamentoDia = gastoDiario * (1 + percentual / 100);

  // Risco de quebrar fase de aprendizado
  const riscoAprendizado: GuiaEscala["riscoAprendizado"] =
    diasAtivo < 7 ? "alto" : diasAtivo < 21 ? "medio" : "baixo";

  // Intervalo mínimo entre ajustes
  const intervaloSeguro =
    riscoAprendizado === "alto" ? "7 dias entre ajustes" :
    riscoAprendizado === "medio" ? "3-5 dias entre ajustes" :
    "48-72h entre ajustes";

  const passos = [
    `Aumentar orçamento em ${percentual}% — de ${fmtBRL(gastoDiario)}/dia para ${fmtBRL(novoOrcamentoDia)}/dia`,
    `Aguardar ${intervaloSeguro} antes de qualquer novo ajuste`,
    "Monitorar CPL nas primeiras 48h — se subir >30%, reverter",
    "Verificar frequência — se passar de 3.5× adicionar novos criativos",
    roas >= 4
      ? "ROAS alto — considerar duplicar conjunto para escala horizontal"
      : "Testar Lookalike 1-3% paralelo para ampliar alcance sem estressar público atual",
    `Meta: manter ROAS acima de ${(roas * 0.8).toFixed(1)}× após escala`,
  ];

  const sinaisDeAlerta = [
    "CPL subiu >30% em 48h → reverter para orçamento anterior",
    "CTR caiu abaixo de 0.5% → trocar criativo antes de continuar escalando",
    "Frequência >4.0× → pausar e criar novos criativos",
    "ROAS abaixo de 1.5× por 3 dias consecutivos → pausar e revisar segmentação",
  ];

  return { percentual, novoOrcamentoDia, intervaloSeguro, riscoAprendizado, passos, sinaisDeAlerta };
}

function gerarDecisoes(campanhas: Campanha[]): Decisao[] {
  const decisoes: Decisao[] = [];
  for (const c of campanhas) {
    if (c.gasto_total === 0) continue;
    const nome = (c.nome_campanha ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const isAwareness = /alcance|reach|awareness|trafego|traffic/.test(nome);
    const roas = c.receita_estimada / c.gasto_total;
    const cpl  = c.contatos > 0 ? c.gasto_total / c.contatos : 999;
    const gastoDiario = c.dias_ativo > 0 ? c.gasto_total / c.dias_ativo : c.gasto_total;
    const conf = Math.min(95, Math.max(50, Math.round(60 + (c.dias_ativo / 30) * 20 + (c.gasto_total / 1000) * 5)));

    if (c.contatos === 0 && c.gasto_total > 100 && !isAwareness) {
      decisoes.push({
        campanhaId: c.id, campanhaNome: c.nome_campanha,
        titulo: `Pausar "${c.nome_campanha}"`,
        motivo: `${fmtBRL(c.gasto_total)} investidos sem nenhum lead em ${c.dias_ativo} dias.`,
        impacto: `Economia de ${fmtBRL(gastoDiario * 30)}/mês se pausada agora.`,
        confianca: conf, prioridade: "Crítica", tipo: "pausar", gastoDiario,
      });
      continue;
    }
    if (roas < 1 && c.gasto_total > 200 && !isAwareness) {
      decisoes.push({
        campanhaId: c.id, campanhaNome: c.nome_campanha,
        titulo: `Pausar "${c.nome_campanha}"`,
        motivo: `ROAS de ${roas.toFixed(2)}× abaixo de 1 — cada R$1 investido retorna ${fmtBRL(roas)}.`,
        impacto: `Pausar evita perda estimada de ${fmtBRL((c.gasto_total - c.receita_estimada) / Math.max(c.dias_ativo, 1) * 30)}/mês.`,
        confianca: conf, prioridade: "Crítica", tipo: "pausar", gastoDiario,
      });
      continue;
    }
    if (roas >= 2.5 && cpl < 80 && c.ctr > 1) {
      decisoes.push({
        campanhaId: c.id, campanhaNome: c.nome_campanha,
        titulo: `Escalar "${c.nome_campanha}"`,
        motivo: `ROAS ${roas.toFixed(2)}× com CPL de ${fmtBRL(cpl)} e CTR ${c.ctr.toFixed(2)}% — campanha madura com headroom de escala.`,
        impacto: `+${fmtBRL(gastoDiario * (calcularGuiaEscala(gastoDiario, roas, c.dias_ativo).percentual / 100) * roas * 30)}/mês estimado.`,
        confianca: conf, prioridade: "Alta", tipo: "escalar", gastoDiario,
        guiaEscala: calcularGuiaEscala(gastoDiario, roas, c.dias_ativo),
      });
      continue;
    }
    if (cpl > 100 && c.contatos > 0) {
      decisoes.push({
        campanhaId: c.id, campanhaNome: c.nome_campanha,
        titulo: `Revisar criativos de "${c.nome_campanha}"`,
        motivo: `CPL de ${fmtBRL(cpl)} acima do ideal. CTR ${c.ctr.toFixed(2)}% indica oportunidade no criativo.`,
        impacto: `Redução de 30% no CPL poderia gerar ${Math.round(c.contatos * 0.3)} leads extras no mesmo orçamento.`,
        confianca: Math.max(50, conf - 10), prioridade: "Média", tipo: "monitorar", gastoDiario,
      });
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

const RISCO_BADGE = {
  baixo: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  medio: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  alto:  "text-red-400 bg-red-500/10 border-red-500/20",
};

function GuiaEscalaCard({ guia }: { guia: GuiaEscala }) {
  useSessionGuard();

  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-emerald-400" />
          <span className="text-[12px] font-semibold text-emerald-400">Guia de Escala Segura</span>
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${RISCO_BADGE[guia.riscoAprendizado]}`}>
            risco {guia.riscoAprendizado} de quebrar aprendizado
          </span>
        </div>
        {open ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-emerald-500/10 pt-3">
          {/* Passos */}
          <div>
            <p className="text-[9px] uppercase tracking-widest text-white/25 mb-2">Passos recomendados</p>
            <ol className="space-y-1.5">
              {guia.passos.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-white/60">
                  <span className="text-emerald-400/70 font-bold shrink-0 mt-px">{i + 1}.</span>
                  {p}
                </li>
              ))}
            </ol>
          </div>

          {/* Sinais de alerta */}
          <div className="rounded-lg bg-red-500/[0.05] border border-red-500/15 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldCheck size={11} className="text-red-400" />
              <p className="text-[9px] uppercase tracking-widest text-red-400/60">Sinais de alerta — reverter se:</p>
            </div>
            <ul className="space-y-1">
              {guia.sinaisDeAlerta.map((s, i) => (
                <li key={i} className="text-[11px] text-white/45 flex items-start gap-1.5">
                  <span className="text-red-400/50 shrink-0">⚠</span>{s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DecisionFeedPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from("metricas_ads").select("*")
          .eq("user_id", user.id).in("status", ["ATIVO", "ACTIVE", "ATIVA"])
          .order("gasto_total", { ascending: false });
        setCampanhas((data ?? []) as Campanha[]);
      } catch {
        setCampanhas([]);
      }
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
      <div className="md:ml-[60px] pb-20 md:pb-0 min-h-screen bg-[#040406] text-white">
        <div className="max-w-4xl mx-auto px-4 py-6 md:px-6 md:py-8">

          <div className="mb-8">
            <p className="text-[11px] text-fuchsia-400 font-semibold uppercase tracking-wider mb-1">Decision Engine</p>
            <h1 className="text-2xl font-bold text-white">Decision Feed</h1>
            <p className="text-sm text-white/40 mt-1">
              Decisões prioritárias com guia de execução — o que fazer, quando e como.
            </p>
          </div>

          {!loading ? (
            <div className="space-y-5">
              {decisoes.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { label: "Críticas", count: criticas, color: "text-red-400" },
                    { label: "Altas",    count: altas,    color: "text-amber-400" },
                    { label: "Total",    count: decisoes.length, color: "text-white" },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                      <p className="text-[11px] text-white/30 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {criticas > 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                  <AlertTriangle size={15} className="text-red-400 shrink-0" />
                  <p className="text-sm text-red-300">
                    <span className="font-semibold">{criticas} decisão{criticas > 1 ? "ões" : ""} crítica{criticas > 1 ? "s" : ""}</span> precisam de atenção imediata.
                  </p>
                </div>
              )}

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
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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

                          {/* Ação rápida para pausar/monitorar */}
                          {d.tipo !== "escalar" && (
                            <div className="mt-3 rounded-xl bg-fuchsia-500/[0.05] border border-fuchsia-500/15 px-3 py-2">
                              <p className="text-[12px] text-white/60">
                                {d.tipo === "pausar"    && "→ Pausar campanha no Meta Ads Manager e revisar público + criativo"}
                                {d.tipo === "monitorar" && "→ Revisar criativos e segmentação. Testar nova variação de copy."}
                              </p>
                            </div>
                          )}

                          {/* Guia de escala expandível */}
                          {d.tipo === "escalar" && d.guiaEscala && (
                            <GuiaEscalaCard guia={d.guiaEscala} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
