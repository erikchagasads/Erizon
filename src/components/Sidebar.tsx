"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Zap, BarChart3, BrainCircuit, Sparkles,
  Settings, LogOut, Users
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

const NAV_ITEMS = [
  { href: "/clientes",     icon: Users,        label: "Clientes"     },
  { href: "/pulse",        icon: Zap,          label: "Pulse"        },
  { href: "/dados",        icon: BarChart3,    label: "Campanhas"    },
];

const AI_ITEMS = [
  { href: "/studio",       icon: BrainCircuit, label: "Studio IA"    },
  { href: "/creative-lab", icon: Sparkles,     label: "Creative Lab" },
];

function SideLink({ href, icon: Icon, label, active }: {
  href: string; icon: React.ElementType; label: string; active: boolean;
}) {
  return (
    <Link href={href} className="group relative flex flex-col items-center">
      {active && (
        <div className="absolute -left-[2.65rem] w-[3px] h-7 bg-purple-500 rounded-r-full shadow-[0_0_12px_rgba(168,85,247,0.6)]" />
      )}
      <div className={`p-3.5 rounded-2xl transition-all duration-300 ${
        active
          ? "bg-purple-600 text-white shadow-[0_8px_20px_rgba(168,85,247,0.35)]"
          : "text-gray-600 hover:text-white hover:bg-white/[0.06]"
      }`}>
        <Icon size={20} />
      </div>
      <span className="absolute left-[4.5rem] bg-[#0c0c0e] border border-white/[0.08] text-white text-[10px] font-semibold px-3 py-1.5 rounded-xl tracking-wide whitespace-nowrap opacity-0 -translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 z-[100] shadow-xl">
        {label}
      </span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return (
    <aside className="w-24 border-r border-white/[0.04] flex flex-col items-center py-10 fixed h-full bg-[#040406] z-50">
      <div className="mb-14 text-2xl font-black italic text-purple-500 tracking-tighter select-none">E.</div>

      <nav className="flex flex-col flex-1 justify-between items-center w-full">
        <div className="flex flex-col gap-5 items-center">
          {NAV_ITEMS.map((item) => (
            <SideLink key={item.href} {...item} active={pathname === item.href} />
          ))}

          <div className="w-6 h-px bg-white/[0.06] my-1" />

          {AI_ITEMS.map((item) => (
            <SideLink key={item.href} {...item} active={pathname === item.href} />
          ))}

          <SideLink href="/settings" icon={Settings} label="Configurações" active={pathname === "/settings" || pathname === "/configuracoes"} />
        </div>

        <div className="group relative flex flex-col items-center">
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
            className="p-3.5 text-gray-700 hover:text-red-400 hover:bg-red-500/8 rounded-2xl transition-all duration-300"
          >
            <LogOut size={20} />
          </button>
          <span className="absolute left-[4.5rem] bg-red-600 text-white text-[10px] font-semibold px-3 py-1.5 rounded-xl tracking-wide whitespace-nowrap opacity-0 -translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 z-[100] shadow-xl">
            Sair
          </span>
        </div>
      </nav>
    </aside>
  );
}