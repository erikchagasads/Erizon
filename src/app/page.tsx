"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import ErizonLogo from "@/components/ErizonLogo";
import {
  Zap, Shield, BarChart2, Users, TrendingUp, AlertTriangle,
  CheckCircle, ChevronRight, ArrowRight, Brain, Target,
  Activity, Clock, DollarSign, Layers, Eye, Play, Sparkles,
  ArrowUpRight, ArrowDownRight, RefreshCw, Lightbulb, XCircle
} from "lucide-react";

// ── Contador animado ──────────────────────────────────────────────────────────
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

// ── Card de Decisão da IA ─────────────────────────────────────────────────────
interface Decisao {
  camp: string;
  acao: string;
  motivo: string;
  cor: string;
  borda: string;
  icone: "pause" | "scale" | "warning" | "test";
}

const DECISOES: Decisao[] = [
  {
    camp: "Clínica Renata · Lead Frio",
    acao: "Pausar campanha",
    motivo: "CPL R$87 · 3× acima do limite",
    cor: "text-red-400",
    borda: "border-red-500/20 bg-red-500/5",
    icone: "pause"
  },
  {
    camp: "Ecom Moda Feminina · Retargeting",
    acao: "Escalar +30%",
    motivo: "ROAS 4.2 · Freq 1.8 · Margem 61%",
    cor: "text-emerald-400",
    borda: "border-emerald-500/20 bg-emerald-500/5",
    icone: "scale"
  },
  {
    camp: "Consultório Odonto · Topo",
    acao: "Ajustar criativo",
    motivo: "CTR 0.4% · Saturação detectada",
    cor: "text-amber-400",
    borda: "border-amber-500/20 bg-amber-500/5",
    icone: "warning"
  },
  {
    camp: "Infoproduto · Webinar",
    acao: "Escalar +20%",
    motivo: "CPL R$12 · 2× abaixo da meta",
    cor: "text-emerald-400",
    borda: "border-emerald-500/20 bg-emerald-500/5",
    icone: "scale"
  },
];

function DecisaoIcon({ type }: { type: Decisao["icone"] }) {
  if (type === "pause") return <XCircle size={16} className="text-red-400" />;
  if (type === "scale") return <TrendingUp size={16} className="text-emerald-400" />;
  if (type === "warning") return <AlertTriangle size={16} className="text-amber-400" />;
  return <RefreshCw size={16} className="text-cyan-400" />;
}

function DecisaoCard({ d, delay }: { d: Decisao; delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div className={`rounded-xl border px-4 py-3 transition-all duration-700 ${d.borda} ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs text-white/40 mb-0.5">{d.camp}</p>
          <p className={`text-sm font-semibold ${d.cor}`}>{d.acao}</p>
          <p className="text-xs text-white/30 mt-0.5">{d.motivo}</p>
        </div>
        <DecisaoIcon type={d.icone} />
      </div>
    </div>
  );
}

// ── Preview do Dashboard ──────────────────────────────────────────────────────
function DashboardPreview() {
  return (
    <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      {/* Header do Dashboard */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] bg-white/[0.01]">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
        </div>
        <span className="text-xs text-white/20 font-mono">erizon.ai · Central de Decisão</span>
        <div className="w-16" />
      </div>

      {/* Conteúdo do Dashboard */}
      <div className="p-5 grid md:grid-cols-2 gap-4">
        {/* Coluna da Esquerda - Métricas */}
        <div className="space-y-3">
          <p className="text-xs text-white/30 uppercase tracking-wider font-medium mb-2">Métricas em Tempo Real</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-xs text-white/30">ROAS Médio</p>
              <p className="text-xl font-bold text-emerald-400">3.8</p>
              <p className="text-xs text-emerald-400/60 flex items-center gap-1">
                <ArrowUpRight size={10} /> +12% vs 7d
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-xs text-white/30">CPL Médio</p>
              <p className="text-xl font-bold text-amber-400">R$24</p>
              <p className="text-xs text-red-400/60 flex items-center gap-1">
                <ArrowDownRight size={10} /> +8% vs 7d
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-xs text-white/30">CTR Médio</p>
              <p className="text-xl font-bold text-cyan-400">1.8%</p>
              <p className="text-xs text-emerald-400/60 flex items-center gap-1">
                <ArrowUpRight size={10} /> +0.3% vs 7d
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-xs text-white/30">Verba Diária</p>
              <p className="text-xl font-bold text-fuchsia-400">R$2.4k</p>
              <p className="text-xs text-white/30">dentro do limite</p>
            </div>
          </div>
        </div>

        {/* Coluna da Direita - Decisões */}
        <div className="space-y-2">
          <p className="text-xs text-white/30 uppercase tracking-wider font-medium mb-2">Decisões da IA</p>
          {DECISOES.map((d, i) => (
            <DecisaoCard key={i} d={d} delay={i * 350 + 600} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Seção de Problemas ────────────────────────────────────────────────────────
function ProblemasSection() {
  const problemas = [
    { texto: "Abro múltiplas abas do Ads Manager sem entender o que está acontecendo", icone: "confusion" },
    { texto: "Não sei se a campanha está ruim ou é sazonalidade do mercado", icone: "question" },
    { texto: "Compilo dados até tarde quando o cliente pede relatório", icone: "time" },
    { texto: "Escalo a campanha errada e queimo orçamento", icone: "money" },
    { texto: "Detecto saturação tarde demais — CPL já explodiu", icone: "alert" },
    { texto: "Levo horas para fazer relatório mensal manualmente", icone: "report" },
  ];

  return (
    <section className="py-24 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-3">Você se identifica?</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Gestão de campanhas no escuro
          </h2>
          <p className="text-lg text-white/40 max-w-2xl mx-auto">
            Sem dados claros, cada decisão vira um risco. Você já passou por isso?
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {problemas.map((p, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-red-500/10 bg-red-500/[0.02] px-4 py-3">
              <span className="text-red-400/60 shrink-0 mt-0.5">
                <XCircle size={18} />
              </span>
              <p className="text-sm text-white/50 leading-relaxed">{p.texto}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-2xl md:text-3xl font-black text-white mb-2">
            A Erizon resolve todos esses pontos
          </p>
          <p className="text-white/40 mb-6">Sem planilha. Sem achismo. Com dados do seu mercado.</p>
        </div>
      </div>
    </section>
  );
}

// ── Seção Antes e Depois ──────────────────────────────────────────────────────
function AntesDepoisSection() {
  return (
    <section className="py-24 px-6 border-t border-white/[0.04] bg-gradient-to-b from-transparent via-white/[0.01] to-transparent">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-fuchsia-400 font-semibold uppercase tracking-wider mb-3">Transformação</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Antes e depois da Erizon
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Antes */}
          <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.02] p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle size={20} className="text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Antes</h3>
            </div>
            <ul className="space-y-4">
              {[
                "Decisões manuais baseadas em intuição",
                "Análise demorada de múltiplas planilhas",
                "Dados confusos em abas separadas",
                "Campanhas desperdiçando verba sem aviso",
                "Relatórios manuais que levam horas",
                "Dependência total de achismo",
                "Reação tardia a problemas",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-white/50">
                  <XCircle size={18} className="text-red-400/40 shrink-0 mt-0.5" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Depois */}
          <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.02] p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle size={20} className="text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Depois</h3>
            </div>
            <ul className="space-y-4">
              {[
                "Decisões baseadas em dados processados por IA",
                "Análise automática em tempo real",
                "Central única com todas as métricas",
                "Alertas proativos antes do desperdício",
                "Relatórios automáticos em 1 clique",
                "Controle total com inteligência",
                "Ação preventiva em sinais de risco",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-white/50">
                  <CheckCircle size={18} className="text-emerald-400/40 shrink-0 mt-0.5" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Seção Como Funciona ──────────────────────────────────────────────────────
function ComoFuncionaSection() {
  const passos = [
    {
      numero: "01",
      icone: Zap,
      titulo: "Conecte suas campanhas",
      descricao: "Integração com Meta Ads em 2 minutos. Token de acesso + Account ID e pronto.",
      cor: "text-fuchsia-400"
    },
    {
      numero: "02",
      icone: Brain,
      titulo: "IA analisa os dados",
      descricao: "Processamento de ROAS, CPL, CTR, frequência, saturação e benchmarks do mercado.",
      cor: "text-cyan-400"
    },
    {
      numero: "03",
      icone: Lightbulb,
      titulo: "Receba diagnósticos",
      descricao: "A IA identifica gargalos, oportunidades e campanhas críticas automaticamente.",
      cor: "text-amber-400"
    },
    {
      numero: "04",
      icone: Target,
      titulo: "Execute com segurança",
      descricao: "Decisões claras: pausar, escalar ou testar. Com dados que justificam cada ação.",
      cor: "text-emerald-400"
    },
  ];

  return (
    <section id="como-funciona" className="py-24 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-fuchsia-400 font-semibold uppercase tracking-wider mb-3">Como funciona</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Do dado à decisão em segundos
          </h2>
          <p className="text-lg text-white/40 max-w-2xl mx-auto">
            Quatro passos simples entre você e decisões mais inteligentes
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {passos.map((p, i) => (
            <div key={i} className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 overflow-hidden">
              <div className="absolute top-4 right-4 text-6xl font-black text-white/[0.03] select-none leading-none">
                {p.numero}
              </div>
              <div className="w-12 h-12 rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center mb-4">
                <p.icone size={22} className={p.cor} />
              </div>
              <div className="text-xs text-fuchsia-400 font-bold mb-2">{p.numero}</div>
              <h3 className="text-lg font-bold text-white mb-2">{p.titulo}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{p.descricao}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Seção Casos de Uso ────────────────────────────────────────────────────────
function CasosUsoSection() {
  const casos = [
    {
      icone: Target,
      titulo: "Gestor de tráfego",
      descricao: "Gerencie múltiplos clientes com decisões rápidas sem perder contexto. Escale sua operação sem aumentar a equipe.",
      cor: "from-fuchsia-600/20 to-transparent",
      iconeCor: "text-fuchsia-400"
    },
    {
      icone: Users,
      titulo: "Agência de marketing",
      descricao: "Entregue mais valor aos clientes com relatórios automáticos e transparência que fideliza.",
      cor: "from-cyan-600/20 to-transparent",
      iconeCor: "text-cyan-400"
    },
    {
      icone: TrendingUp,
      titulo: "Time de growth",
      descricao: "Priorize testes e ações com base em dados. Reduza desperdício e aumente velocidade de decisão.",
      cor: "from-emerald-600/20 to-transparent",
      iconeCor: "text-emerald-400"
    },
    {
      icone: DollarSign,
      titulo: "Dono de empresa",
      descricao: "Tenha clareza sobre onde sua verba está performando e onde está sendo desperdiçada.",
      cor: "from-amber-600/20 to-transparent",
      iconeCor: "text-amber-400"
    },
  ];

  return (
    <section className="py-24 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-fuchsia-400 font-semibold uppercase tracking-wider mb-3">Para quem é</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Feito para quem vive de resultado
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {casos.map((c, i) => (
            <div key={i} className={`group rounded-2xl border border-white/[0.06] bg-gradient-to-br ${c.cor} p-6 hover:border-white/[0.12] transition-all`}>
              <div className="w-12 h-12 rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center mb-4">
                <c.icone size={22} className={c.iconeCor} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{c.titulo}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{c.descricao}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Seção Objeções (FAQ) ──────────────────────────────────────────────────────
function ObjecoesSection() {
  const [aberto, setAberto] = useState<number | null>(null);

  const perguntas = [
    {
      pergunta: "Preciso ser especialista para usar?",
      resposta: "Não. A Erizon foi projetada para ser intuitiva. Se você já gerencia campanhas no Meta Ads, vai conseguir usar a plataforma em minutos. A IA explica o raciocínio por trás de cada decisão."
    },
    {
      pergunta: "A IA toma decisões sozinha?",
      resposta: "Não. A Erizon é um copiloto, não um piloto automático. A IA analisa dados e sugere ações, mas você mantém controle total. Cada decisão é sua — a IA apenas acelera e embasa o processo."
    },
    {
      pergunta: "Serve para pequenas empresas?",
      resposta: "Sim. A Erizon é escalável. Desde quem gerencia R$1.000/mês até R$100.000+/mês. O que importa é a necessidade de clareza e decisões rápidas baseadas em dados."
    },
    {
      pergunta: "Substitui meu gestor de tráfego?",
      resposta: "Não. A Erizon potencializa seu gestor. Ela automatiza a análise de dados e libera tempo para estratégia criativa, testes e otimizações que exigem pensamento humano."
    },
    {
      pergunta: "Posso usar com minha agência?",
      resposta: "Sim. A Erizon é ideal para agências que gerenciam múltiplos clientes. Você pode segmentar por conta, gerar relatórios individuais e escalar a operação sem aumentar a equipe."
    },
    {
      pergunta: "Quais plataformas são suportadas?",
      resposta: "Atualmente integramos com Meta Ads (Facebook e Instagram). Google Ads e TikTok Ads estão em desenvolvimento. Entre na lista de espera para ser notificado do lançamento."
    },
  ];

  return (
    <section className="py-24 px-6 border-t border-white/[0.04]">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-fuchsia-400 font-semibold uppercase tracking-wider mb-3">Dúvidas</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Perguntas frequentes
          </h2>
        </div>

        <div className="space-y-3">
          {perguntas.map((item, i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <button
                onClick={() => setAberto(aberto === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-sm font-semibold text-white pr-4">{item.pergunta}</span>
                <ChevronRight
                  size={18}
                  className={`text-white/40 shrink-0 transition-transform ${aberto === i ? "rotate-90" : ""}`}
                />
              </button>
              {aberto === i && (
                <div className="px-5 pb-4">
                  <p className="text-sm text-white/50 leading-relaxed">{item.resposta}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Seção de Solução / Módulos ───────────────────────────────────────────────
function SolucaoSection() {
  const modulos = [
    {
      icone: TrendingUp,
      tag: "Decision Feed",
      titulo: "Decisões que você realmente usa",
      descricao: "Cada campanha recebe uma recomendação: escalar, pausar ou ajustar. Com o dado que justifica. Sem achismo.",
      href: "/decision-feed",
      cor: "from-fuchsia-600/20 to-transparent",
      iconeCor: "text-fuchsia-400"
    },
    {
      icone: AlertTriangle,
      tag: "Risk Radar",
      titulo: "Detecta problemas antes do cliente",
      descricao: "Campanhas zumbi, saturação de frequência, concentração de risco. Você vê antes que vire reclamação.",
      href: "/risk-radar",
      cor: "from-amber-600/15 to-transparent",
      iconeCor: "text-amber-400"
    },
    {
      icone: Users,
      tag: "Portal do cliente",
      titulo: "Relatório que o cliente entende",
      descricao: "Um link limpo com investimento, leads e CPL. Sem planilha. Transparência que fideliza.",
      href: "/portal",
      cor: "from-emerald-600/15 to-transparent",
      iconeCor: "text-emerald-400"
    },
    {
      icone: Brain,
      tag: "Copiloto IA",
      titulo: "Analista disponível 24h",
      descricao: "Pergunte o que quiser sobre suas campanhas. O Copiloto conhece seus dados e responde com contexto real.",
      href: "/copiloto",
      cor: "from-cyan-600/15 to-transparent",
      iconeCor: "text-cyan-400"
    },
  ];

  return (
    <section className="py-24 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-fuchsia-400 font-semibold uppercase tracking-wider mb-3">Solução</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Uma plataforma. Quatro superpoderes.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {modulos.map((m, i) => (
            <Link key={i} href={m.href}
              className={`group rounded-2xl border border-white/[0.06] bg-gradient-to-br ${m.cor} p-6 hover:border-white/[0.12] transition-all`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/30">{m.tag}</span>
                  <h3 className="text-lg font-bold text-white mt-1">{m.titulo}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center">
                  <m.icone size={18} className={m.iconeCor} />
                </div>
              </div>
              <p className="text-sm text-white/40 leading-relaxed mb-4">{m.descricao}</p>
              <div className="flex items-center gap-1 text-xs text-white/30 group-hover:text-white/60 transition-colors">
                Ver módulo <ChevronRight size={12} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Blog Preview ──────────────────────────────────────────────────────────────
interface BlogPostPreview {
  slug: string;
  title: string;
  description: string;
  category: string;
  publicado_em: string;
  read_time: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Estratégia": "text-purple-400",
  "Métricas": "text-amber-400",
  "Notícias": "text-orange-400",
  "Tendências": "text-cyan-400",
  "Automação": "text-emerald-400",
  "Geral": "text-white/40",
};

function BlogPreview() {
  const [posts, setPosts] = useState<BlogPostPreview[]>([]);

  useEffect(() => {
    fetch("/api/blog?limit=3")
      .then(r => r.json())
      .then(d => setPosts(d.posts ?? []))
      .catch(() => {});
  }, []);

  if (posts.length === 0) return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-48 rounded-2xl bg-white/[0.02] border border-white/[0.05] animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {posts.map(post => (
        <Link key={post.slug} href={`/blog/${post.slug}`}
          className="group flex flex-col gap-3 p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:border-fuchsia-500/25 hover:bg-fuchsia-500/[0.03] transition-all">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-semibold ${CATEGORY_COLORS[post.category] ?? "text-white/40"}`}>
              {post.category}
            </span>
            <span className="text-[10px] text-white/20">
              {new Date(post.publicado_em).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
            </span>
          </div>
          <h3 className="text-[13px] font-semibold text-white/80 leading-snug group-hover:text-white transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-[11px] text-white/30 leading-relaxed line-clamp-2 flex-1">{post.description}</p>
          <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
            <span className="text-[10px] text-white/20">{post.read_time}</span>
            <ArrowRight size={11} className="text-white/20 group-hover:text-fuchsia-400 transition-all" />
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── Página Principal ──────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/pulse");
    });
  }, [router]);

  return (
    <main className="min-h-screen bg-[#040406] text-white overflow-x-hidden">

      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/[0.04] bg-[#040406]/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <ErizonLogo size={28} />
          <span className="text-sm font-bold tracking-tight">Erizon</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-white/40">
          <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
          <a href="#solucao" className="hover:text-white transition-colors">Solução</a>
          <a href="#casos" className="hover:text-white transition-colors">Para quem é</a>
          <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden md:block text-sm text-white/40 hover:text-white transition-colors">
            Entrar
          </Link>
          <Link href="/signup"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-700 hover:from-fuchsia-500 hover:to-violet-600 text-sm font-semibold text-white transition-all shadow-lg shadow-fuchsia-500/20">
            Começar grátis <ArrowRight size={13} />
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-r from-fuchsia-600 to-violet-700/10 blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.02]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-300 text-xs font-semibold uppercase tracking-wider mb-8">
            <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse" />
            Central de decisão para marketing com IA
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight mb-6">
            Pare de decidir campanhas
            <br />
            <span className="text-white/20 line-through decoration-red-500/50">no achismo.</span>
            <br />
            <span className="bg-gradient-to-r from-fuchsia-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              Deixe a IA decidir.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-10">
            A Erizon usa inteligência artificial para analisar seus dados de marketing,
            identificar gargalos e mostrar o que{" "}
            <span className="text-white font-semibold">pausar, escalar ou testar</span> com mais segurança.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
            <Link href="/signup"
              className="flex items-center gap-2 px-7 py-4 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-700 hover:from-fuchsia-500 hover:to-violet-600 text-white text-base font-bold transition-all shadow-lg shadow-fuchsia-500/20 hover:-translate-y-0.5">
              Agendar demonstração <ArrowRight size={16} />
            </Link>
            <Link href="#como-funciona"
              className="flex items-center gap-2 px-7 py-4 rounded-2xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-base font-medium transition-all">
              <Play size={16} /> Ver como funciona
            </Link>
          </div>
          <p className="text-xs text-white/20">Sem cartão de crédito · Conecta em 2 minutos</p>
        </div>

        {/* Dashboard Preview */}
        <div className="relative mt-20 w-full max-w-5xl mx-auto">
          <div className="absolute -inset-4 bg-fuchsia-500/5 rounded-3xl blur-xl pointer-events-none" />
          <DashboardPreview />
        </div>
      </section>

      {/* MÉTRICAS RÁPIDAS */}
      <section id="resultados" className="py-24 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { n: 47, suf: "%", label: "Redução média de CPL", desc: "em 30 dias" },
            { n: 3, suf: "×", label: "Mais campanhas geridas", desc: "sem aumentar equipe" },
            { n: 2, suf: "min", label: "Para conectar Meta Ads", desc: "setup completo" },
            { n: 100, suf: "%", label: "Decisões auditáveis", desc: "sem caixa preta" },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
              <p className="text-4xl font-black text-white mb-1">
                <Counter to={s.n} suffix={s.suf} />
              </p>
              <p className="text-sm font-semibold text-white/70 mb-1">{s.label}</p>
              <p className="text-xs text-white/30">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROBLEMA */}
      <ProblemasSection />

      {/* SOLUÇÃO / MÓDULOS */}
      <SolucaoSection />

      {/* COMO FUNCIONA */}
      <ComoFuncionaSection />

      {/* ANTES E DEPOIS */}
      <AntesDepoisSection />

      {/* CASOS DE USO */}
      <section id="casos" className="py-24 px-6 border-t border-white/[0.04]">
        <CasosUsoSection />
      </section>

      {/* OBJEÇÕES / FAQ */}
      <ObjecoesSection />

      {/* BLOG */}
      <section className="py-24 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs text-fuchsia-400 font-semibold uppercase tracking-wider mb-2">Blog</p>
              <h2 className="text-3xl md:text-4xl font-black leading-tight">
                Aprenda com quem<br />
                <span className="text-fuchsia-400">vive tráfego pago</span>
              </h2>
            </div>
            <Link href="/blog" className="hidden md:flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white transition-colors">
              Ver todos os artigos <ArrowRight size={13} />
            </Link>
          </div>
          <BlogPreview />
          <div className="mt-8 text-center md:hidden">
            <Link href="/blog" className="text-[13px] text-white/40 hover:text-white transition-colors flex items-center justify-center gap-1.5">
              Ver todos os artigos <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-6 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="absolute inset-0 bg-fuchsia-500/5 rounded-3xl blur-3xl pointer-events-none" />
          <div className="relative">
            <p className="text-xs text-fuchsia-400 font-semibold uppercase tracking-wider mb-4">Comece agora</p>
            <h2 className="text-5xl md:text-6xl font-black mb-4 leading-tight">
              Seu próximo mês<br />começa hoje.
            </h2>
            <p className="text-white/40 text-lg mb-8 max-w-xl mx-auto">
              Conecte o Meta Ads em 2 minutos e veja as primeiras decisões da IA sobre suas campanhas.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
              <Link href="/signup"
                className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-700 hover:from-fuchsia-500 hover:to-violet-600 text-white text-base font-bold transition-all shadow-2xl shadow-fuchsia-500/20 hover:-translate-y-0.5">
                Criar conta grátis <ArrowRight size={18} />
              </Link>
              <Link href="/login"
                className="flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-base font-medium transition-all">
                Já tenho conta
              </Link>
            </div>
            <p className="text-xs text-white/20">
              Sem cartão de crédito · Setup em 2 minutos · Cancela quando quiser
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.04] px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ErizonLogo size={24} />
            <span className="text-sm font-bold">Erizon</span>
            <span className="text-white/20 text-sm">· AI Marketing Operating System</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-white/25">
            <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
            <Link href="/termos" className="hover:text-white transition-colors">Termos</Link>
            <Link href="/sobre" className="hover:text-white transition-colors">Sobre</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
