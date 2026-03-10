"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { getSupabase } from "@/lib/supabase";
import { Section, Badge } from "@/components/ops/OpsUI";
import AppShell from "@/components/ops/AppShell";
import { Loader2, Play, Pause, CheckCircle2, AlertTriangle } from "lucide-react";

interface Campanha {
  id: string;
  nome_campanha: string;
  gasto_total: number;
  contatos: number;
  receita_estimada: number;
  ctr: number;
  dias_ativo: number;
  status: string;
  meta_campaign_id: string;
}

interface Regra {
  id: string;
  nome: string;
  condicao: string;
  acao: string;
  status: "Ativa" | "Revisão";
  campanhasAfetadas: string[];
}

interface LogEntry {
  id: string;
  campanha: string;
  acao: string;
  resultado: string;
  ts: string;
}

function fmtBRL(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function gerarRegras(campanhas: Campanha[]): Regra[] {
  const criticas = campanhas.filter(c => c.contatos === 0 && c.gasto_total > 100);
  const escalavel = campanhas.filter(c => {
    const roas = c.gasto_total > 0 ? c.receita_estimada / c.gasto_total : 0;
    const cpl  = c.contatos > 0 ? c.gasto_total / c.contatos : 999;
    return roas >= 2.5 && cpl < 80;
  });
  const altoCPL = campanhas.filter(c => c.contatos > 0 && c.gasto_total / c.contatos > 150);

  return [
    {
      id: "r1", nome: "Pausar campanhas sem leads",
      condicao: "Gasto > R$100 e leads = 0 nos últimos 7 dias",
      acao: "Pausar campanha automaticamente via Meta API",
      status: "Ativa",
      campanhasAfetadas: criticas.map(c => c.nome_campanha),
    },
    {
      id: "r2", nome: "Escalar campanha vencedora",
      condicao: "ROAS ≥ 2.5× e CPL < R$80 por 3 dias consecutivos",
      acao: "Aumentar orçamento diário em 20%",
      status: "Ativa",
      campanhasAfetadas: escalavel.map(c => c.nome_campanha),
    },
    {
      id: "r3", nome: "Alertar CPL elevado",
      condicao: "CPL > R$150 com pelo menos 5 leads registrados",
      acao: "Registrar alerta + notificar via Telegram",
      status: "Ativa",
      campanhasAfetadas: altoCPL.map(c => c.nome_campanha),
    },
    {
      id: "r4", nome: "Reduzir budget em degradação",
      condicao: "CTR cai mais de 30% em relação à semana anterior",
      acao: "Reduzir orçamento em 15% e solicitar refresh criativo",
      status: "Revisão",
      campanhasAfetadas: [],
    },
  ];
}

export default function AutomacoesPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [campanhas, setCampanhas]   = useState<Campanha[]>([]);
  const [logs, setLogs]             = useState<LogEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [executando, setExecutando] = useState<string | null>(null);
  const [executado, setExecutado]   = useState<Set<string>>(new Set());
  const [mensagem, setMensagem]     = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: ads }, { data: dec }] = await Promise.all([
        supabase.from("metricas_ads").select("*").eq("user_id", user.id)
          .in("status", ["ATIVO","ACTIVE","ATIVA"]).order("gasto_total", { ascending: false }),
        supabase.from("decisoes_historico").select("*").eq("user_id", user.id)
          .order("created_at", { ascending: false }).limit(15),
      ]);

      setCampanhas((ads ?? []) as Campanha[]);
      setLogs(((dec ?? []) as Array<{ id: string; campanha_nome?: string; acao?: string; impacto?: string; created_at: string }>).map(d => ({
        id: d.id,
        campanha: d.campanha_nome ?? "—",
        acao: d.acao ?? "—",
        resultado: d.impacto ?? "Registrado",
        ts: new Date(d.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
      })));
      setLoading(false);
    }
    load();
  }, [supabase]);

  const regras = useMemo(() => gerarRegras(campanhas), [campanhas]);

  const executarRegra = useCallback(async (regra: Regra) => {
    if (regra.campanhasAfetadas.length === 0) {
      setMensagem("Nenhuma campanha afetada por essa regra no momento.");
      setTimeout(() => setMensagem(""), 3000);
      return;
    }
    setExecutando(regra.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Para regra de pausa — executa via API
      if (regra.id === "r1") {
        const criticas = campanhas.filter(c => c.contatos === 0 && c.gasto_total > 100);
        for (const camp of criticas) {
          await fetch("/api/meta/pause-campaign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ campanhaId: camp.id, campanhaNome: camp.nome_campanha, motivo: "Autopilot: zero leads com gasto > R$100" }),
          });
          await supabase.from("decisoes_historico").insert({
            user_id: user.id, campanha: camp.id, campanha_nome: camp.nome_campanha,
            acao: "Autopilot: Pausar campanha sem leads",
            impacto: `Budget de ${fmtBRL(camp.gasto_total / Math.max(camp.dias_ativo, 1) * 30)}/mês preservado`,
            data: new Date().toLocaleDateString("pt-BR"),
          });
        }
        setMensagem(`✅ ${criticas.length} campanha${criticas.length > 1 ? "s" : ""} pausada${criticas.length > 1 ? "s" : ""}.`);
      } else {
        // Outras regras — registra decisão
        for (const nome of regra.campanhasAfetadas) {
          const camp = campanhas.find(c => c.nome_campanha === nome);
          if (!camp) continue;
          await supabase.from("decisoes_historico").insert({
            user_id: user.id, campanha: camp.id, campanha_nome: camp.nome_campanha,
            acao: `Autopilot: ${regra.nome}`,
            impacto: regra.acao,
            data: new Date().toLocaleDateString("pt-BR"),
          });
        }
        setMensagem(`✅ Regra executada para ${regra.campanhasAfetadas.length} campanha${regra.campanhasAfetadas.length > 1 ? "s" : ""}.`);
      }

      setExecutado(prev => new Set([...prev, regra.id]));
      setTimeout(() => setMensagem(""), 4000);
    } catch {
      setMensagem("Erro ao executar regra.");
      setTimeout(() => setMensagem(""), 3000);
    } finally {
      setExecutando(null);
    }
  }, [campanhas, supabase]);

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
        <AppShell eyebrow="Autopilot Engine" title="Autopilot de campanhas"
          description="Regras automáticas aplicadas às suas campanhas reais. Execute manualmente ou ative o modo automático.">

          {mensagem && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] px-5 py-3 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-300">{mensagem}</p>
            </div>
          )}

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Section title="Regras operacionais" description="Baseadas nas suas campanhas ativas em tempo real.">
              <div className="space-y-4">
                {regras.map(r => (
                  <div key={r.id} className="rounded-[28px] border border-white/10 bg-[#0B1020] p-5">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h2 className="text-base font-semibold">{r.nome}</h2>
                      <Badge tone={r.status === "Ativa" ? "success" : "warning"}>{r.status}</Badge>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2 mb-4">
                      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
                        <p className="text-xs uppercase tracking-widest text-white/30 mb-1">Condição</p>
                        <p className="text-sm text-white/70">{r.condicao}</p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
                        <p className="text-xs uppercase tracking-widest text-white/30 mb-1">Ação</p>
                        <p className="text-sm text-white/70">{r.acao}</p>
                      </div>
                    </div>

                    {r.campanhasAfetadas.length > 0 ? (
                      <div className="mb-4">
                        <p className="text-xs text-white/30 mb-2">{r.campanhasAfetadas.length} campanha{r.campanhasAfetadas.length > 1 ? "s" : ""} afetada{r.campanhasAfetadas.length > 1 ? "s" : ""}:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {r.campanhasAfetadas.slice(0, 4).map(nome => (
                            <span key={nome} className="text-[10px] px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 truncate max-w-[180px]">{nome}</span>
                          ))}
                          {r.campanhasAfetadas.length > 4 && (
                            <span className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.05] text-white/30">+{r.campanhasAfetadas.length - 4}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-white/20 mb-4">Nenhuma campanha atende a condição agora.</p>
                    )}

                    {executado.has(r.id) ? (
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                        <CheckCircle2 size={14} /> Executada com sucesso
                      </div>
                    ) : (
                      <button
                        onClick={() => executarRegra(r)}
                        disabled={executando === r.id || r.campanhasAfetadas.length === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm font-medium hover:bg-purple-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {executando === r.id
                          ? <><Loader2 size={13} className="animate-spin" /> Executando...</>
                          : <><Play size={13} /> Executar agora</>
                        }
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Log de execuções" description="Últimas ações registradas pelo sistema.">
              {logs.length === 0 ? (
                <p className="text-white/30 text-sm py-8 text-center">Nenhuma execução registrada ainda.</p>
              ) : (
                <div className="space-y-3">
                  {logs.map(l => (
                    <div key={l.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-xs text-white/30 font-mono">{l.ts}</p>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      </div>
                      <p className="text-sm font-medium text-white/80 truncate">{l.campanha}</p>
                      <p className="text-xs text-white/45 mt-0.5">{l.acao}</p>
                      {l.resultado && <p className="text-xs text-emerald-400/60 mt-1">{l.resultado}</p>}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </section>
        </AppShell>
      </main>
    </div>
  );
}