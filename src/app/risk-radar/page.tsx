"use client";

// app/risk-radar/page.tsx — Risk Radar v2
// Diagnóstico de causa: criativo saturado vs público esgotado vs mudança de plataforma

import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { SkeletonPage } from "@/components/ops/AppShell";
import { getSupabase } from "@/lib/supabase";
import { ShieldAlert, AlertTriangle, TrendingDown, Eye, Cpu, Users, Palette, Zap } from "lucide-react";
import { useSessionGuard } from "@/app/hooks/useSessionGuard";

interface Campanha {
  id: string;
  nome_campanha: string;
  gasto_total: number;
  contatos: number;
  receita_estimada: number;
  ctr: number;
  cpm: number;
  cpc: number;
  impressoes: number;
  dias_ativo: number;
  status: string;
  orcamento: number;
  frequencia?: number;
  alcance?: number;
}

interface RiskFlag {
  id: string;
  campanha: string;
  severidade: "Crítico" | "Alto" | "Moderado";
  diagnostico: string;
  causa: string;
  causa_raiz: "criativo" | "publico" | "plataforma" | "oferta" | "orcamento";
  acao: string;
  passos: string[];
  gastoDiario: number;
  perdaMensal: number;
}

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// Diagnóstico de causa raiz baseado em padrões de métricas
function diagnosticarCausaRaiz(c: Campanha): {
  causa_raiz: RiskFlag["causa_raiz"];
  explicacao: string;
  passos: string[];
} {
  const freq = c.frequencia ?? 0;
  const ctr  = c.ctr ?? 0;
  const cpm  = c.cpm ?? 0;
  const alcance = c.alcance ?? 0;
  const impressoes = c.impressoes ?? 0;

  // Criativo saturado: frequência alta + CTR caindo
  if (freq > 3.5 && ctr < 1.0) {
    return {
      causa_raiz: "criativo",
      explicacao: `Frequência de ${freq.toFixed(1)}× — o público já viu este anúncio muitas vezes. CTR caiu para ${ctr.toFixed(2)}% indicando fadiga criativa.`,
      passos: [
        "Criar 3-5 variações do criativo com hooks diferentes",
        "Testar formatos alternativos (vídeo vs imagem vs carrossel)",
        "Mudar o ângulo de copy — problema, solução ou prova social",
        "Resetar o anúncio pausando por 48h antes de reativar",
      ],
    };
  }

  // Público esgotado: alcance baixo + CPM subindo
  if (alcance > 0 && impressoes / alcance > 4 && cpm > 40) {
    return {
      causa_raiz: "publico",
      explicacao: `Público saturado — CPM de ${fmtBRL(cpm)} acima do esperado e frequência elevada. O algoritmo está achando difícil encontrar pessoas novas para alcançar.`,
      passos: [
        "Expandir público com Lookalike baseado nos melhores leads",
        "Adicionar interesses complementares ao conjunto atual",
        "Testar segmentação Broad (sem interesses) para alcançar novos perfis",
        "Criar campanha de remarketing separada para o público quente",
      ],
    };
  }

  // Mudança de plataforma: CPM subiu mas CTR estável
  if (cpm > 50 && ctr > 0.8 && c.contatos === 0) {
    return {
      causa_raiz: "plataforma",
      explicacao: `CPM de ${fmtBRL(cpm)} anormalmente alto com CTR razoável — padrão típico de leilão mais competitivo ou mudança de algoritmo Meta. O criativo funciona, mas o custo de entrega subiu.`,
      passos: [
        "Verificar se há sazonalidade ou evento no nicho elevando o CPM",
        "Testar horário de entrega — restringir para horários de maior conversão",
        "Revisar posicionamentos — desativar Audience Network se ativo",
        "Aguardar 48-72h pois pode ser volatilidade temporária do leilão",
      ],
    };
  }

  // Oferta/Landing: CTR ok mas sem conversão
  if (ctr > 1.0 && c.contatos === 0 && c.gasto_total > 100) {
    return {
      causa_raiz: "oferta",
      explicacao: `CTR de ${ctr.toFixed(2)}% saudável — as pessoas clicam no anúncio mas não convertem. O problema está na landing page ou na oferta, não no criativo.`,
      passos: [
        "Verificar velocidade da landing page (>3s perde 50% das conversões)",
        "Revisar alinhamento entre anúncio e landing — a promessa bate?",
        "Simplificar o formulário — menos campos = mais leads",
        "Testar uma oferta diferente (lead magnet, desconto, garantia)",
      ],
    };
  }

  // Orçamento insuficiente
  if (c.orcamento > 0 && c.gasto_total / Math.max(c.dias_ativo, 1) < c.orcamento * 0.5) {
    return {
      causa_raiz: "orcamento",
      explicacao: `Campanha gastando menos de 50% do orçamento configurado — o algoritmo não está conseguindo entregar. Público muito restrito ou lance muito baixo.`,
      passos: [
        "Ampliar público removendo restrições de segmentação",
        "Verificar se há sobreposição de público com outros conjuntos",
        "Aumentar o lance mínimo se usando CBO manual",
        "Consolidar conjuntos de anúncio para dar mais orçamento a um único",
      ],
    };
  }

  // Genérico
  return {
    causa_raiz: "criativo",
    explicacao: "Performance abaixo do esperado. Múltiplos fatores podem estar contribuindo.",
    passos: [
      "Analisar a curva de performance nos últimos 7 dias",
      "Comparar CPL atual com a média dos últimos 30 dias",
      "Testar novo criativo mantendo público igual para isolar a variável",
    ],
  };
}

function gerarRiscos(campanhas: Campanha[]): RiskFlag[] {
  const flags: RiskFlag[] = [];
  for (const c of campanhas) {
    if (c.gasto_total === 0) continue;
    // Não penalizar campanhas de awareness/tráfego por zero leads ou ROAS
    const nome = (c.nome_campanha ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const isAwareness = /alcance|reach|awareness|trafego|traffic/.test(nome);
    const roas = c.receita_estimada / c.gasto_total;
    const cpl  = c.contatos > 0 ? c.gasto_total / c.contatos : 999;
    const gastoDiario = c.dias_ativo > 0 ? c.gasto_total / c.dias_ativo : 0;
    const diag = diagnosticarCausaRaiz(c);

    if (c.contatos === 0 && c.gasto_total > 100 && !isAwareness) {
      flags.push({ id: c.id, campanha: c.nome_campanha, severidade: "Crítico",
        diagnostico: "Campanha zumbi — gasto sem conversão",
        causa: `${fmtBRL(c.gasto_total)} investidos em ${c.dias_ativo} dias sem leads. CTR ${c.ctr.toFixed(2)}%.`,
        causa_raiz: diag.causa_raiz,
        acao: diag.explicacao,
        passos: diag.passos,
        gastoDiario, perdaMensal: gastoDiario * 30 });
      continue;
    }
    if (roas > 0 && roas < 1 && c.gasto_total > 150 && !isAwareness) {
      flags.push({ id: c.id, campanha: c.nome_campanha, severidade: "Crítico",
        diagnostico: "ROAS abaixo de 1× — operação no prejuízo",
        causa: `Retorno de ${roas.toFixed(2)}× — cada R$1 investido gera ${fmtBRL(roas)} de receita.`,
        causa_raiz: diag.causa_raiz,
        acao: diag.explicacao,
        passos: diag.passos,
        gastoDiario, perdaMensal: (c.gasto_total - c.receita_estimada) / Math.max(c.dias_ativo, 1) * 30 });
      continue;
    }
    if (cpl > 150 && c.contatos > 0) {
      flags.push({ id: c.id, campanha: c.nome_campanha, severidade: "Alto",
        diagnostico: "CPL crítico — custo por lead muito elevado",
        causa: `CPL de ${fmtBRL(cpl)} — meta saudável abaixo de R$80. ${c.contatos} leads em ${c.dias_ativo} dias.`,
        causa_raiz: diag.causa_raiz,
        acao: diag.explicacao,
        passos: diag.passos,
        gastoDiario, perdaMensal: (cpl - 80) * (c.contatos / Math.max(c.dias_ativo, 1)) * 30 });
      continue;
    }
    if (c.ctr > 0 && c.ctr < 0.5 && c.gasto_total > 200 && !isAwareness) {
      flags.push({ id: c.id, campanha: c.nome_campanha, severidade: "Moderado",
        diagnostico: "CTR baixo — criativo com baixo engajamento",
        causa: `CTR de ${c.ctr.toFixed(2)}% abaixo de 0.5%. Impressões: ${c.impressoes.toLocaleString("pt-BR")}. CPM: ${fmtBRL(c.cpm)}.`,
        causa_raiz: diag.causa_raiz,
        acao: diag.explicacao,
        passos: diag.passos,
        gastoDiario, perdaMensal: 0 });
    }
  }
  const ordem = { "Crítico": 0, "Alto": 1, "Moderado": 2 };
  return flags.sort((a, b) => ordem[a.severidade] - ordem[b.severidade]);
}

const CAUSA_RAIZ_CONFIG = {
  criativo:   { label: "Criativo saturado", icon: Palette, cor: "text-pink-400 bg-pink-500/10 border-pink-500/20" },
  publico:    { label: "Público esgotado",  icon: Users,   cor: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  plataforma: { label: "Algoritmo Meta",    icon: Cpu,     cor: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  oferta:     { label: "Oferta/Landing",    icon: Zap,     cor: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  orcamento:  { label: "Orçamento",         icon: TrendingDown, cor: "text-white/40 bg-white/5 border-white/10" },
};

const SEV_STYLE = {
  "Crítico":  { badge: "bg-red-500/15 text-red-400 border-red-500/25", bar: "bg-red-500", icon: <AlertTriangle size={14} className="text-red-400" /> },
  "Alto":     { badge: "bg-amber-500/15 text-amber-400 border-amber-500/25", bar: "bg-amber-500", icon: <TrendingDown size={14} className="text-amber-400" /> },
  "Moderado": { badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25", bar: "bg-yellow-400", icon: <Eye size={14} className="text-yellow-400" /> },
};

export default function RiskRadarPage() {
  const supabase = useMemo(() => getSupabase(), []);
  useSessionGuard();

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

  // Distribuição por causa raiz
  const porCausa = useMemo(() => {
    const map: Record<string, number> = {};
    riscos.forEach(r => { map[r.causa_raiz] = (map[r.causa_raiz] ?? 0) + 1; });
    return map;
  }, [riscos]);

  if (loading) return <SkeletonPage cols={3} />;

  return (
    <>
      <Sidebar />
      <div className="ml-[60px] min-h-screen bg-[#040406] text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">

          <div className="mb-8">
            <p className="text-[11px] text-fuchsia-400 font-semibold uppercase tracking-wider mb-1">Risk Radar</p>
            <h1 className="text-2xl font-bold text-white">Mapa de Risco</h1>
            <p className="text-sm text-white/40 mt-1">
              Detecção automática com diagnóstico de causa raiz — criativo, público ou algoritmo.
            </p>
          </div>

          {!loading ? (
            <div className="space-y-6">
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">Riscos detectados</p>
                  <p className={`text-3xl font-bold ${riscos.length > 0 ? "text-red-400" : "text-emerald-400"}`}>{riscos.length}</p>
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

              {/* Distribuição por causa raiz */}
              {riscos.length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <p className="text-[11px] text-white/30 uppercase tracking-wider mb-3">Causas identificadas</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(porCausa).map(([causa, qty]) => {
                      const cfg = CAUSA_RAIZ_CONFIG[causa as keyof typeof CAUSA_RAIZ_CONFIG];
                      const Icon = cfg.icon;
                      return (
                        <div key={causa} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-medium ${cfg.cor}`}>
                          <Icon size={12} />
                          {cfg.label}
                          <span className="ml-1 font-bold">{qty}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lista */}
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
                    const causaCfg = CAUSA_RAIZ_CONFIG[r.causa_raiz];
                    const CausaIcon = causaCfg.icon;
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

                          {/* Causa raiz badge */}
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold mb-3 ${causaCfg.cor}`}>
                            <CausaIcon size={11} />
                            Causa: {causaCfg.label}
                          </div>

                          <div className="space-y-2">
                            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
                              <p className="text-[9px] uppercase tracking-widest text-white/25 mb-1">O que está acontecendo</p>
                              <p className="text-[12px] text-white/60 leading-relaxed">{r.causa}</p>
                            </div>
                            <div className="rounded-xl bg-fuchsia-500/[0.05] border border-fuchsia-500/15 p-3">
                              <p className="text-[9px] uppercase tracking-widest text-fuchsia-400/50 mb-1">Diagnóstico</p>
                              <p className="text-[12px] text-white/75 leading-relaxed">{r.acao}</p>
                            </div>

                            {/* Passos de ação */}
                            <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
                              <p className="text-[9px] uppercase tracking-widest text-white/25 mb-2">Passos de ação</p>
                              <ol className="space-y-1">
                                {r.passos.map((p, i) => (
                                  <li key={i} className="flex items-start gap-2 text-[12px] text-white/50">
                                    <span className="text-fuchsia-400/60 font-bold shrink-0">{i + 1}.</span>
                                    {p}
                                  </li>
                                ))}
                              </ol>
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
          ) : null}
        </div>
      </div>
    </>
  );
}
