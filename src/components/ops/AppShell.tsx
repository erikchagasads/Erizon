import { ReactNode } from "react";

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
  return (
    <div className="min-h-screen bg-[#05070F] text-[#F5F7FF]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header da página */}
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

        {/* Conteúdo */}
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
