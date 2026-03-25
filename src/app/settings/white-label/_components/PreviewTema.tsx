"use client";

import type { WhiteLabelConfig } from "@/lib/white-label";
import { WL_DEFAULTS } from "@/lib/white-label";

export function PreviewTema({ cfg }: { cfg: Partial<WhiteLabelConfig> }) {
  const p = cfg.cor_primaria   ?? WL_DEFAULTS.cor_primaria;
  const f = cfg.cor_fundo      ?? WL_DEFAULTS.cor_fundo;
  const u = cfg.cor_superficie ?? WL_DEFAULTS.cor_superficie;

  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.08]" style={{ background: f }}>
      {/* Mini sidebar */}
      <div className="flex" style={{ minHeight: 140 }}>
        <div className="w-10 flex flex-col items-center py-3 gap-2 border-r border-white/[0.06]" style={{ background: u }}>
          <div className="w-7 h-7 rounded-lg" style={{ background: p, opacity: 0.9 }}>
            {cfg.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cfg.logo_url} alt="" className="w-full h-full object-contain rounded-lg" />
            ) : null}
          </div>
          {[1,2,3,4].map(i => (
            <div key={i} className="w-5 h-5 rounded-md" style={{ background: i===1 ? p+"33" : "rgba(255,255,255,0.05)" }}/>
          ))}
        </div>

        {/* Mini content */}
        <div className="flex-1 p-3">
          <p className="text-[9px] font-bold text-white/60 mb-2">{cfg.nome_plataforma || "Minha Plataforma"}</p>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-lg p-2" style={{ background: u }}>
                <div className="w-8 h-1 rounded mb-1" style={{ background: "rgba(255,255,255,0.15)" }}/>
                <div className="w-5 h-2 rounded font-bold" style={{ background: p, opacity: 0.7 }}/>
              </div>
            ))}
          </div>
          <div className="rounded-xl p-2" style={{ background: u }}>
            <div className="w-full h-1.5 rounded mb-1" style={{ background: "rgba(255,255,255,0.08)" }}/>
            <div className="w-3/4 h-1.5 rounded" style={{ background: "rgba(255,255,255,0.05)" }}/>
          </div>
        </div>
      </div>

      <div className="px-3 py-1.5 border-t border-white/[0.05]" style={{ background: u }}>
        <p className="text-[8px] text-white/20 text-center">Preview · {cfg.dominio_custom || "seudominio.com.br"}</p>
      </div>
    </div>
  );
}