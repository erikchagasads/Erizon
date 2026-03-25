"use client";

import Link from "next/link";
import ErizonLogo from "@/components/ErizonLogo";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Zap, BarChart3, BarChart2, Users, Users2, Building2,
  BrainCircuit, Sparkles, Settings, LogOut,
  ShieldAlert, Bot, FileText, Layers,
  Cpu, Globe, GitBranch, Instagram, Activity, Kanban, BookOpen,
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
  { href: "/analytics", icon: BarChart3, label: "Analytics"  },
  { href: "/clientes",  icon: Building2, label: "Clientes"   },
  { href: "/crm",       icon: Kanban,    label: "CRM"        },

  null,

  // ── Engines ────────────────────────────────────────────
  {
    group: true, icon: Cpu, label: "Engines",
    items: [
      { href: "/decision-feed",   icon: Cpu,        label: "Decision Feed"        },
      { href: "/risk-radar",     icon: ShieldAlert, label: "Risk Radar"          },
      { href: "/inteligencia",   icon: Globe,       label: "Network Intelligence"},
      { href: "/inteligencia/ena", icon: Activity,  label: "ENA · Atribuição"    },
      { href: "/automacoes",     icon: GitBranch,   label: "Automações"          },
    ],
  },

  // ── IA & Criativos ─────────────────────────────────────
  {
    group: true, icon: BrainCircuit, label: "IA & Criativos",
    items: [
      { href: "/copiloto",      icon: Bot,       label: "Copiloto AI"      },
      { href: "/creative-lab",  icon: Sparkles,  label: "Creative Lab"     },
      { href: "/funil-publico", icon: Users,     label: "Funil de Público" },
      { href: "/benchmarks",    icon: BarChart2, label: "Benchmarks"       },
    ],
  },

  // ── Clientes ───────────────────────────────────────────
  {
    group: true, icon: Layers, label: "Clientes",
    items: [
      { href: "/relatorios", icon: FileText,  label: "Relatórios"        },
      { href: "/portal",     icon: Layers,    label: "Portal do Cliente"  },
      { href: "/insights",   icon: Instagram, label: "Insights Instagram" },
    ],
  },

  null,

  // ── Conta ──────────────────────────────────────────────
  { href: "/blog",     icon: BookOpen,  label: "Blog"          },
  { href: "/settings", icon: Settings, label: "Configurações" },
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

  return (
    <Link href={href} className="group relative flex items-center justify-center w-full py-[2px]">
      <div
        className="absolute left-0 w-[3px] h-4 bg-fuchsia-500 rounded-r-full shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-opacity duration-150"
        style={{ opacity: active ? 1 : 0 }}
      />
      <div className={`p-[9px] rounded-xl transition-all duration-150 ${
        active
          ? "bg-gradient-to-r from-fuchsia-600 to-violet-700 text-white shadow-[0_4px_12px_rgba(168,85,247,0.35)]"
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
  const hasActive = items.some(i => pathname === i.href || pathname.startsWith(i.href + '/'));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
          className="absolute left-0 w-[3px] h-4 bg-fuchsia-400/60 rounded-r-full transition-opacity duration-150"
          style={{ opacity: hasActive ? 1 : 0 }}
        />
        <div className={`p-[9px] rounded-xl transition-all duration-150 ${
          open
            ? "bg-white/[0.08] text-white"
            : hasActive
              ? "bg-gradient-to-r from-fuchsia-600 to-violet-700/30 text-fuchsia-300"
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
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? "bg-gradient-to-r from-fuchsia-600 to-violet-700/20 text-fuchsia-300"
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
  const MOBILE_NAV: NavItem[] = [
    { href: "/pulse",     icon: Zap,       label: "Pulse"     },
    { href: "/campanhas", icon: Users,      label: "Campanhas" },
    { href: "/analytics", icon: BarChart3,  label: "Analytics" },
    { href: "/clientes",  icon: Building2,  label: "Clientes"  },
    { href: "/copiloto",  icon: Bot,        label: "Copiloto"  },
  ];

  return (
    <>
      <OnboardingChecklist />

      {/* ── Sidebar desktop (≥ md) ── */}
      <aside className="
        hidden md:flex
        fixed left-0 top-0 z-50 h-screen w-[60px]
        flex-col items-center
        border-r border-white/[0.04] bg-[#040406]
        py-3 gap-0
      ">
        {/* Logo */}
        <div className="mb-2 flex items-center justify-center select-none">
          <ErizonLogo size={38} />
        </div>

        {/* Nav */}
        <div className="flex flex-col items-center w-full flex-1">
          {NAV.map((entry, i) => {
            if (entry === null) return (
              <div key={i} className="w-6 h-px bg-white/[0.05] my-1 shrink-0" />
            );
            if ("group" in entry) return (
// eslint-disable-next-line @typescript-eslint/no-explicit-any
              <SideGroup key={entry.label} {...(entry as any)} pathname={pathname} />
            );
            return (
// eslint-disable-next-line @typescript-eslint/no-explicit-any
              <SideLink key={entry.href} {...(entry as any)} active={pathname === entry.href || pathname.startsWith(entry.href + '/')} />
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

      {/* ── Bottom nav mobile (< md) ── */}
      <nav className="
        md:hidden fixed bottom-0 inset-x-0 z-50
        flex items-center justify-around
        border-t border-white/[0.06] bg-[#040406]/95 backdrop-blur-xl
        px-2 py-2 pb-[env(safe-area-inset-bottom)]
      ">
        {MOBILE_NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all">
              <item.icon
                size={20}
                className={active ? "text-fuchsia-400" : "text-white/30"}
              />
              <span className={`text-[9px] font-medium ${active ? "text-fuchsia-400" : "text-white/30"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-white/30 hover:text-red-400 transition-all"
        >
          <LogOut size={20} />
          <span className="text-[9px] font-medium">Sair</span>
        </button>
      </nav>
    </>
  );
}