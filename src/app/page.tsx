"use client";

// /app/landing/page.tsx — v2
// Landing page completa com pricing, prova social e CTA forte

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight, Zap, BarChart3, Brain, Shield, TrendingUp,
  CheckCircle2, ChevronDown, Star, Users, Activity,
  AlertTriangle, Play, X, Pause, Target,
} from "lucide-react";

// ─── Dados ───────────────────────────────────────────────────────────────────
const METRICAS = [
  { valor: "R$2.4M",  label: "em budget gerenciado",   cor: "text-purple-400" },
  { valor: "23%",     label: "redução média de CPL",    cor: "text-emerald-400" },
  { valor: "4.2×",    label: "ROAS médio das contas",   cor: "text-white" },
  { valor: "< 2min",  label: "para detectar campanhas em risco", cor: "text-amber-400" },
];

const FEATURES = [
  {
    icon: Brain,
    tag: "IA",
    titulo: "Engine Erizon",
    desc: "Algoritmo proprietário que analisa score, alavancagem e degradação de cada campanha. Não é dashboard — é copiloto.",
    cor: "purple",
  },
  {
    icon: AlertTriangle,
    tag: "ALERTAS",
    titulo: "Pulse em Tempo Real",
    desc: "Detecta campanhas queimando budget sem retorno antes que você precise verificar. Notifica no Telegram instantaneamente.",
    cor: "red",
  },
  {
    icon: TrendingUp,
    tag: "ESCALA",
    titulo: "Simulação de Impacto",
    desc: "Projeta o que acontece se você escalar 20% a campanha X hoje. ROAS, lucro e margem calculados antes de apertar o botão.",
    cor: "emerald",
  },
  {
    icon: Users,
    tag: "AGÊNCIAS",
    titulo: "Multi-cliente",
    desc: "Gerencie toda sua carteira em uma tela. Cada cliente isolado, suas campanhas, seus alertas, seu score.",
    cor: "blue",
  },
  {
    icon: Target,
    tag: "ALTO VALOR",
    titulo: "Engine de Lead Qualificado",
    desc: "Para imóveis, B2B e contratos de alto ticket. Calcula ROAS real por lead, não por clique.",
    cor: "amber",
  },
  {
    icon: Shield,
    tag: "SEGURANÇA",
    titulo: "Dados Isolados",
    desc: "Cada usuário só vê seus próprios dados. Token Meta nunca vaza — armazenado criptografado por usuário.",
    cor: "sky",
  },
];

const PLANOS = [
  {
    nome: "Gestor",
    preco: "R$197",
    periodo: "/mês",
    desc: "Para gestores independentes com 1 conta Meta.",
    destaque: false,
    badge: null,
    itens: [
      "1 conta Meta conectada",
      "Até 20 campanhas monitoradas",
      "Engine Erizon completo",
      "Alertas Telegram",
      "Pulse + Central de Decisão",
      "Histórico 30 dias",
    ],
    cta: "Começar grátis 7 dias",
    ctaHref: "/signup",
  },
  {
    nome: "Agência",
    preco: "R$497",
    periodo: "/mês",
    desc: "Para agências com múltiplos clientes.",
    destaque: true,
    badge: "MAIS POPULAR",
    itens: [
      "Até 10 clientes simultâneos",
      "Campanhas ilimitadas",
      "Engine Erizon + Alto Valor",
      "Alertas Telegram por cliente",
      "Relatório IA automático",
      "Modo CEO + Visão Executiva",
      "Histórico completo",
      "Suporte prioritário",
    ],
    cta: "Começar grátis 7 dias",
    ctaHref: "/signup",
  },
  {
    nome: "Enterprise",
    preco: "Sob consulta",
    periodo: "",
    desc: "Para grandes operações e white-label.",
    destaque: false,
    badge: null,
    itens: [
      "Clientes ilimitados",
      "White-label disponível",
      "SLA garantido",
      "Onboarding dedicado",
      "API de integração",
      "Suporte 24/7",
    ],
    cta: "Falar com time",
    ctaHref: "mailto:contato@erizon.com.br",
  },
];

const DEPOIMENTOS = [
  {
    nome: "Rafael M.",
    cargo: "Gestor de Tráfego · 8 anos",
    texto: "Reduzi o CPL médio dos meus clientes em 31% no primeiro mês. O Engine detectou 3 campanhas queimando R$1.200/dia que eu não estava vendo.",
    stars: 5,
  },
  {
    nome: "Camila S.",
    cargo: "Diretora · Agência Digital",
    texto: "Gerencio 12 clientes na Erizon. O Modo CEO virou minha tela de abertura toda manhã. Em 10 minutos já sei exatamente onde agir.",
    stars: 5,
  },
  {
    nome: "Diego K.",
    cargo: "Media Buyer · E-commerce",
    texto: "A simulação de escala salvou nossa verba mais de uma vez. Projeta o impacto antes de executar. Não tomo mais decisão no feeling.",
    stars: 5,
  },
];

const FAQS = [
  {
    q: "Quanto tempo leva para conectar minha conta Meta?",
    a: "Menos de 5 minutos. Você insere o Access Token e o Ad Account ID nas configurações e a Erizon começa a sincronizar automaticamente.",
  },
  {
    q: "Funciona para imóveis e negócios de alto ticket?",
    a: "Sim. O Engine tem modo 'Alto Valor' específico para imóveis, B2B e contratos premium — calcula o ROAS por lead qualificado em vez de ticket × conversão.",
  },
  {
    q: "Os dados dos meus clientes ficam separados?",
    a: "Completamente isolados. Cada cliente tem seu próprio espaço, suas campanhas e seus alertas. Um cliente nunca vê dados de outro.",
  },
  {
    q: "Posso usar no plano Gestor e depois migrar para Agência?",
    a: "Sim, upgrade com 1 clique. Todos seus dados e histórico são mantidos.",
  },
  {
    q: "Tem período de teste gratuito?",
    a: "7 dias grátis em todos os planos, sem cartão de crédito.",
  },
];

// ─── Componentes ─────────────────────────────────────────────────────────────

function Badge({ children, cor = "purple" }: { children: React.ReactNode; cor?: string }) {
  const cores: Record<string, string> = {
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    red:    "bg-red-500/10 border-red-500/20 text-red-400",
    emerald:"bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    blue:   "bg-blue-500/10 border-blue-500/20 text-blue-400",
    amber:  "bg-amber-500/10 border-amber-500/20 text-amber-400",
    sky:    "bg-sky-500/10 border-sky-500/20 text-sky-400",
  };
  return (
    <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border ${cores[cor] ?? cores.purple}`}>
      {children}
    </span>
  );
}

function FeatureCard({ f }: { f: typeof FEATURES[0] }) {
  const Icon = f.icon;
  const corMap: Record<string, string> = {
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    red:    "bg-red-500/10 border-red-500/20 text-red-400",
    emerald:"bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    blue:   "bg-blue-500/10 border-blue-500/20 text-blue-400",
    amber:  "bg-amber-500/10 border-amber-500/20 text-amber-400",
    sky:    "bg-sky-500/10 border-sky-500/20 text-sky-400",
  };
  return (
    <div className="group p-7 rounded-[24px] border border-white/[0.06] bg-white/[0.015] hover:border-white/[0.12] hover:bg-white/[0.03] transition-all duration-400">
      <div className="flex items-start justify-between mb-5">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${corMap[f.cor]}`}>
          <Icon size={17} />
        </div>
        <Badge cor={f.cor}>{f.tag}</Badge>
      </div>
      <h3 className="text-[15px] font-black text-white mb-2 tracking-tight">{f.titulo}</h3>
      <p className="text-[13px] text-white/40 leading-relaxed">{f.desc}</p>
    </div>
  );
}

function PlanoCard({ p }: { p: typeof PLANOS[0] }) {
  return (
    <div className={`relative flex flex-col rounded-[28px] border p-8 transition-all ${
      p.destaque
        ? "border-purple-500/40 bg-purple-500/[0.06] shadow-[0_0_60px_rgba(147,51,234,0.12)]"
        : "border-white/[0.07] bg-white/[0.02]"
    }`}>
      {p.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="text-[9px] font-black uppercase tracking-[0.25em] px-4 py-1.5 rounded-full bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)]">
            {p.badge}
          </span>
        </div>
      )}

      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-2">{p.nome}</p>
        <div className="flex items-end gap-1 mb-2">
          <span className={`text-[36px] font-black tracking-tight ${p.destaque ? "text-white" : "text-white/80"}`}>
            {p.preco}
          </span>
          {p.periodo && <span className="text-[13px] text-white/30 mb-2">{p.periodo}</span>}
        </div>
        <p className="text-[12px] text-white/30">{p.desc}</p>
      </div>

      <div className="flex-1 space-y-2.5 mb-8">
        {p.itens.map((item, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <CheckCircle2 size={13} className={`shrink-0 mt-0.5 ${p.destaque ? "text-purple-400" : "text-emerald-400/70"}`} />
            <span className="text-[12px] text-white/50">{item}</span>
          </div>
        ))}
      </div>

      <Link href={p.ctaHref}>
        <button className={`w-full py-3.5 rounded-xl text-[13px] font-bold transition-all ${
          p.destaque
            ? "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_25px_rgba(147,51,234,0.3)] hover:shadow-[0_0_35px_rgba(147,51,234,0.5)]"
            : "bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white/70 hover:text-white"
        }`}>
          {p.cta}
        </button>
      </Link>
    </div>
  );
}

function FaqItem({ faq }: { faq: typeof FAQS[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border-b border-white/[0.05] cursor-pointer"
      onClick={() => setOpen(v => !v)}
    >
      <div className="flex items-center justify-between py-5 gap-4">
        <p className={`text-[14px] font-semibold transition-colors ${open ? "text-white" : "text-white/50"}`}>
          {faq.q}
        </p>
        <ChevronDown size={15} className={`text-white/30 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <p className="pb-5 text-[13px] text-white/40 leading-relaxed">{faq.a}</p>
      )}
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-black/80 backdrop-blur-xl border-b border-white/[0.06]" : ""
    }`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="text-[15px] font-black italic uppercase tracking-tight text-white">Erizon</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {["Funcionalidades", "Planos", "FAQ"].map(item => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-[13px] text-white/40 hover:text-white transition-colors"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <button className="text-[13px] text-white/40 hover:text-white transition-colors px-3 py-2">
              Entrar
            </button>
          </Link>
          <Link href="/signup">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[13px] font-bold transition-all shadow-[0_0_20px_rgba(147,51,234,0.25)]">
              Teste grátis <ArrowRight size={13} />
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── CountUp animado ──────────────────────────────────────────────────────────
function useCountUp(end: string, duration = 1500) {
  const [display, setDisplay] = useState("0");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // Extrai número do string (ex: "R$2.4M" → 2.4)
    const match = end.match(/[\d,.]+/);
    if (!match) { setDisplay(end); return; }

    const num  = parseFloat(match[0].replace(",", "."));
    const prefix = end.slice(0, end.search(/[\d]/));
    const suffix = end.slice(end.search(/[\d,.]/) + match[0].length);

    const steps   = 40;
    const step    = duration / steps;
    let current   = 0;

    const timer = setInterval(() => {
      current += num / steps;
      if (current >= num) {
        setDisplay(end);
        clearInterval(timer);
      } else {
        const fmt = current < 10
          ? current.toFixed(1)
          : Math.round(current).toString();
        setDisplay(`${prefix}${fmt}${suffix}`);
      }
    }, step);

    return () => clearInterval(timer);
  }, [end, duration]);

  return display;
}

function MetricaItem({ m }: { m: typeof METRICAS[0] }) {
  const v = useCountUp(m.valor);
  return (
    <div className="flex flex-col items-center gap-2 px-8 py-6 border border-white/[0.06] rounded-[20px] bg-white/[0.02]">
      <span className={`text-[2.2rem] font-black italic tracking-tight ${m.cor}`}>{v}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25 text-center">{m.label}</span>
    </div>
  );
}

// ─── Simulação "live" de alerta — prova visual do produto ────────────────────
function DemoAlerta() {
  const [etapa, setEtapa] = useState(0);
  const etapas = [
    { label: "Escaneando campanhas...", cor: "text-white/40", icon: "⚡" },
    { label: "Campanha 'Leads Imóveis SP' — Score 28/100", cor: "text-red-400", icon: "🔴" },
    { label: "R$480/dia sem retorno detectado", cor: "text-red-400", icon: "💸" },
    { label: "Alerta enviado no Telegram ✓", cor: "text-emerald-400", icon: "✅" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setEtapa(v => (v + 1) % etapas.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0c0c0e] border border-white/[0.06] rounded-2xl p-5 font-mono text-[12px]">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        <span className="ml-2 text-[10px] text-white/20">erizon · engine</span>
      </div>
      <div className="space-y-2">
        {etapas.map((e, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 transition-all duration-500 ${
              i === etapa ? "opacity-100" : i < etapa ? "opacity-30" : "opacity-10"
            }`}
          >
            <span>{e.icon}</span>
            <span className={i === etapa ? e.cor : "text-white/30"}>{e.label}</span>
            {i === etapa && (
              <span className="animate-pulse text-white/30">_</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#060608] text-white overflow-x-hidden">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Glow de fundo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/10 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-5xl mx-auto relative">
          <div className="flex justify-center mb-6">
            <Badge cor="purple">Inteligência Artificial para Meta Ads</Badge>
          </div>

          <h1 className="text-center text-[3rem] md:text-[4.5rem] font-black italic uppercase tracking-tighter leading-[0.92] mb-6">
            Pare de perder dinheiro<br />
            <span className="text-purple-500">em campanhas mortas.</span>
          </h1>

          <p className="text-center text-[16px] text-white/40 max-w-2xl mx-auto mb-10 leading-relaxed">
            A Erizon monitora suas campanhas Meta 24/7, detecta onde o budget está queimando e aponta exatamente o que escalar.
            Engine proprietário. Decisões em segundos, não horas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/signup">
              <button className="flex items-center gap-3 px-8 py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[15px] font-bold transition-all shadow-[0_0_40px_rgba(147,51,234,0.3)] hover:shadow-[0_0_60px_rgba(147,51,234,0.5)]">
                Teste grátis por 7 dias <ArrowRight size={16} />
              </button>
            </Link>
            <p className="text-[12px] text-white/20">Sem cartão de crédito · Conecta em 5 min</p>
          </div>

          {/* Demo ao vivo */}
          <div className="max-w-xl mx-auto">
            <DemoAlerta />
          </div>
        </div>
      </section>

      {/* ── MÉTRICAS ── */}
      <section className="py-16 px-6 border-y border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-white/20 mb-8">
            Resultados reais dos gestores que usam a Erizon
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {METRICAS.map((m, i) => <MetricaItem key={i} m={m} />)}
          </div>
        </div>
      </section>

      {/* ── FUNCIONALIDADES ── */}
      <section id="funcionalidades" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400/60 mb-3">O que você ganha</p>
            <h2 className="text-[2.2rem] font-black italic uppercase tracking-tight leading-tight">
              Tudo que você precisava<br />
              <span className="text-white/40">para tomar decisões de verdade.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => <FeatureCard key={i} f={f} />)}
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section className="py-24 px-6 bg-white/[0.01] border-y border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400/60 mb-3">Simples de começar</p>
            <h2 className="text-[2.2rem] font-black italic uppercase tracking-tight">Em 3 passos você está rodando.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                num: "01",
                titulo: "Conecte sua conta Meta",
                desc: "Insira seu Access Token e Ad Account ID. A Erizon começa a sincronizar imediatamente.",
              },
              {
                num: "02",
                titulo: "Configure o Engine",
                desc: "Informe ticket médio, taxa de conversão (ou valor por lead para alto valor). O algoritmo calibra automaticamente.",
              },
              {
                num: "03",
                titulo: "Tome decisões com dados",
                desc: "Pulse mostra o que agir hoje. Dados mostra o histórico completo. Erizon IA responde qualquer dúvida.",
              },
            ].map((s, i) => (
              <div key={i} className="flex flex-col gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center">
                  <span className="text-[13px] font-black text-purple-400 italic">{s.num}</span>
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-white mb-2">{s.titulo}</h3>
                  <p className="text-[13px] text-white/35 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400/60 mb-3">Quem já usa</p>
            <h2 className="text-[2.2rem] font-black italic uppercase tracking-tight">
              Gestores que pararam<br />
              <span className="text-white/40">de adivinhar.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {DEPOIMENTOS.map((d, i) => (
              <div key={i} className="p-7 rounded-[24px] border border-white/[0.06] bg-white/[0.015] flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: d.stars }).map((_, j) => (
                    <Star key={j} size={12} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-[13px] text-white/55 leading-relaxed flex-1">"{d.texto}"</p>
                <div>
                  <p className="text-[13px] font-bold text-white">{d.nome}</p>
                  <p className="text-[11px] text-white/25">{d.cargo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANOS ── */}
      <section id="planos" className="py-24 px-6 bg-white/[0.01] border-y border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400/60 mb-3">Preços simples</p>
            <h2 className="text-[2.2rem] font-black italic uppercase tracking-tight mb-3">
              Quanto custa uma campanha<br />
              <span className="text-white/40">queimando R$500/dia?</span>
            </h2>
            <p className="text-[13px] text-white/30 max-w-xl mx-auto">
              A Erizon custa menos do que 1 dia de budget desperdiçado. E detecta esse desperdício antes que aconteça.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {PLANOS.map((p, i) => <PlanoCard key={i} p={p} />)}
          </div>

          <p className="text-center text-[12px] text-white/20 mt-8">
            Todos os planos incluem 7 dias grátis. Cancele quando quiser. Sem contratos.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-[2.2rem] font-black italic uppercase tracking-tight">Dúvidas frequentes</h2>
          </div>
          <div>
            {FAQS.map((f, i) => <FaqItem key={i} faq={f} />)}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[500px] h-[300px] bg-purple-600/8 blur-[100px] rounded-full" />
          </div>
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400/60 mb-4">Pronto para começar?</p>
            <h2 className="text-[2.8rem] font-black italic uppercase tracking-tighter leading-tight mb-6">
              Sua próxima campanha<br />
              <span className="text-purple-500">não precisa falhar.</span>
            </h2>
            <p className="text-[14px] text-white/30 mb-10 max-w-lg mx-auto">
              7 dias grátis. Sem cartão de crédito. Conecte sua conta Meta em menos de 5 minutos.
            </p>
            <Link href="/signup">
              <button className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[16px] font-black transition-all shadow-[0_0_60px_rgba(147,51,234,0.35)] hover:shadow-[0_0_80px_rgba(147,51,234,0.5)] tracking-tight">
                Começar agora — grátis <ArrowRight size={18} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.05] py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center">
              <Zap size={11} className="text-white" />
            </div>
            <span className="text-[13px] font-black italic uppercase text-white/60">Erizon</span>
          </div>
          <p className="text-[12px] text-white/20">© {new Date().getFullYear()} Erizon Growth Intelligence · Todos os direitos reservados</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-[12px] text-white/20 hover:text-white/50 transition-colors">Privacidade</a>
            <a href="#" className="text-[12px] text-white/20 hover:text-white/50 transition-colors">Termos</a>
            <a href="mailto:contato@erizon.com.br" className="text-[12px] text-white/20 hover:text-white/50 transition-colors">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}