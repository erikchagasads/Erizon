"use client";

// app/portal/page.tsx — Portal do Cliente
// O cliente acessa e vê só os dados dele: investimento, campanhas, leads, CPL.
// O gestor economiza tempo de WhatsApp. O cliente ganha transparência.

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Users, TrendingUp, Target, DollarSign,
  Loader2, ExternalLink, Copy, Check,
  BarChart3, ChevronRight, AlertTriangle,
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
}

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function MetricCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-purple-500/10">
          <Icon size={13} className="text-purple-400" />
        </div>
        <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function PortalView({ data, clienteId }: { data: PortalData; clienteId: string }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined"
    ? `${window.location.origin}/share/portal/${clienteId}`
    : "";

  const atualizado = data.ultima_atualizacao
    ? new Date(data.ultima_atualizacao).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : "—";

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
            <p className="text-[11px] text-white/30">Atualizado: {atualizado}</p>
          </div>
        </div>
          <div className="flex items-center gap-2">
          <button onClick={() => {
            navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-[11px] text-white/50 hover:text-white transition-all">
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            {copied ? "Copiado!" : "Copiar link"}
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(`Olá! Aqui está o seu portal de acompanhamento de campanhas: ${link}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-500/30 bg-green-500/10 text-[11px] text-green-400 hover:bg-green-500/20 transition-all">
            <ExternalLink size={11} />
            WhatsApp
          </a>
          <a href={link} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-[11px] text-purple-300 hover:bg-purple-500/20 transition-all">
            <ExternalLink size={11} />
            Abrir portal
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={DollarSign} label="Investimento" value={fmtBRL(data.gasto_total)} />
        <MetricCard icon={Target} label="Total de leads" value={fmtNum(data.total_leads)} />
        <MetricCard icon={TrendingUp} label="CPL médio" value={data.cpl_medio > 0 ? fmtBRL(data.cpl_medio) : "—"} />
        <MetricCard icon={BarChart3} label="Campanhas ativas" value={String(data.campanhas_ativas)} />
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05]">
          <h3 className="text-sm font-semibold text-white">Campanhas ativas</h3>
          <p className="text-[11px] text-white/30 mt-0.5">O que o cliente vê no portal público</p>
        </div>
        {data.campanhas.length === 0 ? (
          <div className="px-5 py-10 text-center space-y-2">
            <p className="text-white/30 text-sm">Nenhuma campanha encontrada para este cliente.</p>
            <p className="text-white/20 text-xs leading-relaxed">Verifique se o cliente tem campanhas vinculadas em <span className="text-purple-400">/clientes</span> ou se o Meta Account ID está configurado e o sync foi executado.</p>
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
                      {c.total_leads > 0 && <>
                        <span className="text-white/20">·</span>
                        <span className="text-[11px] text-white/40">CPL {fmtBRL(c.cpl)}</span>
                      </>}
                      <span className="text-white/20">·</span>
                      <span className="text-[11px] text-white/40">CTR {fmtPct(c.ctr)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-bold ${scoreColor(c.score)}`}>{c.score}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${recBadge(c.recomendacao)}`}>
                      {c.recomendacao}
                    </span>
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
          O portal público exibe investimento, leads e CPL. Margem e receita interna não são compartilhadas.
          Envie o link ao cliente via WhatsApp e elimine perguntas operacionais.
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lista: Cliente[] = (json.clientes ?? json ?? []).map((c: any) => ({
          id: c.id,
          nome: c.nome_cliente ?? c.nome ?? "—",
          cor: c.cor,
        }));
        setClientes(lista);
        if (lista.length > 0) setClienteId(lista[0].id);
      })
      .finally(() => setLoadingC(false));
  }, []);

  useEffect(() => {
    if (!clienteId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingP(true);
    setErro(null);
    setPortalData(null);
    fetch(`/api/cliente-publico/${clienteId}`)
      .then(r => r.ok ? r.json() : Promise.reject("Erro ao carregar"))
      .then(setPortalData)
      .catch(() => setErro("Erro ao carregar dados do cliente."))
      .finally(() => setLoadingP(false));
  }, [clienteId]);

  return (
    <>
      <Sidebar />
      <div className="md:ml-[60px] pb-20 md:pb-0 min-h-screen bg-[#040406] text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="mb-8">
            <p className="text-[11px] text-purple-400 font-semibold uppercase tracking-wider mb-1">Portal Cliente</p>
            <h1 className="text-2xl font-bold text-white">Portal do Cliente</h1>
            <p className="text-sm text-white/40 mt-1">
              Transparência operacional. Envie o link e elimine perguntas de WhatsApp.
            </p>
          </div>

          {loadingC ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={20} className="animate-spin text-purple-400" />
            </div>
          ) : clientes.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
              <Users size={32} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">Nenhum cliente cadastrado ainda.</p>
              <p className="text-white/25 text-xs mt-1">Crie um cliente em Campanhas para começar.</p>
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
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={18} className="animate-spin text-purple-400" />
                </div>
              ) : erro ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">{erro}</div>
              ) : portalData ? (
                <PortalView data={portalData} clienteId={clienteId} />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
