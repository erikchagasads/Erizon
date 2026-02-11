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
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) { 
        router.push('/login')
        return 
      }
      setUser(currentUser)

      const [m, h] = await Promise.all([
        supabase.from('metrics').select('*').order('created_at', { ascending: true }),
        supabase.from('chart_history').select('*').order('created_at', { ascending: true })
      ])
      
      if (m.data) setMetrics(m.data)
      if (h.data) setHistory(h.data)
    } catch (err) {
      console.error("Erro ao carregar dados:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'metrics' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chart_history' }, () => fetchData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const deleteMetric = async (id: any) => {
    if (confirm('Deseja excluir esta métrica permanentemente?')) {
      const { error } = await supabase.from('metrics').delete().eq('id', id)
      if (error) alert(`Erro: ${error.message}`)
      else fetchData()
    }
  }

  if (loading) return (
    <div className="bg-[#0f0f11] h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#6c4bff]/20 border-t-[#6c4bff] rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#0f1013] text-[#e4e4e7]">
      
      <aside className="w-64 bg-[#16171a] flex flex-col border-r border-white/5 shadow-2xl z-10">
        <div className="p-8">
          <h1 className="text-3xl font-extrabold tracking-tighter text-white italic">ERIZON</h1>
          <div className="w-10 h-1 bg-[#6c4bff] mt-2 rounded-full shadow-[0_0_10px_#6c4bff]"></div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          <div className="px-4 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em]">Navegação</div>
          <button onClick={() => router.push('/')} className="w-full flex items-center gap-3 p-4 bg-[#6c4bff] rounded-[20px] text-white text-sm font-bold shadow-lg shadow-[#6c4bff]/20">
            📊 Overview
          </button>
          <button onClick={() => router.push('/pulse')} className="w-full flex items-center gap-3 p-4 text-zinc-500 hover:text-zinc-200 hover:bg-white/5 rounded-[20px] text-sm font-bold transition-all group">
            <span className="group-hover:animate-pulse">⚡</span> Pulse
          </button>
        </nav>

        <div className="p-6">
          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} 
            className="w-full p-4 bg-[#1c1d21] border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-red-500 transition-all"
          >
            Encerrar
          </button>
        </div>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-center mb-10 bg-[#16171a] p-10 rounded-[40px] border border-white/5 shadow-xl">
          <div>
            <h2 className="text-6xl font-black tracking-tighter text-white italic leading-none">Command</h2>
            <p className="text-[#6c4bff] text-xs font-bold mt-3 opacity-90 uppercase tracking-[0.2em] flex items-center gap-2">
               {user?.email}
            </p>
          </div>
          <div className="bg-[#1c1d21] border border-white/10 px-8 py-4 rounded-[24px] flex items-center gap-4 shadow-inner">
            <span className="w-3 h-3 bg-[#00ff9d] rounded-full animate-pulse shadow-[0_0_15px_#00ff9d]"></span>
            <span className="text-white text-xs font-black uppercase tracking-[0.3em]">Online</span>
          </div>
        </header>

        <div className="mb-10 text-white">
          <h3 className="text-xl font-bold mb-8 px-4 italic">Área de Comando</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {metrics.map((item) => (
              <div key={item.id} className="bg-[#1c1d21] border border-white/5 p-10 rounded-[45px] group relative shadow-2xl">
                <button 
                  onClick={() => deleteMetric(item.id)} 
                  className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 text-red-500/30 hover:text-red-500 transition-all"
                >
                  🗑️
                </button>
                <div className="flex justify-between items-start mb-8">
                  <span className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em]">{item.label}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-5xl font-medium tracking-tighter tabular-nums">{item.value}</span>
                  <div className={`${item.is_positive ? 'text-[#00ff9d]' : 'text-red-500'}`}>
                    <span className="text-[10px] font-black bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                      {item.change}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#16171a] border border-white/5 p-12 rounded-[55px] shadow-2xl overflow-hidden">
          <h3 className="text-2xl font-black text-white italic tracking-tight mb-12">Performance Histórica</h3>
          <div className="h-96 w-full text-white">
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
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1c1d21', border: 'none', borderRadius: '16px' }}
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