"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Zap, BarChart3, Users, Building2,
  BrainCircuit, Sparkles, Settings, LogOut,
  ShieldAlert, Bot, FileText, Layers,
  Cpu, CreditCard, Radar, Globe,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import OnboardingChecklist from "@/components/OnboardingChecklist";

type NavItem  = { href: string; icon: React.ElementType; label: string };
type NavGroup = { group: true; icon: React.ElementType; label: string; items: NavItem[] };
type NavEntry = NavItem | NavGroup | null;

const NAV: NavEntry[] = [
  // ── Principal ──────────────────────────────────────────
  { href: "/pulse",     icon: Zap,       label: "Pulse"      },
  { href: "/campanhas", icon: Users,     label: "Campanhas"  },
  { href: "/clientes",  icon: Building2, label: "Clientes"   },
  { href: "/analytics", icon: BarChart3, label: "Analytics"  },

  null,

  // ── Engines ────────────────────────────────────────────
  {
    group: true, icon: Cpu, label: "Engines",
    items: [
      { href: "/decision-feed", icon: Cpu,        label: "Decision Feed"        },
      { href: "/risk-radar",    icon: ShieldAlert, label: "Risk Radar"           },
      { href: "/automacoes",    icon: Radar,       label: "Autopilot"            },
      { href: "/inteligencia",  icon: Globe,       label: "Network Intelligence" },
    ],
  },

  // ── IA & Criativos ─────────────────────────────────────
  {
    group: true, icon: BrainCircuit, label: "IA & Criativos",
    items: [
      { href: "/copiloto",     icon: Bot,          label: "Copiloto AI"  },
      { href: "/creative-lab", icon: Sparkles,     label: "Creative Lab" },
    ],
  },

  // ── Clientes ───────────────────────────────────────────
  {
    group: true, icon: Layers, label: "Clientes",
    items: [
      { href: "/relatorios", icon: FileText, label: "Relatórios"    },
      { href: "/portal",     icon: Layers,   label: "Portal Cliente" },
    ],
  },

  null,

  // ── Conta ──────────────────────────────────────────────
  { href: "/billing",  icon: CreditCard, label: "Billing"       },
  { href: "/settings", icon: Settings,   label: "Configurações" },
];

// ─── Tooltip ──────────────────────────────────────────────────
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <span className="
      pointer-events-none absolute left-[4.5rem] z-[200]
      whitespace-nowrap rounded-lg border border-white/[0.08]
      bg-[#0d0d10] px-2.5 py-1 text-[11px] font-semibold text-white
      shadow-xl opacity-0 -translate-x-1
      group-hover:opacity-100 group-hover:translate-x-0
      transition-all duration-150
    ">
      {children}
    </span>
  );
}

// ─── Item de link ─────────────────────────────────────────────
function SideLink({ href, icon: Icon, label, active }: NavItem & { active: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <Link href={href} className="group relative flex items-center justify-center w-full py-[2px]">
      <div
        className="absolute left-0 w-[3px] h-4 bg-purple-500 rounded-r-full shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-opacity duration-150"
        style={{ opacity: mounted && active ? 1 : 0 }}
      />
      <div className={`p-[9px] rounded-xl transition-all duration-150 ${
        mounted && active
          ? "bg-purple-600 text-white shadow-[0_4px_12px_rgba(168,85,247,0.35)]"
          : "text-white/25 hover:text-white hover:bg-white/[0.06]"
      }`}>
        <Icon size={16} />
      </div>
      <Tip>{label}</Tip>
    </Link>
  );
}

// ─── Grupo com flyout lateral ─────────────────────────────────
function SideGroup({ icon: Icon, label, items, pathname }: NavGroup & { pathname: string }) {
  const hasActive = items.some(i => pathname === i.href);
  const [open, setOpen]       = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative w-full">
      <button
        onClick={() => setOpen(o => !o)}
        className="group relative flex items-center justify-center w-full py-[2px]"
      >
        <div
          className="absolute left-0 w-[3px] h-4 bg-purple-400/60 rounded-r-full transition-opacity duration-150"
          style={{ opacity: mounted && hasActive ? 1 : 0 }}
        />
        <div className={`p-[9px] rounded-xl transition-all duration-150 ${
          open
            ? "bg-white/[0.08] text-white"
            : mounted && hasActive
              ? "bg-purple-600/30 text-purple-300"
              : "text-white/25 hover:text-white hover:bg-white/[0.06]"
        }`}>
          <Icon size={16} />
        </div>
        {!open && <Tip>{label}</Tip>}
      </button>

      {open && (
        <div className="
          absolute left-[4.2rem] top-0 z-[200]
          min-w-[176px] rounded-xl
          border border-white/[0.08] bg-[#0e0e12]
          shadow-2xl shadow-black/60
        ">
          <div className="px-3 py-2 border-b border-white/[0.05]">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">{label}</p>
          </div>
          {items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-medium transition-colors ${
                pathname === item.href
                  ? "bg-purple-600/20 text-purple-300"
                  : "text-white/50 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              <item.icon size={13} className="shrink-0" />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return (
    <>
      <OnboardingChecklist />
      <aside className="
        fixed left-0 top-0 z-50 h-screen w-[60px]
        flex flex-col items-center
        border-r border-white/[0.04] bg-[#040406]
        py-3 gap-0
      ">
        {/* Logo */}
        <div className="mb-2 text-[18px] font-black italic text-purple-500 tracking-tighter select-none">
          E.
        </div>

        {/* Nav */}
        <div className="flex flex-col items-center w-full flex-1">
          {NAV.map((entry, i) => {
            if (entry === null) return (
              <div key={i} className="w-6 h-px bg-white/[0.05] my-1 shrink-0" />
            );
            if ("group" in entry) return (
              <SideGroup key={entry.label} {...entry} pathname={pathname} />
            );
            return (
              <SideLink key={entry.href} {...entry} active={pathname === entry.href} />
            );
          })}
        </div>

        {/* Logout */}
        <div className="group relative flex items-center justify-center w-full shrink-0">
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
            className="p-[9px] text-white/20 hover:text-red-400 hover:bg-red-500/[0.08] rounded-xl transition-all duration-150"
          >
            <LogOut size={15} />
          </button>
          <Tip>Sair</Tip>
        </div>
      </aside>
    </>
  );
}
