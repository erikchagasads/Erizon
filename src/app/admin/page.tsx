"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Zap, Bell, CheckCircle2,
  TrendingUp, Activity, ShieldAlert,
  RefreshCw, Eye, EyeOff, Sparkles, Database,
} from "lucide-react";
import Link from "next/link";

type Stats = {
  totais: {
    usuarios: number;
    ativos7d: number;
    ativos30d: number;
    bmsAtivas: number;
    bmsTotal: number;
    onboardingCompleto: number;
    comTelegram: number;
  };
  ultimosUsuarios: {
    userId: string;
    email: string;
    bmsAtivas: number;
    ultimoSync: string | null;
    onboardingCompleto: boolean;
    temTelegram: boolean;
    criadoEm: string;
  }[];
};

function fmt(date: string | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(date));
}

function timeAgo(date: string | null) {
  if (!date) return "nunca";
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "< 1h atrás";
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d atrás`;
  return `${Math.floor(d / 30)}m atrás`;
}

function StatCard({
  icon: Icon, label, value, sub, color = "white",
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    white:  "text-white bg-white/[0.06] border-white/[0.09]",
    green:  "text-emerald-400 bg-emerald-500/[0.07] border-emerald-500/20",
    blue:   "text-blue-400 bg-blue-500/[0.07] border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/[0.07] border-purple-500/20",
    amber:  "text-amber-400 bg-amber-500/[0.07] border-amber-500/20",
  };
  const cls = colorMap[color] ?? colorMap.white;

  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-3 ${cls}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest opacity-50">{label}</p>
        <Icon size={15} className="opacity-40" />
      </div>
      <p className="text-[32px] font-black font-mono leading-none">{value}</p>
      {sub && <p className="text-[11px] opacity-40">{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [erro, setErro]           = useState("");
  const [showEmails, setShowEmails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  async function carregar() {
    setRefreshing(true);
    setErro("");
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 401) { router.push("/login"); return; }
      if (res.status === 403) { setErro("Acesso negado."); setLoading(false); setRefreshing(false); return; }
      if (!res.ok) throw new Error("Erro ao carregar stats.");
      const data = await res.json();
      setStats(data);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    }
    setLoading(false);
    setRefreshing(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar(); }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#040406] flex items-center justify-center">
      <div className="flex items-center gap-3 text-white/30">
        <RefreshCw size={16} className="animate-spin" />
        <span className="text-[13px]">Carregando...</span>
      </div>
    </div>
  );

  if (erro) return (
    <div className="min-h-screen bg-[#040406] flex items-center justify-center">
      <div className="flex items-center gap-3 text-red-400">
        <ShieldAlert size={16} />
        <span className="text-[13px]">{erro}</span>
      </div>
    </div>
  );

  if (!stats) return null;

  const { totais, ultimosUsuarios } = stats;
  const taxaAtivacao = totais.usuarios > 0
    ? Math.round((totais.ativos30d / totais.usuarios) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#040406] text-white p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-white/20 uppercase tracking-widest mb-1">Admin</p>
            <h1 className="text-[22px] font-black text-white">Painel de Controle</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/blog"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-[12px] text-cyan-100 hover:bg-cyan-300/15 transition-all"
            >
              <Sparkles size={12} />
              Blog Inteligente
            </Link>
            <Link
              href="/admin/database-health"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-[12px] text-emerald-100 hover:bg-emerald-300/15 transition-all"
            >
              <Database size={12} />
              Saúde do banco
            </Link>
            <button
              onClick={carregar}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[12px] text-white/40 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-30"
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Cards de totais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={Users}
            label="Total usuários"
            value={totais.usuarios}
            sub="cadastrados"
            color="white"
          />
          <StatCard
            icon={Activity}
            label="Ativos 7 dias"
            value={totais.ativos7d}
            sub={`${totais.usuarios > 0 ? Math.round((totais.ativos7d / totais.usuarios) * 100) : 0}% do total`}
            color="green"
          />
          <StatCard
            icon={TrendingUp}
            label="Ativos 30 dias"
            value={totais.ativos30d}
            sub={`${taxaAtivacao}% de retenção`}
            color="blue"
          />
          <StatCard
            icon={Zap}
            label="BMs ativas"
            value={totais.bmsAtivas}
            sub={`${totais.bmsTotal} total`}
            color="purple"
          />
        </div>

        {/* Cards secundários */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard
            icon={CheckCircle2}
            label="Onboarding OK"
            value={totais.onboardingCompleto}
            sub={`${totais.usuarios > 0 ? Math.round((totais.onboardingCompleto / totais.usuarios) * 100) : 0}% dos usuários`}
            color="green"
          />
          <StatCard
            icon={Bell}
            label="Com Telegram"
            value={totais.comTelegram}
            sub={`${totais.usuarios > 0 ? Math.round((totais.comTelegram / totais.usuarios) * 100) : 0}% dos usuários`}
            color="amber"
          />
          <StatCard
            icon={TrendingUp}
            label="BMs por usuário ativo"
            value={totais.ativos30d > 0 ? (totais.bmsAtivas / totais.ativos30d).toFixed(1) : "—"}
            sub="média"
            color="purple"
          />
        </div>

        {/* Tabela de usuários */}
        <div className="bg-[#0a0a0c] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
            <div>
              <p className="text-[13px] font-bold text-white">Últimos usuários cadastrados</p>
              <p className="text-[11px] text-white/25 mt-0.5">{ultimosUsuarios.length} mais recentes</p>
            </div>
            <button
              onClick={() => setShowEmails(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.07] text-[11px] text-white/30 hover:text-white/60 transition-colors"
            >
              {showEmails ? <EyeOff size={12} /> : <Eye size={12} />}
              {showEmails ? "Ocultar emails" : "Ver emails"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left px-5 py-3 text-white/25 font-medium">Usuário</th>
                  <th className="text-center px-4 py-3 text-white/25 font-medium">BMs</th>
                  <th className="text-center px-4 py-3 text-white/25 font-medium">Último sync</th>
                  <th className="text-center px-4 py-3 text-white/25 font-medium">Cadastro</th>
                  <th className="text-center px-4 py-3 text-white/25 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {ultimosUsuarios.map((u, i) => (
                  <tr key={u.userId} className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                    <td className="px-5 py-3">
                      {showEmails ? (
                        <span className="text-white/70 font-mono">{u.email}</span>
                      ) : (
                        <span className="text-white/30 font-mono">
                          {u.email.replace(/(.{2}).*(@.*)/, "$1•••$2")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold font-mono ${u.bmsAtivas > 0 ? "text-purple-400" : "text-white/20"}`}>
                        {u.bmsAtivas}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`${u.ultimoSync ? "text-white/50" : "text-white/15"}`}>
                        {timeAgo(u.ultimoSync)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-white/30">
                      {fmt(u.criadoEm)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {u.onboardingCompleto && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Onboarding OK" />
                        )}
                        {u.temTelegram && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Telegram ativo" />
                        )}
                        {u.bmsAtivas > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" title="BM conectada" />
                        )}
                        {!u.onboardingCompleto && !u.temTelegram && u.bmsAtivas === 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legenda */}
          <div className="px-5 py-3 border-t border-white/[0.04] flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-white/20">Onboarding</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[10px] text-white/20">Telegram</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span className="text-[10px] text-white/20">BM ativa</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
