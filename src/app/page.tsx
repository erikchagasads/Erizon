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
      console.error("Erro ao carregar dados:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [router])

  const deleteMetric = async (id: any) => {
    if (confirm('Deseja excluir esta métrica?')) {
      const { error } = await supabase.from('metrics').delete().eq('id', id)
      if (error) alert(`Erro: ${error.message}`)
      else fetchData()
    }
  }

  if (loading) return (
    <div className="bg-[#050505] h-screen flex items-center justify-center">
      <div className="text-[#6c4bff] text-xs font-bold tracking-[0.5em] animate-pulse uppercase">Estabelecendo Conexão...</div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#050505] text-slate-200 overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-white/5 bg-[#08080a] p-8 flex flex-col">
        <div className="mb-12">
            <h1 className="text-2xl font-black text-[#6c4bff] italic tracking-tighter">ERIZON</h1>
            <p className="text-[8px] text-slate-500 tracking-[0.4em] uppercase mt-1 font-bold">Growth Intel</p>
        </div>
        
        <nav className="space-y-2 flex-1 text-[10px] font-black uppercase tracking-widest">
          <button onClick={() => router.push('/')} className="w-full text-left p-4 bg-[#6c4bff]/10 rounded-2xl text-[#6c4bff] border border-[#6c4bff]/20 flex items-center gap-3">
            📊 Overview
          </button>
          <button onClick={() => router.push('/pulse')} className="w-full text-left p-4 hover:bg-white/[0.03] rounded-2xl transition-all text-slate-500 flex items-center gap-3">
            ⚡ Pulse
          </button>
        </nav>
        
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} className="p-4 text-left text-red-500/30 hover:text-red-500 text-[9px] font-black uppercase tracking-[0.2em] transition-all">
          Sair
        </button>
      </aside>

      {/* CONTEÚDO */}
      <main className="flex-1 p-12 overflow-y-auto">
        <header className="mb-12 flex justify-between items-start">
          <div>
            <h2 className="text-4xl font-black tracking-tighter text-white italic">COMMAND</h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
               {user?.email}
            </p>
          </div>
          <div className="bg-[#00ff9d]/5 border border-[#00ff9d]/20 px-4 py-2 rounded-full flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#00ff9d] rounded-full animate-pulse"></div>
            <span className="text-[#00ff9d] text-[9px] font-black tracking-widest uppercase">Live</span>
          </div>
        </header>

        {/* MÉTRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-white">
          {metrics.map((item) => (
            <div key={item.id} className="p-8 rounded-[32px] border border-white/5 bg-gradient-to-b from-[#0d0d12] to-[#08080a] group relative shadow-xl">
              <button onClick={() => deleteMetric(item.id)} className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 text-red-500/50 hover:text-red-500 transition-all">🗑️</button>
              <p className="text-slate-500 text-[9px] uppercase font-black tracking-[0.2em] mb-4">{item.label}</p>
              <div className="flex items-baseline justify-between">
                <h3 className="text-4xl font-medium tracking-tighter">{item.value}</h3>
                <span className={`${item.is_positive ? 'text-[#00ff9d]' : 'text-red-500'} text-[9px] font-black px-2 py-1 rounded-lg bg-white/[0.02] border border-white/5`}>
                    {item.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* GRÁFICO FINAL - O "SEG" É OBRIGADO A APARECER AQUI */}
        <div className="p-10 rounded-[40px] border border-white/5 bg-[#08080a] shadow-2xl relative">
           <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mb-10">Histórico de Performance</h4>
           
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
                    fontWeight="bold"
                    tickLine={false} 
                    axisLine={false}
                    interval={0}
                    padding={{ left: 40, right: 40 }}
                    dy={15}
                  />
                  <YAxis hide={true} domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0d0d12', border: '1px solid #ffffff10', borderRadius: '16px' }} 
                    itemStyle={{ color: '#6c4bff', fontWeight: 'bold' }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#6c4bff" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorAmt)" 
                    dot={{ fill: '#6c4bff', r: 5, strokeWidth: 3, stroke: '#08080a' }} 
                    activeDot={{ r: 8, strokeWidth: 0, fill: '#00ff9d' }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-700 text-[9px] font-black uppercase tracking-[0.3em]">Sincronizando...</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}