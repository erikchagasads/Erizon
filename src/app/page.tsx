'use client'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useRouter } from 'next/navigation'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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
      supabase.from('metrics').select('*'),
      supabase.from('chart_history').select('*').order('created_at', { ascending: true })
    ])

    if (metricsRes.data) setMetrics(metricsRes.data)
    if (historyRes.data) setHistory(historyRes.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [router])

  // FUNÇÃO PARA DELETAR MÉTRICA
  const deleteMetric = async (id: string) => {
    if (confirm('Deseja excluir esta métrica permanentemente?')) {
      const { error } = await supabase.from('metrics').delete().eq('id', id)
      if (error) alert('Erro ao deletar')
      else fetchData() // Recarrega os dados após deletar
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div className="bg-erizon-black h-screen flex items-center justify-center text-erizon-purple italic animate-pulse">Sincronizando cockpit...</div>

  return (
    <div className="flex h-screen bg-erizon-black text-erizon-white font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-white/10 bg-erizon-cosmic/30 p-6 flex flex-col">
        <h1 className="text-2xl font-bold text-erizon-purple mb-10 italic">ERIZON</h1>
        <nav className="space-y-4 flex-1">
          <button onClick={() => router.push('/')} className="w-full text-left p-3 bg-white/5 rounded-lg text-erizon-mint border border-erizon-mint/20 flex items-center gap-2">📊 Overview</button>
          <button onClick={() => router.push('/pulse')} className="w-full text-left p-3 hover:bg-white/5 rounded-lg transition-all text-erizon-lunar flex items-center gap-2">⚡ Pulse (Lançar)</button>
        </nav>
        <button onClick={handleLogout} className="p-3 text-left text-erizon-red/60 hover:text-erizon-red text-sm mt-auto transition-colors">🚫 Encerrar Sessão</button>
      </aside>

      {/* CONTEÚDO */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="mb-10 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tighter">Growth Command</h2>
            <p className="text-erizon-lunar text-sm">{user?.email}</p>
          </div>
          <div className="bg-erizon-mint/10 text-erizon-mint border border-erizon-mint/20 px-4 py-1 rounded-full text-[10px] font-bold shadow-[0_0_15px_rgba(0,255,157,0.1)]">ONLINE</div>
        </header>

        {/* MÉTRICAS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {metrics.map((item, index) => (
            <div key={item.id || index} className="p-6 rounded-2xl border border-white/10 bg-erizon-cosmic/30 backdrop-blur-sm group relative hover:border-erizon-purple/40 transition-all">
              
              {/* BOTÃO DELETAR (Aparece no Hover) */}
              <button 
                onClick={() => deleteMetric(item.id)}
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-erizon-red hover:scale-110 transition-all text-xs bg-erizon-red/10 p-1 rounded"
              >
                🗑️
              </button>

              <p className="text-erizon-lunar text-xs uppercase font-bold tracking-widest mb-2">{item.label}</p>
              <div className="flex items-end justify-between">
                <h3 className="text-3xl font-bold">{item.value}</h3>
                <span className={`${item.is_positive ? 'text-erizon-mint' : 'text-erizon-red'} text-xs font-bold`}>{item.change}</span>
              </div>
            </div>
          ))}
        </div>

        {/* GRÁFICO */}
        <div className="p-8 rounded-3xl border border-white/10 bg-erizon-cosmic/20 backdrop-blur-md relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-erizon-purple to-transparent"></div>
           <h4 className="text-lg font-bold mb-6 text-erizon-lunar italic">Performance Histórica</h4>
           <div className="h-80 w-full">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="day_name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0d0d12', border: '1px solid #ffffff20', borderRadius: '12px' }} itemStyle={{ color: '#6c4bff' }} />
                  <Line type="monotone" dataKey="amount" stroke="#6c4bff" strokeWidth={4} dot={{ fill: '#6c4bff', r: 5 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-erizon-lunar italic">Aguardando telemetria...</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}