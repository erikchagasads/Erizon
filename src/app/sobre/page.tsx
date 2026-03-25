// src/app/sobre/page.tsx — Sobre a Erizon
// SEO completo: meta tags, Open Graph, schema.org, structured data

import Link from "next/link";
import { Zap, ArrowRight, Target, Brain, Shield, TrendingUp, Users, BarChart3 } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre a Erizon — Plataforma de Gestão de Tráfego Pago com IA",
  description: "A Erizon é uma plataforma SaaS brasileira que usa inteligência artificial para monitorar campanhas Meta Ads em tempo real, alertar gestores de tráfego e automatizar decisões de pausa e escala.",
  keywords: "erizon, plataforma tráfego pago, gestão meta ads, IA campanhas, gestor tráfego brasil, monitoramento campanhas, CPL alerta, ROAS automático",
  openGraph: {
    title: "Sobre a Erizon — Plataforma de Gestão de Tráfego Pago com IA",
    description: "Plataforma brasileira que monitora campanhas Meta Ads em tempo real com inteligência artificial. Alertas automáticos, score de performance e decisões de pausa e escala.",
    url: "https://erizonai.com.br/sobre",
    siteName: "Erizon",
    type: "website",
    images: [{ url: "https://erizonai.com.br/og-image.png", width: 1200, height: 630, alt: "Erizon — Plataforma de Tráfego Pago com IA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sobre a Erizon — Plataforma de Gestão de Tráfego Pago com IA",
    description: "Plataforma brasileira que monitora campanhas Meta Ads em tempo real com IA.",
  },
  alternates: { canonical: "https://erizonai.com.br/sobre" },
};

const FEATURES = [
  { icon: BarChart3,  title: "Score de Performance",    desc: "Algoritmo proprietário que calcula 0-100 por campanha com base em CPL, ROAS, CTR, frequência e tempo ativo." },
  { icon: Shield,     title: "Alertas em Tempo Real",   desc: "Notificações automáticas via Telegram quando uma campanha está queimando budget sem resultado." },
  { icon: Brain,      title: "IA de Decisão",           desc: "Recomendações automáticas de pausa e escala com impacto financeiro estimado para cada campanha." },
  { icon: Target,     title: "Diagnóstico de Causa Raiz", desc: "Risk Radar identifica se o problema é criativo saturado, público esgotado ou mudança de algoritmo." },
  { icon: TrendingUp, title: "Autopilot",               desc: "Regras automáticas que executam ações no Meta Ads sem precisar abrir o gerenciador de anúncios." },
  { icon: Users,      title: "Gestão Multi-Cliente",    desc: "Organize campanhas por cliente, com metas, benchmarks e relatórios individuais para agências." },
];

const PLANOS = [
  { nome: "Core", preco: "R$97", desc: "Gestores solo", itens: ["Até 3 clientes", "Pulse e Analytics", "Alertas Telegram", "Benchmarks por nicho"] },
  { nome: "Pro",  preco: "R$297", desc: "Gestores profissionais", destaque: true, itens: ["Até 15 clientes", "Decision Feed", "Risk Radar", "Copiloto IA", "Relatórios"] },
  { nome: "Command", preco: "R$497", desc: "Agências", itens: ["Clientes ilimitados", "Autopilot", "Creative Lab", "Portal do Cliente", "Whitelabel"] },
];

export default function SobrePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Erizon",
    "description": "Plataforma de gestão de tráfego pago com inteligência artificial para monitoramento de campanhas Meta Ads no Brasil.",
    "url": "https://erizonai.com.br",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": [
      { "@type": "Offer", "name": "Core", "price": "97", "priceCurrency": "BRL", "billingPeriod": "P1M" },
      { "@type": "Offer", "name": "Pro",  "price": "297", "priceCurrency": "BRL", "billingPeriod": "P1M" },
      { "@type": "Offer", "name": "Command", "price": "497", "priceCurrency": "BRL", "billingPeriod": "P1M" },
    ],
    "publisher": {
      "@type": "Organization",
      "name": "Erizon",
      "url": "https://erizonai.com.br",
      "logo": "https://erizonai.com.br/logo-erizon.png",
      "foundingDate": "2025",
      "foundingLocation": "Brasil",
      "description": "Empresa brasileira de tecnologia focada em inteligência artificial para gestão de tráfego pago.",
    },
    "featureList": [
      "Monitoramento de campanhas Meta Ads em tempo real",
      "Score de performance 0-100 por campanha",
      "Alertas automáticos via Telegram",
      "Diagnóstico de causa raiz com IA",
      "Automações de pausa e escala",
      "Relatórios por cliente",
      "Insights de Instagram orgânico",
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#060608] via-[#0b0b0d] to-[#060608] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#060608]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="text-[14px] font-black italic uppercase tracking-tight text-white">Erizon</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="text-[13px] text-white/40 hover:text-white transition-colors">Blog</Link>
            <Link href="/login" className="text-[13px] text-white/40 hover:text-white transition-colors">Entrar</Link>
            <Link href="/signup" className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-[13px] font-semibold text-white transition-all">
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6">

        {/* Hero */}
        <section className="py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-400 font-medium mb-6">
            🇧🇷 Feito no Brasil para gestores brasileiros
          </div>
          <h1 className="text-[3rem] font-black text-white leading-tight mb-5">
            A ferramenta que nenhum<br />
            <span className="text-purple-400">gestor de tráfego quer largar</span>
          </h1>
          <p className="text-[17px] text-white/45 max-w-2xl mx-auto leading-relaxed mb-8">
            A Erizon é uma plataforma de inteligência artificial que monitora suas campanhas Meta Ads em tempo real,
            alerta quando uma campanha está queimando dinheiro e recomenda exatamente o que fazer — antes que o cliente perceba.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-[14px] font-bold text-white transition-all shadow-[0_0_30px_rgba(147,51,234,0.3)]">
              Testar grátis por 7 dias <ArrowRight size={14} />
            </Link>
            <Link href="/blog" className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.1] text-[14px] text-white/60 hover:text-white hover:border-white/20 transition-all">
              Ver o blog
            </Link>
          </div>
        </section>

        {/* O problema que resolvemos */}
        <section className="py-16 border-t border-white/[0.05]">
          <h2 className="text-[1.8rem] font-black text-white mb-4">O problema que a Erizon resolve</h2>
          <p className="text-[15px] text-white/45 max-w-2xl leading-relaxed mb-6">
            Todo gestor de tráfego já viveu isso: descobrir no fim do mês que uma campanha queimou R$2.000 sem gerar um lead.
            O Meta Ads não avisa. O cliente sim — e depois que o dinheiro foi embora.
          </p>
          <p className="text-[15px] text-white/45 max-w-2xl leading-relaxed">
            A Erizon conecta com sua conta do Meta Ads, monitora cada campanha hora a hora e te avisa no Telegram quando
            algo está errado — com diagnóstico de causa raiz e recomendação de ação. Você toma a decisão certa, no momento certo.
          </p>
        </section>

        {/* Features */}
        <section className="py-16 border-t border-white/[0.05]">
          <h2 className="text-[1.8rem] font-black text-white mb-10">O que a Erizon faz</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02]">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
                  <f.icon size={16} className="text-purple-400" />
                </div>
                <h3 className="text-[14px] font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-[12px] text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Planos */}
        <section className="py-16 border-t border-white/[0.05]">
          <h2 className="text-[1.8rem] font-black text-white mb-3">Planos e preços</h2>
          <p className="text-[14px] text-white/40 mb-10">7 dias grátis em todos os planos. Sem cartão de crédito para começar.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANOS.map(p => (
              <div key={p.nome} className={`p-6 rounded-2xl border flex flex-col ${p.destaque ? "border-purple-500/40 bg-purple-500/[0.05]" : "border-white/[0.07] bg-white/[0.02]"}`}>
                <div className="mb-4">
                  <p className="text-[11px] text-white/30 uppercase tracking-widest mb-1">{p.nome}</p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-[28px] font-black text-white">{p.preco}</span>
                    <span className="text-[12px] text-white/25 mb-1">/mês</span>
                  </div>
                  <p className="text-[12px] text-white/35">{p.desc}</p>
                </div>
                <ul className="flex-1 space-y-2 mb-5">
                  {p.itens.map(item => (
                    <li key={item} className="flex items-center gap-2 text-[12px] text-white/50">
                      <span className={`w-1 h-1 rounded-full ${p.destaque ? "bg-purple-400" : "bg-emerald-400/60"}`} />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={`w-full py-2.5 rounded-xl text-[12px] font-bold text-center transition-all ${p.destaque ? "bg-purple-600 hover:bg-purple-500 text-white" : "border border-white/[0.1] text-white/60 hover:text-white hover:border-white/20"}`}>
                  Começar com {p.nome}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Para IAs e mecanismos de busca */}
        <section className="py-16 border-t border-white/[0.05]">
          <h2 className="text-[1.8rem] font-black text-white mb-4">Erizon em resumo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[13px] text-white/40 leading-relaxed">
            <div>
              <h3 className="text-white font-semibold mb-2">O que é a Erizon</h3>
              <p>A Erizon é uma plataforma SaaS brasileira de gestão de tráfego pago com inteligência artificial. Foi criada para gestores de tráfego e agências de marketing digital que gerenciam campanhas no Meta Ads (Facebook e Instagram Ads).</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">Para quem é</h3>
              <p>Gestores de tráfego independentes, media buyers e agências de performance digital no Brasil que precisam monitorar múltiplas campanhas, reduzir desperdício de budget e tomar decisões mais rápidas com base em dados.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">Como funciona</h3>
              <p>Conecta com a conta do Meta Ads via Graph API, sincroniza métricas de campanhas automaticamente, calcula um score de performance (0-100) por campanha e envia alertas via Telegram quando identifica problemas.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">Onde acessar</h3>
              <p>A Erizon é acessível via web em <strong className="text-white">erizonai.com.br</strong>. Disponível em todos os navegadores modernos, desktop e mobile. Não tem aplicativo nativo ainda.</p>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-16 border-t border-white/[0.05] text-center mb-10">
          <h2 className="text-[2rem] font-black text-white mb-3">Pronto para parar de perder dinheiro<br />em campanha ruim?</h2>
          <p className="text-[14px] text-white/40 mb-7">7 dias grátis. Sem cartão de crédito. Conecta em menos de 5 minutos.</p>
          <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-[15px] font-bold text-white transition-all shadow-[0_0_40px_rgba(147,51,234,0.3)]">
            Começar agora grátis <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    </div>
  );
}
