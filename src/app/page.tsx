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

  if (loading) return (
    <div className="bg-[#0f0f11] h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#6c4bff]/20 border-t-[#6c4bff] rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#0f1013] text-[#e4e4e7]">
      
      {/* SIDEBAR REPRODUZIDA */}
      <aside className="w-64 bg-[#16171a] flex flex-col border-r border-white/5">
        <div className="p-8">
          <h1 className="text-3xl font-extrabold tracking-tighter text-white italic">ERIZON</h1>
          <div className="w-10 h-1 bg-[#6c4bff] mt-2 rounded-full"></div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          <div className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Menu</div>
          <button className="w-full flex items-center gap-3 p-3 bg-[#6c4bff] rounded-xl text-white text-sm font-semibold shadow-lg shadow-[#6c4bff]/20">
            📊 Overview
          </button>
          <button onClick={() => router.push('/pulse')} className="w-full flex items-center gap-3 p-3 text-zinc-400 hover:bg-white/5 rounded-xl text-sm font-medium transition-all">
            ⚡ Pulse
          </button>
        </nav>

        <div className="p-6">
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} 
            className="w-full p-3 bg-[#1c1d21] border border-white/5 rounded-xl text-xs font-bold hover:bg-red-500/10 hover:text-red-500 transition-all">
            Terminate_Session
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-center mb-10 bg-[#16171a] p-8 rounded-[32px] border border-white/5">
          <div>
            <h2 className="text-5xl font-extrabold tracking-tight text-white italic">Command</h2>
            <p className="text-[#6c4bff] text-xs font-semibold mt-1 opacity-80">{user?.email}</p>
          </div>
          <div className="bg-[#1c1d21] border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-[#00ff9d] rounded-full animate-pulse shadow-[0_0_10px_#00ff9d]"></span>
            <span className="text-white text-xs font-bold uppercase tracking-widest">System Live</span>
          </div>
        </header>

        {/* ÁREA DE COMANDO - CARDS REDONDOS */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-6 px-2 italic">Área de Comande</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {metrics.map((item) => (
              <div key={item.id} className="bg-[#1c1d21] border border-white/5 p-8 rounded-[32px] hover:border-zinc-700 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full"></div>
                    <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full"></div>
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-5xl font-medium tracking-tighter text-white tabular-nums">{item.value}</span>
                  <div className={`flex flex-col items-end ${item.is_positive ? 'text-[#00ff9d]' : 'text-red-500'}`}>
                    <span className="text-[10px] font-bold bg-white/5 px-2 py-1 rounded-lg">{item.change}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PERFORMANCE TELEMETRY */}
        <div className="bg-[#16171a] border border-white/5 p-10 rounded-[40px] mt-10 shadow-2xl">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-bold text-white italic">Performance_Telemetry</h3>
            <div className="flex gap-1.5">
               {[1,2,3,4].map(i => <div key={i} className="w-1.5 h-1.5 bg-zinc-800 rounded-full"></div>)}
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="purpleGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6c4bff" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6c4bff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                <XAxis 
                  dataKey="day_name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600 }} 
                  interval={0}
                  padding={{ left: 40, right: 40 }}
                  dy={15}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1c1d21', border: 'none', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#6c4bff', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#6c4bff" 
                  strokeWidth={5} 
                  fill="url(#purpleGlow)" 
                  dot={{ fill: '#6c4bff', r: 5, strokeWidth: 3, stroke: '#16171a' }}
                  activeDot={{ r: 9, fill: '#00ff9d', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  )
}