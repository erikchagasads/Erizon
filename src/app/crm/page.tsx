"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Users, DollarSign, TrendingUp, Target,
  Copy, Check, Link, ChevronDown, ChevronUp,
  Plus, X, Search, AlertTriangle, BarChart2,
  Phone, Mail, StickyNote, ArrowRight,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

type Estagio = "novo" | "contato" | "proposta" | "fechado" | "perdido";

interface Lead {
  id: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  anotacao?: string | null;
  estagio: Estagio;
  valor_fechado?: number | null;
  motivo_perda?: string | null;
  campanha_nome?: string | null;
  campanha_id?: string | null;
  plataforma?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  cliente_id?: string | null;
  score?: number | null;
  created_at: string;
  updated_at?: string;
}

interface Cliente {
  id: string;
  nome: string | null;
  crm_token?: string | null;
}

interface CampanhaROI {
  campanha_id: string | null;
  campanha_nome: string;
  plataforma: string;
  total: number;
  fechados: number;
  perdidos: number;
  valor: number;
  taxa_conversao: number;
}

interface Analytics {
  total_leads: number;
  total_fechados: number;
  valor_total: number;
  taxa_conversao: number;
  ticket_medio: number;
  leads_atrasados: number;
  funil: Record<Estagio, number>;
  por_campanha: CampanhaROI[];
  por_plataforma: { plataforma: string; count: number }[];
  evolucao_diaria: { data: string; leads: number }[];
}

const ESTAGIOS: { id: Estagio; label: string; cor: string }[] = [
  { id: "novo",     label: "Novo",     cor: "#6366f1" },
  { id: "contato",  label: "Contato",  cor: "#f59e0b" },
  { id: "proposta", label: "Proposta", cor: "#3b82f6" },
  { id: "fechado",  label: "Fechado",  cor: "#10b981" },
  { id: "perdido",  label: "Perdido",  cor: "#ef4444" },
];

const PLATAFORMA_COR: Record<string, string> = {
  meta: "#1877F2", google: "#EA4335", tiktok: "#69C9D0",
  linkedin: "#0A66C2", manual: "#6b7280",
};
const PLATAFORMA_LABEL: Record<string, string> = {
  meta: "Meta Ads", google: "Google Ads", tiktok: "TikTok Ads",
  linkedin: "LinkedIn Ads", manual: "Manual",
};

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });

function ScoreBadge({ score }: { score: number }) {
  const cor = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: cor + "22", color: cor }}>
      {score}
    </span>
  );
}

// ── Modal Novo Lead ──────────────────────────────────────────────────────────
function ModalNovoLead({
  clientes,
  onClose,
  onSalvo,
}: {
  clientes: Cliente[];
  onClose: () => void;
  onSalvo: () => void;
}) {
  const [nome, setNome]         = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail]       = useState("");
  const [anotacao, setAnotacao] = useState("");
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? "");
  const [plataforma, setPlataforma] = useState<string>("manual");
  const [campanhaId, setCampanhaId] = useState("");
  const [campanhaNome, setCampanhaNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState<string | null>(null);

  async function salvar() {
    if (!nome.trim()) { setErro("Nome é obrigatório"); return; }
    setSalvando(true); setErro(null);
    try {
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          telefone: telefone.trim() || null,
          email: email.trim() || null,
          anotacao: anotacao.trim() || null,
          cliente_id: clienteId || null,
          plataforma,
          campanha_id: campanhaId.trim() || null,
          campanha_nome: campanhaNome.trim() || null,
        }),
      });
      if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? "Erro"); }
      onSalvo(); onClose();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar");
    } finally { setSalvando(false); }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0e0e12] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Novo lead</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X size={14} /></button>
        </div>
        <div className="px-6 py-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Nome */}
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Nome *</label>
            <input value={nome} onChange={e => setNome(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40"
              placeholder="João Silva" autoFocus />
          </div>
          {/* Telefone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Telefone</label>
              <input value={telefone} onChange={e => setTelefone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40"
                placeholder="85999999999" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40"
                placeholder="joao@email.com" />
            </div>
          </div>
          {/* Cliente */}
          {clientes.length > 0 && (
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Cliente</label>
              <select value={clienteId} onChange={e => setClienteId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-[#111] text-sm text-white focus:outline-none focus:border-purple-500/40">
                <option value="">Nenhum</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          )}
          {/* Plataforma */}
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Plataforma de origem</label>
            <select value={plataforma} onChange={e => setPlataforma(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-[#111] text-sm text-white focus:outline-none focus:border-purple-500/40">
              {Object.entries(PLATAFORMA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {/* Campanha */}
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Nome da campanha</label>
            <input value={campanhaNome} onChange={e => setCampanhaNome(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40"
              placeholder="Ex: Summer 2024" />
          </div>
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">ID da campanha</label>
            <input value={campanhaId} onChange={e => setCampanhaId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 font-mono text-xs"
              placeholder="Ex: 23848..." />
          </div>
          {/* Anotação */}
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Anotação</label>
            <textarea value={anotacao} onChange={e => setAnotacao(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 resize-none"
              placeholder="Observações sobre o lead..." />
          </div>
          {erro && <p className="text-xs text-red-400">{erro}</p>}
        </div>
        <div className="px-6 py-4 border-t border-white/[0.06] flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-white/40 hover:text-white transition-colors">Cancelar</button>
          <button onClick={salvar} disabled={salvando}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2">
            {salvando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Criar lead
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Editar Lead ────────────────────────────────────────────────────────
function ModalEditarLead({
  lead,
  onClose,
  onSalvo,
}: {
  lead: Lead;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const [estagio, setEstagio]   = useState<Estagio>(lead.estagio);
  const [anotacao, setAnotacao] = useState(lead.anotacao ?? "");
  const [valor, setValor]       = useState(lead.valor_fechado ? String(lead.valor_fechado) : "");
  const [motivo, setMotivo]     = useState(lead.motivo_perda ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState<string | null>(null);

  async function salvar() {
    setSalvando(true); setErro(null);
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estagio,
          anotacao: anotacao.trim() || null,
          valor_fechado: valor ? parseFloat(valor) : null,
          motivo_perda: motivo.trim() || null,
        }),
      });
      if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? "Erro"); }
      onSalvo(); onClose();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar");
    } finally { setSalvando(false); }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0e0e12] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-sm font-semibold text-white">{lead.nome}</h2>
            {lead.campanha_nome && <p className="text-[10px] text-white/30 mt-0.5">{lead.campanha_nome}</p>}
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white"><X size={14} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {/* Estágio */}
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1.5">Estágio</label>
            <div className="flex flex-wrap gap-1.5">
              {ESTAGIOS.map(e => (
                <button key={e.id} onClick={() => setEstagio(e.id)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border"
                  style={estagio === e.id
                    ? { background: e.cor, color: "#fff", borderColor: e.cor }
                    : { background: "transparent", color: e.cor, borderColor: e.cor + "44" }}>
                  {e.label}
                </button>
              ))}
            </div>
          </div>
          {/* Valor (se fechado) */}
          {estagio === "fechado" && (
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Valor fechado (R$)</label>
              <input value={valor} onChange={e => setValor(e.target.value)} type="number"
                className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/40"
                placeholder="Ex: 1500" />
            </div>
          )}
          {/* Motivo perda (se perdido) */}
          {estagio === "perdido" && (
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Motivo da perda</label>
              <input value={motivo} onChange={e => setMotivo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-500/40"
                placeholder="Ex: Sem orçamento, concorrente..." />
            </div>
          )}
          {/* Anotação */}
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Anotação</label>
            <textarea value={anotacao} onChange={e => setAnotacao(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 resize-none"
              placeholder="Observações..." />
          </div>
          {erro && <p className="text-xs text-red-400">{erro}</p>}
        </div>
        <div className="px-5 py-4 border-t border-white/[0.06] flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-white/40 hover:text-white transition-colors">Cancelar</button>
          <button onClick={salvar} disabled={salvando}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2">
            {salvando ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página Principal ─────────────────────────────────────────────────────────
export default function CRMGestorPage() {
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [clientes, setClientes]     = useState<Cliente[]>([]);
  const [analytics, setAnalytics]   = useState<Analytics | null>(null);
  const [loading, setLoading]       = useState(true);
  const [userId, setUserId]         = useState("");
  const [filtroCliente, setFiltroCliente] = useState("todos");
  const [filtroEstagio, setFiltroEstagio] = useState<Estagio | "todos">("todos");
  const [busca, setBusca]           = useState("");
  const [copiado, setCopiado]       = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [abaAtiva, setAbaAtiva]     = useState<"leads" | "analytics" | "campanhas" | "webhooks">("leads");
  const [modalNovo, setModalNovo]   = useState(false);
  const [leadEditando, setLeadEditando] = useState<Lead | null>(null);

  const fetchDados = useCallback(async () => {
    setLoading(true);
    const clienteParam = filtroCliente !== "todos" ? `?cliente_id=${filtroCliente}` : "";
    const [leadsRes, clientesRes, meRes, analyticsRes] = await Promise.all([
      fetch(`/api/crm/leads${filtroCliente !== "todos" ? `?cliente_id=${filtroCliente}` : ""}`),
      fetch("/api/clientes"),
      fetch("/api/me"),
      fetch(`/api/crm/analytics${clienteParam}`),
    ]);
    if (leadsRes.ok)    setLeads(await leadsRes.json() as Lead[]);
    if (clientesRes.ok) {
      const j = await clientesRes.json() as { clientes?: Cliente[] } | Cliente[];
      setClientes(Array.isArray(j) ? j : (j as { clientes?: Cliente[] }).clientes ?? []);
    }
    if (meRes.ok) {
      const me = await meRes.json() as { id: string };
      setUserId(me.id);
    }
    if (analyticsRes.ok) setAnalytics(await analyticsRes.json() as Analytics);
    setLoading(false);
  }, [filtroCliente]);

  useEffect(() => { fetchDados(); }, [fetchDados]);

  // Filtros aplicados
  const leadsFiltrados = leads.filter(l => {
    if (filtroEstagio !== "todos" && l.estagio !== filtroEstagio) return false;
    if (busca) {
      const q = busca.toLowerCase();
      return (
        l.nome.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.telefone?.includes(q) ||
        l.campanha_nome?.toLowerCase().includes(q) ||
        l.utm_campaign?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalFechado   = leadsFiltrados.filter(l => l.estagio === "fechado").reduce((a, l) => a + (l.valor_fechado ?? 0), 0);
  const taxaFechamento = leadsFiltrados.length > 0
    ? Math.round((leadsFiltrados.filter(l => l.estagio === "fechado").length / leadsFiltrados.length) * 100)
    : 0;
  const leadsSemana    = leadsFiltrados.filter(l => {
    const d = new Date(l.created_at);
    const ref = new Date(); ref.setDate(ref.getDate() - 7);
    return d >= ref;
  }).length;

  function copiar(key: string, texto: string) {
    navigator.clipboard.writeText(texto);
    setCopiado(key);
    setTimeout(() => setCopiado(null), 2000);
  }

  function toggleExpandido(id: string) {
    setExpandidos(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-[#0a0a0a]">
        <Sidebar />
        <div className="ml-[60px] flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-[#6366f1]" size={28} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar />

      {modalNovo && (
        <ModalNovoLead
          clientes={clientes}
          onClose={() => setModalNovo(false)}
          onSalvo={() => { setModalNovo(false); fetchDados(); }}
        />
      )}
      {leadEditando && (
        <ModalEditarLead
          lead={leadEditando}
          onClose={() => setLeadEditando(null)}
          onSalvo={() => { setLeadEditando(null); fetchDados(); }}
        />
      )}

      <div className="ml-[60px] flex-1 flex flex-col">

        {/* Header */}
        <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-white">CRM</h1>
            <p className="text-xs text-white/30 mt-0.5">Painel de inteligência de leads</p>
          </div>
          <div className="flex items-center gap-3">
            {analytics?.leads_atrasados ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle size={12} className="text-amber-400" />
                <span className="text-[11px] text-amber-400">{analytics.leads_atrasados} propostas atrasadas</span>
              </div>
            ) : null}
            <select
              value={filtroCliente}
              onChange={e => setFiltroCliente(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 focus:outline-none"
              style={{ background: "#111" }}
            >
              <option value="todos">Todos os clientes</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <button
              onClick={() => setModalNovo(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={14} />
              Novo lead
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="px-8 pt-4 flex items-center gap-1 border-b border-white/5">
          {[
            { id: "leads" as const,     label: "Leads",     icon: Users },
            { id: "analytics" as const, label: "Analytics", icon: BarChart2 },
            { id: "campanhas" as const, label: "Campanhas", icon: Target },
            { id: "webhooks" as const,  label: "Webhooks",  icon: Link },
          ].map(aba => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                abaAtiva === aba.id
                  ? "text-purple-400 border-purple-500"
                  : "text-white/30 border-transparent hover:text-white/60"
              }`}
            >
              <aba.icon size={12} />
              {aba.label}
            </button>
          ))}
        </div>

        <div className="flex-1 px-8 py-6 space-y-6 overflow-y-auto">

          {/* ── KPIs ── */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: Users,      label: "Total de leads",   value: String(leadsFiltrados.length), sub: `${leadsSemana} esta semana`,     cor: "#6366f1" },
              { icon: Target,     label: "Taxa fechamento",  value: `${taxaFechamento}%`,          sub: `${leadsFiltrados.filter(l=>l.estagio==="fechado").length} fechados`,  cor: "#10b981" },
              { icon: DollarSign, label: "Receita fechada",  value: fmtBRL(totalFechado),          sub: analytics?.ticket_medio ? `ticket médio ${fmtBRL(analytics.ticket_medio)}` : "registrado pelos clientes", cor: "#10b981" },
              { icon: TrendingUp, label: "Em negociação",    value: String(leadsFiltrados.filter(l=>["contato","proposta"].includes(l.estagio)).length), sub: "contato + proposta", cor: "#f59e0b" },
            ].map(m => (
              <div key={m.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <m.icon size={13} style={{ color: m.cor }} />
                  <span className="text-[11px] text-white/30 uppercase tracking-wider">{m.label}</span>
                </div>
                <p className="text-2xl font-semibold text-white">{m.value}</p>
                <p className="text-[11px] text-white/25 mt-1">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* ── ABA LEADS ── */}
          {abaAtiva === "leads" && (
            <>
              {/* Filtros */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    placeholder="Buscar por nome, email, campanha..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40"
                  />
                </div>
                <div className="flex gap-1">
                  {([{id:"todos",label:"Todos"} , ...ESTAGIOS] as {id:string;label:string;cor?:string}[]).map(e => (
                    <button
                      key={e.id}
                      onClick={() => setFiltroEstagio(e.id as Estagio | "todos")}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border"
                      style={filtroEstagio === e.id
                        ? { background: e.cor ?? "#6366f1", color: "#fff", borderColor: e.cor ?? "#6366f1" }
                        : { background: "transparent", color: "#ffffff44", borderColor: "#ffffff11" }}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabela de leads */}
              <div className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                  <p className="text-xs text-white/40 uppercase tracking-wider">Leads</p>
                  <span className="text-[11px] text-white/20">{leadsFiltrados.length} registros</span>
                </div>
                {leadsFiltrados.length === 0 ? (
                  <div className="px-5 py-12 text-center text-white/20 text-sm">
                    {busca ? "Nenhum lead encontrado para esta busca." : "Nenhum lead ainda. Use o botão 'Novo lead' ou configure o webhook."}
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.03] max-h-[500px] overflow-y-auto">
                    {leadsFiltrados.slice(0, 50).map(l => {
                      const est = ESTAGIOS.find(e => e.id === l.estagio);
                      const clienteNome = clientes.find(c => c.id === l.cliente_id)?.nome ?? null;
                      return (
                        <div
                          key={l.id}
                          className="px-5 py-3 flex items-center gap-4 hover:bg-white/[0.02] cursor-pointer group"
                          onClick={() => setLeadEditando(l)}
                        >
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ background: (est?.cor ?? "#6b7280") + "22", color: est?.cor ?? "#6b7280" }}>
                            {l.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-medium text-white/90">{l.nome}</p>
                              {clienteNome && <span className="text-[10px] text-white/25">· {clienteNome}</span>}
                              {typeof l.score === "number" && <ScoreBadge score={l.score} />}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              {l.telefone && <span className="text-[10px] text-white/30 flex items-center gap-0.5"><Phone size={9} />{l.telefone}</span>}
                              {l.email && <span className="text-[10px] text-white/30 flex items-center gap-0.5 max-w-[140px] truncate"><Mail size={9} />{l.email}</span>}
                              {l.campanha_nome && <span className="text-[10px] text-white/25 truncate max-w-[140px]">{l.campanha_nome}</span>}
                              {l.anotacao && <span className="text-[10px] text-white/20 flex items-center gap-0.5 max-w-[120px] truncate"><StickyNote size={9} />{l.anotacao}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {l.plataforma && (
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: PLATAFORMA_COR[l.plataforma] ?? "#6b7280" }} />
                            )}
                            {l.estagio === "fechado" && l.valor_fechado && (
                              <span className="text-[11px] font-semibold text-emerald-400">{fmtBRL(l.valor_fechado)}</span>
                            )}
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                              style={{ background: (est?.cor ?? "#6b7280") + "15", color: est?.cor ?? "#6b7280" }}>
                              {est?.label}
                            </span>
                            <span className="text-[10px] text-white/20">{fmtData(l.created_at)}</span>
                            <ArrowRight size={12} className="text-white/10 group-hover:text-white/40 transition-colors" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Por cliente */}
              {filtroCliente === "todos" && clientes.length > 0 && (
                <div className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5">
                    <p className="text-xs text-white/40 uppercase tracking-wider">Por cliente</p>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {clientes
                      .map(c => ({
                        ...c,
                        leads: leads.filter(l => l.cliente_id === c.id),
                        fechado: leads.filter(l => l.cliente_id === c.id && l.estagio === "fechado").reduce((a, l) => a + (l.valor_fechado ?? 0), 0),
                      }))
                      .filter(c => c.leads.length > 0)
                      .sort((a, b) => b.leads.length - a.leads.length)
                      .map(c => {
                        const aberto = expandidos.has(c.id);
                        const origin = typeof window !== "undefined" ? window.location.origin : "";
                        const crmUrl     = `${origin}/crm/cliente/${c.crm_token ?? c.id}`;
                        const webhookUrl = `${origin}/api/crm/webhook/${userId}/${c.id}`;
                        const porEst = ESTAGIOS.map(e => ({ ...e, count: c.leads.filter(l => l.estagio === e.id).length }));
                        return (
                          <div key={c.id}>
                            <div className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] cursor-pointer" onClick={() => toggleExpandido(c.id)}>
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 bg-purple-600/40">
                                {(c.nome ?? "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white">{c.nome}</p>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {porEst.filter(e => e.count > 0).map(e => (
                                    <span key={e.id} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: e.cor + "22", color: e.cor }}>
                                      {e.label}: {e.count}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-6 shrink-0">
                                <div className="text-right">
                                  <p className="text-xs text-white/30">Total</p>
                                  <p className="text-sm font-semibold text-white">{c.leads.length}</p>
                                </div>
                                {c.fechado > 0 && (
                                  <div className="text-right">
                                    <p className="text-xs text-white/30">Receita</p>
                                    <p className="text-sm font-semibold text-emerald-400">{fmtBRL(c.fechado)}</p>
                                  </div>
                                )}
                                {aberto ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
                              </div>
                            </div>
                            {aberto && (
                              <div className="px-5 pb-4 bg-white/[0.01]">
                                <div className="flex gap-2 mb-3 flex-wrap">
                                  {[
                                    { key: `crm_${c.id}`,  label: "Link CRM cliente", url: crmUrl,     cor: "#818cf8" },
                                    { key: `hook_${c.id}`, label: "Webhook captura",  url: webhookUrl, cor: "#c084fc" },
                                  ].map(item => (
                                    <div key={item.key} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs border border-white/10 bg-white/[0.03]">
                                      <Link size={10} style={{ color: item.cor }} />
                                      <span style={{ color: item.cor }}>{item.label}</span>
                                      <button onClick={e => { e.stopPropagation(); copiar(item.key, item.url); }} className="text-white/30 hover:text-white ml-1">
                                        {copiado === item.key ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── ABA ANALYTICS ── */}
          {abaAtiva === "analytics" && analytics && (
            <div className="grid grid-cols-3 gap-4">
              {/* Funil */}
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-4">Funil de vendas</p>
                <div className="space-y-3">
                  {ESTAGIOS.map(e => {
                    const count = analytics.funil[e.id] ?? 0;
                    const pct = analytics.total_leads > 0 ? Math.round((count / analytics.total_leads) * 100) : 0;
                    return (
                      <div key={e.id}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: e.cor }} />
                            <span className="text-xs text-white/60">{e.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/30">{pct}%</span>
                            <span className="text-xs font-medium text-white">{count}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: e.cor }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Origem */}
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-4">Origem dos leads</p>
                {analytics.por_plataforma.length === 0 ? (
                  <p className="text-xs text-white/20 py-4 text-center">Sem dados</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.por_plataforma.map(({ plataforma, count }) => {
                      const max = analytics.por_plataforma[0]?.count ?? 1;
                      const pct = Math.round((count / max) * 100);
                      const cor = PLATAFORMA_COR[plataforma] ?? "#6b7280";
                      return (
                        <div key={plataforma}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: cor }} />
                              <span className="text-xs text-white/60">{PLATAFORMA_LABEL[plataforma] ?? plataforma}</span>
                            </div>
                            <span className="text-xs font-medium text-white">{count}</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cor }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Evolução diária */}
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-4">Leads últimos 14 dias</p>
                {analytics.evolucao_diaria.length === 0 ? (
                  <p className="text-xs text-white/20 py-4 text-center">Sem dados</p>
                ) : (
                  <div className="flex items-end gap-1 h-24">
                    {analytics.evolucao_diaria.map(({ data, leads: cnt }) => {
                      const maxCnt = Math.max(...analytics.evolucao_diaria.map(d => d.leads), 1);
                      const h = Math.max(4, Math.round((cnt / maxCnt) * 88));
                      return (
                        <div key={data} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="absolute bottom-full mb-1 text-[9px] text-white/50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {cnt} leads<br />{data.slice(5)}
                          </div>
                          <div className="w-full rounded-sm bg-purple-500/60 hover:bg-purple-400/80 transition-colors" style={{ height: h }} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ABA CAMPANHAS ── */}
          {abaAtiva === "campanhas" && (
            <div className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <p className="text-xs text-white/40 uppercase tracking-wider">ROI por campanha</p>
              </div>
              {!analytics?.por_campanha?.length ? (
                <div className="px-5 py-12 text-center text-white/20 text-sm">Nenhum dado de campanha ainda.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      {["Campanha", "Plataforma", "Leads", "Fechados", "Perdidos", "Conversão", "Receita"].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-white/25 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.por_campanha.map((c, i) => {
                      const plat = PLATAFORMA_COR[c.plataforma] ?? "#6b7280";
                      return (
                        <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-white/80 font-medium max-w-[180px] truncate">{c.campanha_nome}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: plat + "22", color: plat }}>
                              {PLATAFORMA_LABEL[c.plataforma] ?? c.plataforma}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/60">{c.total}</td>
                          <td className="px-4 py-3 text-emerald-400 font-medium">{c.fechados}</td>
                          <td className="px-4 py-3 text-red-400">{c.perdidos}</td>
                          <td className="px-4 py-3">
                            <span className="font-medium" style={{ color: c.taxa_conversao >= 20 ? "#10b981" : c.taxa_conversao >= 10 ? "#f59e0b" : "#ef4444" }}>
                              {c.taxa_conversao}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-emerald-400 font-semibold">
                            {c.valor > 0 ? fmtBRL(c.valor) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Aba Webhooks ── */}
          {abaAtiva === "webhooks" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-500/[0.05] border border-purple-500/15">
                <p className="text-xs text-white/50 leading-relaxed">
                  Cole o link abaixo como destino do formulário da campanha no Meta Ads, Google Ads ou qualquer landing page.
                  Os leads chegam automaticamente no CRM com UTMs rastreados.
                </p>
              </div>

              {clientes.length === 0 ? (
                <div className="py-12 text-center text-white/20 text-sm">Nenhum cliente cadastrado ainda.</div>
              ) : (
                <div className="space-y-3">
                  {clientes.map(c => {
                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://erizonai.com.br";
                    const webhookBase = `${baseUrl}/api/crm/webhook/${userId}/${c.id}`;
                    const webhookMeta = `${webhookBase}?utm_source=facebook&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content={{ad.name}}`;

                    return (
                      <div key={c.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between">
                          <span className="text-sm font-medium text-white">{c.nome}</span>
                          <span className="text-[10px] text-white/30 font-mono">{c.id.slice(0, 8)}…</span>
                        </div>

                        <div className="p-4 space-y-3">
                          {/* Link limpo */}
                          <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Link base</p>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-[11px] text-purple-300 bg-purple-500/[0.06] border border-purple-500/15 rounded-lg px-3 py-2 truncate">
                                {webhookBase}
                              </code>
                              <button
                                onClick={() => copiar(`base-${c.id}`, webhookBase)}
                                className="shrink-0 p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] transition-colors"
                              >
                                {copiado === `base-${c.id}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-white/40" />}
                              </button>
                            </div>
                          </div>

                          {/* Link Meta Ads com UTMs */}
                          <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Meta Ads (com UTMs automáticos)</p>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-[11px] text-blue-300 bg-blue-500/[0.06] border border-blue-500/15 rounded-lg px-3 py-2 truncate">
                                {webhookMeta}
                              </code>
                              <button
                                onClick={() => copiar(`meta-${c.id}`, webhookMeta)}
                                className="shrink-0 p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] transition-colors"
                              >
                                {copiado === `meta-${c.id}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-white/40" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
