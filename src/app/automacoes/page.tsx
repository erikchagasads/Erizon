"use client";

// src/app/automacoes/page.tsx — v2
// Página de Automações: o gestor cadastra regras e decide quando executar.
// Nenhuma ação automática — tudo exige confirmação manual.

import { useEffect, useState, useMemo, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { SkeletonPage } from "@/components/ops/AppShell";
import { getSupabase } from "@/lib/supabase";
import { toast } from "@/components/Toast";
import { type CondicaoTipo, type AcaoTipo } from "@/app/lib/engine/campanhaEngine";
import { useSessionGuard } from "@/app/hooks/useSessionGuard";
import {
  Play, Pause, Plus, Trash2, CheckCircle2, AlertTriangle,
  Loader2, Settings2, Zap, ToggleLeft, ToggleRight, X,
  Clock, DollarSign, TrendingDown, TrendingUp,
  Activity, Save,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Regra {
  id: string;
  nome: string;
  condicao_tipo: CondicaoTipo;
  condicao_valor: number;
  acao_tipo: AcaoTipo;
  ativa: boolean;
  criada_em: string;
}

interface Campanha {
  id: string;
  nome_campanha: string;
  gasto_total: number;
  contatos: number;
  receita_estimada: number;
  ctr: number;
  dias_ativo: number;
  status: string;
}

interface LogEntry {
  id: string;
  campanha: string;
  acao: string;
  ts: string;
}

// ─── Opções de condição ───────────────────────────────────────────────────────
const CONDICOES: { tipo: CondicaoTipo; label: string; unidade: string; placeholder: string; icon: React.ReactNode }[] = [
  { tipo: "gasto_sem_leads",    label: "Gasto sem leads (R$)",        unidade: "R$",   placeholder: "ex: 100", icon: <DollarSign size={13}/> },
  { tipo: "cpl_acima",          label: "CPL acima de (R$)",           unidade: "R$",   placeholder: "ex: 80",  icon: <TrendingUp size={13}/> },
  { tipo: "roas_abaixo",        label: "ROAS abaixo de",              unidade: "×",    placeholder: "ex: 1.5", icon: <TrendingDown size={13}/> },
  { tipo: "ctr_abaixo",         label: "CTR abaixo de (%)",           unidade: "%",    placeholder: "ex: 0.8", icon: <Activity size={13}/> },
  { tipo: "dias_sem_resultado", label: "Dias ativo sem leads",        unidade: "dias", placeholder: "ex: 5",   icon: <Clock size={13}/> },
];

const ACOES: { tipo: AcaoTipo; label: string; descricao: string; cor: string }[] = [
  { tipo: "pausar",    label: "Pausar campanha",   descricao: "Envia comando de pausa via Meta API",  cor: "text-red-400" },
  { tipo: "alertar",   label: "Emitir alerta",     descricao: "Registra alerta no painel Risk Radar", cor: "text-amber-400" },
  { tipo: "registrar", label: "Registrar decisão", descricao: "Salva no histórico de decisões",       cor: "text-blue-400" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtBRL(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function calcScore(gasto: number, leads: number, receita: number): number {
  if (gasto === 0) return 0;
  if (leads === 0 && gasto > 50) return 20;
  const roas = gasto > 0 ? receita / gasto : 0;
  const cpl  = leads > 0 ? gasto / leads : 999;
  let s = 50;
  if (roas >= 3) s += 25; else if (roas >= 2) s += 10; else if (roas < 1) s -= 20;
  if (cpl < 30)  s += 15; else if (cpl < 60)  s += 5;  else if (cpl > 120) s -= 15;
  return Math.min(100, Math.max(0, Math.round(s)));
}

function isAtivo(status: string) {
  return ["ATIVO", "ACTIVE", "ATIVA"].includes((status ?? "").toUpperCase());
}

// Calcula campanhas afetadas por uma regra
function campanhasAfetadas(regra: Regra, campanhas: Campanha[]): Campanha[] {
  return campanhas.filter(c => {
    if (!isAtivo(c.status)) return false;
    switch (regra.condicao_tipo) {
      case "gasto_sem_leads":
        return c.contatos === 0 && c.gasto_total >= regra.condicao_valor;
      case "cpl_acima":
        return c.contatos > 0 && (c.gasto_total / c.contatos) > regra.condicao_valor;
      case "roas_abaixo":
        return c.receita_estimada > 0 && c.gasto_total > 0 &&
          (c.receita_estimada / c.gasto_total) < regra.condicao_valor;
      case "ctr_abaixo":
        return c.ctr > 0 && c.ctr < regra.condicao_valor;
      case "dias_sem_resultado":
        return c.contatos === 0 && c.dias_ativo >= regra.condicao_valor;
      default: return false;
    }
  });
}

// ─── Modal de nova regra ──────────────────────────────────────────────────────
function ModalNovaRegra({
  onSalvar, onFechar
}: {
  onSalvar: (regra: Omit<Regra, "id" | "criada_em">) => void;
  onFechar: () => void;
}) {
  useSessionGuard();

  const [nome, setNome]     = useState("");
  const [cTipo, setCTipo]   = useState<CondicaoTipo>("gasto_sem_leads");
  const [cValor, setCValor] = useState("");
  const [aTipo, setATipo]   = useState<AcaoTipo>("alertar");
  const [erro, setErro]     = useState("");

  function salvar() {
    if (!nome.trim()) { setErro("Dê um nome para a regra."); return; }
    const val = parseFloat(cValor.replace(",", "."));
    if (isNaN(val) || val <= 0) { setErro("Informe um valor válido para a condição."); return; }
    onSalvar({ nome: nome.trim(), condicao_tipo: cTipo, condicao_valor: val, acao_tipo: aTipo, ativa: true });
  }

  const condicaoAtual = CONDICOES.find(c => c.tipo === cTipo)!;
  const acaoAtual     = ACOES.find(a => a.tipo === aTipo)!;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-6 px-4" onClick={onFechar}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"/>
      <div className="relative w-full max-w-[480px] bg-[#0f0f13] border border-white/[0.09] rounded-[28px] shadow-2xl my-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.06]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-purple-400/60 mb-1">Nova regra</p>
            <h2 className="text-[16px] font-bold text-white">Configurar automação</h2>
          </div>
          <button onClick={onFechar} className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.08] transition-all">
            <X size={14} className="text-white/40"/>
          </button>
        </div>

        <div className="px-7 py-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Nome */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2 block">Nome da regra</label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="ex: Pausar campanha sem leads"
              className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 transition-all"
            />
          </div>

          {/* Condição */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2 block">Quando...</label>
            <div className="grid grid-cols-1 gap-2 mb-3">
              {CONDICOES.map(c => (
                <button key={c.tipo} onClick={() => setCTipo(c.tipo)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    cTipo === c.tipo
                      ? "border-purple-500/40 bg-purple-500/[0.06] text-white"
                      : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/[0.12] hover:text-white/70"
                  }`}>
                  <span className={cTipo === c.tipo ? "text-purple-400" : "text-white/20"}>{c.icon}</span>
                  <span className="text-[12px] font-medium">{c.label}</span>
                </button>
              ))}
            </div>

            {/* Valor da condição */}
            <div className="flex items-center gap-3">
              <input
                value={cValor}
                onChange={e => setCValor(e.target.value)}
                placeholder={condicaoAtual.placeholder}
                type="number"
                min="0"
                step="any"
                className="flex-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 transition-all"
              />
              <span className="text-[12px] text-white/30 font-mono shrink-0">{condicaoAtual.unidade}</span>
            </div>
          </div>

          {/* Ação */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2 block">Então...</label>
            <div className="grid grid-cols-3 gap-2">
              {ACOES.map(a => (
                <button key={a.tipo} onClick={() => setATipo(a.tipo)}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border transition-all ${
                    aTipo === a.tipo
                      ? "border-purple-500/40 bg-purple-500/[0.06]"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                  }`}>
                  <span className={`text-[11px] font-semibold ${aTipo === a.tipo ? a.cor : "text-white/30"}`}>{a.label}</span>
                  <span className="text-[9px] text-white/20 text-center leading-relaxed">{a.descricao}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] px-4 py-3">
            <p className="text-[10px] text-white/20 uppercase tracking-wider mb-1">Preview da regra</p>
            <p className="text-[12px] text-white/60 leading-relaxed">
              <span className="text-purple-300">Se</span> {condicaoAtual.label.toLowerCase()} {cValor || "?"} {condicaoAtual.unidade} →{" "}
              <span className={acaoAtual.cor}>{acaoAtual.label.toLowerCase()}</span>
            </p>
          </div>

          {erro && <p className="text-[11px] text-red-400 flex items-center gap-1.5"><AlertTriangle size={11}/>{erro}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={onFechar} className="flex-1 py-2.5 rounded-xl border border-white/[0.07] text-[12px] text-white/30 hover:text-white transition-all">
              Cancelar
            </button>
            <button onClick={salvar}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-[12px] font-semibold text-white transition-all flex items-center justify-center gap-2">
              <Save size={13}/> Salvar regra
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Card de Regra ────────────────────────────────────────────────────────────
function CardRegra({
  regra, campanhas, onToggle, onExcluir, onExecutar, executando, executado
}: {
  regra: Regra;
  campanhas: Campanha[];
  onToggle: (id: string) => unknown;
  onExcluir: (id: string) => unknown;
  onExecutar: (regra: Regra, afetadas: Campanha[]) => unknown;
  executando: boolean;
  executado: boolean;
}) {
  const afetadas = useMemo(() => campanhasAfetadas(regra, campanhas), [regra, campanhas]);
  const condicao = CONDICOES.find(c => c.tipo === regra.condicao_tipo)!;
  const acao     = ACOES.find(a => a.tipo === regra.acao_tipo)!;

  return (
    <div className={`rounded-[22px] border transition-all ${
      regra.ativa
        ? "border-white/[0.09] bg-[#0d0d11]"
        : "border-white/[0.04] bg-[#0a0a0d] opacity-60"
    }`}>
      {/* Header do card */}
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-white/[0.05]">
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-bold text-white truncate">{regra.nome}</h3>
          <p className="text-[10px] text-white/20 mt-0.5">
            Criada em {new Date(regra.criada_em).toLocaleDateString("pt-BR")}
          </p>
        </div>

        {/* Toggle ativo/inativo */}
        <button onClick={() => onToggle(regra.id)} className="shrink-0 flex items-center gap-1.5 group">
          {regra.ativa
            ? <ToggleRight size={22} className="text-purple-400 group-hover:text-purple-300 transition-colors"/>
            : <ToggleLeft  size={22} className="text-white/20 group-hover:text-white/40 transition-colors"/>
          }
          <span className={`text-[10px] font-medium ${regra.ativa ? "text-purple-400/70" : "text-white/20"}`}>
            {regra.ativa ? "Ativa" : "Inativa"}
          </span>
        </button>

        {/* Excluir */}
        <button onClick={() => onExcluir(regra.id)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
          <Trash2 size={12}/>
        </button>
      </div>

      {/* Corpo */}
      <div className="px-5 py-4 space-y-3">
        {/* Condição + Ação */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-wider text-white/20 mb-1">Condição</p>
            <div className="flex items-center gap-1.5">
              <span className="text-purple-400/60">{condicao.icon}</span>
              <p className="text-[11px] text-white/60 leading-snug">
                {condicao.label} <span className="text-white/80 font-mono font-semibold">{regra.condicao_valor}{condicao.unidade === "R$" ? "" : condicao.unidade}</span>
              </p>
            </div>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-wider text-white/20 mb-1">Ação</p>
            <p className={`text-[11px] font-semibold ${acao.cor}`}>{acao.label}</p>
            <p className="text-[9px] text-white/20 mt-0.5 leading-snug">{acao.descricao}</p>
          </div>
        </div>

        {/* Campanhas afetadas */}
        {afetadas.length > 0 ? (
          <div>
            <p className="text-[10px] text-white/25 mb-2">
              {afetadas.length} campanha{afetadas.length !== 1 ? "s" : ""} atende{afetadas.length === 1 ? "" : "m"} essa condição agora:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {afetadas.slice(0, 3).map(c => (
                <span key={c.id} className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 truncate max-w-[160px]">
                  {c.nome_campanha}
                </span>
              ))}
              {afetadas.length > 3 && (
                <span className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.04] text-white/30">
                  +{afetadas.length - 3}
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-white/15 italic">Nenhuma campanha atende a condição no momento.</p>
        )}

        {/* Botão de execução manual */}
        <div className="pt-1">
          {executado ? (
            <div className="flex items-center gap-2 text-emerald-400 text-[12px] font-medium">
              <CheckCircle2 size={13}/> Executada com sucesso
            </div>
          ) : (
            <button
              onClick={() => onExecutar(regra, afetadas)}
              disabled={!regra.ativa || executando || afetadas.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all ${
                !regra.ativa
                  ? "bg-white/[0.03] border border-white/[0.06] text-white/20 cursor-not-allowed"
                  : afetadas.length === 0
                  ? "bg-white/[0.03] border border-white/[0.06] text-white/20 cursor-not-allowed"
                  : "bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30"
              } disabled:opacity-50`}
            >
              {executando
                ? <><Loader2 size={12} className="animate-spin"/> Executando...</>
                : !regra.ativa
                ? <><Pause size={12}/> Regra inativa</>
                : afetadas.length === 0
                ? <><Play size={12}/> Sem campanhas afetadas</>
                : <><Play size={12}/> Executar para {afetadas.length} campanha{afetadas.length !== 1 ? "s" : ""}</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function AutomacoesPage() {
  const supabase = useMemo(() => getSupabase(), []);

  const [campanhas, setCampanhas]     = useState<Campanha[]>([]);
  const [regras, setRegras]           = useState<Regra[]>([]);
  const [logs, setLogs]               = useState<LogEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [executando, setExecutando]   = useState<string | null>(null);
  const [executados, setExecutados]   = useState<Set<string>>(new Set());

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: ads }, { data: dec }, { data: regrasSalvas }] = await Promise.all([
        supabase.from("metricas_ads").select("*").eq("user_id", user.id)
          .in("status", ["ATIVO","ACTIVE","ATIVA"]).order("gasto_total", { ascending: false }),
        supabase.from("decisoes_historico").select("*").eq("user_id", user.id)
          .order("created_at", { ascending: false }).limit(15),
        supabase.from("automacao_regras").select("*").eq("user_id", user.id)
          .order("criada_em", { ascending: false }),
      ]);

      setCampanhas((ads ?? []) as Campanha[]);
      setLogs(((dec ?? []) as Array<{ id: string; campanha_nome?: string; acao?: string; impacto?: string; created_at: string }>).map(d => ({
        id: d.id,
        campanha: d.campanha_nome ?? "—",
        acao: d.acao ?? "—",
        ts: new Date(d.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
      })));

      // Se não tem tabela de regras ainda, usa regras padrão em memória
      if (regrasSalvas && regrasSalvas.length > 0) {
        setRegras(regrasSalvas as Regra[]);
      } else {
        // Regras padrão para começar
        setRegras([
          {
            id: "default-1",
            nome: "Pausar sem leads com gasto alto",
            condicao_tipo: "gasto_sem_leads",
            condicao_valor: 100,
            acao_tipo: "pausar",
            ativa: false,
            criada_em: new Date().toISOString(),
          },
          {
            id: "default-2",
            nome: "Alertar CPL elevado",
            condicao_tipo: "cpl_acima",
            condicao_valor: 80,
            acao_tipo: "alertar",
            ativa: false,
            criada_em: new Date().toISOString(),
          },
        ]);
      }

      setLoading(false);
    }
    load();
  }, [supabase]);

  // ── Adicionar regra ───────────────────────────────────────────────────────
  const adicionarRegra = useCallback(async (dados: Omit<Regra, "id" | "criada_em">) => {
    const { data: { user } } = await supabase.auth.getUser();

    const nova: Regra = {
      ...dados,
      id: `local-${Date.now()}`,
      criada_em: new Date().toISOString(),
    };

    // Tenta salvar no Supabase (tabela opcional)
    if (user) {
      const { data } = await supabase.from("automacao_regras").insert({
        user_id: user.id,
        nome: dados.nome,
        condicao_tipo: dados.condicao_tipo,
        condicao_valor: dados.condicao_valor,
        acao_tipo: dados.acao_tipo,
        ativa: dados.ativa,
      }).select().maybeSingle();
      if (data) nova.id = data.id;
    }

    setRegras(prev => [nova, ...prev]);
    setShowModal(false);
    toast.success( `Regra "${nova.nome}" criada com sucesso.`);
  }, [supabase]);

  // ── Toggle ativo/inativo ─────────────────────────────────────────────────
  const toggleRegra = useCallback(async (id: string) => {
    setRegras(prev => prev.map(r => r.id === id ? { ...r, ativa: !r.ativa } : r));

    // Tenta sincronizar com Supabase
    const regra = regras.find(r => r.id === id);
    if (regra && !id.startsWith("local-") && !id.startsWith("default-")) {
      await supabase.from("automacao_regras").update({ ativa: !regra.ativa }).eq("id", id);
    }
  }, [regras, supabase]);

  // ── Excluir regra ────────────────────────────────────────────────────────
  const excluirRegra = useCallback(async (id: string) => {
    setRegras(prev => prev.filter(r => r.id !== id));
    if (!id.startsWith("local-") && !id.startsWith("default-")) {
      await supabase.from("automacao_regras").delete().eq("id", id);
    }
    toast.success( "Regra removida.");
  }, [supabase]);

  // ── Executar regra manualmente ────────────────────────────────────────────
  const executarRegra = useCallback(async (regra: Regra, afetadas: Campanha[]) => {
    if (afetadas.length === 0) {
      toast.error( "Nenhuma campanha afetada por essa regra no momento.");
      return;
    }

    setExecutando(regra.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const camp of afetadas) {
        const gastoDiario = camp.dias_ativo > 0 ? camp.gasto_total / camp.dias_ativo : camp.gasto_total;

        if (regra.acao_tipo === "pausar") {
          const pauseRes = await fetch("/api/meta/pause-campaign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campanhaId: camp.id,
              campanhaNome: camp.nome_campanha,
              motivo: `Automação: ${regra.nome}`,
            }),
          });
          const pauseJson = await pauseRes.json();
          // Avisa se a Meta API não confirmou a pausa (mas continua — Supabase já foi atualizado)
          if (pauseJson.metaError) {
            toast.error( `⚠️ ${camp.nome_campanha}: ${pauseJson.metaError}`);
          }
        }

        // Sempre registra no histórico de decisões
        await supabase.from("decisoes_historico").insert({
          user_id: user.id,
          campanha: camp.id,
          campanha_nome: camp.nome_campanha,
          acao: `Automação executada: ${regra.nome}`,
          impacto: regra.acao_tipo === "pausar"
            ? `Budget de ${fmtBRL(Math.round(gastoDiario * 30))}/mês preservado`
            : `Regra "${regra.acao_tipo}" aplicada`,
          data: new Date().toLocaleDateString("pt-BR"),
        });
      }

      setExecutados(prev => new Set([...prev, regra.id]));
      toast.success( `Executado para ${afetadas.length} campanha${afetadas.length !== 1 ? "s" : ""}.`);

      // Recarrega logs
      if (user) {
        const { data: dec } = await supabase.from("decisoes_historico").select("*")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(15);
        setLogs(((dec ?? []) as Array<{ id: string; campanha_nome?: string; acao?: string; created_at: string }>).map(d => ({
          id: d.id,
          campanha: d.campanha_nome ?? "—",
          acao: d.acao ?? "—",
          ts: new Date(d.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
        })));
      }
    } catch {
      toast.error( "Erro ao executar a regra.");
    } finally {
      setExecutando(null);
    }
  }, [supabase]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const ativas   = regras.filter(r => r.ativa).length;
    const inativas = regras.filter(r => !r.ativa).length;
    const afetadas = regras.reduce((acc, r) => {
      if (!r.ativa) return acc;
      return acc + campanhasAfetadas(r, campanhas).length;
    }, 0);
    return { total: regras.length, ativas, inativas, afetadas };
  }, [regras, campanhas]);

  if (loading) return <SkeletonPage cols={4} />;

  return (
    <div className="flex min-h-screen bg-[#060609] text-white">
      <Sidebar/>
      <main className="md:ml-[60px] pb-20 md:pb-0 flex-1 flex flex-col">

        {/* Header */}
        <div className="shrink-0 px-8 py-6 border-b border-white/[0.05]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-purple-400/60 mb-1">Autopilot</p>
              <h1 className="text-[22px] font-bold text-white">Automações</h1>
              <p className="text-[13px] text-white/30 mt-1 max-w-xl">
                Você cria as regras e decide quando executar. Nada acontece sem sua confirmação.
              </p>
            </div>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-[13px] font-semibold text-white transition-all shadow-lg shadow-purple-500/20">
              <Plus size={15}/> Nova regra
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            {[
              { label: "Regras criadas",   value: String(stats.total),    color: "text-white" },
              { label: "Ativas",           value: String(stats.ativas),   color: "text-purple-400" },
              { label: "Inativas",         value: String(stats.inativas), color: "text-white/40" },
              { label: "Campanhas afetadas agora", value: String(stats.afetadas), color: stats.afetadas > 0 ? "text-amber-400" : "text-white/25" },
            ].map(k => (
              <div key={k.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">{k.label}</p>
                <p className={`text-[22px] font-black font-mono ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-auto px-8 py-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

            {/* Lista de regras */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13px] font-semibold text-white/60 uppercase tracking-wider">
                  Suas regras ({regras.length})
                </h2>
              </div>

              {regras.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Settings2 size={32} className="text-white/10 mb-4"/>
                  <p className="text-[15px] text-white/25 font-medium mb-2">Nenhuma regra criada</p>
                  <p className="text-[12px] text-white/15 mb-6 max-w-xs">
                    Crie uma regra para definir quando o sistema deve agir nas suas campanhas.
                  </p>
                  <button onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 text-[13px] font-medium hover:bg-purple-600/30 transition-all">
                    <Plus size={14}/> Criar primeira regra
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {regras.map(r => (
                    <CardRegra
                      key={r.id}
                      regra={r}
                      campanhas={campanhas}
                      onToggle={toggleRegra}
                      onExcluir={excluirRegra}
                      onExecutar={executarRegra}
                      executando={executando === r.id}
                      executado={executados.has(r.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Painel direito */}
            <div className="space-y-5">

              {/* Aviso de controle manual */}
              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap size={14} className="text-purple-400"/>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-purple-300 mb-1">Controle manual</p>
                    <p className="text-[11px] text-white/35 leading-relaxed">
                      As regras <strong className="text-white/60">não executam sozinhas</strong>. Você ativa as que quiser e clica em &quot;Executar&quot; quando decidir agir. O sistema apresenta quais campanhas serão afetadas antes de qualquer ação.
                    </p>
                  </div>
                </div>
              </div>

              {/* Log de execuções */}
              <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d11] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.05]">
                  <h3 className="text-[12px] font-semibold text-white/50 uppercase tracking-wider">
                    Histórico de execuções
                  </h3>
                </div>

                {logs.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <Clock size={20} className="text-white/10 mx-auto mb-2"/>
                    <p className="text-[12px] text-white/20">Nenhuma execução registrada</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.04] max-h-[400px] overflow-y-auto">
                    {logs.map(l => (
                      <div key={l.id} className="px-5 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] text-white/20 font-mono">{l.ts}</p>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"/>
                        </div>
                        <p className="text-[12px] font-medium text-white/70 truncate">{l.campanha}</p>
                        <p className="text-[10px] text-white/30 mt-0.5 truncate">{l.acao}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Campanhas ativas agora */}
              <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d11] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                  <h3 className="text-[12px] font-semibold text-white/50 uppercase tracking-wider">
                    Campanhas ativas
                  </h3>
                  <span className="text-[11px] text-white/25">{campanhas.length}</span>
                </div>
                <div className="divide-y divide-white/[0.04] max-h-[300px] overflow-y-auto">
                  {campanhas.slice(0, 10).map(c => {
                    const cpl   = c.contatos > 0 ? c.gasto_total / c.contatos : 0;
                    const score = calcScore(c.gasto_total, c.contatos, c.receita_estimada);
                    return (
                      <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-white/60 truncate font-medium">{c.nome_campanha}</p>
                          <p className="text-[10px] text-white/25 mt-0.5">
                            {fmtBRL(c.gasto_total)} · {c.contatos > 0 ? `CPL ${fmtBRL(cpl)}` : "sem leads"}
                          </p>
                        </div>
                        <span className={`text-[11px] font-bold font-mono shrink-0 ${
                          score >= 70 ? "text-emerald-400" : score >= 45 ? "text-amber-400" : "text-red-400"
                        }`}>{score}</span>
                      </div>
                    );
                  })}
                  {campanhas.length === 0 && (
                    <div className="px-5 py-8 text-center">
                      <p className="text-[11px] text-white/20">Nenhuma campanha ativa</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Modal */}
      {showModal && (
        <ModalNovaRegra
          onSalvar={adicionarRegra}
          onFechar={() => setShowModal(false)}
        />
      )}
    </div>
  );
}