"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  Zap, BarChart3, BrainCircuit, ScrollText, PenTool, 
  Settings, RefreshCw, Target, Users, TrendingUp, Calendar 
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// --- COMPONENTE DO LINK LATERAL (CYBERPUNK) ---
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

export default function DadosPage() {
  const [dados, setDados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [aba, setAba] = useState("ATIVO");
  const pathname = usePathname();

  async function atualizar() {
    setLoading(true);
    try {
      await fetch('/api/ads-sync');
      const { data } = await supabase.from("metricas_ads").select("*").order('data_inicio', { ascending: false });
      if (data) setDados(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { atualizar(); }, []);

  const filtrados = dados.filter(c => c.status === aba);

  return (
    <div className="flex min-h-screen bg-black text-white font-sans text-left">
      
      {/* NOVO MENU LATERAL CYBERPUNK INTEGRADO */}
      <aside className="w-24 border-r border-white/[0.03] flex flex-col items-center py-10 fixed h-full bg-black/40 backdrop-blur-3xl z-50">
        <div className="mb-16 relative group cursor-pointer">
          <div className="absolute -inset-4 bg-purple-600/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
          <div className="relative text-3xl font-black italic text-purple-600 tracking-tighter">E.</div>
        </div>

        <nav className="flex flex-col gap-8 flex-1">
          <SideLink href="/pulse" icon={<Zap size={22}/>} label="Pulse" />
          <SideLink href="/dados" icon={<BarChart3 size={22}/>} active={true} label="Dados" />
          <SideLink href="/studio" icon={<BrainCircuit size={22}/>} label="Studio" />
          <SideLink href="/roteiros" icon={<ScrollText size={22}/>} label="Roteiros" />
          <SideLink href="/copy" icon={<PenTool size={22}/>} label="Copywriter" />
          <SideLink href="/settings" icon={<Settings size={22}/>} label="Configurações" />
        </nav>

        <div className="mt-auto flex flex-col gap-8 items-center pb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 p-[1px]">
            <div className="w-full h-full rounded-[15px] bg-black flex items-center justify-center text-[10px] font-bold italic">ER</div>
          </div>
        </div>
      </aside>

      {/* CONTEÚDO ORIGINAL MANTIDO (Apenas ml-24 para ajuste) */}
      <main className="flex-1 ml-24 p-12">
        <header className="max-w-6xl mx-auto flex justify-between items-end mb-16 border-b border-white/5 pb-8 text-left">
          <div className="text-left">
            <h1 className="text-5xl font-black italic uppercase tracking-tighter">GROWTH OS <span className="text-purple-600">/ DATA</span></h1>
            <div className="flex gap-8 mt-10 font-black text-[10px] tracking-widest uppercase">
              {["ATIVO", "CONCLUIDO", "DESATIVADO"].map(s => (
                <button key={s} onClick={() => setAba(s)} className={`pb-2 border-b-2 transition-all ${aba === s ? 'text-white border-purple-500' : 'text-gray-600 border-transparent'}`}>
                  {s} ({dados.filter(d => d.status === s).length})
                </button>
              ))}
            </div>
          </div>
          <button onClick={atualizar} className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-purple-600/20 transition-all">
            <RefreshCw size={24} className={loading ? 'animate-spin' : 'text-purple-500'} />
          </button>
        </header>

        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          {filtrados.map((c) => (
            <div key={c.nome_campanha} className="bg-[#0A0A0A] border border-white/5 p-10 rounded-[35px] flex justify-between items-center group hover:border-purple-500/30 transition-all text-left">
              <div className="w-1/3 text-left">
                <div className="flex items-center gap-4 mb-2">
                  <div className={`w-2 h-2 rounded-full ${c.status === 'ATIVO' ? 'bg-green-500 animate-pulse' : 'bg-gray-700'}`}></div>
                  <span className="text-[9px] font-black opacity-30 uppercase tracking-widest"><Calendar size={10} className="inline mr-1"/> {new Date(c.data_inicio).toLocaleDateString('pt-BR')}</span>
                </div>
                <h3 className="text-xl font-bold uppercase italic tracking-tight">{c.nome_campanha}</h3>
              </div>
              
              <div className="flex gap-12">
                <Metric label="BUDGET" value={`R$ ${c.orcamento.toFixed(0)}`} icon={<Target size={14}/>} />
                <Metric label="LEADS" value={c.contatos} icon={<Users size={14}/>} color="text-purple-500" />
                <Metric label="CPL" value={`R$ ${c.contatos > 0 ? (c.gasto_total / c.contatos).toFixed(2) : "0,00"}`} icon={<TrendingUp size={14}/>} color="text-purple-400" />
                <Metric label="SPEND" value={`R$ ${c.gasto_total.toFixed(2)}`} icon={<Zap size={14}/>} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value, icon, color = "text-white" }: any) {
  return (
    <div className="flex flex-col gap-1 min-w-[110px] text-left">
      <span className="text-[9px] font-black text-gray-600 flex items-center gap-2 tracking-widest uppercase italic">{icon} {label}</span>
      <span className={`text-lg font-black ${color}`}>{value}</span>
    </div>
  );
}