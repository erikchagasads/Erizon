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
    setLoading(false)
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

  if (loading) return <div className="bg-[#050505] h-screen flex items-center justify-center text-[#6c4bff] italic animate-pulse text-xs tracking-[0.3em] font-mono">ESTABELECENDO CONEXÃO...</div>

  return (
    <div className="flex h-screen bg-[#050505] text-slate-200 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-72 border-r border-white/5 bg-[#08080a] p-10 flex flex-col">
        <div className="mb-14">
            <h1 className="text-3xl font-black text-[#6c4bff] italic tracking-tighter leading-none">ERIZON</h1>
            <p className="text-[9px] text-slate-500 tracking-[0.5em] uppercase mt-2 font-bold opacity-80">Growth Intelligence</p>
        </div>
        
        <nav className="space-y-4 flex-1">
          <button onClick={() => router.push('/')} className="w-full text-left p-4 bg-[#6c4bff]/10 rounded-2xl text-[#6c4bff] border border-[#6c4bff]/20 flex items-center gap-3 font-bold text-[11px] uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(108,75,255,0.1)]">
            <span className="text-lg">📊</span> Overview
          </button>
          <button onClick={() => router.push('/pulse')} className="w-full text-left p-4 hover:bg-white/[0.03] rounded-2xl transition-all text-slate-500 flex items-center gap-3 font-bold text-[11px] uppercase tracking-widest group">
            <span className="group-hover:animate-pulse">⚡</span> Pulse (Lançar)
          </button>
        </nav>
        
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} className="p-4 text-left text-red-500/40 hover:text-red-500 text-[10px] font-black uppercase tracking-[0.2em] transition-all mt-auto border-t border-white/5 pt-8">
          Sair do Sistema
        </button>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-16 overflow-y-auto custom-scrollbar">
        <header className="mb-16 flex justify-between items-start">
          <div>
            <h2 className="text-5xl font-black tracking-tight text-white italic leading-none">COMMAND<br/><span className="text-[#6c4bff] not-italic">CENTER</span></h2>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.3em] mt-4 flex items-center gap-2">
              <span className="w-1 h-1 bg-[#6c4bff] rounded-full"></span> {user?.email}
            </p>
          </div>
          <div className="flex items-center gap-3 bg-[#00ff9d]/5 border border-[#00ff9d]/20 px-6 py-3 rounded-2xl">
            <div className="w-2 h-2 bg-[#00ff9d] rounded-full animate-pulse shadow-[0_0_10px_#00ff9d]"></div>
            <span className="text-[#00ff9d] text-[10px] font-black tracking-[0.3em] uppercase">Status: Ativo</span>
          </div>
        </header>

        {/* CARDS COM FONTE MELHORADA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {metrics.map((item) => (
            <div key={item.id} className="p-10 rounded-[40px] border border-white/5 bg-gradient-to-b from-[#0d0d12] to-[#08080a] group relative shadow-2xl hover:border-[#6c4bff]/30 transition-all duration-500">
              <button onClick={() => deleteMetric(item.id)} className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 text-red-500/50 hover:text-red-500 transition-all bg-red-500/5 p-2 rounded-xl">🗑️</button>
              <p className="text-slate-500 text-[11px] uppercase font-black tracking-[0.3em] mb-6">{item.label}</p>
              <div className="flex items-baseline justify-between">
                <h3 className="text-5xl font-light tracking-tighter text-white tabular-nums">{item.value}</h3>
                <span className={`${item.is_positive ? 'text-[#00ff9d]' : 'text-red-500'} text-[11px] font-black px-3 py-1 rounded-lg bg-white/[0.02] border border-white/5`}>
                    {item.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* GRÁFICO FINAL */}
        <div className="p-12 rounded-[50px] border border-white/5 bg-[#08080a] relative shadow-inner overflow-hidden">
           <div className="flex justify-between items-center mb-12">
              <div>
                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em] mb-1">Performance Histórica</h4>
                <div className="h-1 w-12 bg-[#6c4bff] rounded-full"></div>
              </div>
              <div className="flex gap-4">
                <div className="text-[10px] font-bold text-[#6c4bff] uppercase tracking-widest bg-[#6c4bff]/10 px-4 py-2 rounded-xl border border-[#6c4bff]/20">Live Feed</div>
              </div>
           </div>
           
           <div className="h-96 w-full">
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
                    fontSize={11} 
                    fontWeight="900"
                    tickLine={false} 
                    axisLine={false}
                    interval={0}
                    padding={{ left: 40, right: 40 }}
                    dy={20}
                    className="uppercase tracking-[0.2em] opacity-50"
                  />
                  <YAxis hide={true} domain={['auto', 'auto']} />
                  <Tooltip 
                    cursor={{ stroke: '#6c4bff30', strokeWidth: 2 }}
                    contentStyle={{ backgroundColor: '#0d0d12', border: '1px solid #ffffff10', borderRadius: '24px', padding: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} 
                    itemStyle={{ color: '#6c4bff', fontWeight: '900', fontSize: '18px', textTransform: 'uppercase' }} 
                    labelStyle={{ color: '#475569', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'black', tracking: '0.2em' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#6c4bff" 
                    strokeWidth={6} 
                    fillOpacity={1} 
                    fill="url(#colorAmt)" 
                    dot={{ fill: '#6c4bff', r: 7, strokeWidth: 4, stroke: '#08080a' }} 
                    activeDot={{ r: 10, strokeWidth: 0, fill: '#00ff9d' }} 
                    animationDuration={2500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-700 text-[11px] font-black uppercase tracking-[0.5em]">Aguardando Sincronização...</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}