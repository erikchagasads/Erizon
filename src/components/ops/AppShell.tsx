"use client";

import { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import { useSessionGuard } from "@/app/hooks/useSessionGuard";

// ─── Skeleton genérico ────────────────────────────────────────────────────────
function Bone({ className }: { className?: string; key?: string | number }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.04] ${className ?? ""}`} />;
}

export function SkeletonPage({ cols = 1 }: { cols?: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex min-h-screen bg-[#060609]">
      <Sidebar />
      <main className="md:ml-[60px] flex-1 px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8 space-y-5 max-w-7xl">
        {/* Header */}
        <div className="space-y-2 mb-2">
          <Bone className="h-3 w-24" />
          <Bone className="h-7 w-52" />
          <Bone className="h-3 w-80" />
        </div>
        {/* KPI bar */}
        <div className={`grid gap-4 ${
          cols === 4 ? "grid-cols-4" : cols === 3 ? "grid-cols-3" : cols === 2 ? "grid-cols-2" : "grid-cols-1"
        }`}>
          {Array.from({ length: cols }).map((_, i) => <Bone key={i} className="h-24" />)}
        </div>
        {/* Cards */}
        <Bone className="h-40" />
        <Bone className="h-56" />
        <Bone className="h-32" />
      </main>
    </div>
  );
}

// ─── AppShell com session guard embutido ──────────────────────────────────────
export default function AppShell({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
}) {
  useSessionGuard(); // ← protege contra sessão expirada

  return (
    <div className="min-h-screen bg-[#05070F] text-[#F5F7FF]">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8 pb-24 md:pb-8">
        <header className="mb-8 rounded-[24px] border border-white/[0.07] bg-white/[0.03] px-8 py-6">
          {eyebrow && (
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#2FFFCB]">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm text-white/50">{description}</p>
          )}
        </header>
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
