"use client";

import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { getSupabase } from "@/lib/supabase";
import { MetricCard, Section, Badge } from "@/components/ops/OpsUI";
import AppShell from "@/components/ops/AppShell";

interface Campanha {
  id: string;
  nome_campanha: string;
  status: string;
  gasto_total: number;
  contatos: number;
  receita_estimada: number;
  orcamento: number;
  ctr: number;
  cpm: number;
  cpc: number;
  impressoes: number;
  dias_ativo: number;
  data_atualizacao: string;
}

interface Decisao {
  id: string;
  campanha_nome: string;
  acao: string;
  impacto: string;
  created_at: string;
}

function fmtBRL(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function calcScore(c: Campanha): number {
  if (c.gasto_total === 0) return 0;
  const roas = c.receita_estimada / c.gasto_total;
  const cpl  = c.contatos > 0 ? c.gasto_total / c.contatos : 999;
  let score  = 50;
  if (roas >= 3) score += 25; else if (roas >= 2) score += 10; else if (roas < 1) score -= 20;
  if (cpl < 30)  score += 15; else if (cpl < 60) score += 5; else if (cpl > 120) score -= 15;
  if (c.ctr > 2) score += 5; else if (c.ctr < 0.8) score -= 5;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function statusTone(score: number): "success" | "danger" | "warning" | "default" {
  if (score >= 70) return "success";
  if (score < 40)  return "danger";
  if (score < 60)  return "warning";
  return "default";
}

function statusLabel(score: number, status: string): string {
  if (!["ATIVO","ACTIVE","ATIVA"].includes(status)) return "Pausada";
  if (score >= 70) return "Escalando";
  if (score < 40)  return "Em risco";
  return "Estável";
}

export default function DashboardPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [decisoes, setDecisoes]   = useState<Decisao[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: ads }, { data: dec }] = await Promise.all([
        supabase.from("metricas_ads").select("*").eq("user_id", user.id)
          .in("status", ["ATIVO","ACTIVE","ATIVA"])
          .order("gasto_total", { ascending: false }).limit(20),
        supabase.from("decisoes_historico").select("*").eq("user_id", user.id)
          .order("created_at", { ascending: false }).limit(10),
      ]);

      setCampanhas((ads ?? []) as Campanha[]);
      setDecisoes((dec ?? []) as Decisao[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const stats = useMemo(() => {
    const totalInvest  = campanhas.reduce((s, c) => s + c.gasto_total, 0);
    const totalReceita = campanhas.reduce((s, c) => s + c.receita_estimada, 0);
    const totalLeads   = campanhas.reduce((s, c) => s + c.contatos, 0);
    const lucro        = totalReceita - totalInvest;
    const roas         = totalInvest > 0 ? totalReceita / totalInvest : 0;
    return { totalInvest, totalReceita, totalLeads, lucro, roas };
  }, [campanhas]);

  if (loading) return (
    <div className="flex min-h-screen bg-[#060609] text-white">
      <Sidebar />
      <main className="ml-[60px] flex-1 flex items-center justify-center text-white/30">Carregando...</main>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#060609] text-white">
      <Sidebar />
      <main className="ml-[60px] flex-1">
        <AppShell eyebrow="Dashboard OS" title="Visão operacional da conta"
          description="Performance real das campanhas ativas, decisões registradas e saúde da operação.">

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Investimento total"  value={fmtBRL(stats.totalInvest)}  hint={`${campanhas.length} campanhas ativas`} />
            <MetricCard label="Receita estimada"    value={fmtBRL(stats.totalReceita)} hint="Baseado em conversões Meta" />
            <MetricCard label="Lucro estimado"      value={fmtBRL(stats.lucro)}        hint="Receita − Investimento" />
            <MetricCard label="ROAS médio"          value={`${stats.roas.toFixed(2)}×`} hint="Retorno sobre investimento" />
          </section>

          <Section title="Campanhas ativas" description="Ranqueadas por investimento. Score calculado em tempo real.">
            {campanhas.length === 0 ? (
              <p className="text-white/30 text-sm py-8 text-center">Nenhuma campanha ativa. Sincronize em Dados.</p>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {campanhas.map(c => {
                  const score = calcScore(c);
                  const roas  = c.gasto_total > 0 ? c.receita_estimada / c.gasto_total : 0;
                  const cpl   = c.contatos > 0 ? c.gasto_total / c.contatos : 0;
                  return (
                    <div key={c.id} className="rounded-3xl border border-white/10 bg-[#0B1020] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-white/55">{c.dias_ativo}d ativo</p>
                          <h3 className="mt-1 text-base font-semibold leading-snug">{c.nome_campanha}</h3>
                        </div>
                        <Badge tone={statusTone(score)}>{statusLabel(score, c.status)}</Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-4 gap-3">
                        <div><p className="text-xs text-white/50">Score</p><p className="mt-1 text-xl font-semibold">{score}</p></div>
                        <div><p className="text-xs text-white/50">ROAS</p><p className="mt-1 text-xl font-semibold">{roas.toFixed(2)}×</p></div>
                        <div><p className="text-xs text-white/50">CPL</p><p className="mt-1 text-xl font-semibold">{cpl > 0 ? fmtBRL(cpl) : "—"}</p></div>
                        <div><p className="text-xs text-white/50">CTR</p><p className="mt-1 text-xl font-semibold">{c.ctr > 0 ? `${c.ctr.toFixed(2)}%` : "—"}</p></div>
                        <div><p className="text-xs text-white/50">Gasto</p><p className="mt-1 text-base font-semibold">{fmtBRL(c.gasto_total)}</p></div>
                        <div><p className="text-xs text-white/50">Leads</p><p className="mt-1 text-base font-semibold">{c.contatos}</p></div>
                        <div><p className="text-xs text-white/50">CPM</p><p className="mt-1 text-base font-semibold">{c.cpm > 0 ? fmtBRL(c.cpm) : "—"}</p></div>
                        <div><p className="text-xs text-white/50">Impressões</p><p className="mt-1 text-base font-semibold">{c.impressoes > 0 ? c.impressoes.toLocaleString("pt-BR") : "—"}</p></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          <Section title="Histórico de decisões" description="Últimas ações registradas pelo gestor ou pela IA.">
            {decisoes.length === 0 ? (
              <p className="text-white/30 text-sm py-8 text-center">Nenhuma decisão registrada ainda.</p>
            ) : (
              <div className="space-y-3">
                {decisoes.map(d => (
                  <div key={d.id} className="rounded-2xl border border-white/10 bg-[#0B1020] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-white/55">{d.campanha_nome ?? "—"}</p>
                      <p className="text-xs text-white/30">{new Date(d.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <p className="mt-1 font-medium text-sm">{d.acao}</p>
                    {d.impacto && <p className="mt-1 text-sm text-emerald-400/70">{d.impacto}</p>}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </AppShell>
      </main>
    </div>
  );
}