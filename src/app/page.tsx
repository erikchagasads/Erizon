'use client'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useRouter } from 'next/navigation'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [metrics, setMetrics] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return; }
      setUser(user)
      const [m, h] = await Promise.all([
        supabase.from('metrics').select('*').order('created_at', { ascending: true }),
        supabase.from('chart_history').select('*').order('created_at', { ascending: true })
      ])
      if (m.data) setMetrics(m.data)
      if (h.data) setHistory(h.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  if (loading) return <div className="bg-[#050505] h-screen flex items-center justify-center text-[#6c4bff] tracking-[0.5em] font-mono animate-pulse uppercase text-xs">Loading_Erizon_OS...</div>

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans selection:bg-[#6c4bff]/30">
      
      {/* SIDEBAR MINIMALISTA */}
      <aside className="w-64 border-r border-white/5 bg-[#08080a] flex flex-col overflow-hidden">
        <div className="p-8">
            <h1 className="text-xl font-black tracking-tighter text-[#6c4bff]">ERIZON</h1>
            <div className="h-[1px] w-8 bg-[#6c4bff] mt-1"></div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <button className="w-full flex items-center gap-3 p-3 bg-[#6c4bff]/10 border border-[#6c4bff]/20 rounded-xl text-[#6c4bff] text-[10px] font-bold uppercase tracking-widest">
            <span>●</span> Overview
          </button>
          <button onClick={() => router.push('/pulse')} className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.03] rounded-xl text-zinc-500 text-[10px] font-bold uppercase tracking-widest transition-all">
            <span>○</span> Pulse
          </button>
        </nav>

        <div className="p-8 border-t border-white/5">
           <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest hover:text-red-500 transition-colors">Terminate_Session</button>
        </div>
      </aside>

      {/* ÁREA DE COMANDO */}
      <main className="flex-1 p-12 overflow-y-auto">
        <header className="flex justify-between items-start mb-16">
          <div>
            <h2 className="text-5xl font-black tracking-tight italic uppercase leading-none">Command</h2>
            <p className="text-[#6c4bff] text-[10px] font-mono mt-3 uppercase tracking-[0.3em] opacity-80">{user?.email}</p>
          </div>
          <div className="bg-[#00ff9d]/5 border border-[#00ff9d]/20 px-4 py-2 rounded-lg flex items-center gap-3 shadow-[0_0_20px_rgba(0,255,157,0.05)]">
            <span className="w-2 h-2 bg-[#00ff9d] rounded-full animate-pulse"></span>
            <span className="text-[#00ff9d] text-[9px] font-black tracking-widest uppercase">System_Live</span>
          </div>
        </header>

        {/* CARDS ESTILO TERMINAL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {metrics.map((item) => (
            <div key={item.id} className="bg-[#0d0d12] border border-white/5 p-8 rounded-3xl hover:border-[#6c4bff]/40 transition-all group shadow-2xl">
              <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-[0.3em] block mb-6">{item.label}</span>
              <div className="flex justify-between items-end">
                <span className="text-4xl font-light tracking-tighter tabular-nums text-white/90">{item.value}</span>
                <span className={`text-[9px] font-bold px-2 py-1 rounded bg-white/5 border border-white/10 ${item.is_positive ? 'text-[#00ff9d]' : 'text-red-500'}`}>{item.change}</span>
              </div>
            </div>
          ))}
        </div>

        {/* O GRÁFICO (COM O SEG CORRIGIDO) */}
        <div className="bg-[#0d0d12] border border-white/5 p-10 rounded-[40px] shadow-2xl">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.5em]">Performance_Telemetry</h3>
            <div className="flex gap-1">
               {[1,2,3].map(i => <div key={i} className="w-1 h-1 bg-[#6c4bff]/30 rounded-full"></div>)}
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ left: 0, right: 30, top: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="purpleGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6c4bff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6c4bff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                <XAxis 
                  dataKey="day_name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#3f3f46', fontSize: 10, fontWeight: 700 }} 
                  interval={0}
                  padding={{ left: 40, right: 40 }}
                  dy={15}
                  className="uppercase tracking-widest font-mono"
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#050505', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
                  itemStyle={{ color: '#6c4bff', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#6c4bff" 
                  strokeWidth={4} 
                  fill="url(#purpleGlow)" 
                  dot={{ fill: '#6c4bff', r: 4, strokeWidth: 2, stroke: '#0d0d12' }}
                  activeDot={{ r: 8, fill: '#00ff9d', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  )
}