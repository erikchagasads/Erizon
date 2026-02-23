"use client";

/**
 * page_clientes.tsx — v2
 * Correções:
 * 1. Botão "Analisar" vai para /dados?cliente=id (não /pulse)
 * 2. Cards mostram status score calculado (não só CPL)
 * 3. Explicação contextual de como funciona o fluxo agência → cliente
 * 4. Link rápido para Pulse de cada cliente
 */

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import {
  Plus, TrendingUp, AlertCircle,
  CheckCircle2, BarChart3, Building2, ArrowRight, Users,
  Activity, Target, Zap, ExternalLink,
} from "lucide-react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Cliente {
  id: string;
  nome_cliente: string;
  fb_ad_account_id: string;
  gasto_total?: number;
  leads?: number;
  campanhas_ativas?: number;
  campanhas_total?: number;
  campanhas_criticas?: number;
  cpl?: number;
  roas?: number;
  score?: number;
  status?: "saudavel" | "atencao" | "risco";
}

function StatusBadge({ status }: { status?: string }) {
  if (status === "saudavel") return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      <span className="text-[10px] font-semibold text-emerald-400">Saudável</span>
    </div>
  );
  if (status === "atencao") return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
      <span className="text-[10px] font-semibold text-yellow-400">Atenção</span>
    </div>
  );
  if (status === "risco") return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      <span className="text-[10px] font-semibold text-red-400">Em risco</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-full">
      <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
      <span className="text-[10px] font-semibold text-gray-500">Sem dados</span>
    </div>
  );
}

// ScoreRing — visualização rápida do score
function ScoreRing({ score }: { score: number }) {
  const cor = score >= 70 ? "text-emerald-400" : score >= 40 ? "text-amber-400" : "text-red-400";
  const bg  = score >= 70 ? "bg-emerald-500/10 border-emerald-500/20" : score >= 40 ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20";
  return (
    <div className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center shrink-0 ${bg}`}>
      <span className={`text-[15px] font-black leading-none ${cor}`}>{score}</span>
      <span className="text-[8px] text-white/20 mt-0.5">score</span>
    </div>
  );
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    async function fetchDados() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.full_name) {
        setUserName(user.user_metadata.full_name.split(" ")[0]);
      } else if (user?.email) {
        setUserName(user.email.split("@")[0]);
      }

      const { data: clientesData } = await supabase.from("clientes_config").select("*");
      if (!clientesData) { setLoading(false); return; }

      const enriched = await Promise.all(clientesData.map(async (c) => {
        const { data: metricas } = await supabase
          .from("metricas_ads")
          .select("gasto_total, contatos, status")
          .eq("cliente_id", c.id);

        if (!metricas || metricas.length === 0) return { ...c, status: undefined };

        const gasto_total = metricas.reduce((a, m) => a + (m.gasto_total || 0), 0);
        const leads = metricas.reduce((a, m) => a + (m.contatos || 0), 0);
        const cpl = leads > 0 ? gasto_total / leads : 0;
        const campanhas_ativas = metricas.filter(m => ["ATIVO", "ACTIVE", "ATIVA"].includes(m.status || "")).length;
        const campanhas_total = metricas.length;

        // Score simplificado baseado em CPL e campanhas ativas
        const score = campanhas_ativas === 0 ? 0
          : cpl === 0 ? 50
          : cpl < 20 ? 85
          : cpl < 40 ? 65
          : cpl < 80 ? 40
          : 20;

        // Campanhas críticas (CPL alto ou sem leads)
        const campanhas_criticas = metricas.filter(m =>
          ["ATIVO", "ACTIVE", "ATIVA"].includes(m.status || "") && (m.contatos || 0) === 0
        ).length;

        let status: Cliente["status"] = "saudavel";
        if (score < 40 || campanhas_ativas === 0) status = "risco";
        else if (score < 65 || campanhas_criticas > 0) status = "atencao";

        // ROAS estimado simples (assume ticket R$50 por lead como padrão)
        const roas = gasto_total > 0 && leads > 0 ? (leads * 50) / gasto_total : 0;

        return { ...c, gasto_total, leads, cpl, campanhas_ativas, campanhas_total, campanhas_criticas, score, roas, status };
      }));

      setClientes(enriched);
      setLoading(false);
    }
    fetchDados();
  }, []);

  const totalGasto = clientes.reduce((a, c) => a + (c.gasto_total || 0), 0);
  const totalLeads = clientes.reduce((a, c) => a + (c.leads || 0), 0);
  const totalAtivos = clientes.filter(c => (c.campanhas_ativas || 0) > 0).length;
  const emRisco = clientes.filter(c => c.status === "risco" || c.status === "atencao").length;

  return (
    <div className="flex min-h-screen bg-[#060608] text-white font-sans">
      <Sidebar />

      <main className="flex-1 ml-24 p-10">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <header className="flex items-start justify-between mb-8 pb-8 border-b border-white/[0.05]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-500/70 mb-1">Erizon Rede</p>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-tight">
                {userName ? <>Olá, <span className="text-purple-500">{userName}.</span></> : "Clientes"}
              </h1>
              <p className="text-gray-600 text-sm mt-1.5">Central de controle da agência</p>
            </div>
            <Link href="/config">
              <button className="flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(147,51,234,0.15)] hover:shadow-[0_0_30px_rgba(147,51,234,0.3)]">
                <Plus size={15} /> Novo Cliente
              </button>
            </Link>
          </header>

          {/* Explicação do fluxo — só aparece se tem clientes */}
          {!loading && clientes.length > 0 && (
            <div className="mb-6 px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-start gap-3">
              <Zap size={14} className="text-purple-400 shrink-0 mt-0.5" />
              <p className="text-[12px] text-white/30 leading-relaxed">
                Cada cliente tem campanhas vinculadas pelo <span className="text-white/50">Ad Account ID</span>.
                Clique em <span className="text-white/50">"Analisar"</span> para ver a Central de Decisão filtrada só por aquele cliente.
                Use <span className="text-white/50">"Pulse"</span> para ver o resumo estratégico do cliente.
              </p>
            </div>
          )}

          {/* Overview rápido */}
          {!loading && clientes.length > 0 && (
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: "Clientes ativos",   value: `${totalAtivos}/${clientes.length}`,          color: "text-white",         icon: <Building2 size={16} /> },
                { label: "Invest. total",      value: `R$ ${totalGasto.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, color: "text-purple-400", icon: <TrendingUp size={16} /> },
                { label: "Leads gerados",      value: totalLeads.toLocaleString("pt-BR"),           color: "text-blue-400",      icon: <Users size={16} /> },
                { label: "Em atenção",         value: String(emRisco),                              color: emRisco > 0 ? "text-yellow-400" : "text-emerald-400", icon: emRisco > 0 ? <AlertCircle size={16} /> : <CheckCircle2 size={16} /> },
              ].map(({ label, value, color, icon }) => (
                <div key={label} className="bg-[#0c0c0e] border border-white/[0.06] p-5 rounded-2xl">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    {icon}
                    <span className="text-[10px] font-semibold uppercase tracking-widest">{label}</span>
                  </div>
                  <p className={`text-2xl font-black ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Lista de clientes */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : clientes.length === 0 ? (
            <div className="bg-[#0c0c0e] border border-dashed border-white/[0.08] p-20 rounded-3xl text-center">
              <Building2 size={40} className="mx-auto mb-4 text-gray-700" />
              <p className="font-semibold text-gray-600 text-sm mb-1">Nenhum cliente cadastrado</p>
              <p className="text-gray-700 text-xs mb-6">Adicione seu primeiro cliente para começar a monitorar</p>
              <Link href="/config">
                <button className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm rounded-xl transition-all">
                  <Plus size={14} /> Adicionar primeiro cliente
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {clientes.map((cliente) => (
                <div key={cliente.id}
                  className={`bg-[#0c0c0e] border p-6 rounded-3xl hover:border-purple-500/20 transition-all group relative overflow-hidden ${
                    cliente.status === "risco" ? "border-red-500/20" : cliente.status === "atencao" ? "border-yellow-500/20" : "border-white/[0.06]"
                  }`}>

                  <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-purple-600/5 blur-[50px] rounded-full group-hover:bg-purple-600/15 transition-all" />

                  <div className="relative">
                    {/* Top: score + nome + status */}
                    <div className="flex items-start justify-between mb-5 gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {cliente.score !== undefined && <ScoreRing score={cliente.score} />}
                        <div className="min-w-0">
                          <p className="text-[10px] text-gray-600 font-mono mb-0.5">
                            ID: {cliente.fb_ad_account_id?.slice(-6) || "—"}
                          </p>
                          <h3 className="text-[15px] font-bold text-white leading-tight truncate">{cliente.nome_cliente}</h3>
                        </div>
                      </div>
                      <StatusBadge status={cliente.status} />
                    </div>

                    {/* Métricas */}
                    {cliente.gasto_total !== undefined ? (
                      <div className="grid grid-cols-2 gap-2.5 mb-5">
                        <div className="bg-white/[0.03] border border-white/[0.05] p-3 rounded-xl">
                          <p className="text-[10px] text-gray-600 mb-1">Investido</p>
                          <p className="text-sm font-bold text-purple-400">
                            R$ {(cliente.gasto_total || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div className="bg-white/[0.03] border border-white/[0.05] p-3 rounded-xl">
                          <p className="text-[10px] text-gray-600 mb-1">Leads</p>
                          <p className="text-sm font-bold text-blue-400">{cliente.leads || 0}</p>
                        </div>
                        <div className="bg-white/[0.03] border border-white/[0.05] p-3 rounded-xl">
                          <p className="text-[10px] text-gray-600 mb-1">CPL Médio</p>
                          <p className={`text-sm font-bold ${(cliente.cpl || 0) > 50 ? "text-red-400" : (cliente.cpl || 0) > 25 ? "text-yellow-400" : "text-emerald-400"}`}>
                            {cliente.cpl ? `R$ ${cliente.cpl.toFixed(2)}` : "—"}
                          </p>
                        </div>
                        <div className="bg-white/[0.03] border border-white/[0.05] p-3 rounded-xl">
                          <p className="text-[10px] text-gray-600 mb-1">Campanhas</p>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-white">{cliente.campanhas_ativas} ativas</p>
                            {(cliente.campanhas_criticas || 0) > 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/15 font-bold">
                                {cliente.campanhas_criticas} crítica{cliente.campanhas_criticas !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl mb-5">
                        <BarChart3 size={14} className="text-gray-700" />
                        <span className="text-xs text-gray-700">Aguardando sincronização de dados</span>
                      </div>
                    )}

                    {/* Botões de ação — CORRIGIDO: dois botões claros */}
                    <div className="flex gap-2">
                      {/* Analisar → vai para /dados com cliente selecionado */}
                      <Link
                        href={`/dados?cliente=${cliente.id}`}
                        className="flex-1 py-2.5 bg-purple-600/10 border border-purple-500/20 hover:bg-purple-600 hover:border-purple-600 hover:text-white rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all text-purple-400"
                      >
                        <Activity size={12} /> Analisar
                      </Link>
                      {/* Pulse → resumo estratégico */}
                      <Link
                        href={`/pulse?cliente=${cliente.id}`}
                        className="flex-1 py-2.5 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/20 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all text-gray-400 hover:text-white"
                      >
                        <Zap size={12} /> Pulse
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}