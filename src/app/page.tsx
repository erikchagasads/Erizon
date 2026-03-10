
import Link from "next/link";
import { ArrowRight, BrainCircuit, Factory, Radar, WalletCards } from "lucide-react";
import { decisions, networkInsights, stats, formatMoney } from "@/lib/erizon-operating-system";

const pillars = [
  {
    title: "Autopilot por lucro real",
    desc: "Escala e corta campanhas usando Profit ROAS, frequência e margem líquida.",
    icon: BrainCircuit,
    href: "/automacoes",
  },
  {
    title: "Risk Radar",
    desc: "Encontra campanhas zumbis, saturação e concentração de risco antes do cliente reclamar.",
    icon: Radar,
    href: "/risk-radar",
  },
  {
    title: "Creative Factory",
    desc: "Transforma criativos vencedores em blueprints e novos testes de escala.",
    icon: Factory,
    href: "/creative-lab",
  },
  {
    title: "Portal do cliente",
    desc: "Entrega lucro, investimento e linha do tempo em um link limpo para o cliente final.",
    icon: WalletCards,
    href: "/portal",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#05070F] px-4 py-8 text-[#F5F7FF] lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(108,75,255,0.22),_transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-8 lg:p-10">
          <p className="text-xs uppercase tracking-[0.35em] text-[#2FFFCB]">ERIZON 10/10</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight lg:text-6xl">
            A IA que analisa, decide e executa campanhas lucrativas.
          </h1>
          <p className="mt-5 max-w-3xl text-base text-white/72 lg:text-lg">
            A Erizon deixa de ser dashboard. Agora ela opera como sistema de decisão com Profit Brain, Autopilot,
            Creative Factory e Network Intelligence para gestores de tráfego no Brasil.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/crm/dashboard" className="inline-flex items-center gap-2 rounded-2xl bg-[#6C4BFF] px-5 py-3 font-medium text-white">
              Abrir produto
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/decision-feed" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-5 py-3 text-white/85">
              Ver Decision Feed
            </Link>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-white/60">Receita hoje</p>
              <p className="mt-3 text-3xl font-semibold">{formatMoney(stats.receitaHoje)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-white/60">Investimento hoje</p>
              <p className="mt-3 text-3xl font-semibold">{formatMoney(stats.investimentoHoje)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-white/60">Lucro hoje</p>
              <p className="mt-3 text-3xl font-semibold">{formatMoney(stats.lucroHoje)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-white/60">Decisões críticas</p>
              <p className="mt-3 text-3xl font-semibold">{stats.decisoesCriticas}</p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Decision Feed</h2>
              <Link href="/decision-feed" className="text-sm text-[#2FFFCB]">Abrir módulo</Link>
            </div>
            <div className="mt-4 space-y-4">
              {decisions.slice(0, 3).map((decision) => (
                <div key={decision.id} className="rounded-3xl border border-white/10 bg-[#0B1020] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-white/55">{decision.cliente}</p>
                      <h3 className="mt-1 text-lg font-medium">{decision.titulo}</h3>
                    </div>
                    <span className="rounded-full bg-[#6C4BFF]/15 px-3 py-1 text-xs text-[#C7B9FF]">{decision.confianca}% confiança</span>
                  </div>
                  <p className="mt-3 text-sm text-white/70">{decision.motivo}</p>
                  <p className="mt-2 text-sm text-[#2FFFCB]">{decision.impacto}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Network Intelligence</h2>
            <div className="mt-4 space-y-4">
              {networkInsights.map((item) => (
                <div key={item.id} className="rounded-3xl border border-white/10 bg-[#0B1020] p-4">
                  <p className="text-sm text-[#2FFFCB]">{item.nicho}</p>
                  <h3 className="mt-2 font-medium">{item.recorte}</h3>
                  <p className="mt-2 text-sm text-white/70">{item.insight}</p>
                  <p className="mt-2 text-sm text-white">{item.ganho}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Link key={pillar.title} href={pillar.href} className="rounded-[28px] border border-white/10 bg-white/5 p-6 transition hover:border-[#6C4BFF]/50 hover:bg-white/7">
                <Icon className="h-6 w-6 text-[#9B7CFF]" />
                <h3 className="mt-4 text-lg font-semibold">{pillar.title}</h3>
                <p className="mt-2 text-sm text-white/68">{pillar.desc}</p>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
