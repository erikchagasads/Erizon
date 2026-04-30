export type PlanId = "core" | "pro" | "command";

export const PLAN_ORDER: Record<PlanId, number> = {
  core: 1,
  pro: 2,
  command: 3,
};

export const PLAN_LABELS: Record<PlanId, string> = {
  core: "Core",
  pro: "Pro",
  command: "Command",
};

export function normalizePlan(plan?: string | null): PlanId | null {
  if (!plan) return null;
  if (plan === "gestor") return "pro";
  if (plan === "agencia" || plan === "agency") return "command";
  if (plan === "core" || plan === "pro" || plan === "command") return plan;
  return null;
}

export function canAccessPlan(current?: string | null, required: PlanId = "core") {
  const normalized = normalizePlan(current);
  if (!normalized) return false;
  return PLAN_ORDER[normalized] >= PLAN_ORDER[required];
}
