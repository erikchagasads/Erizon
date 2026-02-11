'use client'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase' // Caminho conforme sua estrutura src/app/lib
import { useRouter } from 'next/navigation'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [metrics, setMetrics] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      // 1. Verifica sessão do usuário
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // 2. Busca dados das duas tabelas em paralelo
      const [metricsRes, historyRes] = await Promise.all([
        supabase.from('metrics').select('*'),
        // Ordenamos pelo created_at para a linha do gráfico fazer sentido
        supabase.from('chart_history').select('*').order('created_at', { ascending: true })
      ])

      if (metricsRes.data) setMetrics(metricsRes.data)
      if (historyRes.data) setHistory(historyRes.data)
      
      setLoading(false)
    }
    fetchData()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div className="bg-erizon-black h-screen flex items-center justify-center text-erizon-purple italic animate-pulse text-xl">
      Sincronizando com a rede neural ERIZON...
    </div>
  )

  return (
    <div className="flex h-screen bg-erizon-black text-erizon-white font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-white/10 bg-erizon-cosmic/30 p-6 flex flex-col shadow-2xl">
        <h1 className="text-2xl font-bold text-erizon-purple mb-10 italic tracking-tighter">ERIZON</h1>
        
        <nav className="space-y-4 flex-1">
          <button 
            onClick={() => router.push('/')}
            className="w-full text-left p-3 bg-white/5 rounded-lg text-erizon-mint border border-erizon-mint/20 flex items-center gap-3"
          >
            📊 Overview
          </button>
          
          <button 
            onClick={() => router.push('/pulse')}
            className="w-full text-left p-3 hover:bg-white/5 rounded-lg transition-all text-erizon-lunar flex items-center gap-3 border border-transparent hover:border-white/10"
          >
            ⚡ Pulse (Lançar)
          </button>
        </nav>

        <button 
          onClick={handleLogout}
          className="p-3 text-left text-erizon-red/60 hover:text-erizon-red transition-colors text-sm font-medium mt-auto"
        >
          🚫 Encerrar Sessão
        </button>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-10 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-erizon-purple/5 via-transparent to-transparent">
        
        <header className="mb-10 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Growth Command</h2>
            <p className="text-erizon-lunar text-sm opacity-80">Operador: {user?.email}</p>
          </div>
          <div className="bg-erizon-mint/10 text-erizon-mint border border-erizon-mint/20 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase shadow-[0_0_15px_rgba(0,255,157,0.1)]">
            Banco de Dados Conectado
          </div>
        </header>

        {/* GRID DE MÉTRICAS (CARTÕES) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {metrics.length > 0 ? (
            metrics.map((item, index) => (
              <div 
                key={item.id || `metric-${index}`} 
                className="p-6 rounded-2xl border border-white/10 bg-erizon-cosmic/30 backdrop-blur-md hover:border-erizon-purple/30 transition-all group"
              >
                <p className="text-erizon-lunar text-[10px] uppercase font-bold tracking-[0.2em] mb-2 group-hover:text-erizon-purple transition-colors">
                  {item.label}
                </p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-bold tracking-tight text-white">{item.value}</h3>
                  <span className={`${item.is_positive ? 'text-erizon-mint' : 'text-erizon-red'} text-xs font-bold bg-white/5 px-2 py-1 rounded-md border border-white/5`}>
                    {item.change}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 p-10 border border-dashed border-white/10 rounded-2xl text-center text-erizon-lunar italic">
              Nenhuma métrica ativa. Acesse o módulo Pulse.
            </div>
          )}
        </div>

        {/* ÁREA DO GRÁFICO (RECHARTS) */}
        <div className="p-8 rounded-3xl border border-white/10 bg-erizon-cosmic/20 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-erizon-purple/50 to-transparent"></div>
          
          <h4 className="text-lg font-bold mb-8 text-erizon-lunar italic flex items-center gap-2">
            <span className="w-2 h-2 bg-erizon-purple rounded-full animate-ping"></span>
            Histórico de Tração (Real-time)
          </h4>
          
          <div className="h-80 w-full">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="day_name" 
                    stroke="#475569" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0d0d12', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#6c4bff', fontWeight: 'bold' }}
                    cursor={{ stroke: '#6c4bff30', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#6c4bff" 
                    strokeWidth={4} 
                    dot={{ fill: '#6c4bff', r: 5, strokeWidth: 2, stroke: '#0d0d12' }}
                    activeDot={{ r: 8, fill: '#00ff9d', strokeWidth: 0 }}
                    animationDuration={2000}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-erizon-lunar italic gap-2">
                <p>Aguardando telemetria do Supabase...</p>
                <span className="text-[10px] opacity-50 font-mono">TABELA: chart_history</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}