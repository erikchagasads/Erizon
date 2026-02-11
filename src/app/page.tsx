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

  if (loading) return <div className="bg-[#050505] h-screen flex items-center justify-center text-[#6c4bff] italic animate-pulse text-xs tracking-[0.3em]">ERIZON COMMAND: CARREGANDO...</div>

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-white/5 bg-[#0a0a0f] p-8 flex flex-col">
        <div className="mb-12">
            <h1 className="text-2xl font-black text-[#6c4bff] italic tracking-tighter uppercase">ERIZON</h1>
            <p className="text-[8px] text-gray-500 tracking-[0.4em] uppercase mt-1 font-bold">Growth Intelligence</p>
        </div>
        
        <nav className="space-y-3 flex-1">
          <button onClick={() => router.push('/')} className="w-full text-left p-4 bg-white/[0.03] rounded-2xl text-[#00ff9d] border border-[#00ff9d]/10 flex items-center gap-3 font-bold text-xs uppercase tracking-widest">📊 Overview</button>
          <button onClick={() => router.push('/pulse')} className="w-full text-left p-4 hover:bg-white/[0.03] rounded-2xl transition-all text-gray-500 flex items-center gap-3 font-bold text-xs uppercase tracking-widest">⚡ Pulse (Lançar)</button>
        </nav>
        
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} className="p-4 text-left text-red-500/50 hover:text-red-500 text-[10px] font-bold uppercase tracking-widest transition-colors mt-auto">🚫 Sair do Sistema</button>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-12 overflow-y-auto">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-none">Global Insights</h2>
            <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest mt-2">Operador: {user?.email}</p>
          </div>
          <div className="flex items-center gap-2 bg-[#00ff9d]/5 border border-[#00ff9d]/20 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(0,255,157,0.1)]">
            <div className="w-2 h-2 bg-[#00ff9d] rounded-full animate-ping"></div>
            <span className="text-[#00ff9d] text-[10px] font-black tracking-widest uppercase">Live Connection</span>
          </div>
        </header>

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {metrics.map((item) => (
            <div key={item.id} className="p-8 rounded-[35px] border border-white/5 bg-gradient-to-br from-[#0d0d12] to-[#08080a] group relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#6c4bff]/20 to-transparent"></div>
              <button onClick={() => deleteMetric(item.id)} className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 text-red-500/40 hover:text-red-500 transition-all">🗑️</button>
              <p className="text-gray-500 text-[10px] uppercase font-black tracking-[0.2em] mb-4">{item.label}</p>
              <div className="flex items-end justify-between">
                <h3 className="text-4xl font-black tracking-tighter">{item.value}</h3>
                <span className={`${item.is_positive ? 'text-[#00ff9d] bg-[#00ff9d]/5' : 'text-red-500 bg-red-500/5'} text-[10px] font-black px-3 py-1 rounded-lg border border-white/5`}>
                    {item.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* GRÁFICO REESTILIZADO (O "FIX" DO SEG) */}
        <div className="p-10 rounded-[45px] border border-white/5 bg-[#0a0a0f] relative shadow-2xl overflow-hidden group">
           <div className="flex justify-between items-center mb-10">
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-[0.4em] italic">Performance Histórica</h4>
              <div className="px-3 py-1 rounded-md bg-[#6c4bff]/10 border border-[#6c4bff]/20 text-[#6c4bff] text-[10px] font-bold uppercase">7 Day Telemetry</div>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="day_name" 
                    stroke="#334155" 
                    fontSize={10} 
                    fontWeight="900"
                    tickLine={false} 
                    axisLine={false}
                    interval={0} // Força a exibição de todos os nomes
                    padding={{ left: 35, right: 35 }} // EMPURRA OS PONTOS PARA DENTRO
                    dy={15} // Dá espaço para o nome não colar na linha
                    className="uppercase tracking-tighter"
                  />
                  <YAxis hide={true} domain={['auto', 'auto']} />
                  <Tooltip 
                    cursor={{ stroke: '#6c4bff20', strokeWidth: 2 }}
                    contentStyle={{ backgroundColor: '#0d0d12', border: '1px solid #ffffff10', borderRadius: '20px', padding: '15px' }} 
                    itemStyle={{ color: '#6c4bff', fontWeight: 'bold', fontSize: '14px' }} 
                    labelStyle={{ color: '#555', marginBottom: '5px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#6c4bff" 
                    strokeWidth={5} 
                    fillOpacity={1} 
                    fill="url(#colorAmt)" 
                    dot={{ fill: '#6c4bff', r: 6, strokeWidth: 3, stroke: '#0a0a0f' }} 
                    activeDot={{ r: 9, strokeWidth: 0, fill: '#00ff9d' }} 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-700 text-[10px] font-bold uppercase tracking-[0.5em] border border-dashed border-white/5 rounded-[35px]">Waiting for uplink...</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}