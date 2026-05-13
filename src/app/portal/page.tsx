"use client";

// app/portal/page.tsx — Portal do Cliente v2 "Painel Vivo"
// O cliente abre e SENTE o ROI em tempo real.
// O gestor para de justificar e vira parceiro estratégico.

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PlanGate from "@/components/PlanGate";
import {
  Users, TrendingUp, Target, DollarSign,
  Loader2, ExternalLink, Copy, Check,
  BarChart3, ChevronRight, AlertTriangle,
  Star, Activity, ArrowUpRight, ArrowDownRight,
  RefreshCw,
} from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
  cor?: string;
}

interface CampanhaPublica {
  nome_campanha: string;
  gasto_total: number;
  total_leads: number;
  cpl: number;
  ctr: number;
  score: number;
  recomendacao: string;
  leads_fechados?: number;
  receita_gerada?: number;
}

interface PortalData {
  nome: string;
  cor: string;
  campanhas: CampanhaPublica[];
  total_leads: number;
  gasto_total: number;
  cpl_medio: number;
  campanhas_ativas: number;
  ultima_atualizacao: string | null;
  receita_total?: number;
  roi_pct?: number;
  leads_fechados_total?: number;
  taxa_fechamento?: number;
  leads_semana_anterior?: number;
  gasto_semana_anterior?: number;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtNum = (v: number) => v.toLocaleString("pt-BR");
const fmtPct = (v: number) => `${v.toFixed(2)}%`;

function scoreColor(s: number) {
  if (s >= 75) return "text-emerald-400";
  if (s >= 50) return "text-yellow-400";
  return "text-red-400";
}

function recBadge(r: string) {
  const m: Record<string, string> = {
    Escalar:   "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    Manter:    "bg-blue-500/15 text-blue-400 border-blue-500/20",
    Otimizar:  "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    Pausar:    "bg-red-500/15 text-red-400 border-red-500/20",
    Maturando: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  };
  return m[r] ?? "bg-white/5 text-white/40 border-white/10";
}

function LiveMetricCard({
  icon: Icon, label, value, delta, deltaLabel, highlight,
}: {
  icon: React.ElementType; label: string; value: string;
  delta?: number; deltaLabel?: string; highlight?: boolean;
}) {
  const isPositive = delta !== undefined && delta >= 0;
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? "border-purple-500/30 bg-purple-500/[0.07]" : "border-white/[0.06] bg-white/[0.02]"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${highlight ? "bg-purple-500/20" : "bg-purple-500/10"}`}>
            <Icon size={13} className="text-purple-400" />
          </div>
          <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">{label}</span>
        </div>
        {delta !== undefined && (
          <div className={`flex items-center gap-0.5 text-[10px] font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {isPositive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(delta)}%
          </div>
        )}
      </div>
      <p className={`text-2xl font-bold ${highlight ? "text-purple-200" : "text-white"}`}>{value}</p>
      {deltaLabel && <p className="text-[10px] text-white/25 mt-1">{deltaLabel}</p>}
    </div>
  );
}

function ROIBar({ roi }: { roi: number }) {
  const capped = Math.min(roi, 1000);
  const pct = Math.min((capped / 1000) * 100, 100);
  const color = roi >= 300 ? "bg-emerald-500" : roi >= 100 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10">
            <Activity size={13} className="text-emerald-400" />
          </div>
          <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">ROI da campanha</span>
        </div>
        <span className={`text-sm font-bold ${roi >= 100 ? "text-emerald-400" : "text-red-400"}`}>
          {roi >= 0 ? "+" : ""}{roi.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] text-white/20">0%</span>
        <span className="text-[9px] text-white/20">ROI 1000%</span>
      </div>
    </div>
  );
}

function FaturamentoForm({ clienteId, onSaved }: { clienteId: string; onSaved: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [receita, setReceita] = useState("");
  const [fechados, setFechados] = useState("");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);

  async function salvar() {
    setSaving(true);
    try {
      await fetch(`/api/clientes/${clienteId}/financeiro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receita_gerada: parseFloat(receita) || 0,
          leads_fechados: parseInt(fechados) || 0,
        }),
      });
      setOk(true);
      setTimeout(() => { setOk(false); setAberto(false); onSaved(); }, 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button onClick={() => setAberto(!aberto)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10">
            <DollarSign size={13} className="text-emerald-400" />
          </div>
          <span className="text-sm font-medium text-white">Registrar faturamento real</span>
          <span className="text-[10px] text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-full">gestor</span>
        </div>
        <ChevronRight size={13} className={`text-white/30 transition-transform ${aberto ? "rotate-90" : ""}`} />
      </button>
      {aberto && (
        <div className="px-5 pb-5 space-y-3 border-t border-white/[0.04]">
          <p className="text-[11px] text-white/30 pt-3">
            Conecte o resultado real ao tráfego. Alimenta o ROI e o Profit DNA do cliente.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1.5">Receita gerada (R$)</label>
              <input type="number" value={receita} onChange={e => setReceita(e.target.value)}
                placeholder="ex: 15000"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1.5">Leads fechados</label>
              <input type="number" value={fechados} onChange={e => setFechados(e.target.value)}
                placeholder="ex: 3"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40" />
            </div>
          </div>
          <button onClick={salvar} disabled={saving || ok}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : ok ? <Check size={13} /> : <RefreshCw size={13} />}
            {ok ? "Salvo!" : saving ? "Salvando..." : "Salvar faturamento"}
          </button>
        </div>
      )}
    </div>
  );
}

function PortalView({ data, clienteId, onRefresh }: { data: PortalData; clienteId: string; onRefresh: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/share/portal/${clienteId}` : "";
  const atualizado = data.ultima_atualizacao
    ? new Date(data.ultima_atualizacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";

  const roi = data.receita_total && data.gasto_total > 0
    ? ((data.receita_total - data.gasto_total) / data.gasto_total) * 100
    : null;

  const deltaLeads = data.leads_semana_anterior && data.leads_semana_anterior > 0
    ? Math.round(((data.total_leads - data.leads_semana_anterior) / data.leads_semana_anterior) * 100)
    : undefined;

  const deltaGasto = data.gasto_semana_anterior && data.gasto_semana_anterior > 0
    ? Math.round(((data.gasto_total - data.gasto_semana_anterior) / data.gasto_semana_anterior) * 100)
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: data.cor ?? "#6366f1" }}>
            {data.nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">{data.nome}</h2>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[11px] text-white/30">Atualizado: {atualizado}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-[11px] text-white/50 hover:text-white transition-all">
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            {copied ? "Copiado!" : "Copiar link"}
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(`Olá! Aqui está seu painel de resultados ao vivo: ${link}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-500/30 bg-green-500/10 text-[11px] text-green-400 hover:bg-green-500/20 transition-all">
            <ExternalLink size={11} /> WhatsApp
          </a>
          <a href={link} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-[11px] text-purple-300 hover:bg-purple-500/20 transition-all">
            <ExternalLink size={11} /> Abrir portal
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <LiveMetricCard icon={DollarSign} label="Investimento" value={fmtBRL(data.gasto_total)}
          delta={deltaGasto} deltaLabel={deltaGasto !== undefined ? "vs semana anterior" : undefined} />
        <LiveMetricCard icon={Target} label="Total de leads" value={fmtNum(data.total_leads)}
          delta={deltaLeads} deltaLabel={deltaLeads !== undefined ? "vs semana anterior" : undefined} />
        <LiveMetricCard icon={TrendingUp} label="CPL médio" value={data.cpl_medio > 0 ? fmtBRL(data.cpl_medio) : "—"} />
        {data.receita_total && data.receita_total > 0 ? (
          <LiveMetricCard icon={Star} label="Receita gerada" value={fmtBRL(data.receita_total)} highlight />
        ) : (
          <LiveMetricCard icon={BarChart3} label="Campanhas ativas" value={String(data.campanhas_ativas)} />
        )}
      </div>

      {roi !== null && <ROIBar roi={roi} />}

      {data.leads_fechados_total !== undefined && data.leads_fechados_total > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Leads fechados</p>
            <p className="text-2xl font-bold text-white">{fmtNum(data.leads_fechados_total)}</p>
            <p className="text-[11px] text-white/30 mt-1">de {fmtNum(data.total_leads)} leads gerados</p>
          </div>
          {data.taxa_fechamento !== undefined && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Taxa de fechamento</p>
              <p className={`text-2xl font-bold ${data.taxa_fechamento >= 15 ? "text-emerald-400" : data.taxa_fechamento >= 8 ? "text-amber-400" : "text-white"}`}>
                {data.taxa_fechamento.toFixed(1)}%
              </p>
              <p className="text-[11px] text-white/30 mt-1">leads → contratos</p>
            </div>
          )}
        </div>
      )}

      <FaturamentoForm clienteId={clienteId} onSaved={onRefresh} />

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05]">
          <h3 className="text-sm font-semibold text-white">Campanhas ativas</h3>
          <p className="text-[11px] text-white/30 mt-0.5">Performance em tempo real</p>
        </div>
        {data.campanhas.length === 0 ? (
          <div className="px-5 py-10 text-center space-y-2">
            <p className="text-white/30 text-sm">Nenhuma campanha encontrada.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {data.campanhas.map((c, i) => (
              <div key={i} className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{c.nome_campanha}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-[11px] text-white/40">{fmtBRL(c.gasto_total)} investido</span>
                      <span className="text-white/20">·</span>
                      <span className="text-[11px] text-white/40">{fmtNum(c.total_leads)} leads</span>
                      {c.total_leads > 0 && <><span className="text-white/20">·</span>
                        <span className="text-[11px] text-white/40">CPL {fmtBRL(c.cpl)}</span></>}
                      <span className="text-white/20">·</span>
                      <span className="text-[11px] text-white/40">CTR {fmtPct(c.ctr)}</span>
                      {c.receita_gerada && c.receita_gerada > 0 && <><span className="text-white/20">·</span>
                        <span className="text-[11px] text-emerald-400 font-medium">{fmtBRL(c.receita_gerada)} receita</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-bold ${scoreColor(c.score)}`}>{c.score}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${recBadge(c.recomendacao)}`}>{c.recomendacao}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-blue-500/15 bg-blue-500/5 p-4">
        <AlertTriangle size={14} className="text-blue-400 mt-0.5 shrink-0" />
        <p className="text-[11px] text-blue-300/70 leading-relaxed">
          O portal público mostra investimento, leads, CPL e ROI autorizado. Dados estratégicos e margens internas não são expostos. Envie via WhatsApp e elimine perguntas operacionais.
        </p>
      </div>
    </div>
  );
}

export default function PortalPage() {
  const [clientes, setClientes]     = useState<Cliente[]>([]);
  const [clienteId, setClienteId]   = useState("");
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [loadingC, setLoadingC]     = useState(true);
  const [loadingP, setLoadingP]     = useState(false);
  const [erro, setErro]             = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clientes")
      .then(r => r.json())
      .then(json => {
        const payload =
          json && typeof json === "object" && "clientes" in json
            ? asArray<Record<string, unknown>>((json as { clientes?: unknown }).clientes)
            : asArray<Record<string, unknown>>(json);

        const lista: Cliente[] = payload.map((c) => ({
          id: String(c.id ?? ""),
          nome: String(c.nome_cliente ?? c.nome ?? "—"),
          cor: typeof c.cor === "string" ? c.cor : undefined,
        }));
        setClientes(lista);
        if (lista.length > 0) setClienteId(lista[0].id);
      })
      .finally(() => setLoadingC(false));
  }, []);

  function carregarPortal(id: string) {
    setLoadingP(true); setErro(null); setPortalData(null);
    fetch(`/api/cliente-publico/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject("Erro ao carregar"))
      .then(setPortalData)
      .catch(() => setErro("Erro ao carregar dados do cliente."))
      .finally(() => setLoadingP(false));
  }

  useEffect(() => { if (clienteId) carregarPortal(clienteId); }, [clienteId]);

  return (
    <PlanGate minPlan="command" feature="Portal do Cliente">
      <>
      <Sidebar />
      <div className="md:ml-[60px] pb-20 md:pb-0 min-h-screen bg-[#040406] text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[11px] text-purple-400 font-semibold uppercase tracking-wider">Portal Cliente</p>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] text-emerald-400 font-semibold">AO VIVO</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white">Painel do Cliente</h1>
            <p className="text-sm text-white/40 mt-1">ROI em tempo real. Registre faturamento e elimine a necessidade de justificar resultados.</p>
          </div>

          {loadingC ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={20} className="animate-spin text-purple-400" /></div>
          ) : clientes.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
              <Users size={32} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">Nenhum cliente cadastrado ainda.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3 flex-wrap">
                {clientes.map(c => (
                  <button key={c.id} onClick={() => setClienteId(c.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                      clienteId === c.id
                        ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
                        : "border-white/[0.06] bg-white/[0.02] text-white/50 hover:text-white hover:border-white/20"
                    }`}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor ?? "#6366f1" }} />
                    {c.nome}
                    {clienteId === c.id && <ChevronRight size={13} />}
                  </button>
                ))}
              </div>
              {loadingP ? (
                <div className="flex items-center justify-center py-16"><Loader2 size={18} className="animate-spin text-purple-400" /></div>
              ) : erro ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">{erro}</div>
              ) : portalData ? (
                <PortalView data={portalData} clienteId={clienteId} onRefresh={() => carregarPortal(clienteId)} />
              ) : null}
            </div>
          )}
        </div>
      </div>
      </>
    </PlanGate>
  );
}
