"use client";

import Link from "next/link";
import { Lock, ArrowRight, Loader2, Sparkles } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { PLAN_LABELS, type PlanId } from "@/lib/plans";
import { usePlan } from "@/app/hooks/usePlan";

interface PlanGateProps {
  minPlan: PlanId;
  feature: string;
  children: React.ReactNode;
}

export default function PlanGate({ minPlan, feature, children }: PlanGateProps) {
  const plan = usePlan();

  if (plan.loading) {
    return (
      <>
        <Sidebar />
        <main className="md:ml-[60px] min-h-screen bg-[#040406] text-white flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-fuchsia-400" />
        </main>
      </>
    );
  }

  if (plan.canAccess(minPlan)) return <>{children}</>;

  return (
    <>
      <Sidebar />
      <main className="md:ml-[60px] min-h-screen bg-[#040406] text-white flex items-center justify-center px-5 py-10">
        <section className="w-full max-w-[520px] rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10">
            <Lock size={20} className="text-fuchsia-300" />
          </div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-300">
            Upgrade para {PLAN_LABELS[minPlan]}
          </p>
          <h1 className="mb-3 text-2xl font-black tracking-tight text-white">{feature}</h1>
          <p className="mx-auto mb-6 max-w-sm text-sm leading-relaxed text-white/45">
            Seu plano atual libera o essencial. Esta camada fica no {PLAN_LABELS[minPlan]} para proteger a diferenca de valor entre os planos.
          </p>
          <Link
            href={`/billing?upgrade=${minPlan}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-fuchsia-500"
          >
            <Sparkles size={15} /> Ver planos <ArrowRight size={14} />
          </Link>
        </section>
      </main>
    </>
  );
}
