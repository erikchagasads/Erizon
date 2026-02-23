"use client";

// app/studio/page.tsx — Studio IA (Analista Neural)
// Refatorado para usar ChatShell — elimina duplicação de chat boilerplate.
// FIX: filtra campanhas por cliente_id quando um cliente está selecionado.

import { useState, useEffect, useRef } from "react";
import {
  BrainCircuit, ChevronDown,
  TrendingUp, Users, Wallet, Activity
} from "lucide-react";
import ChatShell, { type Mensagem } from "@/components/ChatShell";
import { getSupabase } from "@/lib/supabase";
import { useCliente } from "@/app/hooks/useCliente";

interface Campanha {
  id?: string;
  cliente_id?: string;
  nome_campanha: string;
  status: string;
  gasto_total: number;
  contatos: number;
  orcamento: number;
  impressoes?: number;
  alcance?: number;
}

const STATUS_ATIVOS = new Set(["ATIVO", "ACTIVE", "ATIVA"]);
const isCampanhaAtiva = (c: Campanha) =>
  STATUS_ATIVOS.has(String(c.status ?? "").toUpperCase().trim());

const SUGESTOES = [
  { text: "Analise as campanhas ativas",         emoji: "📊" },
  { text: "Qual tem melhor performance?",         emoji: "🏆" },
  { text: "Identifique oportunidades de escala", emoji: "🚀" },
  { text: "Como reduzir meu CPL?",               emoji: "💡" },
];

// ─── Campaign Dropdown ────────────────────────────────────────────────────────
function CampaignDropdown({ campanhas, value, onChange }: {
  campanhas: Campanha[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const label = value === "todas" ? `Todas as ativas (${campanhas.length})` : value;

  return (
    <div ref={ref} className="relative min-w-[280px]">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-3 bg-[#0e0e10] border px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
          open ? "border-purple-500/50 text-white" : "border-white/[0.08] text-gray-400 hover:border-white/20 hover:text-white"
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          {value === "todas"
            ? <span className="text-purple-400">◈</span>
            : <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />}
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown
          size={13}
          className={`text-purple-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 w-full bg-[#0e0e10] border border-white/[0.08] rounded-xl overflow-hidden z-50 shadow-2xl">
          <button
            onClick={() => { onChange("todas"); setOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-left transition-all ${
              value === "todas" ? "bg-purple-600/15 text-purple-300" : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            <span className="text-purple-400">◈</span>
            Todas as ativas
            <span className="ml-auto text-[10px] bg-purple-600/20 text-purple-400 px-1.5 py-0.5 rounded-lg">
              {campanhas.length}
            </span>
          </button>
          {campanhas.map((c, i) => (
            <button
              key={i}
              onClick={() => { onChange(c.nome_campanha); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-left transition-all border-t border-white/[0.04] ${
                value === c.nome_campanha ? "bg-purple-600/15 text-purple-300" : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
              <span className="truncate">{c.nome_campanha || "SEM NOME"}</span>
            </button>
          ))}
          {campanhas.length === 0 && (
            <div className="px-4 py-5 text-center text-xs text-gray-600">
              Nenhuma campanha ativa
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Metric Bar ───────────────────────────────────────────────────────────────
function MetricBar({ label, value, icon, color = "text-white", bar }: {
  label: string; value: string; icon: React.ReactNode; color?: string; bar?: number;
}) {
  return (
    <div className="bg-[#0a0a0c] border border-white/[0.05] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-600 font-medium">{label}</span>
        <span className="text-gray-700">{icon}</span>
      </div>
      <p className={`text-lg font-black ${color}`}>{value}</p>
      {bar !== undefined && (
        <div className="mt-2 h-0.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${bar > 90 ? "bg-red-500" : "bg-purple-500"}`}
            style={{ width: `${Math.min(bar, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onSelect }: { onSelect: (s: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center py-8">
      <div className="relative mb-6">
        <div className="absolute -inset-6 bg-purple-600/[0.08] rounded-full blur-2xl animate-pulse" />
        <div className="relative w-14 h-14 rounded-2xl bg-[#0e0e10] border border-white/[0.06] flex items-center justify-center">
          <BrainCircuit size={28} className="text-purple-500/60" />
        </div>
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-700 mb-2">
        Studio IA · Analista Neural
      </p>
      <h2 className="text-2xl font-black italic text-white/90">
        Como posso <span className="text-purple-500">ajudar hoje?</span>
      </h2>
      <p className="text-sm text-gray-600 mt-2 mb-6">
        Faça perguntas sobre suas campanhas ou peça análises
      </p>
      <div className="grid grid-cols-2 gap-2 max-w-sm w-full">
        {SUGESTOES.map(s => (
          <button
            key={s.text}
            onClick={() => onSelect(s.text)}
            className="flex items-center gap-2.5 px-4 py-3 bg-[#0a0a0c] border border-white/[0.06] hover:border-purple-500/30 rounded-xl text-left transition-all hover:bg-purple-600/5 group"
          >
            <span className="text-base shrink-0">{s.emoji}</span>
            <span className="text-xs text-gray-500 group-hover:text-white/80 transition-colors leading-snug">
              {s.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function StudioPage() {
  const supabase = getSupabase();
  const { clienteAtual } = useCliente(); // null = conta própria, objeto = cliente selecionado
  const clienteId = clienteAtual?.id ?? null;

  const [campanhas, setCampanhas]               = useState<Campanha[]>([]);
  const [campanhaSelecionada, setCampanhaSelecionada] = useState("todas");

  // Recarrega campanhas quando o cliente muda
  useEffect(() => {
    setCampanhaSelecionada("todas"); // reset dropdown ao trocar cliente
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("metricas_ads")
        .select("*")
        .eq("user_id", user.id);

      // FIX: filtra por cliente_id se um cliente estiver selecionado
      if (clienteId) {
        query = query.eq("cliente_id", clienteId);
      }

      const { data } = await query;
      if (data) setCampanhas(data as Campanha[]);
    }
    init();
  }, [supabase, clienteId]);

  const campanhasAtivas = campanhas.filter(isCampanhaAtiva);
  const campData = campanhaSelecionada !== "todas"
    ? campanhas.find(c => c.nome_campanha === campanhaSelecionada)
    : null;
  const cpl      = campData && campData.contatos > 0 ? campData.gasto_total / campData.contatos : 0;
  const pctGasto = campData && campData.orcamento > 0 ? (campData.gasto_total / campData.orcamento) * 100 : 0;

  const buildPayload = (input: string, msgs: Mensagem[]) => {
    const filtradas = campanhaSelecionada === "todas"
      ? campanhasAtivas
      : campanhas.filter(c => c.nome_campanha === campanhaSelecionada);
    const contexto =
      `ANALISTA GROWTH OS — MÉTRICAS ATUAIS:\n` +
      filtradas.map(c => {
        const cpl = c.contatos > 0 ? (c.gasto_total / c.contatos).toFixed(2) : "0.00";
        return `• ${c.nome_campanha} | Status: ${c.status} | Gasto: R$${c.gasto_total?.toFixed(2)} | Leads: ${c.contatos} | CPL: R$${cpl}`;
      }).join("\n") +
      `\n\nHISTÓRICO:\n${msgs.slice(-4).map(m => `${m.role}: ${m.content}`).join("\n")}`;
    return { metrics: filtradas, objetivo: "DIAGNÓSTICO COMPLETO", mensagemUsuario: input, contexto };
  };

  const extractReply = (data: unknown) => {
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      return String(d.analysis ?? d.error ?? "Desculpe, ocorreu um erro.");
    }
    return "Desculpe, ocorreu um erro.";
  };

  return (
    <ChatShell
      tabelaSupabase="conversas_studio"
      sidebarLabel="Nova Conversa"
      headerLabel="Studio IA"
      placeholder="Pergunte sobre suas campanhas..."
      endpoint="/api/ai-analyst"
      buildPayload={buildPayload}
      extractReply={extractReply}
      headerRight={
        <CampaignDropdown
          campanhas={campanhasAtivas}
          value={campanhaSelecionada}
          onChange={setCampanhaSelecionada}
        />
      }
      headerBottom={campData ? (
        <div className="grid grid-cols-4 gap-2 mt-4">
          <MetricBar label="Status"       value="Ativa"                     icon={<Activity size={12} />}   color="text-emerald-400" />
          <MetricBar label="CPL"          value={`R$${cpl.toFixed(2)}`}     icon={<TrendingUp size={12} />} color={cpl > 25 ? "text-red-400" : cpl < 15 ? "text-emerald-400" : "text-yellow-400"} />
          <MetricBar label="Leads"        value={String(campData.contatos)}  icon={<Users size={12} />}      color="text-purple-400" />
          <MetricBar label="Budget usado" value={`${pctGasto.toFixed(0)}%`} icon={<Wallet size={12} />}     color={pctGasto > 90 ? "text-red-400" : "text-white"} bar={pctGasto} />
        </div>
      ) : null}
      emptyState={<EmptyState onSelect={() => {}} />}
    />
  );
}