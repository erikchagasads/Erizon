"use client";

import { X } from "lucide-react";
import type { WhiteLabelCliente } from "@/lib/white-label";

export function CardCliente({ c, onRevogar }: { c: WhiteLabelCliente; onRevogar: (id: string) => unknown }) {
  const statusCor = c.status === "ativo" ? "text-emerald-400" : c.status === "pendente" ? "text-amber-400" : "text-white/20";
  const statusLabel = c.status === "ativo" ? "Ativo" : c.status === "pendente" ? "Aguardando" : "Revogado";

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-white/80 truncate">{c.nome || c.email_convidado}</p>
        <p className="text-[10px] text-white/30 truncate">{c.email_convidado}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex gap-1">
          {c.ver_campanhas  && <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/30">Campanhas</span>}
          {c.ver_financeiro && <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/30">Financeiro</span>}
          {c.ver_criativo   && <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/30">Criativo</span>}
        </div>
        <span className={`text-[10px] font-semibold ${statusCor}`}>{statusLabel}</span>
        {c.status !== "revogado" && (
          <button onClick={() => onRevogar(c.id)}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <X size={11}/>
          </button>
        )}
      </div>
    </div>
  );
}