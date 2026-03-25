"use client";
// src/app/cliente/page.tsx
// Painel simplificado para clientes convidados via white label.
// Não exibe nenhuma marca Erizon — usa 100% o tema do gestor.

import { useEffect, useState, useMemo } from "react";
import { getSupabase } from "@/lib/supabase";
import { useTheme } from "@/components/ThemeProvider";
import {
  TrendingUp, TrendingDown, DollarSign,
  Users, Target, BarChart3, LogOut, Loader2,
} from "lucide-react";

interface Campanha {
  id: string;
  nome_campanha: string;
  status: string;
  gasto_total: number;
  contatos: number;
  receita_estimada: number;
  ctr?: number;
  cpm?: number;
}

const fmtBRL  = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtBRL2 = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum  = (v: number) => v.toLocaleString("pt-BR");
const fmtX    = (v: number) => `${v.toFixed(2)}×`;

function isAtivo(s: string) {
  return ["ATIVO", "ACTIVE", "ATIVA"].includes((s ?? "").toUpperCase());
}

function calcScore(gasto: number, leads: number, receita: number) {
  if (gasto === 0) return 0;
  if (leads === 0 && gasto > 50) return 20;
  const roas = gasto > 0 ? receita / gasto : 0;
  const cpl  = leads > 0 ? gasto / leads : 999;
  let s = 50;
  if (roas >= 3) s += 25; else if (roas >= 2) s += 10; else if (roas < 1) s -= 20;
  if (cpl < 30)  s += 15; else if (cpl < 60)  s += 5;  else if (cpl > 120) s -= 15;
  return Math.min(100, Math.max(0, Math.round(s)));
}

function ScorePill({ score }: { score: number }) {
  const [cor, bg] = score >= 70
    ? ["#10b981", "rgba(16,185,129,0.12)"]
    : score >= 45
    ? ["#f59e0b", "rgba(245,158,11,0.12)"]
    : ["#ef4444", "rgba(239,68,68,0.12)"];
  return (
    <span className="text-[11px] font-black font-mono px-2 py-1 rounded-lg" style={{ color: cor, background: bg }}>
      {score}
    </span>
  );
}

export default function ClienteDashboard() {
  const supabase = useMemo(() => getSupabase(), []);
  const { nomePlataforma, logoUrl, corPrimaria } = useTheme();

  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading]     = useState(true);
  const [userName, setUserName]   = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      setUserName(user.email?.split("@")[0] ?? "");

      const { data: ads } = await supabase
        .from("metricas_ads")
        .select("*")
        .eq("user_id", user.id)
        .order("gasto_total", { ascending: false });

      setCampanhas((ads ?? []) as Campanha[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function sair() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const totais = useMemo(() => {
    const invest  = campanhas.reduce((s, c) => s + c.gasto_total, 0);
    const leads   = campanhas.reduce((s, c) => s + c.contatos, 0);
    const receita = campanhas.reduce((s, c) => s + c.receita_estimada, 0);
    const ativas  = campanhas.filter(c => isAtivo(c.status)).length;
    return { invest, leads, receita, ativas, total: campanhas.length,
      cpl: leads > 0 ? invest / leads : 0,
      roas: invest > 0 ? receita / invest : 0,
    };
  }, [campanhas]);

  if (loading) return (
    <div className="min-h-screen bg-[#060609] flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-white/30"/>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--wl-bg, #060609)", color: "#fff" }}>

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]"
        style={{ background: "var(--wl-surface, #0d0d11)" }}>
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={nomePlataforma} className="w-9 h-9 rounded-xl object-contain"/>
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-[15px]"
              style={{ background: corPrimaria }}>
              {nomePlataforma.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-[14px] font-bold text-white">{nomePlataforma}</p>
            <p className="text-[10px] text-white/30">Painel de resultados</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <p className="text-[12px] text-white/30">Olá, <span className="text-white/60 font-medium">{userName}</span></p>
          <button onClick={sair}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] text-[11px] text-white/30 hover:text-white hover:border-white/20 transition-all">
            <LogOut size={12}/> Sair
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Campanhas ativas",  value: `${totais.ativas} / ${totais.total}`, icon: Target,      color: "#fff" },
            { label: "Investimento total", value: fmtBRL(totais.invest),               icon: DollarSign,  color: "#fff" },
            { label: "Leads gerados",      value: fmtNum(totais.leads),                icon: Users,       color: "#38bdf8" },
            { label: "ROAS",               value: totais.roas > 0 ? fmtX(totais.roas) : "—", icon: BarChart3, color: totais.roas >= 3 ? "#10b981" : totais.roas >= 2 ? "#f59e0b" : "#ef4444" },
          ].map(k => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="rounded-2xl border border-white/[0.07] p-5"
                style={{ background: "var(--wl-surface, #0d0d11)" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">{k.label}</p>
                  <Icon size={14} className="text-white/15"/>
                </div>
                <p className="text-[22px] font-black font-mono" style={{ color: k.color }}>{k.value}</p>
              </div>
            );
          })}
        </div>

        {/* Métricas secundárias */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/[0.07] p-5 flex items-center justify-between"
            style={{ background: "var(--wl-surface, #0d0d11)" }}>
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">CPL médio</p>
              <p className="text-[20px] font-black font-mono"
                style={{ color: totais.cpl === 0 ? "rgba(255,255,255,0.2)" : totais.cpl < 50 ? "#10b981" : totais.cpl < 100 ? "#f59e0b" : "#ef4444" }}>
                {totais.cpl > 0 ? fmtBRL2(totais.cpl) : "—"}
              </p>
            </div>
            {totais.cpl > 0 && (
              totais.cpl < 50
                ? <TrendingDown size={24} className="text-emerald-400"/>
                : <TrendingUp size={24} className="text-amber-400"/>
            )}
          </div>
          <div className="rounded-2xl border border-white/[0.07] p-5 flex items-center justify-between"
            style={{ background: "var(--wl-surface, #0d0d11)" }}>
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Receita estimada</p>
              <p className="text-[20px] font-black font-mono text-purple-300">{fmtBRL(totais.receita)}</p>
            </div>
            <TrendingUp size={24} className="text-purple-400/40"/>
          </div>
        </div>

        {/* Tabela de campanhas */}
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden"
          style={{ background: "var(--wl-surface, #0d0d11)" }}>
          <div className="px-6 py-4 border-b border-white/[0.05]">
            <h2 className="text-[13px] font-semibold text-white/60 uppercase tracking-wider">
              Campanhas ({campanhas.length})
            </h2>
          </div>

          {campanhas.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Target size={32} className="text-white/10 mx-auto mb-3"/>
              <p className="text-[14px] text-white/25">Nenhuma campanha encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 600 }}>
                <thead>
                  <tr className="border-b border-white/[0.05]" style={{ background: "rgba(255,255,255,0.02)" }}>
                    {["Campanha", "Status", "Score", "Investido", "Leads", "CPL", "ROAS"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold tracking-wider uppercase text-white/25">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {campanhas.map(c => {
                    const cpl   = c.contatos > 0 ? c.gasto_total / c.contatos : 0;
                    const roas  = c.gasto_total > 0 ? c.receita_estimada / c.gasto_total : 0;
                    const score = calcScore(c.gasto_total, c.contatos, c.receita_estimada);
                    const ativo = isAtivo(c.status);
                    return (
                      <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="text-[12px] font-semibold text-white/80 truncate max-w-[200px]" title={c.nome_campanha}>
                            {c.nome_campanha}
                          </p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md ${
                            ativo ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-white/[0.04] text-white/25 border border-white/[0.07]"
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${ativo ? "bg-emerald-400" : "bg-white/20"}`}/>
                            {ativo ? "Ativa" : "Pausada"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5"><ScorePill score={score}/></td>
                        <td className="px-5 py-3.5 text-[12px] font-mono text-white/70">{fmtBRL(c.gasto_total)}</td>
                        <td className="px-5 py-3.5 text-[12px] font-mono text-sky-400">{c.contatos > 0 ? fmtNum(c.contatos) : "—"}</td>
                        <td className="px-5 py-3.5 text-[12px] font-mono"
                          style={{ color: cpl === 0 ? "rgba(255,255,255,0.2)" : cpl < 50 ? "#10b981" : cpl < 100 ? "rgba(255,255,255,0.7)" : "#ef4444" }}>
                          {cpl > 0 ? fmtBRL2(cpl) : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-[12px] font-mono"
                          style={{ color: roas === 0 ? "rgba(255,255,255,0.2)" : roas >= 3 ? "#10b981" : roas >= 2 ? "rgba(255,255,255,0.7)" : "#f59e0b" }}>
                          {roas > 0 ? fmtX(roas) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rodapé — sem menção ao Erizon */}
        <p className="text-center text-[10px] text-white/10 pb-4">
          {nomePlataforma} · Painel de resultados
        </p>
      </main>
    </div>
  );
}
