"use client";

// /app/billing/page.tsx
// Paywall — exibido quando trial expirou ou não tem plano
// Botões chamam POST /api/billing com action="checkout"

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Zap, CheckCircle2, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

const PLANOS = [
  {
    id: "gestor",
    nome: "Gestor",
    preco: "R$197",
    periodo: "/mês",
    desc: "Para gestores independentes",
    destaque: false,
    itens: [
      "1 conta Meta conectada",
      "Até 20 campanhas",
      "Engine Erizon completo",
      "Alertas Telegram",
      "Histórico 30 dias",
    ],
  },
  {
    id: "agencia",
    nome: "Agência",
    preco: "R$497",
    periodo: "/mês",
    desc: "Para agências multi-cliente",
    destaque: true,
    itens: [
      "Até 10 clientes",
      "Campanhas ilimitadas",
      "Engine Alto Valor",
      "Relatório IA automático",
      "Modo CEO",
      "Suporte prioritário",
    ],
  },
];

export default function BillingPage() {
  const params  = useSearchParams();
  const reason  = params.get("reason"); // "expired" | "no_plan"
  const [loading, setLoading] = useState<string | null>(null);
  const [erro, setErro]       = useState("");

  async function assinar(plano: string) {
    setLoading(plano);
    setErro("");
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkout", plano }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro desconhecido");
      if (json.url) window.location.href = json.url;
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao iniciar checkout");
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#060608] flex flex-col items-center justify-center px-4 py-16">
      {/* Glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="w-[500px] h-[400px] bg-purple-600/8 blur-[120px] rounded-full" />
      </div>

      <div className="relative w-full max-w-3xl">
        {/* Header */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-[17px] font-black italic uppercase tracking-tight text-white">Erizon</span>
          </div>
        </div>

        {/* Mensagem contextual */}
        <div className="text-center mb-10">
          {reason === "expired" ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle size={13} className="text-amber-400" />
                  <span className="text-[12px] text-amber-400 font-medium">Seu período de teste encerrou</span>
                </div>
              </div>
              <h1 className="text-[2rem] font-black italic uppercase tracking-tight text-white mb-3">
                Continue protegendo<br />
                <span className="text-purple-500">seu budget.</span>
              </h1>
              <p className="text-[14px] text-white/35 max-w-md mx-auto">
                Seus dados e histórico estão preservados. Escolha um plano para continuar monitorando suas campanhas.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[2rem] font-black italic uppercase tracking-tight text-white mb-3">
                Escolha seu plano<br />
                <span className="text-purple-500">e comece agora.</span>
              </h1>
              <p className="text-[14px] text-white/35 max-w-md mx-auto">
                7 dias grátis. Sem cartão de crédito necessário para começar.
              </p>
            </>
          )}
        </div>

        {/* Planos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {PLANOS.map(p => (
            <div
              key={p.id}
              className={`relative rounded-[24px] border p-7 flex flex-col ${
                p.destaque
                  ? "border-purple-500/40 bg-purple-500/[0.05] shadow-[0_0_50px_rgba(147,51,234,0.1)]"
                  : "border-white/[0.07] bg-white/[0.02]"
              }`}
            >
              {p.destaque && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-purple-600 text-white">
                    RECOMENDADO
                  </span>
                </div>
              )}

              <div className="mb-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-1">{p.nome}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-[30px] font-black text-white">{p.preco}</span>
                  <span className="text-[12px] text-white/25 mb-1.5">{p.periodo}</span>
                </div>
                <p className="text-[12px] text-white/25">{p.desc}</p>
              </div>

              <div className="flex-1 space-y-2 mb-6">
                {p.itens.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 size={12} className={p.destaque ? "text-purple-400" : "text-emerald-400/60"} />
                    <span className="text-[12px] text-white/45">{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => assinar(p.id)}
                disabled={loading !== null}
                className={`w-full py-3.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 transition-all ${
                  p.destaque
                    ? "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_25px_rgba(147,51,234,0.3)]"
                    : "bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white/70 hover:text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === p.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    Assinar {p.nome} <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {erro && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
            <AlertCircle size={13} className="text-red-400 shrink-0" />
            <p className="text-[12px] text-red-400">{erro}</p>
          </div>
        )}

        <div className="text-center space-y-3">
          <p className="text-[11px] text-white/20">
            Cancelamento a qualquer momento · Dados preservados · Suporte via Telegram
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/settings" className="text-[12px] text-white/20 hover:text-white/50 transition-colors">
              Gerenciar assinatura
            </Link>
            <span className="text-white/10">·</span>
            <a href="mailto:contato@erizon.com.br" className="text-[12px] text-white/20 hover:text-white/50 transition-colors">
              Precisa de ajuda?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}