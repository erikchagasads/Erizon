"use client";

// src/components/OnboardingChecklist.tsx
// Checklist flutuante que aparece na primeira semana de uso.
// Persiste estado no Supabase (user_configs.onboarding_steps).

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  CheckCircle2, ChevronDown, ChevronUp, X,
  Zap, SlidersHorizontal, BarChart3, Bell, Users,
} from "lucide-react";

interface Step {
  id: string;
  icon: React.ElementType;
  titulo: string;
  desc: string;
  href: string;
}

const STEPS: Step[] = [
  {
    id: "bm_conectado",
    icon: BarChart3,
    titulo: "Conectar Meta Ads",
    desc: "Adicione seu Access Token e Ad Account ID em Settings.",
    href: "/settings",
  },
  {
    id: "engine_configurado",
    icon: SlidersHorizontal,
    titulo: "Configurar o Engine",
    desc: "Informe ticket médio e taxa de conversão em Settings → Engine.",
    href: "/settings",
  },
  {
    id: "campanha_sincronizada",
    icon: Zap,
    titulo: "Sincronizar campanhas",
    desc: "Clique em Sincronizar na página Dados para carregar sua conta.",
    href: "/analytics",
  },
  {
    id: "telegram_configurado",
    icon: Bell,
    titulo: "Ativar alertas Telegram",
    desc: "Configure o Chat ID em Settings → Alertas.",
    href: "/settings",
  },
  {
    id: "primeiro_pulse",
    icon: Users,
    titulo: "Ver seu primeiro Pulse",
    desc: "Acesse o Pulse e leia a análise estratégica da sua conta.",
    href: "/pulse",
  },
];

export default function OnboardingChecklist() {
  const pathname = usePathname();
  const [concluidos, setConcluidos] = useState<Set<string>>(new Set());
  const [aberto, setAberto]         = useState(true);
  const [fechado, setFechado]       = useState(false);
  const [carregou, setCarregou]     = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Persiste novos steps concluídos no Supabase
  const salvarSteps = useCallback(async (steps: Set<string>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("user_configs").upsert(
        { user_id: user.id, onboarding_steps: Array.from(steps) },
        { onConflict: "user_id" }
      );
    } catch {}
  }, [supabase]);

  // Carga inicial
  useEffect(() => {
    async function carregar() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setCarregou(true); return; }

        const { data } = await supabase
          .from("user_configs")
          .select("onboarding_steps, onboarding_fechado, ticket_medio_global, telegram_chat_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data?.onboarding_fechado) { setFechado(true); setCarregou(true); return; }

        const salvos = new Set<string>(data?.onboarding_steps ?? []);

        // Auto-detecta BM e campanhas
        const [{ data: bm }, { data: ads }] = await Promise.all([
          supabase.from("bm_accounts").select("id").eq("user_id", user.id).limit(1),
          supabase.from("metricas_ads").select("id").eq("user_id", user.id).limit(1),
        ]);

        if (bm && bm.length > 0)     salvos.add("bm_conectado");
        if (data?.ticket_medio_global) salvos.add("engine_configurado");
        if (ads && ads.length > 0)   salvos.add("campanha_sincronizada");
        if (data?.telegram_chat_id)  salvos.add("telegram_configurado");

        setConcluidos(salvos);
        await salvarSteps(salvos);
      } catch {}
      setCarregou(true);
    }
    carregar();
  }, [supabase, salvarSteps]);

  // Detecta visita ao /pulse → marca primeiro_pulse
  useEffect(() => {
    if (!carregou || fechado) return;
    if (pathname === "/pulse" && !concluidos.has("primeiro_pulse")) {
      const novos = new Set(concluidos);
      novos.add("primeiro_pulse");
      queueMicrotask(() => {
        setConcluidos(novos);
        void salvarSteps(novos);
      });
    }
  }, [pathname, carregou, fechado, concluidos, salvarSteps]);

  async function marcarConcluido(id: string) {
    const novos = new Set(concluidos);
    novos.add(id);
    setConcluidos(novos);
    await salvarSteps(novos);
  }

  async function fecharDefinitivamente() {
    setFechado(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("user_configs").upsert(
        { user_id: user.id, onboarding_fechado: true },
        { onConflict: "user_id" }
      );
    } catch {}
  }

  // Não renderiza enquanto carrega ou se fechado manualmente
  if (!carregou || fechado) return null;

  const total    = STEPS.length;
  const feitos   = STEPS.filter(s => concluidos.has(s.id)).length;
  const pct      = Math.round((feitos / total) * 100);
  const completo = feitos >= total;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 shadow-2xl">
      <div className={`border rounded-[20px] overflow-hidden transition-all duration-500 ${
        completo
          ? "bg-[#0d1a12] border-emerald-500/20"
          : "bg-[#111113] border-white/[0.09]"
      }`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${completo ? "border-emerald-500/10" : "border-white/[0.05]"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
              completo
                ? "bg-emerald-500/15 border border-emerald-500/25"
                : "bg-purple-600/15 border border-purple-500/25"
            }`}>
              {completo
                ? <CheckCircle2 size={13} className="text-emerald-400" />
                : <Zap size={13} className="text-purple-400" />
              }
            </div>
            <div>
              <p className="text-[12px] font-bold text-white">
                {completo ? "Setup concluído" : "Primeiros passos"}
              </p>
              <p className={`text-[10px] ${completo ? "text-emerald-400/50" : "text-white/25"}`}>
                {completo ? "Tudo configurado ✓" : `${feitos}/${total} concluídos · ${pct}%`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!completo && (
              <button onClick={() => setAberto(v => !v)}
                className="p-1.5 rounded-lg text-white/25 hover:text-white transition-colors">
                {aberto ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            )}
            <button onClick={fecharDefinitivamente}
              className="p-1.5 rounded-lg text-white/15 hover:text-white/40 transition-colors" title="Fechar">
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Barra de progresso */}
        {!completo && (
          <div className="px-5 pt-3">
            <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Steps */}
        {(aberto || completo) && (
          <div className="px-4 py-3 space-y-1">
            {STEPS.map(step => {
              const feito = completo || concluidos.has(step.id);
              const Icon  = step.icon;
              return (
                <div key={step.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                    feito ? "opacity-50" : "hover:bg-white/[0.03]"
                  }`}>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                    feito
                      ? "bg-emerald-500/10 border border-emerald-500/20"
                      : "bg-white/[0.03] border border-white/[0.07]"
                  }`}>
                    {feito
                      ? <CheckCircle2 size={11} className="text-emerald-400" />
                      : <Icon size={11} className="text-white/30" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-semibold truncate transition-all ${
                      feito ? "line-through text-white/20" : "text-white/80"
                    }`}>
                      {step.titulo}
                    </p>
                  </div>
                  {!feito && (
                    <a href={step.href}
                      onClick={() => marcarConcluido(step.id)}
                      className="shrink-0 text-[10px] font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                      Ir →
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}