'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function AIStudio() {
  const [activeTab, setActiveTab] = useState<'copy' | 'creative' | 'script' | 'analyst'>('copy')
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [userMetrics, setUserMetrics] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')
      const { data } = await supabase.from('metrics').select('label, value, change').eq('user_id', session.user.id)
      if (data) setUserMetrics(data)
    }
    checkUser()
  }, [router])

  const generateAI = async () => {
    setLoading(true)
    setResult("Processando inteligência...")
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab, prompt, contextData: activeTab === 'analyst' ? userMetrics : null }),
      })
      const data = await res.json()
      setResult(data.text)
    } catch (e) {
      setResult("Erro ao conectar com a API.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-[#0f1013] text-[#e4e4e7] font-sans">
      <aside className="w-64 bg-[#16171a] flex flex-col border-r border-white/5 shadow-2xl">
        <div className="p-8">
          <h1 className="text-3xl font-black italic text-white uppercase tracking-tighter">ERIZON</h1>
          <div className="w-10 h-1 bg-[#6c4bff] mt-2 rounded-full shadow-[0_0_10px_#6c4bff]"></div>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <button onClick={() => router.push('/')} className="w-full flex items-center gap-3 p-4 text-zinc-500 hover:text-white hover:bg-white/5 rounded-[20px] text-sm font-bold transition-all">📊 Overview</button>
          <button className="w-full flex items-center gap-3 p-4 bg-[#6c4bff] rounded-[22px] text-white text-sm font-bold shadow-lg shadow-[#6c4bff]/20">🧠 Studio</button>
          <button onClick={() => router.push('/pulse')} className="w-full flex items-center gap-3 p-4 text-zinc-500 hover:text-white hover:bg-white/5 rounded-[20px] text-sm font-bold transition-all group">⚡ Pulse</button>
        </nav>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto">
        <header className="mb-10 text-6xl font-black tracking-tighter text-white italic uppercase leading-none">AI_Studio</header>
        <div className="flex bg-[#16171a] p-2 rounded-[30px] mb-8 border border-white/5 w-fit">
          {['copy', 'creative', 'script', 'analyst'].map((tab) => (
            <button key={tab} onClick={() => {setActiveTab(tab as any); setResult('')}} className={`px-8 py-3 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-[#6c4bff] text-white shadow-lg shadow-[#6c4bff]/40' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {tab === 'analyst' ? 'Analista Data' : tab}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-[#16171a] p-10 rounded-[45px] border border-white/5 shadow-2xl">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6 italic">Comando</h3>
            <textarea className="w-full h-80 bg-[#1c1d21] border border-white/5 rounded-[30px] p-6 outline-none focus:border-[#6c4bff]/50 text-white transition-all resize-none font-medium" placeholder="Descreva sua necessidade..." value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            <button onClick={generateAI} disabled={loading} className="w-full mt-8 p-6 bg-[#6c4bff] text-white rounded-[25px] font-black text-xs uppercase tracking-[0.4em] hover:scale-[1.02] transition-all shadow-xl shadow-[#6c4bff]/30">
              {loading ? 'SINCROIZANDO...' : 'EXECUTAR COMANDO'}
            </button>
          </div>
          <div className="bg-[#1c1d21] p-10 rounded-[45px] border border-white/5 shadow-2xl flex flex-col min-h-[500px]">
            <h3 className="text-[10px] font-black text-[#6c4bff] uppercase tracking-[0.3em] mb-6 italic">Relatório</h3>
            <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-medium flex-1 overflow-y-auto">
              {result || "Aguardando entrada..."}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}