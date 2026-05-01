"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {
  ArrowLeft, CreditCard, Zap, Check, Loader2,
  ExternalLink, AlertTriangle, CheckCircle2, Crown, X,
} from "lucide-react";

interface BillingInfo {
  ativo: boolean;
  plano: string | null;
  status: string | null;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
}

const PLANOS = [
  {
    id: "core",
    nome: "Core",
    preco: "R$97/mês",
    cor: "border-white/[0.08] bg-white/[0.02]",
    corNome: "text-white/60",
    features: [
      "Até 3 clientes",
      "Pulse — health score diário",
      "Alertas Telegram (3x por dia)",
      "Benchmarks por nicho",
      "Histórico 30 dias",
    ],
  },
  {
    id: "pro",
    nome: "Pro",
    preco: "R$297/mês",
    cor: "border-purple-500/25 bg-purple-500/[0.05]",
    corNome: "text-purple-400",
    destaque: true,
    badge: "Mais popular",
    features: [
      "Até 15 clientes",
      "Analytics e Decision Feed",
      "Risk Radar — diagnóstico de causa raiz",
      "Copiloto IA — analista neural",
      "Relatórios por cliente",
      "Histórico 90 dias",
    ],
  },
  {
    id: "command",
    nome: "Command",
    preco: "R$497/mês",
    cor: "border-sky-500/20 bg-sky-500/[0.04]",
    corNome: "text-sky-400",
    features: [
      "Clientes ilimitados",
      "Autopilot — pausa e escala automática",
      "Creative Lab com IA",
      "Portal do Cliente",
      "Insights Instagram",
      "Whitelabel",
    ],
  },
];

function fmtData(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function PlanoPage() {
  const router = useRouter();

  const [billing, setBilling]     = useState<BillingInfo | null>(null);
  const [loading, setLoading]     = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [erro, setErro]           = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [cancelOk, setCancelOk]   = useState(false);

  const diasRestantes = billing?.trial_ends_at
    ? Math.max(0, Math.ceil(
        (new Date(billing.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ))
    : null;

  const isPastDue = billing?.status === "past_due";
  const isTrialing = billing?.status === "trialing";
  const isTrialExpirando = isTrialing && diasRestantes !== null && diasRestantes <= 2;

  useEffect(() => {
    fetch("/api/billing")
      .then(r => r.json())
      .then(d => { console.log("[billing]", d); setBilling(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function assinar(planoId: string) {
    setLoadingId(planoId); setErro(null);
    try {
      const res  = await fetch("/api/billing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkout", plano: planoId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error ?? "Erro ao iniciar checkout.");
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao processar.");
    }
    setLoadingId(null);
  }

  async function abrirPortal() {
    setLoadingId("portal"); setErro(null);
    try {
      const res  = await fetch("/api/billing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "portal" }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error ?? "Erro ao abrir portal.");
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao processar.");
    }
    setLoadingId(null);
  }

  async function cancelar() {
    setCancelando(true); setErro(null);
    try {
      const res  = await fetch("/api/billing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (data.ok) {
        setCancelOk(true);
        setBilling(prev => prev ? { ...prev, cancel_at_period_end: true } : prev);
      } else throw new Error(data.error ?? "Erro ao cancelar.");
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao cancelar.");
    }
    setCancelando(false);
  }

  const planoAtual   = billing?.plano ?? null;
  const isAtivo      = billing?.ativo ?? false;
  const isCanceling  = billing?.cancel_at_period_end;
  const periodoFim   = fmtData(billing?.current_period_end);
  const trialFim     = fmtData(billing?.trial_ends_at);

  const ordemPlanos    = ["core", "pro", "command"];
  const idxAtual       = planoAtual ? ordemPlanos.indexOf(planoAtual) : -1;
  const planosUpgrade  = PLANOS.filter((_, i) => i > idxAtual);
  const planosDowngrade = PLANOS.filter((_, i) => i < idxAtual && i >= 0);

  return (
    <div className="flex min-h-screen bg-[#060609] text-white">
      <Sidebar />
      <main className="md:ml-[60px] pb-20 md:pb-0 flex-1 px-8 py-8 max-w-2xl">

        <button onClick={() => router.push("/settings")}
          className="flex items-center gap-2 text-[11px] text-white/30 hover:text-white/60 transition-colors mb-6">
          <ArrowLeft size={13} /> Configurações
        </button>

        <div className="mb-7">
          <div className="flex items-center gap-3 mb-1">
            <CreditCard size={16} className="text-sky-400" />
            <h1 className="text-[22px] font-bold">Plano & Billing</h1>
          </div>
          <p className="text-[12px] text-white/30">Gerencie sua assinatura e faça upgrade quando quiser.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={20} className="animate-spin text-white/30" />
          </div>
        ) : (
          <div className="space-y-4">

            {/* ── Card plano atual ───────────────────────────────── */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-3">Plano atual</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <Crown size={16} className={isAtivo ? "text-purple-400" : "text-white/20"} />
                  </div>
                  <div>
                    <p className="text-[16px] font-bold capitalize">
                      {planoAtual === "core" ? "Core" : planoAtual === "pro" ? "Pro" : planoAtual === "command" ? "Command" : planoAtual === "gestor" ? "Pro" : planoAtual === "agencia" || planoAtual === "agency" ? "Command" : "Sem plano"}
                    </p>
                    <p className="text-[11px] text-white/30">
                      {isTrialing
                        ? `Trial gratuito — encerra em ${trialFim ?? "breve"}`
                        : isAtivo
                        ? isCanceling
                          ? `Cancelamento agendado para ${periodoFim}`
                          : `Renova em ${periodoFim}`
                        : "Plano gratuito"}
                    </p>
                  </div>
                </div>

                {/* Badge status */}
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
                  isTrialing   ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                  isCanceling  ? "bg-red-500/10 border-red-500/20 text-red-400" :
                  isAtivo      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                 "bg-white/[0.04] border-white/[0.08] text-white/30"
                }`}>
                  {isTrialing ? "Trial" : isCanceling ? "Cancelando" : isAtivo ? "Ativo" : "Gratuito"}
                </span>
              </div>

              {/* Ações do plano atual */}
              {isAtivo && (
                <div className="mt-5 pt-4 border-t border-white/[0.05] flex flex-wrap gap-2">
                  <button onClick={abrirPortal} disabled={loadingId === "portal"}
                    className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-[12px] font-semibold rounded-xl transition-all disabled:opacity-50">
                    {loadingId === "portal" ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
                    Gerenciar assinatura
                  </button>

                  {!isCanceling && (
                    <button onClick={cancelar} disabled={cancelando}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/[0.06] hover:bg-red-500/[0.12] border border-red-500/15 text-[12px] font-semibold text-red-400 rounded-xl transition-all disabled:opacity-50">
                      {cancelando ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                      Cancelar plano
                    </button>
                  )}
                </div>
              )}

              {/* Aviso cancelamento agendado */}
              {isCanceling && periodoFim && (
                <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-red-500/[0.06] border border-red-500/15">
                  <AlertTriangle size={13} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-red-400">
                    Seu plano será cancelado em <strong>{periodoFim}</strong>. Você ainda tem acesso completo até lá.
                    Para reativar, clique em &quot;Gerenciar assinatura&quot;.
                  </p>
                </div>
              )}

              {/* Aviso trial */}
              {isTrialing && trialFim && (
                <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
                  <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-400">
                    Seu trial encerra em <strong>{trialFim}</strong>. Adicione um cartão para continuar sem interrupção.
                  </p>
                </div>
              )}
            </div>

            {/* Feedback */}
            {erro && (
              <div className="flex items-center gap-2 text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertTriangle size={13} /> {erro}
              </div>
            )}
            {cancelOk && (
              <div className="flex items-center gap-2 text-[12px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                <CheckCircle2 size={13} /> Cancelamento agendado com sucesso.
              </div>
            )}

            {isPastDue && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-red-400">Pagamento não processado</p>
                  <p className="text-[12px] text-white/40 mt-0.5">
                    Seu acesso será suspenso em breve. Atualize seu cartão para continuar.
                  </p>
                </div>
                <button
                  onClick={abrirPortal}
                  className="text-[12px] font-medium text-red-400 border border-red-500/30 rounded-lg px-3 py-1.5 hover:bg-red-500/10 transition-colors"
                >
                  Atualizar cartão
                </button>
              </div>
            )}

            {isTrialExpirando && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
                <p className="text-[13px] text-amber-300 flex-1">
                  Seu trial encerra em <strong>{diasRestantes} {diasRestantes === 1 ? "dia" : "dias"}</strong>.
                  Escolha um plano abaixo para não perder o acesso.
                </p>
              </div>
            )}

            {isTrialing && !isTrialExpirando && diasRestantes !== null && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3">
                <Zap size={16} className="text-purple-400 flex-shrink-0" />
                <p className="text-[13px] text-white/60 flex-1">
                  Trial Pro ativo — <strong className="text-white/80">{diasRestantes} dias restantes</strong>.
                  Aproveite todas as funcionalidades.
                </p>
              </div>
            )}

            {/* ── Upgrade ───────────────────────────────────────── */}
            {planosUpgrade.length > 0 && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/25 pt-2">
                  {isAtivo ? "Fazer upgrade" : "Escolha um plano"}
                </p>

                {planosUpgrade.map(plano => (
                  <div key={plano.nome}
                    className={`rounded-2xl border p-5 ${plano.cor} ${plano.destaque ? "ring-1 ring-purple-500/20" : ""}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {plano.destaque && <Zap size={14} className="text-purple-400" />}
                        <span className={`text-[15px] font-bold ${plano.corNome}`}>{plano.nome}</span>
                        {plano.badge && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                            {plano.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[15px] font-bold text-white">{plano.preco}</span>
                    </div>

                    <ul className="space-y-2 mb-5">
                      {plano.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-[12px] text-white/50">
                          <Check size={11} className="text-emerald-400 shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => plano.id && assinar(plano.id)}
                      disabled={loadingId === plano.id}
                      className={`w-full py-2.5 rounded-xl text-[13px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                        plano.destaque
                          ? "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.25)] hover:shadow-[0_0_28px_rgba(168,85,247,0.4)]"
                          : "bg-sky-600/80 hover:bg-sky-500 text-white"
                      }`}>
                      {loadingId === plano.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Zap size={14} />}
                      {isAtivo ? `Migrar para ${plano.nome}` : `Assinar ${plano.nome}`}
                      {plano.destaque && !isAtivo && (
                        <span className="text-[10px] font-semibold text-purple-300 ml-1">· 7 dias grátis</span>
                      )}
                    </button>
                  </div>
                ))}
              </>
            )}

            {/* Já está no plano mais alto */}
            {planosUpgrade.length === 0 && isAtivo && (
              <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] p-5 flex items-center gap-3">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="text-[13px] font-semibold text-emerald-400">Você está no plano máximo!</p>
                  <p className="text-[11px] text-white/30 mt-0.5">Para gerenciar faturas e dados de pagamento, use &quot;Gerenciar assinatura&quot;.</p>
                </div>
              </div>
            )}

            {/* ── Downgrade ──────────────────────────────────────── */}
            {planosDowngrade.length > 0 && isAtivo && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/25 pt-2">
                  Fazer downgrade
                </p>

                {planosDowngrade.map(plano => (
                  <div key={plano.nome}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-5 opacity-75 hover:opacity-90 transition-opacity">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[14px] font-bold ${plano.corNome}`}>{plano.nome}</span>
                      </div>
                      <span className="text-[14px] font-bold text-white/50">{plano.preco}</span>
                    </div>

                    <ul className="space-y-1.5 mb-4">
                      {plano.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-[11px] text-white/35">
                          <Check size={10} className="text-white/25 shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => plano.id && assinar(plano.id)}
                      disabled={loadingId === plano.id}
                      className="w-full py-2 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-white/40 hover:text-white/60"
                    >
                      {loadingId === plano.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : null}
                      Fazer downgrade para {plano.nome}
                    </button>
                  </div>
                ))}
              </>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
