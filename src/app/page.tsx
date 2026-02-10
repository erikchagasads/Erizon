'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  // --- LÓGICA DE SEGURANÇA (O CÉREBRO) ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login') // Se não estiver logado, volta pro login
      } else {
        setUser(user)
      }
    }
    checkUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Tela de carregamento enquanto o Supabase responde
  if (!user) {
    return (
      <div className="bg-erizon-black h-screen flex items-center justify-center">
        <div className="text-erizon-purple italic animate-pulse text-xl">
          Iniciando sistemas neurais da ERIZON...
        </div>
      </div>
    )
  }

  // --- INTERFACE DO DASHBOARD (O CORPO) ---
  return (
    <div className="flex h-screen bg-erizon-black text-erizon-white">
      
      {/* SIDEBAR (MENU LATERAL) */}
      <aside className="w-64 border-r border-white/10 bg-erizon-cosmic/30 p-6 flex flex-col">
        <h1 className="text-2xl font-bold text-erizon-purple mb-10 italic tracking-tighter">
          ERIZON <span className="text-white text-xs block not-italic opacity-50">SPACE TECH</span>
        </h1>
        
        <nav className="space-y-4 flex-1">
          <div className="p-3 bg-white/5 rounded-lg text-erizon-mint border border-erizon-mint/20 cursor-default">
            📊 Overview
          </div>
          <div className="p-3 hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-erizon-lunar">
            ⚡ Pulse (Ads)
          </div>
          <div className="p-3 hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-erizon-lunar">
            🌀 Orbit (CRM)
          </div>
          <div className="p-3 hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-erizon-lunar">
            🛠️ Forge (AI)
          </div>
        </nav>

        {/* BOTÃO DE SAIR */}
        <button 
          onClick={handleLogout}
          className="p-3 text-left text-erizon-red/60 hover:text-erizon-red hover:bg-erizon-red/5 rounded-lg transition-all border border-transparent hover:border-erizon-red/20 text-sm font-medium"
        >
          🚫 Encerrar Sessão
        </button>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-10 overflow-y-auto">
        
        {/* CABEÇALHO */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Growth Command</h2>
            <p className="text-erizon-lunar text-sm">Bem-vindo ao cockpit, {user.email}</p>
          </div>
          
          <div className="flex items-center gap-4 bg-white/5 p-2 rounded-full pr-4 border border-white/5">
            <div className="w-10 h-10 rounded-full bg-erizon-ia flex items-center justify-center text-erizon-black font-bold">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-erizon-lunar">SISTEMA ONLINE</span>
          </div>
        </header>

        {/* CARTÕES DE NÚMEROS (STATS) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="ROAS Global" value="4.8x" change="+12%" color="text-erizon-mint" />
          <StatCard title="Leads Gerados" value="1,240" change="+5%" color="text-erizon-plasma" />
          <StatCard title="CPL Médio" value="R$ 12,40" change="-8%" color="text-erizon-mint" />
        </div>

        {/* ÁREA DO GRÁFICO (WORK IN PROGRESS) */}
        <div className="mt-10 h-80 rounded-2xl border border-white/10 bg-erizon-cosmic/20 border-dashed flex flex-col items-center justify-center text-erizon-lunar">
          <div className="w-12 h-12 mb-4 rounded-full border-2 border-erizon-purple/30 border-t-erizon-purple animate-spin"></div>
          <p className="italic">Sincronizando dados com redes neurais...</p>
        </div>

      </main>
    </div>
  )
}

// COMPONENTE AUXILIAR PARA OS CARTÕES
function StatCard({ title, value, change, color }: any) {
  return (
    <div className="p-6 rounded-2xl border border-white/10 bg-erizon-cosmic/30 backdrop-blur-sm hover:border-white/20 transition-all">
      <p className="text-erizon-lunar text-xs uppercase tracking-wider font-semibold">{title}</p>
      <div className="flex items-end justify-between mt-2">
        <h3 className="text-3xl font-bold">{value}</h3>
        <span className={`${color} text-xs font-bold bg-white/5 px-2 py-1 rounded-md`}>
          {change}
        </span>
      </div>
    </div>
  )
}