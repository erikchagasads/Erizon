"use client";

import type { PlataformaId, CampanhaEnriquecida } from "@/app/analytics/types";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

// ── Config de plataformas ──────────────────────────────────────────────────────
export interface PlataformaConfig {
  id: PlataformaId | "geral";
  nome: string;
  cor: string;
  corFundo: string;
  corBorda: string;
  sigla: string;
  conectado: boolean;
}

export const PLATAFORMAS: PlataformaConfig[] = [
  {
    id:       "geral",
    nome:     "Geral",
    cor:      "text-white",
    corFundo: "bg-white/[0.06]",
    corBorda: "border-white/10",
    sigla:    "G",
    conectado: true,
  },
  {
    id:       "meta",
    nome:     "Meta Ads",
    cor:      "text-[#1877F2]",
    corFundo: "bg-[#1877F2]/10",
    corBorda: "border-[#1877F2]/25",
    sigla:    "f",
    conectado: true,
  },
  {
    id:       "google",
    nome:     "Google Ads",
    cor:      "text-[#EA4335]",
    corFundo: "bg-[#EA4335]/10",
    corBorda: "border-[#EA4335]/20",
    sigla:    "G",
    conectado: false,
  },
  {
    id:       "tiktok",
    nome:     "TikTok",
    cor:      "text-white",
    corFundo: "bg-white/[0.05]",
    corBorda: "border-white/10",
    sigla:    "T",
    conectado: false,
  },
  {
    id:       "linkedin",
    nome:     "LinkedIn",
    cor:      "text-[#0A66C2]",
    corFundo: "bg-[#0A66C2]/10",
    corBorda: "border-[#0A66C2]/20",
    sigla:    "in",
    conectado: false,
  },
];

// ── Seletor de abas ────────────────────────────────────────────────────────────
interface PlataformaSelectorProps {
  ativa: PlataformaId | "geral";
  onChange: (p: PlataformaId | "geral") => void;
}

export function PlataformaSelector({ ativa, onChange }: PlataformaSelectorProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-6">
      {PLATAFORMAS.map(p => {
        const isAtiva = ativa === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id as PlataformaId | "geral")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[12px] font-semibold transition-all ${
              isAtiva
                ? `${p.corFundo} ${p.corBorda} ${p.cor}`
                : "bg-white/[0.02] border-white/[0.05] text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
            } ${!p.conectado ? "opacity-60" : ""}`}
          >
            {/* Dot indicador */}
            {p.id !== "geral" && (
              <span className={`w-1.5 h-1.5 rounded-full ${p.conectado ? "bg-emerald-400" : "bg-white/20"}`} />
            )}
            {p.nome}
            {!p.conectado && (
              <span className="text-[9px] text-white/20 font-normal">Em breve</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Vista Geral — cards por plataforma ────────────────────────────────────────
interface GeralViewProps {
  campanhas: CampanhaEnriquecida[];
  onSelecionar: (p: PlataformaId) => void;
}

export function GeralView({ campanhas, onSelecionar }: GeralViewProps) {
  const plataformasAds = PLATAFORMAS.filter(p => p.id !== "geral");

  // Calcula métricas para Meta (único conectado por agora)
  const metaCampanhas = campanhas; // todas são Meta por enquanto
  const metaInvest    = metaCampanhas.reduce((s, c) => s + c.gasto_total, 0);
  const metaLeads     = metaCampanhas.reduce((s, c) => s + (c.contatos ?? 0), 0);
  const metaScore     = metaCampanhas.length > 0
    ? Math.round(metaCampanhas.reduce((s, c) => s + c.m.score, 0) / metaCampanhas.length)
    : 0;

  const metricas: Record<string, { invest: number; leads: number; score: number; total: number }> = {
    meta:     { invest: metaInvest, leads: metaLeads, score: metaScore, total: metaCampanhas.length },
    google:   { invest: 0, leads: 0, score: 0, total: 0 },
    tiktok:   { invest: 0, leads: 0, score: 0, total: 0 },
    linkedin: { invest: 0, leads: 0, score: 0, total: 0 },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {plataformasAds.map(p => {
          const m = metricas[p.id] ?? { invest: 0, leads: 0, score: 0, total: 0 };
          const conectado = p.conectado;

          return (
            <div
              key={p.id}
              className={`relative rounded-[20px] border p-5 transition-all ${
                conectado
                  ? `${p.corFundo} ${p.corBorda} cursor-pointer hover:scale-[1.01]`
                  : "bg-white/[0.02] border-white/[0.05] cursor-default"
              }`}
              onClick={() => conectado && onSelecionar(p.id as PlataformaId)}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[13px] border ${p.corFundo} ${p.corBorda} ${p.cor}`}>
                  {p.sigla}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${conectado ? "bg-emerald-400" : "bg-white/15"}`} />
                  <span className={`text-[10px] ${conectado ? "text-emerald-400/70" : "text-white/20"}`}>
                    {conectado ? "Conectado" : "Não conectado"}
                  </span>
                </div>
              </div>

              <p className={`text-[13px] font-bold mb-3 ${conectado ? "text-white" : "text-white/25"}`}>
                {p.nome}
              </p>

              {conectado ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[11px] text-white/30">Investimento</span>
                      <span className="text-[11px] font-semibold text-white/80 font-mono">
                        R$ {m.invest.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[11px] text-white/30">Leads</span>
                      <span className="text-[11px] font-semibold text-white/80">{m.leads.toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[11px] text-white/30">Score médio</span>
                      <span className={`text-[11px] font-bold ${
                        m.score >= 70 ? "text-emerald-400" :
                        m.score >= 45 ? "text-amber-400" : "text-red-400"
                      }`}>{m.score}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[11px] text-white/30">Campanhas</span>
                      <span className="text-[11px] text-white/60">{m.total}</span>
                    </div>
                  </div>
                  <div className={`mt-4 flex items-center gap-1 text-[11px] font-semibold ${p.cor}`}>
                    Ver campanhas <ExternalLink size={10} />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] text-white/20 leading-relaxed">
                    Conecte sua conta {p.nome} para ver campanhas aqui.
                  </p>
                  <Link
                    href="/settings/integracoes"
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    Conectar →
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resumo consolidado */}
      {metaCampanhas.length > 0 && (
        <div className="p-5 rounded-[20px] bg-white/[0.02] border border-white/[0.05]">
          <p className="text-[10px] text-white/25 uppercase tracking-widest mb-4">Consolidado — todas as plataformas</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-white/25 mb-1">Investimento total</p>
              <p className="text-[18px] font-black font-mono text-white">
                R$ {metaInvest.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-white/25 mb-1">Total de leads</p>
              <p className="text-[18px] font-black font-mono text-white">{metaLeads.toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/25 mb-1">Score médio</p>
              <p className={`text-[18px] font-black font-mono ${
                metaScore >= 70 ? "text-emerald-400" :
                metaScore >= 45 ? "text-amber-400" : "text-red-400"
              }`}>{metaScore}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/25 mb-1">Campanhas ativas</p>
              <p className="text-[18px] font-black font-mono text-white">{metaCampanhas.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
