"use client";
import { useEffect, useState } from "react";
import { Globe, TrendingUp, TrendingDown, Minus, Loader2, Users } from "lucide-react";
import type { NicheInsight, WorkspacePosition } from "@/services/network-intelligence-service";

type NetworkData = {
  position: WorkspacePosition | null;
  nicheInsight: NicheInsight | null;
};

function PositionBadge({ pos }: { pos: WorkspacePosition["posicaoCpl"] }) {
  if (pos === "top25") return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
      <TrendingUp size={10} /> Top 25%
    </span>
  );
  if (pos === "bottom25") return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/[0.08] border border-red-500/15 px-2.5 py-1 rounded-full">
      <TrendingDown size={10} /> Abaixo da média
    </span>
  );
  if (pos === "median") return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-white/40 bg-white/[0.04] border border-white/[0.07] px-2.5 py-1 rounded-full">
      <Minus size={10} /> Na média
    </span>
  );
  return null;
}

function TrendIcon({ trend }: { trend: NicheInsight["marketTrend"] }) {
  if (trend === "rising") return <TrendingUp size={13} className="text-emerald-400" />;
  if (trend === "falling") return <TrendingDown size={13} className="text-red-400" />;
  return <Minus size={13} className="text-white/30" />;
}

function BenchmarkBar({
  label, meuValor, p25, p50, p75, inverso = false
}: {
  label: string;
  meuValor: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  inverso?: boolean;  // CPL: menor = melhor; ROAS: maior = melhor
}) {
  const max = p75 ? p75 * 1.2 : 100;
  const toPercent = (v: number | null) => v ? Math.min(98, (v / max) * 100) : 0;

  const meuPos = toPercent(meuValor);
  const p25Pos = toPercent(p25);
  const p50Pos = toPercent(p50);
  const p75Pos = toPercent(p75);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-white/40 font-semibold">{label}</span>
        {meuValor && (
          <span className="text-[11px] font-bold text-white/70">
            {label.includes("ROAS") ? `${meuValor.toFixed(1)}x` : `R$${meuValor.toFixed(0)}`}
          </span>
        )}
      </div>
      <div className="relative h-3 bg-white/[0.04] rounded-full overflow-visible">
        {/* Zona boa */}
        <div
          className="absolute h-full rounded-full bg-emerald-500/10"
          style={inverso
            ? { left: 0, width: `${p25Pos}%` }
            : { left: `${p75Pos}%`, width: `${100 - p75Pos}%` }}
        />
        {/* Linha p25 */}
        {p25 && <div className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: `${p25Pos}%` }} />}
        {/* Linha p50 */}
        {p50 && <div className="absolute top-0 bottom-0 w-px bg-white/40" style={{ left: `${p50Pos}%` }} />}
        {/* Linha p75 */}
        {p75 && <div className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: `${p75Pos}%` }} />}
        {/* Meu valor */}
        {meuValor && (
          <div
            className="absolute -top-0.5 -translate-x-1/2 w-4 h-4 rounded-full bg-purple-500 border-2 border-[#060609] z-10"
            style={{ left: `${meuPos}%` }}
          />
        )}
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-white/20">
        <span>Melhor</span>
        {p50 && <span>Mediana: {label.includes("ROAS") ? `${p50.toFixed(1)}x` : `R$${p50.toFixed(0)}`}</span>}
        <span>Pior</span>
      </div>
    </div>
  );
}

export function RedeInteligencia() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/intelligence/network")
      .then(r => r.json())
      .then(d => { if (d.ok) setData(d); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 flex items-center gap-3">
        <Loader2 size={16} className="animate-spin text-blue-400" />
        <p className="text-[12px] text-white/40">Carregando inteligência da rede...</p>
      </div>
    );
  }

  if (!data?.nicheInsight) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-center">
        <Globe size={22} className="text-white/20 mx-auto mb-2" />
        <p className="text-[13px] font-semibold text-white/40">Rede em construção</p>
        <p className="text-[11px] text-white/25 mt-1">
          Os benchmarks da rede são gerados toda segunda-feira.<br />
          Volte em breve para ver onde você está no mercado.
        </p>
      </div>
    );
  }

  const { position, nicheInsight } = data;

  return (
    <div className="rounded-2xl border border-blue-500/15 bg-blue-500/[0.03] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Globe size={15} className="text-blue-400" />
          <span className="text-[14px] font-bold text-white/90">Rede de Inteligência</span>
          <span className="text-[10px] text-white/30 font-semibold capitalize">· {nicheInsight.nicho}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/25">
          <Users size={11} />
          {nicheInsight.nWorkspaces} gestores no nicho
        </div>
      </div>

      {/* Sua posição */}
      {position && (
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/25">Sua posição esta semana</p>
            <PositionBadge pos={position.posicaoCpl} />
          </div>
          <p className="text-[12px] text-white/60 leading-relaxed">{position.insight}</p>
        </div>
      )}

      {/* Benchmarks visuais */}
      <div className="px-5 py-4 space-y-5">
        <BenchmarkBar
          label="CPL (R$)"
          meuValor={position?.suaCpl ?? null}
          p25={nicheInsight.cplP25}
          p50={nicheInsight.cplP50}
          p75={nicheInsight.cplP75}
          inverso={true}
        />
        <BenchmarkBar
          label="ROAS (x)"
          meuValor={position?.suaRoas ?? null}
          p25={nicheInsight.roasP75 ?? null}
          p50={nicheInsight.roasP50}
          p75={nicheInsight.roasP25 ?? null}
          inverso={false}
        />
      </div>

      {/* Tendência de mercado */}
      {nicheInsight.trendNote && (
        <div className="mx-5 mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <TrendIcon trend={nicheInsight.marketTrend} />
          <p className="text-[11px] text-white/50">{nicheInsight.trendNote}</p>
        </div>
      )}

      {/* Rodapé */}
      <div className="px-5 pb-4 text-[9px] text-white/15">
        Dados anonimizados · semana de {nicheInsight.semanaInicio} ·{" "}
        <span className="text-white/25">seus dados contribuem para a rede</span>
      </div>
    </div>
  );
}
