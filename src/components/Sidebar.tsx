"use client";
import { Zap, BarChart3, BrainCircuit, RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function SideLink({ href, icon, active, label }: { href: string, icon: any, active?: boolean, label: string }) {
  return (
    <Link href={href} className="group relative flex flex-col items-center">
      <div className={`
        p-4 rounded-2xl transition-all duration-500 relative z-10
        ${active 
          ? 'bg-purple-600 text-white shadow-[0_0_25px_rgba(168,85,247,0.5)]' 
          : 'text-gray-500 hover:text-white hover:bg-white/5'}
      `}>
        {icon}
      </div>
      <span className="absolute left-20 bg-purple-600 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none tracking-widest z-50 whitespace-nowrap">
        {label}
      </span>
      {active && (
        <div className="absolute -left-10 w-1.5 h-8 bg-purple-600 rounded-r-full shadow-[5px_0_15px_#a855f7]"></div>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-24 border-r border-white/[0.03] flex flex-col items-center py-10 fixed h-full bg-black/40 backdrop-blur-3xl z-50">
      <div className="mb-16 relative group cursor-pointer">
        <div className="absolute -inset-4 bg-purple-600/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
        <div className="relative text-3xl font-black italic text-purple-600 tracking-tighter">E.</div>
      </div>

      <nav className="flex flex-col gap-10 flex-1">
        <SideLink href="/" icon={<Zap size={22}/>} active={pathname === "/"} label="Radar" />
        <SideLink href="/pulse" icon={<BrainCircuit size={22}/>} active={pathname === "/pulse"} label="Pulse" />
        <SideLink href="/dados" icon={<BarChart3 size={22}/>} active={pathname === "/dados"} label="Dados" />
        <SideLink href="/config" icon={<RefreshCw size={22}/>} active={pathname === "/config"} label="Sincronizar" />
      </nav>

      <div className="mt-auto flex flex-col gap-8 items-center pb-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 p-[1px]">
          <div className="w-full h-full rounded-[15px] bg-black flex items-center justify-center text-[10px] font-bold italic">ER</div>
        </div>
      </div>
    </aside>
  );
}