"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  Zap,
  SlidersHorizontal,
  BarChart3,
  Users,
  Smartphone,
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
    desc: "Adicione seu token e account ID em Settings.",
    href: "/settings/integracoes",
  },
  {
    id: "engine_configurado",
    icon: SlidersHorizontal,
    titulo: "Configurar o engine",
    desc: "Defina ticket medio e taxa de conversao.",
    href: "/onboarding",
  },
  {
    id: "campanha_sincronizada",
    icon: Zap,
    titulo: "Sincronizar campanhas",
    desc: "Traga suas campanhas para destravar o Daily Digest.",
    href: "/analytics",
  },
  {
    id: "push_configurado",
    icon: Smartphone,
    titulo: "Ativar push",
    desc: "Habilite o push do navegador para criar o habito diario.",
    href: "/settings/notificacoes",
  },
  {
    id: "primeiro_pulse",
    icon: Users,
    titulo: "Abrir o primeiro Pulse",
    desc: "Veja o cockpit com benchmark, resumo e decisoes.",
    href: "/pulse",
  },
];

export default function OnboardingChecklist() {
  const pathname = usePathname();
  const [concluidos, setConcluidos] = useState<Set<string>>(new Set());
  const [aberto, setAberto] = useState(true);
  const [fechado, setFechado] = useState(false);
  const [carregou, setCarregou] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const salvarSteps = useCallback(async (steps: Set<string>) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("user_configs").upsert(
        { user_id: user.id, onboarding_steps: Array.from(steps) },
        { onConflict: "user_id" }
      );
    } catch {}
  }, [supabase]);

  useEffect(() => {
    async function carregar() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setCarregou(true);
          return;
        }

        const { data } = await supabase
          .from("user_configs")
          .select("onboarding_steps, onboarding_fechado, ticket_medio_global, telegram_chat_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data?.onboarding_fechado) {
          setFechado(true);
          setCarregou(true);
          return;
        }

        const salvos = new Set<string>(data?.onboarding_steps ?? []);
        const [{ data: bm }, { data: ads }] = await Promise.all([
          supabase.from("bm_accounts").select("id").eq("user_id", user.id).limit(1),
          supabase.from("metricas_ads").select("id").eq("user_id", user.id).limit(1),
        ]);

        if (bm && bm.length > 0) salvos.add("bm_conectado");
        if (data?.ticket_medio_global) salvos.add("engine_configurado");
        if (ads && ads.length > 0) salvos.add("campanha_sincronizada");
        if (data?.telegram_chat_id) salvos.add("push_configurado");
        if (typeof window !== "undefined" && window.localStorage.getItem("erizon_onboarding_push") === "done") {
          salvos.add("push_configurado");
        }

        setConcluidos(salvos);
        await salvarSteps(salvos);
      } catch {}
      setCarregou(true);
    }

    carregar();
  }, [salvarSteps, supabase]);

  useEffect(() => {
    if (!carregou || fechado) return;
    if (pathname === "/pulse" && !concluidos.has("primeiro_pulse")) {
      const proximos = new Set(concluidos);
      proximos.add("primeiro_pulse");
      queueMicrotask(() => {
        setConcluidos(proximos);
        void salvarSteps(proximos);
      });
    }
  }, [pathname, carregou, fechado, concluidos, salvarSteps]);

  async function marcarConcluido(id: string) {
    const proximos = new Set(concluidos);
    proximos.add(id);
    setConcluidos(proximos);
    await salvarSteps(proximos);
  }

  async function fecharDefinitivamente() {
    setFechado(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("user_configs").upsert(
        { user_id: user.id, onboarding_fechado: true },
        { onConflict: "user_id" }
      );
    } catch {}
  }

  if (!carregou || fechado) return null;

  const total = STEPS.length;
  const feitos = STEPS.filter((step) => concluidos.has(step.id)).length;
  const pct = Math.round((feitos / total) * 100);
  const completo = feitos >= total;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 shadow-2xl">
      <div className={`overflow-hidden rounded-[20px] border transition-all duration-500 ${
        completo ? "border-emerald-500/20 bg-[#0d1a12]" : "border-white/[0.09] bg-[#111113]"
      }`}>
        <div className={`flex items-center justify-between border-b px-5 py-4 ${completo ? "border-emerald-500/10" : "border-white/[0.05]"}`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${
              completo ? "border border-emerald-500/25 bg-emerald-500/15" : "border border-purple-500/25 bg-purple-600/15"
            }`}>
              {completo ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Zap size={13} className="text-purple-400" />}
            </div>
            <div>
              <p className="text-[12px] font-bold text-white">{completo ? "Setup concluido" : "Primeiros passos"}</p>
              <p className={`text-[10px] ${completo ? "text-emerald-400/50" : "text-white/25"}`}>
                {completo ? "Tudo configurado" : `${feitos}/${total} concluidos · ${pct}%`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!completo && (
              <button onClick={() => setAberto((value) => !value)} className="rounded-lg p-1.5 text-white/25 transition-colors hover:text-white">
                {aberto ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            )}
            <button onClick={fecharDefinitivamente} className="rounded-lg p-1.5 text-white/15 transition-colors hover:text-white/40" title="Fechar">
              <X size={13} />
            </button>
          </div>
        </div>

        {!completo && (
          <div className="px-5 pt-3">
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
              <div className="h-full rounded-full bg-purple-500 transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {(aberto || completo) && (
          <div className="space-y-1 px-4 py-3">
            {STEPS.map((step) => {
              const feito = completo || concluidos.has(step.id);
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 rounded-xl p-2.5 transition-colors ${
                    feito ? "opacity-50" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                    feito ? "border border-emerald-500/20 bg-emerald-500/10" : "border border-white/[0.07] bg-white/[0.03]"
                  }`}>
                    {feito ? <CheckCircle2 size={11} className="text-emerald-400" /> : <Icon size={11} className="text-white/30" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[11px] font-semibold ${feito ? "text-white/20 line-through" : "text-white/80"}`}>
                      {step.titulo}
                    </p>
                    {!feito && <p className="text-[10px] text-white/25">{step.desc}</p>}
                  </div>
                  {!feito && (
                    <a
                      href={step.href}
                      onClick={() => void marcarConcluido(step.id)}
                      className="shrink-0 text-[10px] font-semibold text-purple-400 transition-colors hover:text-purple-300"
                    >
                      Ir {">"}
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
