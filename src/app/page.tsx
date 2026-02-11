'use client'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase' // AJUSTADO: agora aponta para a pasta local
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [metrics, setMetrics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const { data } = await supabase.from('metrics').select('*')
      if (data) setMetrics(data)
      setLoading(false)
    }
    getData()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div className="bg-erizon-black h-screen flex items-center justify-center text-erizon-purple italic animate-pulse">
      Sincronizando sistemas...
    </div>
  )

  return (
    <div className="flex h-screen bg-erizon-black text-erizon-white font-sans">
      <aside className="w-64 border-r border-white/10 bg-erizon-cosmic/30 p-6 flex flex-col">
        <h1 className="text-2xl font-bold text-erizon-purple mb-10 italic">ERIZON</h1>
        <nav className="space-y-4 flex-1">
          <button onClick={() => router.push('/')} className="w-full text-left p-3 bg-white/5 rounded-lg text-erizon-mint border border-erizon-mint/20">📊 Overview</button>
          <button onClick={() => router.push('/pulse')} className="w-full text-left p-3 hover:bg-white/5 rounded-lg transition-colors text-erizon-lunar">⚡ Pulse (Cadastrar)</button>
        </nav>
        <button onClick={handleLogout} className="p-3 text-left text-erizon-red/60 hover:text-erizon-red text-sm font-medium">🚫 Sair</button>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto">
        <header className="mb-10">
          <h2 className="text-3xl font-bold">Growth Command</h2>
          <p className="text-erizon-lunar text-sm">Operador: {user?.email}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {metrics.map((item) => (
            <div key={item.id} className="p-6 rounded-2xl border border-white/10 bg-erizon-cosmic/30 backdrop-blur-sm">
              <p className="text-erizon-lunar text-xs uppercase font-bold tracking-widest">{item.label}</p>
              <div className="flex items-end justify-between mt-2">
                <h3 className="text-3xl font-bold">{item.value}</h3>
                <span className={`${item.is_positive ? 'text-erizon-mint' : 'text-erizon-red'} text-xs font-bold bg-white/5 px-2 py-1 rounded`}>
                  {item.change}
                </span>
              </div>
            </div>
          ))}
          {metrics.length === 0 && <p className="col-span-3 text-erizon-lunar text-center p-10 border border-dashed border-white/10 rounded-xl">Nenhum dado. Vá em Pulse para cadastrar!</p>}
        </div>
      </main>
    </div>
  )
}