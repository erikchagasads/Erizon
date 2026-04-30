"use client";

import { useEffect, useMemo, useState } from "react";
import { canAccessPlan, normalizePlan, type PlanId } from "@/lib/plans";

export interface PlanState {
  loading: boolean;
  ativo: boolean;
  plano: PlanId | null;
  status: string | null;
  trialEndsAt: string | null;
  canAccess: (required: PlanId) => boolean;
}

export function usePlan(): PlanState {
  const [loading, setLoading] = useState(true);
  const [ativo, setAtivo] = useState(false);
  const [plano, setPlano] = useState<PlanId | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    fetch("/api/billing", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!mounted) return;
        setAtivo(Boolean(data?.ativo));
        setPlano(normalizePlan(data?.plano));
        setStatus(data?.status ?? null);
        setTrialEndsAt(data?.trial_ends_at ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setAtivo(false);
        setPlano(null);
        setStatus(null);
        setTrialEndsAt(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  return useMemo(() => ({
    loading,
    ativo,
    plano,
    status,
    trialEndsAt,
    canAccess: (required: PlanId) => ativo && canAccessPlan(plano, required),
  }), [loading, ativo, plano, status, trialEndsAt]);
}
