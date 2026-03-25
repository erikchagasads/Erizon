"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  MessageCircle, Phone, ChevronRight, Loader2,
  DollarSign, X, Tag, TrendingUp, Users, CheckCircle, XCircle, LogOut,
} from "lucide-react";

// ── Tipos ──────────────────────────────────────────────────────────────────────
type Estagio = "novo" | "contato" | "proposta" | "fechado" | "perdido";

interface Lead {
  id: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  estagio: Estagio;
  valor_fechado?: number | null;
  motivo_perda?: string | null;
  campanha_nome?: string | null;
  plataforma?: string | null;
  anotacao?: string | null;
  created_at: string;
}

interface ClienteInfo {
  id: string;
  nome: string;
}

// ── Config colunas ─────────────────────────────────────────────────────────────
const COLUNAS: { id: Estagio; label: string; cor: string; bg: string; icon: string }[] = [
  { id: "novo",     label: "Novos",    cor: "#6366f1", bg: "rgba(99,102,241,0.06)",  icon: "⚡" },
  { id: "contato",  label: "Contato",  cor: "#f59e0b", bg: "rgba(245,158,11,0.06)",  icon: "📞" },
  { id: "proposta", label: "Proposta", cor: "#3b82f6", bg: "rgba(59,130,246,0.06)",  icon: "📄" },
  { id: "fechado",  label: "Fechados", cor: "#10b981", bg: "rgba(16,185,129,0.06)",  icon: "✅" },
  { id: "perdido",  label: "Perdidos", cor: "#ef4444", bg: "rgba(239,68,68,0.06)",   icon: "❌" },
];

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtData = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

// ── Componente ─────────────────────────────────────────────────────────────────
export default function CRMClientePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [cliente, setCliente]   = useState<ClienteInfo | null>(null);
  const [leads, setLeads]       = useState<Lead[]>([]);
  const [loading, setLoading]   = useState(true);
  const [erro, setErro]         = useState("");

  const [leadAtivo, setLeadAtivo]       = useState<Lead | null>(null);
  const [valorFechado, setValorFechado] = useState("");
  const [motivoPerda, setMotivoPerda]   = useState("");
  const [salvando, setSalvando]         = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    const res = await fetch(`/api/crm-cliente/${token}/leads`);
    if (res.status === 401) {
      router.replace(`/crm/cliente/login/${token}`);
      return;
    }
    if (!res.ok) {
      const e = await res.json() as { error: string };
      setErro(e.error ?? "Link inválido ou expirado");
      setLoading(false);
      return;
    }
    const data = await res.json() as { cliente: ClienteInfo; leads: Lead[] };
    setCliente(data.cliente);
    setLeads(data.leads);
    setLoading(false);
  }, [token, router]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // ── Mover lead ─────────────────────────────────────────────────────────────
  async function moverLead(leadId: string, estagio: Estagio) {
    setSalvando(true);
    const body: Record<string, unknown> = { estagio };
    if (estagio === "fechado" && valorFechado) body.valor_fechado = Number(valorFechado);
    if (estagio === "perdido" && motivoPerda)  body.motivo_perda  = motivoPerda;

    const res = await fetch(`/api/crm-cliente/${token}/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const atualizado = await res.json() as Lead;
      setLeads(prev => prev.map(l => l.id === leadId ? atualizado : l));
      setLeadAtivo(atualizado);
    }
    setSalvando(false);
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  async function handleLogout() {
    await fetch("/api/crm-cliente/auth/logout", { method: "POST" });
    router.replace(`/crm/cliente/login/${token}`);
  }

  // ── Métricas rápidas ───────────────────────────────────────────────────────
  const totalFechado   = leads.filter(l => l.estagio === "fechado").reduce((a, l) => a + (l.valor_fechado ?? 0), 0);
  const taxaFechamento = leads.length > 0
    ? Math.round((leads.filter(l => l.estagio === "fechado").length / leads.length) * 100)
    : 0;

  // ── Loading / Erro ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-[#6366f1] mx-auto mb-3" size={32} />
          <p className="text-white/40 text-sm">Carregando seu CRM...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-white font-semibold text-lg mb-2">Link inválido</h1>
          <p className="text-white/40 text-sm">{erro}</p>
          <p className="text-white/20 text-xs mt-4">Solicite um novo link ao seu gestor de tráfego.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">

      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-white/30 uppercase tracking-wider">CRM</span>
            </div>
            <h1 className="text-white font-semibold text-lg">{cliente?.nome}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-white/30">Powered by</p>
              <p className="text-white/60 text-sm font-medium">Erizon</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/5 transition-colors"
              title="Sair"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="max-w-[1400px] mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Users,       label: "Total de leads",    value: leads.length,         color: "#6366f1", fmt: (v: number) => String(v) },
            { icon: TrendingUp,  label: "Taxa de fechamento",value: taxaFechamento,        color: "#3b82f6", fmt: (v: number) => `${v}%` },
            { icon: CheckCircle, label: "Leads fechados",    value: leads.filter(l => l.estagio === "fechado").length, color: "#10b981", fmt: (v: number) => String(v) },
            { icon: DollarSign,  label: "Receita fechada",   value: totalFechado,          color: "#10b981", fmt: fmtBRL },
          ].map(m => (
            <div key={m.label} className="bg-white/[0.03] rounded-xl border border-white/5 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <m.icon size={13} style={{ color: m.color }} />
                <span className="text-[11px] text-white/30">{m.label}</span>
              </div>
              <p className="text-white font-semibold text-lg">{m.fmt(m.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="max-w-[1400px] mx-auto">
          {leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-white/40 text-sm">Nenhum lead ainda.</p>
              <p className="text-white/20 text-xs mt-1">Os leads aparecerão aqui quando chegarem pelos seus anúncios.</p>
            </div>
          ) : (
            <div className="flex gap-4" style={{ minWidth: "max-content" }}>
              {COLUNAS.map(col => {
                const colLeads = leads.filter(l => l.estagio === col.id);
                return (
                  <div
                    key={col.id}
                    className="flex flex-col rounded-xl border border-white/5 overflow-hidden"
                    style={{ width: 270, background: col.bg }}
                  >
                    {/* Header coluna */}
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{col.icon}</span>
                        <span className="text-sm font-medium text-white/80">{col.label}</span>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: col.cor + "22", color: col.cor }}
                      >
                        {colLeads.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 px-3 pb-3 space-y-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
                      {colLeads.length === 0 && (
                        <div className="text-center text-white/15 text-xs py-6">Vazio</div>
                      )}
                      {colLeads.map(lead => (
                        <div
                          key={lead.id}
                          onClick={() => {
                            setLeadAtivo(lead);
                            setValorFechado(lead.valor_fechado?.toString() ?? "");
                            setMotivoPerda(lead.motivo_perda ?? "");
                          }}
                          className="bg-white/[0.04] rounded-lg p-3 cursor-pointer hover:bg-white/[0.08] transition-colors border border-white/5"
                        >
                          <p className="text-sm font-medium text-white leading-tight mb-1.5">{lead.nome}</p>

                          {lead.telefone && (
                            <div className="flex items-center gap-1 text-white/40 text-xs mb-1">
                              <Phone size={10} />
                              {lead.telefone}
                            </div>
                          )}

                          {lead.campanha_nome && (
                            <div className="flex items-center gap-1 text-white/25 text-xs mb-1">
                              <Tag size={10} />
                              {lead.campanha_nome}
                            </div>
                          )}

                          {lead.valor_fechado && (
                            <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                              <DollarSign size={10} />
                              {fmtBRL(lead.valor_fechado)}
                            </div>
                          )}

                          <p className="text-white/20 text-[10px] mt-1.5">{fmtData(lead.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Detalhe do Lead ─────────────────────────────────────────────── */}
      {leadAtivo && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-white">{leadAtivo.nome}</h2>
                {leadAtivo.campanha_nome && (
                  <p className="text-xs text-white/30 mt-0.5">via {leadAtivo.campanha_nome}</p>
                )}
              </div>
              <button onClick={() => setLeadAtivo(null)}>
                <X size={20} className="text-white/30 hover:text-white transition-colors" />
              </button>
            </div>

            {/* Contato rápido */}
            {leadAtivo.telefone && (
              <div className="flex gap-2 mb-5">
                <a
                  href={`https://wa.me/55${leadAtivo.telefone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-colors"
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </a>
                <a
                  href={`tel:${leadAtivo.telefone}`}
                  className="flex items-center gap-2 bg-white/5 text-white/50 px-4 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors"
                >
                  <Phone size={14} />
                  Ligar
                </a>
              </div>
            )}

            {/* Pipeline */}
            <div className="mb-5">
              <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">Mover para</p>
              <div className="flex flex-wrap gap-2">
                {COLUNAS.map(col => (
                  <button
                    key={col.id}
                    onClick={() => moverLead(leadAtivo.id, col.id)}
                    disabled={leadAtivo.estagio === col.id || salvando}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: leadAtivo.estagio === col.id ? col.cor + "33" : "rgba(255,255,255,0.05)",
                      color:      leadAtivo.estagio === col.id ? col.cor : "rgba(255,255,255,0.45)",
                      border:    `1px solid ${leadAtivo.estagio === col.id ? col.cor + "55" : "transparent"}`,
                      opacity:   salvando ? 0.5 : 1,
                    }}
                  >
                    {leadAtivo.estagio === col.id && <ChevronRight size={10} />}
                    {col.icon} {col.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Valor / Motivo */}
            {leadAtivo.estagio !== "fechado" && leadAtivo.estagio !== "perdido" && (
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <p className="text-[11px] text-white/30 mb-1.5">Valor da venda (R$)</p>
                  <input
                    type="number"
                    value={valorFechado}
                    onChange={e => setValorFechado(e.target.value)}
                    placeholder="Ex: 2500"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#6366f1]"
                  />
                  <p className="text-[10px] text-white/20 mt-1">Preencha antes de mover para Fechado</p>
                </div>
                <div>
                  <p className="text-[11px] text-white/30 mb-1.5">Motivo da perda</p>
                  <input
                    value={motivoPerda}
                    onChange={e => setMotivoPerda(e.target.value)}
                    placeholder="Ex: Preço alto"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#6366f1]"
                  />
                  <p className="text-[10px] text-white/20 mt-1">Preencha antes de mover para Perdido</p>
                </div>
              </div>
            )}

            {/* Badge fechado */}
            {leadAtivo.estagio === "fechado" && leadAtivo.valor_fechado && (
              <div className="mb-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="text-emerald-400 font-semibold">{fmtBRL(leadAtivo.valor_fechado)}</p>
                  <p className="text-emerald-400/50 text-xs">Venda confirmada</p>
                </div>
              </div>
            )}

            {/* Badge perdido */}
            {leadAtivo.estagio === "perdido" && (
              <div className="mb-5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                <XCircle size={18} className="text-red-400 shrink-0" />
                <div>
                  <p className="text-red-400 font-medium text-sm">Lead perdido</p>
                  {leadAtivo.motivo_perda && (
                    <p className="text-red-400/50 text-xs mt-0.5">{leadAtivo.motivo_perda}</p>
                  )}
                </div>
              </div>
            )}

            {/* Origem */}
            {(leadAtivo.campanha_nome || leadAtivo.plataforma) && (
              <div className="border-t border-white/5 pt-4">
                <p className="text-[11px] text-white/25 uppercase tracking-wider mb-2">Origem</p>
                {leadAtivo.campanha_nome && (
                  <p className="text-xs text-white/40 mb-0.5">📣 {leadAtivo.campanha_nome}</p>
                )}
                {leadAtivo.plataforma && (
                  <p className="text-xs text-white/30">
                    {{
                      meta: "Meta Ads",
                      google: "Google Ads",
                      tiktok: "TikTok Ads",
                      linkedin: "LinkedIn Ads",
                      manual: "Manual",
                    }[leadAtivo.plataforma] ?? leadAtivo.plataforma}
                  </p>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
