"use client";

// src/app/sucesso/page.tsx
// Página de boas-vindas após checkout do Stripe
// 3 passos: conectar Meta → configurar Engine → ver primeiro Pulse

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight, Zap, SlidersHorizontal, BarChart3, Loader2 } from "lucide-react";

const PASSOS = [
  {
    num: 1,
    icon: BarChart3,
    titulo: "Conectar Meta Ads",
    desc: "Adicione seu Access Token e Ad Account ID para sincronizar suas campanhas.",
    acao: "Ir para Settings → Business Managers",
    href: "/settings?tab=bm",
    cor: "text-purple-400",
    corBg: "bg-purple-500/10 border-purple-500/20",
  },
  {
    num: 2,
    icon: SlidersHorizontal,
    titulo: "Configurar o Engine",
    desc: "Informe ticket médio e taxa de conversão para o algoritmo calcular ROAS real.",
    acao: "Ir para Settings → Engine",
    href: "/settings?tab=engine",
    cor: "text-emerald-400",
    corBg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    num: 3,
    icon: Zap,
    titulo: "Ver seu primeiro Pulse",
    desc: "Sincronize as campanhas e receba sua primeira análise estratégica em segundos.",
    acao: "Ir para o Pulse",
    href: "/pulse",
    cor: "text-amber-400",
    corBg: "bg-amber-500/10 border-amber-500/20",
  },
];

function SucessoContent() {
  const params   = useSearchParams();
  const router   = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _session  = params.get("session_id");
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Anima entrada dos passos
    const t = setInterval(() => {
      setStep(prev => prev < PASSOS.length ? prev + 1 : prev);
    }, 400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#060608] text-white flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-[560px]">

        {/* Header sucesso */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={28} className="text-emerald-400" />
          </div>
          <p className="text-[11px] font-medium text-white/20 mb-2 uppercase tracking-widest">Bem-vindo à Erizon</p>
          <h1 className="text-[2rem] font-black text-white tracking-tight mb-2">
            Tudo certo! 🎉
          </h1>
          <p className="text-[14px] text-white/35 leading-relaxed">
            Sua conta está ativa. Siga os 3 passos abaixo para começar a proteger seu budget em minutos.
          </p>
        </div>

        {/* 3 passos */}
        <div className="space-y-3 mb-8">
          {PASSOS.map((p, i) => {
            const Icon = p.icon;
            const visivel = i < step;
            return (
              <div key={p.num}
                className={`p-5 rounded-2xl border transition-all duration-500 ${visivel ? `${p.corBg} opacity-100 translate-y-0` : "border-white/[0.04] bg-white/[0.01] opacity-0 translate-y-4"}`}
                style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${p.corBg}`}>
                    <Icon size={15} className={p.cor} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] text-white/20 font-mono">0{p.num}</span>
                      <h3 className="text-[13px] font-bold text-white">{p.titulo}</h3>
                    </div>
                    <p className="text-[12px] text-white/30 mb-3 leading-relaxed">{p.desc}</p>
                    <button onClick={() => router.push(p.href)}
                      className={`flex items-center gap-1.5 text-[12px] font-semibold ${p.cor} hover:opacity-80 transition-opacity`}>
                      {p.acao} <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA principal */}
        <button onClick={() => router.push("/pulse")}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-[14px] font-bold text-white transition-all">
          <Zap size={16} /> Abrir meu Pulse agora
        </button>

        <p className="text-center text-[11px] text-white/15 mt-4">
          Você pode acessar essas configurações a qualquer momento em Settings.
        </p>
      </div>
    </div>
  );
}

export default function SucessoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#060608] flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-white/20" />
      </div>
    }>
      <SucessoContent />
    </Suspense>
  );
}