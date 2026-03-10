"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, Zap, Shield, BarChart2, Users,
  TrendingUp, AlertTriangle, CheckCircle, ChevronRight,
} from "lucide-react";

function Counter({ to, prefix = "", suffix = "", duration = 1800 }: {
  to: number; prefix?: string; suffix?: string; duration?: number;
}) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(ease * to));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{prefix}{val.toLocaleString("pt-BR")}{suffix}</span>;
}

function NoiseLine() {
  const points = Array.from({ length: 40 }, (_, i) => {
    const x = (i / 39) * 100;
    const y = 50 + Math.sin(i * 0.7) * 12 + Math.sin(i * 1.3) * 8 + Math.sin(i * 2.1) * 4;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-16 opacity-30">
      <polyline points={points} fill="none" stroke="url(#grad)" strokeWidth="0.8" />
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
          <stop offset="40%" stopColor="#6366f1" />
          <stop offset="70%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const DECISOES = [
  { camp: "Clínica Renata · Lead Frio", acao: "⛔ Pausar", motivo: "CPL R$87 · 3× acima do limite", cor: "text-red-400", borda: "border-red-500/20 bg-red-500/5" },
  { camp: "Ecom Moda Feminina · Retargeting", acao: "🚀 Escalar +30%", motivo: "ROAS 4.2 · Freq 1.8 · Margem 61%", cor: "text-emerald-400", borda: "border-emerald-500/20 bg-emerald-500/5" },
  { camp: "Consultório Odonto · Topo", acao: "⚠️ Ajustar criativo", motivo: "CTR 0.4% · Saturação detectada", cor: "text-amber-400", borda: "border-amber-500/20 bg-amber-500/5" },
  { camp: "Infoproduto · Webinar", acao: "🚀 Escalar +20%", motivo: "CPL R$12 · 2× abaixo da meta", cor: "text-emerald-400", borda: "border-emerald-500/20 bg-emerald-500/5" },
];

function DecisaoCard({ d, delay }: { d: typeof DECISOES[0]; delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className={`rounded-xl border px-4 py-3 transition-all duration-700 ${d.borda} ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-white/40 mb-0.5">{d.camp}</p>
          <p className={`text-sm font-semibold ${d.cor}`}>{d.acao}</p>
          <p className="text-xs text-white/30 mt-0.5">{d.motivo}</p>
        </div>
        <CheckCircle size={14} className={d.cor + " shrink-0 mt-0.5"} />
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#040406] text-white overflow-x-hidden">

      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/[0.04] bg-[#040406]/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
            <Zap size={13} className="text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight">Erizon</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-white/40">
          <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
          <a href="#modulos" className="hover:text-white transition-colors">Módulos</a>
          <a href="#resultados" className="hover:text-white transition-colors">Resultados</a>
        </div>
        <Link href="/signup"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white transition-all">
          Começar grátis <ArrowRight size={13} />
        </Link>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.02]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 text-violet-300 text-xs font-semibold uppercase tracking-wider mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Sistema de decisão para gestores de tráfego
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight mb-6">
            Pare de{" "}
            <span className="text-white/20 line-through decoration-red-500">adivinhar.</span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Deixe a IA decidir.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-10">
            A Erizon analisa suas campanhas no Meta Ads em tempo real, detecta riscos, gera decisões e executa — enquanto você foca no que importa.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
            <Link href="/signup"
              className="flex items-center gap-2 px-7 py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-base font-bold transition-all shadow-lg shadow-violet-500/20 hover:-translate-y-0.5">
              Testar grátis agora <ArrowRight size={16} />
            </Link>
            <Link href="/login"
              className="flex items-center gap-2 px-7 py-4 rounded-2xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-base font-medium transition-all">
              Já tenho conta
            </Link>
          </div>
          <p className="text-xs text-white/20">Sem cartão de crédito · Conecta em 2 minutos</p>
        </div>

        {/* Preview do produto */}
        <div className="relative mt-20 w-full max-w-2xl mx-auto">
          <div className="absolute -inset-4 bg-violet-500/5 rounded-3xl blur-xl" />
          <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05] bg-white/[0.01]">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
              <span className="ml-3 text-xs text-white/20 font-mono">erizonai.com.br · Decision Feed</span>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-white/30 uppercase tracking-wider font-medium">Decisões geradas agora</p>
              {DECISOES.map((d, i) => (
                <DecisaoCard key={i} d={d} delay={i * 350 + 600} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* NÚMEROS */}
      <section id="resultados" className="py-24 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { n: 47, suf: "%", label: "Redução média de CPL", desc: "em 30 dias" },
            { n: 3, suf: "×", label: "Mais campanhas geridas", desc: "sem aumentar equipe" },
            { n: 2, suf: "min", label: "Para conectar Meta Ads", desc: "setup completo" },
            { n: 100, suf: "%", label: "Decisões auditáveis", desc: "sem caixa preta" },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
              <p className="text-4xl font-black text-white mb-1"><Counter to={s.n} suffix={s.suf} /></p>
              <p className="text-sm font-semibold text-white/70 mb-1">{s.label}</p>
              <p className="text-xs text-white/30">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="py-24 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-3">Como funciona</p>
            <h2 className="text-4xl md:text-5xl font-black">Do dado à decisão<br />em segundos</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { n: "01", title: "Conecta o Meta Ads", desc: "Token de acesso + Account ID. Sincroniza todas as campanhas automaticamente.", icon: Zap, cor: "text-violet-400" },
              { n: "02", title: "IA analisa em tempo real", desc: "CPL, ROAS, frequência, saturação, margem — processado com benchmarks do Brasil.", icon: BarChart2, cor: "text-purple-400" },
              { n: "03", title: "Recebe decisões prontas", desc: "Pausar, escalar, ajustar criativo. Com motivo e dado. Você aprova ou ignora.", icon: CheckCircle, cor: "text-pink-400" },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 relative overflow-hidden">
                <div className="absolute top-4 right-4 text-5xl font-black text-white/[0.04] select-none leading-none">{s.n}</div>
                <div className="w-10 h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center mb-4">
                  <s.icon size={18} className={s.cor} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6"><NoiseLine /></div>
        </div>
      </section>

      {/* MÓDULOS */}
      <section id="modulos" className="py-24 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-3">Módulos</p>
            <h2 className="text-4xl md:text-5xl font-black">Uma plataforma.<br />Quatro superpoderes.</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: TrendingUp, cor: "from-violet-600/20 to-transparent", iconCor: "text-violet-400", tag: "Decision Feed", title: "Decisões que você realmente usa", desc: "Cada campanha recebe uma recomendação: escalar, pausar ou ajustar. Com o dado que justifica. Sem achismo.", href: "/decision-feed" },
              { icon: AlertTriangle, cor: "from-amber-600/15 to-transparent", iconCor: "text-amber-400", tag: "Risk Radar", title: "Detecta problemas antes do cliente", desc: "Campanhas zumbi, saturação de frequência, concentração de risco. Você vê antes que vire reclamação.", href: "/risk-radar" },
              { icon: Users, cor: "from-emerald-600/15 to-transparent", iconCor: "text-emerald-400", tag: "Portal do cliente", title: "Relatório que o cliente entende", desc: "Um link limpo com investimento, leads e CPL. Sem planilha. Transparência que fideliza.", href: "/portal" },
              { icon: Shield, cor: "from-pink-600/15 to-transparent", iconCor: "text-pink-400", tag: "Copiloto IA", title: "Analista disponível 24h", desc: "Pergunta o que quiser sobre suas campanhas. O Copiloto conhece seus dados e responde com contexto real.", href: "/copiloto" },
            ].map((m, i) => (
              <Link key={i} href={m.href}
                className={`group rounded-2xl border border-white/[0.06] bg-gradient-to-br ${m.cor} p-6 hover:border-white/[0.12] transition-all`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/30">{m.tag}</span>
                    <h3 className="text-lg font-bold text-white mt-1">{m.title}</h3>
                  </div>
                  <m.icon size={20} className={m.iconCor + " shrink-0 mt-1"} />
                </div>
                <p className="text-sm text-white/40 leading-relaxed mb-4">{m.desc}</p>
                <div className="flex items-center gap-1 text-xs text-white/30 group-hover:text-white/60 transition-colors">
                  Ver módulo <ChevronRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* DOR */}
      <section className="py-24 px-6 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl border border-white/[0.06] bg-white/[0.01] p-8 md:p-12">
            <p className="text-xs text-white/30 uppercase tracking-wider font-medium mb-6">Reconhece isso?</p>
            <div className="grid md:grid-cols-2 gap-3 mb-10">
              {[
                "Abro 10 abas do Ads Manager todo dia sem entender o que está acontecendo",
                "Não sei se a campanha está ruim ou é sazonalidade do mercado",
                "Cliente pergunta sobre resultado e fico compilando dados às 23h",
                "Escalo campanha errada e queimo budget sem saber por quê",
                "Detecto saturação tarde demais — CPL já explodiu",
                "Relatório mensal leva meio dia pra fazer",
              ].map((d, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-white/[0.01] px-4 py-3">
                  <span className="text-red-400/60 shrink-0 mt-0.5">×</span>
                  <p className="text-sm text-white/50 leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-black text-white mb-2">A Erizon resolve todos esses pontos.</p>
              <p className="text-white/40 mb-6">Sem planilha. Sem achismo. Com dados do seu mercado.</p>
              <Link href="/signup"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-all shadow-lg shadow-violet-500/20">
                Quero testar grátis <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PARA QUEM É */}
      <section className="py-24 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-3">Para quem é</p>
          <h2 className="text-4xl font-black mb-12">Feito para quem vive de resultado</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { emoji: "🎯", title: "Gestor de tráfego", desc: "Que gerencia múltiplos clientes e precisa de decisões rápidas sem perder contexto." },
              { emoji: "📊", title: "Media buyer", desc: "Que precisa escalar campanhas com precisão e justificar cada centavo investido." },
              { emoji: "🏢", title: "Agência digital", desc: "Que quer entregar mais valor ao cliente e reduzir o tempo operacional da equipe." },
            ].map((p, i) => (
              <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="text-3xl mb-3">{p.emoji}</div>
                <h3 className="text-base font-bold mb-2">{p.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-6 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto text-center relative">
          <div className="absolute inset-0 bg-violet-500/5 rounded-3xl blur-3xl pointer-events-none" />
          <div className="relative">
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-4">Comece agora</p>
            <h2 className="text-5xl md:text-6xl font-black mb-4 leading-tight">
              Seu próximo mês<br />começa hoje.
            </h2>
            <p className="text-white/40 text-lg mb-8 max-w-xl mx-auto">
              Conecte o Meta Ads em 2 minutos e veja as primeiras decisões da IA sobre suas campanhas.
            </p>
            <Link href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-base font-bold transition-all shadow-2xl shadow-violet-500/20 hover:-translate-y-0.5">
              Criar conta grátis <ArrowRight size={18} />
            </Link>
            <p className="text-xs text-white/20 mt-4">Sem cartão de crédito · Setup em 2 minutos · Cancela quando quiser</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.04] px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
              <Zap size={11} className="text-white" />
            </div>
            <span className="text-sm font-bold">Erizon</span>
            <span className="text-white/20 text-sm">· AI Marketing Operating System</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-white/25">
            <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
            <Link href="/termos" className="hover:text-white transition-colors">Termos</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
