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
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      const [metricsRes, historyRes] = await Promise.all([
        supabase.from('metrics').select('*').order('created_at', { ascending: true }),
        supabase.from('chart_history').select('*').order('created_at', { ascending: true })
      ])
      if (metricsRes.data) setMetrics(metricsRes.data)
      if (historyRes.data) setHistory(historyRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [router])

  const deleteMetric = async (id: any) => {
    if (confirm('Excluir métrica?')) {
      const { error } = await supabase.from('metrics').delete().eq('id', id)
      if (!error) fetchData()
    }
  }

  if (loading) return (
    <div className="bg-[#050505] h-screen flex items-center justify-center">
      <div className="text-[#6c4bff] text-[10px] font-bold tracking-[0.8em] animate-pulse font-michroma uppercase">Inicializando Cockpit</div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#050505] text-slate-300 font-inter overflow-hidden">
      
      {/* SIDEBAR TECH */}
      <aside className="w-72 border-r border-white/5 bg-[#08080a] p-10 flex flex-col">
        <div className="mb-14">
            <h1 className="text-2xl font-black text-[#6c4bff] italic tracking-tighter font-michroma">ERIZON</h1>
            <p className="text-[8px] text-slate-600 tracking-[0.5em] uppercase mt-2 font-bold font-inter">Growth Intel</p>
        </div>
        
        <nav className="space-y-4 flex-1">
          <button onClick={() => router.push('/')} className="w-full text-left p-4 bg-[#6c4bff]/10 rounded-2xl text-[#6c4bff] border border-[#6c4bff]/20 flex items-center gap-3 font-bold text-[10px] uppercase tracking-[0.2em] font-michroma transition-all">
            📊 Overview
          </button>
          <button onClick={() => router.push('/pulse')} className="w-full text-left p-4 hover:bg-white/[0.03] rounded-2xl transition-all text-slate-500 flex items-center gap-3 font-bold text-[10px] uppercase tracking-[0.2em] font-michroma">
            ⚡ Pulse
          </button>
        </nav>
        
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} className="p-4 text-left text-red-500/30 hover:text-red-500 text-[9px] font-bold uppercase tracking-[0.3em] font-michroma transition-all">
          Sair do Sistema
        </button>
      </aside>

      {/* CONTEÚDO PREMIUM */}
      <main className="flex-1 p-16 overflow-y-auto">
        <header className="mb-16 flex justify-between items-start">
          <div>
            <h2 className="text-5xl font-black tracking-tighter text-white italic font-michroma leading-tight">COMMAND<br/><span className="text-[#6c4bff] not-italic">CENTER</span></h2>
            <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.4em] mt-4 flex items-center gap-2 font-inter">
              <span className="w-1.5 h-1.5 bg-[#6c4bff] rounded-full"></span> {user?.email}
            </p>
          </div>
          <div className="bg-[#00ff9d]/5 border border-[#00ff9d]/20 px-5 py-2.5 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-[#00ff9d] rounded-full animate-pulse shadow-[0_0_10px_#00ff9d]"></div>
            <span className="text-[#00ff9d] text-[9px] font-black tracking-[0.3em] uppercase font-michroma">Live Telemetry</span>
          </div>
        </header>

        {/* CARDS COM FONTE "TABULAR NUMS" */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {metrics.map((item) => (
            <div key={item.id} className="p-10 rounded-[40px] border border-white/5 bg-gradient-to-br from-[#0d0d12] to-[#08080a] group relative shadow-2xl transition-all hover:scale-[1.02]">
              <button onClick={() => deleteMetric(item.id)} className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 text-red-500/40 hover:text-red-500 transition-all">🗑️</button>
              <p className="text-slate-500 text-[10px] uppercase font-black tracking-[0.3em] mb-6 font-michroma">{item.label}</p>
              <div className="flex items-baseline justify-between">
                <h3 className="text-5xl font-light tracking-tighter text-white font-inter tabular-nums">{item.value}</h3>
                <span className={`${item.is_positive ? 'text-[#00ff9d] bg-[#00ff9d]/5' : 'text-red-500 bg-red-500/5'} text-[9px] font-black px-3 py-1 rounded-lg border border-white/5 font-inter`}>
                    {item.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* GRÁFICO REFINADO */}
        <div className="p-12 rounded-[50px] border border-white/5 bg-[#08080a] shadow-inner relative overflow-hidden group">
           <div className="flex justify-between items-center mb-12">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.6em] font-michroma">Global History</h4>
              <div className="h-[1px] flex-1 mx-8 bg-white/5"></div>
              <div className="text-[9px] font-bold text-[#6c4bff] uppercase tracking-widest font-michroma">Active Link</div>
           </div>
           
           <div className="h-80 w-full">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6c4bff" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6c4bff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                  <XAxis 
                    dataKey="day_name" 
                    stroke="#334155" 
                    fontSize={10} 
                    fontWeight="900"
                    tickLine={false} 
                    axisLine={false}
                    interval={0}
                    padding={{ left: 45, right: 45 }}
                    dy={20}
                    className="uppercase tracking-[0.3em] font-michroma"
                  />
                  <YAxis hide={true} domain={['auto', 'auto']} />
                  <Tooltip 
                    cursor={{ stroke: '#6c4bff20', strokeWidth: 2 }}
                    contentStyle={{ backgroundColor: '#0d0d12', border: '1px solid #ffffff10', borderRadius: '24px', padding: '20px' }} 
                    itemStyle={{ color: '#6c4bff', fontWeight: 'bold', fontSize: '18px', fontFamily: 'var(--font-inter)' }} 
                    labelStyle={{ color: '#475569', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'black', fontFamily: 'var(--font-michroma)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#6c4bff" 
                    strokeWidth={5} 
                    fillOpacity={1} 
                    fill="url(#colorAmt)" 
                    dot={{ fill: '#6c4bff', r: 6, strokeWidth: 3, stroke: '#08080a' }} 
                    activeDot={{ r: 9, strokeWidth: 0, fill: '#00ff9d' }} 
                    animationDuration={2500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-700 text-[10px] font-black uppercase tracking-[0.5em] font-michroma italic">Uplink Pending...</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}