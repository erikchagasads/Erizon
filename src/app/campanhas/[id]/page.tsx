"use client";

// app/clientes/page.tsx — v3
// Novidade: Modal "Conectar Meta Ads" busca accounts reais do BM via /api/meta-accounts
// Clientes sem meta_account_id mostram estado "Sem integração" com botão para conectar

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Plus, AlertCircle, CheckCircle2, RefreshCw,
  Users, DollarSign, Loader2, ChevronRight,
  Clock, Zap, ShieldAlert, Search, Link2,
  BarChart3, Copy, Check, ExternalLink, Trash2,
  Plug, X, Building2, CircleDot, ChevronDown,
  WifiOff, Wifi
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { getSupabase } from "@/lib/supabase";
import { fetchSafe } from "@/lib/fetchSafe";

// ─── Types ────────────────────────────────────────────────────
interface Cliente {
  id: string;
  nome: string;
  nome_cliente?: string;
  cor: string;
  logo_url?: string;
  meta_account_id?: string;
  ticket_medio?: number;
  ativo: boolean;
  total_campanhas: number;
  campanhas_ativas: number;
  campanhas_criticas?: number;
  gasto_total: number;
  total_leads: number;
  cpl_medio: number;
  score?: number;
  ultima_atualizacao?: string;
}

interface MetaAccount {
  id: string;
  name: string;
  status: number;
  status_label: string;
  ativo: boolean;
  currency: string;
  business_name: string | null;
}

// ─── Constants & helpers ──────────────────────────────────────
const CORES = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];
const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const horasDesdeSync = (d?: string) => d ? (Date.now() - new Date(d).getTime()) / 3_600_000 : 999;

function formatarNome(nome: string): string {
  if (!nome) return "";
  return nome
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function calcularScore(cliente: Cliente): number {
  if (cliente.total_leads === 0 && cliente.gasto_total > 50) return 20;
  if (cliente.cpl_medio === 0) return 50;
  const limite = cliente.ticket_medio ? cliente.ticket_medio * 0.04 * 0.35 : 40;
  if (cliente.cpl_medio > limite * 2) return 25;
  if (cliente.cpl_medio > limite * 1.5) return 45;
  if (cliente.cpl_medio > limite) return 65;
  return 85;
}

// ─── Score Ring ───────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const cor = score >= 70 ? "#10b981" : score >= 45 ? "#f59e0b" : "#ef4444";
  const r = 18, c = 22, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative w-11 h-11 shrink-0">
      <svg width={44} height={44} className="-rotate-90">
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={3} />
        <circle cx={c} cy={c} r={r} fill="none" stroke={cor} strokeWidth={3}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-white">{score}</span>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────
function Avatar({ cliente, size = "md" }: { cliente: Cliente; size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "w-12 h-12 text-[18px]" : size === "md" ? "w-10 h-10 text-[15px]" : "w-7 h-7 text-[11px]";
  const inicial = (cliente.nome_cliente ?? cliente.nome ?? "?").charAt(0).toUpperCase();
  return (
    <div className={`${s} rounded-xl flex items-center justify-center font-black text-white shrink-0`}
      style={{ backgroundColor: cliente.cor }}>
      {inicial}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────
function StatusBadge({ score }: { score: number }) {
  if (score >= 70) return <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/15">Saudável</span>;
  if (score >= 45) return <span className="text-[10px] font-bold text-amber-400 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/15">Atenção</span>;
  return <span className="text-[10px] font-bold text-red-400 px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/15">Crítico</span>;
}

// ─── CopyLink Button ──────────────────────────────────────────
function CopyLinkBtn({ clienteId }: { clienteId: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/cliente/${clienteId}`;
  function copiar() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copiar} title="Copiar link do cliente"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.07] text-[11px] text-white/35 hover:text-white hover:border-white/[0.15] hover:bg-white/[0.03] transition-all">
      {copied ? <><Check size={11} className="text-emerald-400" /> Copiado!</> : <><Link2 size={11} /> Link cliente</>}
    </button>
  );
}

// ─── Modal Conectar Meta Ads ──────────────────────────────────
function ModalConectarMeta({
  cliente,
  onConectar,
  onFechar,
}: {
  cliente: Cliente;
  onConectar: (clienteId: string, accountId: string) => Promise<void>;
  onFechar: () => void;
}) {
  const [accounts, setAccounts]     = useState<MetaAccount[]>([]);
  const [loading, setLoading]       = useState(true);
  const [salvando, setSalvando]     = useState(false);
  const [erro, setErro]             = useState("");
  const [busca, setBusca]           = useState("");
  const [selecionado, setSelecionado] = useState<MetaAccount | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/meta-accounts")
      .then(r => r.json())
      .then(d => {
        if (d.error) setErro(d.error);
        else setAccounts(d.accounts ?? []);
      })
      .catch(() => setErro("Erro ao buscar contas Meta."))
      .finally(() => setLoading(false));
  }, []);

  const filtrados = useMemo(() => {
    if (!busca.trim()) return accounts;
    const b = busca.toLowerCase();
    return accounts.filter(a =>
      a.name.toLowerCase().includes(b) ||
      a.id.includes(b) ||
      (a.business_name ?? "").toLowerCase().includes(b)
    );
  }, [accounts, busca]);

  async function handleConectar() {
    if (!selecionado) return;
    setSalvando(true);
    await onConectar(cliente.id, selecionado.id);
    setSalvando(false);
    onFechar();
  }

  const nomeFormatado = formatarNome(cliente.nome_cliente ?? cliente.nome ?? "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onFechar()}
    >
      <div className="w-full max-w-[520px] bg-[#111113] border border-white/[0.08] rounded-[24px] overflow-hidden">
        
        {/* Header do modal */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-[13px] shrink-0"
              style={{ backgroundColor: cliente.cor }}>
              {(cliente.nome_cliente ?? cliente.nome ?? "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] text-white/25 mb-0.5">Conectar Meta Ads</p>
              <h3 className="text-[15px] font-bold text-white">{nomeFormatado}</h3>
            </div>
          </div>
          <button onClick={onFechar}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] transition-all">
            <X size={14} className="text-white/30" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={20} className="animate-spin text-white/20" />
              <p className="text-[12px] text-white/20">Buscando contas no Business Manager...</p>
            </div>
          ) : erro ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="w-12 h-12 rounded-2xl bg-red-500/[0.06] border border-red-500/15 flex items-center justify-center">
                <WifiOff size={18} className="text-red-400" />
              </div>
              <p className="text-[13px] text-white/40 text-center max-w-[300px]">{erro}</p>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                <input
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder={`Buscar entre ${accounts.length} contas...`}
                  className="w-full pl-9 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.07] rounded-xl text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/15 transition-colors"
                />
              </div>

              {/* Conta atual (se houver) */}
              {cliente.meta_account_id && (
                <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-blue-500/[0.04] border border-blue-500/10 rounded-xl">
                  <CircleDot size={11} className="text-blue-400 shrink-0" />
                  <p className="text-[11px] text-blue-400/70">
                    Conta atual: <span className="font-mono font-bold">{cliente.meta_account_id}</span> — selecionar outra irá substituir.
                  </p>
                </div>
              )}

              {/* Lista de contas */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scroll">
                {filtrados.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-[12px] text-white/20">Nenhuma conta encontrada.</p>
                  </div>
                ) : (
                  filtrados.map(acc => {
                    const isSel = selecionado?.id === acc.id;
                    return (
                      <button
                        key={acc.id}
                        onClick={() => setSelecionado(isSel ? null : acc)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                          isSel
                            ? "bg-purple-500/[0.08] border-purple-500/30"
                            : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.10]"
                        } ${!acc.ativo ? "opacity-40" : ""}`}
                      >
                        {/* Ícone status */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          acc.ativo ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-white/[0.04] border border-white/[0.08]"
                        }`}>
                          <Building2 size={13} className={acc.ativo ? "text-emerald-400" : "text-white/20"} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-[13px] font-semibold text-white truncate">{acc.name}</p>
                            {!acc.ativo && (
                              <span className="text-[9px] text-white/25 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] shrink-0">
                                {acc.status_label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-white/30">{acc.id}</span>
                            {acc.business_name && (
                              <>
                                <span className="text-white/10">·</span>
                                <span className="text-[11px] text-white/25 truncate">{acc.business_name}</span>
                              </>
                            )}
                            <span className="text-[11px] text-white/20 ml-auto shrink-0">{acc.currency}</span>
                          </div>
                        </div>

                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                          isSel ? "bg-purple-600 border-purple-500" : "border-white/[0.10] bg-transparent"
                        }`}>
                          {isSel && <Check size={11} className="text-white" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !erro && (
          <div className="flex items-center justify-between gap-3 px-6 pb-6">
            <p className="text-[11px] text-white/20">
              {selecionado
                ? <>Selecionado: <span className="text-white/50 font-mono">{selecionado.id}</span></>
                : `${filtrados.length} conta${filtrados.length !== 1 ? "s" : ""} disponível${filtrados.length !== 1 ? "is" : ""}`
              }
            </p>
            <div className="flex gap-2">
              <button onClick={onFechar}
                className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-[12px] text-white/40 hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={handleConectar} disabled={!selecionado || salvando}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 border border-purple-500 text-[12px] font-semibold text-white hover:bg-purple-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                {salvando ? <><Loader2 size={12} className="animate-spin" /> Conectando...</> : <><Wifi size={12} /> Conectar conta</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal Novo Cliente ───────────────────────────────────────
function ModalNovoCliente({ onCriar, onFechar }: {
  onCriar: (dados: Record<string, unknown>) => Promise<void>;
  onFechar: () => void;
}) {
  const [nome, setNome]           = useState("");
  const [accountId, setAccountId] = useState("");
  const [ticket, setTicket]       = useState("");
  const [corSel, setCorSel]       = useState(CORES[0]);
  const [loading, setLoading]     = useState(false);
  const [erro, setErro]           = useState("");

  async function handleCriar() {
    if (!nome.trim()) { setErro("Nome é obrigatório."); return; }
    setLoading(true);
    await onCriar({ nome: nome.trim(), meta_account_id: accountId.trim() || undefined, ticket_medio: parseFloat(ticket) || undefined, cor: corSel });
    setLoading(false);
    onFechar();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="w-full max-w-[420px] bg-[#111113] border border-white/[0.08] rounded-[24px] p-6">
        <h3 className="text-[16px] font-bold text-white mb-6">Novo cliente</h3>
        <div className="space-y-4">
          {[
            { label: "Nome *",            value: nome,      set: setNome,      placeholder: "Ex: Clínica Dr. Silva", type: "text"   },
            { label: "Meta Account ID (opcional)", value: accountId, set: setAccountId, placeholder: "Deixe em branco para conectar depois", type: "text" },
            { label: "Ticket médio (R$)", value: ticket,    set: setTicket,    placeholder: "450",                   type: "number" },
          ].map(f => (
            <div key={f.label}>
              <p className="text-[11px] text-white/30 mb-1.5">{f.label}</p>
              <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors" />
            </div>
          ))}
          <div>
            <p className="text-[11px] text-white/30 mb-2">Cor</p>
            <div className="flex gap-2 flex-wrap">
              {CORES.map(cor => (
                <button key={cor} onClick={() => setCorSel(cor)}
                  className={`w-7 h-7 rounded-lg transition-all ${corSel === cor ? "ring-2 ring-white/40 scale-110" : "opacity-60 hover:opacity-100"}`}
                  style={{ backgroundColor: cor }} />
              ))}
            </div>
          </div>
          {erro && (
            <div className="flex items-center gap-2 p-3 bg-red-500/[0.06] border border-red-500/15 rounded-xl">
              <AlertCircle size={12} className="text-red-400 shrink-0" />
              <p className="text-[12px] text-red-400">{erro}</p>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onFechar}
            className="flex-1 py-3 rounded-xl border border-white/[0.08] text-[13px] text-white/40 hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={handleCriar} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 border border-purple-500 text-[13px] font-semibold text-white hover:bg-purple-500 transition-all disabled:opacity-50">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Criando...</> : <><Plus size={14} /> Criar cliente</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cliente Card ─────────────────────────────────────────────
function ClienteCard({
  cliente, onSync, syncing, onAnalisar, onPulse, onExcluir, onConectar
}: {
  cliente: Cliente;
  onSync: (id: string) => void;
  syncing: boolean;
  onAnalisar: (id: string) => void;
  onPulse: (id: string) => void;
  onExcluir: (id: string) => void;
  onConectar: (cliente: Cliente) => void;
}) {
  const horas = horasDesdeSync(cliente.ultima_atualizacao);
  const desatualizado = horas > 24;
  const score = cliente.score ?? calcularScore(cliente);
  const nomeFormatado = formatarNome(cliente.nome_cliente ?? cliente.nome ?? "");
  const criticas = cliente.campanhas_criticas ?? 0;
  const semIntegracao = !cliente.meta_account_id;

  return (
    <div className="bg-[#111113] border border-white/[0.05] rounded-[24px] p-6 hover:border-white/[0.10] transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <Avatar cliente={cliente} size="md" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-white">{nomeFormatado}</h3>
              {criticas > 0 && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-red-400 px-1.5 py-0.5 rounded-md bg-red-500/10 border border-red-500/15">
                  <ShieldAlert size={9} /> {criticas} crítica{criticas !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {semIntegracao
                ? <span className="text-[10px] font-bold text-white/25 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">Sem integração</span>
                : <StatusBadge score={score} />
              }
              {!semIntegracao && desatualizado && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400/60">
                  <Clock size={9} /> {Math.round(horas)}h sem sync
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!semIntegracao && <ScoreRing score={score} />}
          <button onClick={() => onSync(cliente.id)} disabled={syncing || semIntegracao}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title={semIntegracao ? "Conecte uma conta Meta primeiro" : "Sincronizar"}>
            <RefreshCw size={13} className={`text-white/30 ${syncing ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => onExcluir(cliente.id)}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.03] border border-white/[0.06] hover:bg-red-500/10 hover:border-red-500/25 transition-all"
            title="Excluir cliente">
            <Trash2 size={13} className="text-white/20 hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* Estado: sem integração */}
      {semIntegracao ? (
        <div className="mb-5">
          <div className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl bg-white/[0.015] border border-dashed border-white/[0.06]">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <Plug size={16} className="text-white/15" />
            </div>
            <div className="text-center">
              <p className="text-[12px] font-medium text-white/30 mb-0.5">Sem conta Meta Ads vinculada</p>
              <p className="text-[11px] text-white/15">Conecte para monitorar campanhas em tempo real</p>
            </div>
            <button
              onClick={() => onConectar(cliente)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600/80 hover:bg-purple-600 border border-purple-500/50 text-[12px] font-semibold text-white transition-all"
            >
              <Plug size={11} /> Conectar Meta Ads
            </button>
          </div>
        </div>
      ) : (
        <>
          {desatualizado && (
            <div className="flex items-center gap-2 px-3 py-2 mb-4 bg-amber-500/[0.05] border border-amber-500/10 rounded-xl">
              <AlertCircle size={11} className="text-amber-400 shrink-0" />
              <p className="text-[11px] text-amber-400/70">Dados desatualizados — sincronize para ver informações recentes</p>
            </div>
          )}

          {/* Métricas */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label: "Investimento",     value: `R$${fmtBRL(cliente.gasto_total)}`,      color: "text-white" },
              { label: "Total leads",      value: cliente.total_leads.toLocaleString("pt-BR"), color: "text-white" },
              {
                label: "CPL médio",
                value: cliente.cpl_medio > 0 ? `R$${fmtBRL(cliente.cpl_medio)}` : "—",
                color: cliente.cpl_medio === 0 ? "text-white/25" : cliente.cpl_medio > 60 ? "text-red-400" : cliente.cpl_medio > 30 ? "text-amber-400" : "text-emerald-400",
              },
              { label: "Campanhas ativas", value: String(cliente.campanhas_ativas),         color: "text-white" },
            ].map(m => (
              <div key={m.label} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="text-[10px] text-white/20 mb-1">{m.label}</p>
                <p className={`text-[16px] font-black font-mono ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Account ID badge (quando conectado) */}
      {!semIntegracao && (
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => onConectar(cliente)}
            title="Trocar conta Meta Ads"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[11px] text-white/25 hover:text-white/50 hover:border-white/[0.10] transition-all font-mono"
          >
            <Plug size={10} className="shrink-0" />
            {cliente.meta_account_id}
          </button>
        </div>
      )}

      {/* Ações (só quando integrado) */}
      {!semIntegracao && (
        <div className="flex gap-2 mb-3">
          <button onClick={() => onAnalisar(cliente.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-white/[0.07] text-[12px] font-medium text-white/40 hover:text-white hover:border-purple-500/30 hover:bg-purple-500/[0.04] transition-all">
            <BarChart3 size={12} /> Analisar
          </button>
          <button onClick={() => onPulse(cliente.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-white/[0.07] text-[12px] font-medium text-white/40 hover:text-white hover:border-amber-500/30 hover:bg-amber-500/[0.04] transition-all">
            <Zap size={12} /> Pulse
          </button>
        </div>
      )}

      <CopyLinkBtn clienteId={cliente.id} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function ClientesPage() {
  const supabase = getSupabase();
  const [clientes, setClientes]         = useState<Cliente[]>([]);
  const [loading, setLoading]           = useState(true);
  const [syncingId, setSyncingId]       = useState<string | null>(null);
  const [modal, setModal]               = useState(false);
  const [clienteConectar, setClienteConectar] = useState<Cliente | null>(null);
  const [erro, setErro]                 = useState("");
  const [sucesso, setSucesso]           = useState("");
  const [busca, setBusca]               = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "saudavel" | "atencao" | "critico" | "sem_integracao">("todos");

  async function carregar() {
    setLoading(true);
    const { data, error } = await fetchSafe<{ clientes: Cliente[] }>("/api/clientes");
    if (error) setErro(error);
    else setClientes(data?.clientes ?? []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function sincronizar(clienteId: string) {
    setSyncingId(clienteId);
    setErro("");
    const { data, error } = await fetchSafe<{ count?: number }>(`/api/ads-sync?cliente_id=${clienteId}`);
    if (error) setErro(error);
    else {
      setSucesso(`${data?.count ?? 0} campanhas sincronizadas.`);
      setTimeout(() => setSucesso(""), 4000);
      await carregar();
    }
    setSyncingId(null);
  }

  async function excluirCliente(clienteId: string) {
    if (!confirm("Excluir este cliente? Esta ação não pode ser desfeita.")) return;
    setErro("");
    const { error } = await fetchSafe(`/api/clientes?id=${clienteId}`, { method: "DELETE" });
    if (error) setErro(error);
    else {
      setClientes(prev => prev.filter(c => c.id !== clienteId));
      setSucesso("Cliente excluído.");
      setTimeout(() => setSucesso(""), 3000);
    }
  }

  async function criarCliente(dados: Record<string, unknown>) {
    setErro("");
    const { error } = await fetchSafe("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (error) { setErro(error); return; }
    await carregar();
  }

  // Conecta/atualiza o meta_account_id de um cliente
  async function conectarAccount(clienteId: string, accountId: string) {
    setErro("");
    const { error } = await fetchSafe(`/api/clientes?id=${clienteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meta_account_id: accountId }),
    });
    if (error) { setErro(error); return; }
    setSucesso("Conta Meta Ads conectada! Sincronizando campanhas...");
    setTimeout(() => setSucesso(""), 5000);
    await carregar();
    // Dispara sync automático após conectar
    await sincronizar(clienteId);
  }

  const clientesFiltrados = useMemo(() => {
    return clientes
      .map(c => ({ ...c, score: c.score ?? calcularScore(c) }))
      .filter(c => {
        const nome = (c.nome_cliente ?? c.nome ?? "").toLowerCase();
        if (busca && !nome.includes(busca.toLowerCase())) return false;
        if (filtroStatus === "sem_integracao" && c.meta_account_id) return false;
        if (filtroStatus === "saudavel"       && (c.score < 70 || !c.meta_account_id)) return false;
        if (filtroStatus === "atencao"        && (c.score < 45 || c.score >= 70 || !c.meta_account_id)) return false;
        if (filtroStatus === "critico"        && (c.score >= 45 || !c.meta_account_id)) return false;
        return true;
      });
  }, [clientes, busca, filtroStatus]);

  const totais = useMemo(() => ({
    investimento:    clientes.reduce((s, c) => s + c.gasto_total, 0),
    leads:           clientes.reduce((s, c) => s + c.total_leads, 0),
    ativas:          clientes.reduce((s, c) => s + c.campanhas_ativas, 0),
    criticos:        clientes.filter(c => calcularScore(c) < 45 && c.meta_account_id).length,
    sem_integracao:  clientes.filter(c => !c.meta_account_id).length,
  }), [clientes]);

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0b0b0d] to-[#0a0a0a] text-white">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-24 px-5 md:px-10 xl:px-14 py-10 max-w-[1400px] mx-auto w-full">

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-8 pb-7 border-b border-white/[0.04]">
          <div>
            <p className="text-[11px] font-medium text-white/20 mb-2.5 tracking-wide uppercase">Erizon Rede</p>
            <h1 className="text-[1.9rem] font-bold text-white tracking-tight">
              Olá, <span className="text-purple-400 italic">{formatarNome(clientes[0]?.nome ?? "Gestor")}.</span>
            </h1>
            <p className="text-[13px] text-white/20 mt-1">Central de controle da agência</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            {erro && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-500/[0.06] border border-red-500/15 rounded-xl">
                <AlertCircle size={13} className="text-red-400 shrink-0" />
                <span className="text-[12px] text-red-400">{erro}</span>
              </div>
            )}
            {sucesso && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/[0.06] border border-emerald-500/15 rounded-xl">
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                <span className="text-[12px] text-emerald-400">{sucesso}</span>
              </div>
            )}
            <button onClick={() => setModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 transition-all text-[12px] font-medium text-white">
              <Plus size={13} /> Novo Cliente
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin text-white/20" />
          </div>
        ) : clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
              <Users size={20} className="text-white/15" />
            </div>
            <p className="text-[16px] font-semibold text-white/30 mb-1">Nenhum cliente cadastrado</p>
            <p className="text-[13px] text-white/15 mb-6">Adicione seu primeiro cliente para começar a monitorar</p>
            <button onClick={() => setModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-[13px] font-semibold text-white transition-all">
              <Plus size={14} /> Adicionar primeiro cliente
            </button>
          </div>
        ) : (
          <>
            {/* Totais */}
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
              {[
                { label: "Investimento total",  value: `R$${fmtBRL(totais.investimento)}`,           icon: DollarSign,  color: "text-white"       },
                { label: "Total de leads",       value: totais.leads.toLocaleString("pt-BR"),          icon: Users,       color: "text-sky-400"     },
                { label: "Campanhas ativas",     value: String(totais.ativas),                         icon: Zap,         color: "text-emerald-400" },
                { label: "Clientes em atenção",  value: String(totais.criticos),                       icon: ShieldAlert, color: totais.criticos > 0 ? "text-red-400" : "text-white/25" },
                { label: "Sem integração",       value: String(totais.sem_integracao),                 icon: Plug,        color: totais.sem_integracao > 0 ? "text-amber-400" : "text-white/25" },
              ].map(m => (
                <div key={m.label} className="p-5 rounded-2xl bg-[#0f0f11] border border-white/[0.05]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[12px] text-white/25">{m.label}</p>
                    <m.icon size={13} className="text-white/10" />
                  </div>
                  <p className={`text-xl font-black font-mono tracking-tight ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* Alerta: clientes sem integração */}
            {totais.sem_integracao > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 mb-5 bg-amber-500/[0.04] border border-amber-500/10 rounded-2xl">
                <Plug size={14} className="text-amber-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-amber-400/80">
                    {totais.sem_integracao} cliente{totais.sem_integracao !== 1 ? "s" : ""} sem conta Meta Ads vinculada
                  </p>
                  <p className="text-[11px] text-amber-400/40 mt-0.5">
                    Clique em "Conectar Meta Ads" em cada card para vincular automaticamente a conta correta do BM.
                  </p>
                </div>
                <button onClick={() => setFiltroStatus("sem_integracao")}
                  className="shrink-0 text-[11px] text-amber-400/60 hover:text-amber-400 underline underline-offset-2 transition-colors">
                  Ver apenas esses
                </button>
              </div>
            )}

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1 max-w-xs">
                <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                <input
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="w-full pl-9 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.07] rounded-xl text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/15 transition-colors"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {(["todos", "saudavel", "atencao", "critico", "sem_integracao"] as const).map(f => (
                  <button key={f} onClick={() => setFiltroStatus(f)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-medium transition-all border ${
                      filtroStatus === f
                        ? f === "critico"        ? "bg-red-500/10 border-red-500/30 text-red-400"
                          : f === "atencao"      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : f === "saudavel"     ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : f === "sem_integracao" ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : "bg-white/[0.07] border-white/[0.15] text-white"
                        : "border-white/[0.06] text-white/30 hover:text-white hover:border-white/[0.12]"
                    }`}>
                    {f === "todos"           ? "Todos"
                      : f === "saudavel"    ? "Saudáveis"
                      : f === "atencao"     ? "Atenção"
                      : f === "critico"     ? "Críticos"
                      : "Sem integração"}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid clientes */}
            {clientesFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-[14px] text-white/20">Nenhum cliente encontrado com esse filtro.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {clientesFiltrados.map(c => (
                  <ClienteCard
                    key={c.id}
                    cliente={c}
                    onSync={sincronizar}
                    syncing={syncingId === c.id}
                    onAnalisar={id => window.location.href = `/dados?cliente_id=${id}`}
                    onPulse={id => window.location.href = `/pulse?cliente_id=${id}`}
                    onExcluir={excluirCliente}
                    onConectar={setClienteConectar}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modais */}
      {modal && (
        <ModalNovoCliente onCriar={criarCliente} onFechar={() => setModal(false)} />
      )}
      {clienteConectar && (
        <ModalConectarMeta
          cliente={clienteConectar}
          onConectar={conectarAccount}
          onFechar={() => setClienteConectar(null)}
        />
      )}
    </div>
  );
}