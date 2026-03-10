
import { ReactNode } from "react";

export function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-sm text-white/65">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0B1020] p-5">
      <p className="text-sm text-white/60">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      {hint ? <p className="mt-2 text-xs text-[#2FFFCB]">{hint}</p> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "danger" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-400/10 text-emerald-300"
      : tone === "danger"
        ? "bg-rose-400/10 text-rose-300"
        : tone === "warning"
          ? "bg-amber-400/10 text-amber-200"
          : "bg-white/10 text-white/75";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs ${toneClass}`}>{children}</span>;
}
