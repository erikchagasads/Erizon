"use client";

// src/components/dados/StatusContaDominante.tsx
// Bloco hero — score circular, status da conta, métricas financeiras.
// FIX: modo "risco" e "atencao" agora listam as campanhas problemáticas por nome.

import type { HealthResult } from "@/app/lib/algoritmoErizon";

interface Props {
  health: HealthResult;
  totalInvest: number;
  combinacoesAnalisadas: number;
}

export default function StatusContaDominante({ health, totalInvest, combinacoesAnalisadas }: Props) {
  const isRisco   = health.urgenciaGlobal === "critico" && health.score < 60;
  const isAtencao = health.urgenciaGlobal === "atencao";
  const isEscala  = health.urgenciaGlobal === "oportunidade";

  // ── Campanhas problemáticas com nome + gasto ──────────────────────────────
  const campanhasProblema = health.enriched
    .filter(c => c.scores.urgencia === "critico" || c.scores.urgencia === "atencao")
    .sort((a, b) => b.gasto - a.gasto)
    .slice(0, 4); // mostra até 4

  const campanhasEscala = health.enriched
    .filter(c => c.scores.urgencia === "oportunidade")
    .sort((a, b) => b.roas - a.roas)
    .slice(0, 3);

  const fmtBRL = (v: number) => Math.round(v).toLocaleString("pt-BR");

  const cfg = isRisco ? {
    border: "border-red-500/25",
    bg: "from-red-500/[0.08] to-red-500/[0.02]",
    glow: "shadow-[0_0_60px_rgba(239,68,68,0.10)]",
    pill: "bg-red-500 text-white",
    pillText: "CONTA EM RISCO",
    titulo: health.dinheiroEmRisco > 100
      ? `R$${fmtBRL(health.dinheiroEmRisco)} em campanhas sem retorno adequado`
      : `${health.campanhasProblema} campanha${health.campanhasProblema !== 1 ? "s" : ""} operando abaixo do mínimo saudável`,
    sub: health.lucroPerda7d > 0
      ? `Projeção: −R$${fmtBRL(health.lucroPerda7d)} em lucro nos próximos 7 dias se não agir`
      : `ROAS abaixo de 2.5× — retorno insuficiente para cobrir custos operacionais`,
    pulso: true,
    listaCampanhas: campanhasProblema,
    listaCor: { tag: "bg-red-500/10 border-red-500/20 text-red-400", gasto: "text-red-400/70" },
    listaLabel: "Campanhas causando o risco:",
  } : isEscala ? {
    border: "border-emerald-500/20",
    bg: "from-emerald-500/[0.07] to-emerald-500/[0.02]",
    glow: "shadow-[0_0_60px_rgba(16,185,129,0.08)]",
    pill: "bg-emerald-500 text-white",
    pillText: "CONTA PRONTA PARA ESCALAR",
    titulo: "Há dinheiro sendo deixado na mesa",
    sub: `+R$${fmtBRL(health.oportunidadeEscala)} disponível para escalar agora`,
    pulso: false,
    listaCampanhas: campanhasEscala,
    listaCor: { tag: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", gasto: "text-emerald-400/70" },
    listaLabel: "Prontas para escalar:",
  } : isAtencao ? {
    border: "border-amber-500/20",
    bg: "from-amber-500/[0.06] to-amber-500/[0.02]",
    glow: "",
    pill: "bg-amber-500/20 text-amber-300",
    pillText: "REQUER ATENÇÃO",
    titulo: "Conta com pontos de melhoria",
    sub: `${health.campanhasProblema} campanha${health.campanhasProblema !== 1 ? "s" : ""} abaixo do desempenho esperado`,
    pulso: false,
    listaCampanhas: campanhasProblema,
    listaCor: { tag: "bg-amber-500/10 border-amber-500/20 text-amber-400", gasto: "text-amber-400/70" },
    listaLabel: "Campanhas que precisam de atenção:",
  } : {
    border: "border-white/[0.07]",
    bg: "from-white/[0.03] to-transparent",
    glow: "",
    pill: "bg-white/10 text-white/50",
    pillText: "OPERAÇÃO ESTÁVEL",
    titulo: "Conta operando dentro dos parâmetros",
    sub: `Margem média ${(health.margemMedia * 100).toFixed(1)}% · ROAS ${health.roasMedio.toFixed(2)}×`,
    pulso: false,
    listaCampanhas: [],
    listaCor: { tag: "", gasto: "" },
    listaLabel: "",
  };

  const r = 28, circ = 2 * Math.PI * r;
  const filled = (health.score / 100) * circ;
  const scoreColor = health.score >= 75 ? "#10b981" : health.score >= 50 ? "#f59e0b" : "#ef4444";

  const metricas = [
    {
      label: health.lucroPotencial7d > 0 && health.lucroPerda7d <= 0
        ? "Lucro potencial / 7d"
        : health.lucroPerda7d > 0
        ? "Lucro em risco / 7d"
        : "Lucro projetado / 7d",
      value: health.lucroPotencial7d > 0 && health.lucroPerda7d <= 0
        ? `+R$${fmtBRL(health.lucroPotencial7d)}`
        : health.lucroPerda7d > 0
        ? `−R$${fmtBRL(health.lucroPerda7d)}`
        : `R$${fmtBRL(health.lucroPotencial7d)}`,
      color: health.lucroPotencial7d > 0 && health.lucroPerda7d <= 0
        ? "text-emerald-400"
        : health.lucroPerda7d > 0
        ? "text-red-400"
        : "text-white/60",
      sub: "próximos 7 dias",
    },
    {
      label: "Investimento ativo",
      value: `R$${fmtBRL(totalInvest)}`,
      color: "text-white",
      sub: "no período",
    },
    {
      label: "ROAS médio",
      value: health.roasMedio > 0 ? `${health.roasMedio.toFixed(2)}×` : "—",
      color: health.roasMedio >= 2.5 ? "text-emerald-400" : health.roasMedio >= 1.5 ? "text-amber-400" : "text-red-400",
      sub: health.roasMedio >= 2.5 ? "acima do ideal" : health.roasMedio >= 1.5 ? "abaixo do ideal" : "abaixo do mínimo",
    },
    {
      label: "Margem média",
      value: `${(health.margemMedia * 100).toFixed(1)}%`,
      color: health.margemMedia >= 0.25 ? "text-emerald-400" : health.margemMedia >= 0.10 ? "text-amber-400" : "text-red-400",
      sub: "lucro líquido",
    },
  ];

  return (
    <div className={`mb-6 rounded-[28px] border ${cfg.border} bg-gradient-to-br ${cfg.bg} ${cfg.glow} overflow-hidden`}>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-0 divide-y md:divide-y-0 md:divide-x divide-white/[0.05]">

        {/* Score + Status + lista de campanhas */}
        <div className="flex items-start gap-5 px-7 py-6 md:min-w-[320px] shrink-0">
          <div className="relative mt-1">
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
              <circle
                cx="36" cy="36" r={r} fill="none" stroke={scoreColor} strokeWidth="4"
                strokeDasharray={`${filled} ${circ - filled}`}
                strokeDashoffset={circ / 4} strokeLinecap="round"
                style={{ transition: "stroke-dasharray 1.5s cubic-bezier(0.4,0,0.2,1)" }}
              />
              <text x="36" y="40" textAnchor="middle" fill="white" fontSize="17" fontWeight="900" fontFamily="monospace">
                {health.score}
              </text>
            </svg>
            {cfg.pulso && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-ping opacity-75" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] font-black uppercase tracking-[0.18em] px-2.5 py-1 rounded-lg ${cfg.pill}`}>
                {cfg.pillText}
              </span>
            </div>
            <p className="text-[14px] font-bold text-white leading-snug">{cfg.titulo}</p>
            <p className="text-[11px] text-white/30 mt-1 mb-3">{cfg.sub}</p>

            {/* Lista de campanhas problemáticas / de escala */}
            {cfg.listaCampanhas.length > 0 && (
              <div>
                <p className="text-[10px] text-white/20 uppercase tracking-widest mb-1.5">{cfg.listaLabel}</p>
                <div className="flex flex-col gap-1">
                  {cfg.listaCampanhas.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border truncate max-w-[180px] ${cfg.listaCor.tag}`}>
                        {c.nome_campanha}
                      </span>
                      <span className={`text-[10px] font-mono shrink-0 ${cfg.listaCor.gasto}`}>
                        R${fmtBRL(c.gasto)}/período
                      </span>
                    </div>
                  ))}
                  {health.campanhasProblema > cfg.listaCampanhas.length && (
                    <p className="text-[10px] text-white/20 mt-0.5">
                      +{health.campanhasProblema - cfg.listaCampanhas.length} outras — ver em Campanhas ↓
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Métricas financeiras */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-white/[0.05]">
          {metricas.map((m, i) => (
            <div key={i} className="flex flex-col justify-center px-5 py-5 gap-1">
              <p className="text-[10px] text-white/25 uppercase tracking-widest leading-tight">{m.label}</p>
              <p className={`text-[18px] font-black font-mono tracking-tight ${m.color}`}>{m.value}</p>
              <p className="text-[10px] text-white/20">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Motor da IA */}
        <div className="flex flex-col justify-center gap-2 px-6 py-5 md:min-w-[200px] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-[10px] text-white/25 uppercase tracking-widest">Erizon AI</span>
          </div>
          <p className="text-[12px] text-white/50 leading-relaxed">
            Analisou <span className="text-white/80 font-semibold">{combinacoesAnalisadas.toLocaleString("pt-BR")}</span> combinações
          </p>
          <p className="text-[11px] text-white/25">
            {health.enriched.length} campanhas · {new Date().toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

      </div>
    </div>
  );
}