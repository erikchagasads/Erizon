'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Pulse() {
  const [activeTab, setActiveTab] = useState<'cards' | 'chart'>('cards')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  // Estados das Métricas
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')
  const [change, setChange] = useState('')
  const [isPositive, setIsPositive] = useState(true)

  // Estados do Gráfico
  const [dayName, setDayName] = useState('')
  const [amount, setAmount] = useState('')

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
      else setUserId(user.id)
    }
    checkUser()
  }, [router])

  const saveCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setLoading(true)
    const { error } = await supabase.from('metrics').insert([
      { label, value, change, is_positive: isPositive, user_id: userId }
    ])
    if (error) alert(error.message)
    else router.push('/')
    setLoading(false)
  }

  const saveChart = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setLoading(true)
    const { error } = await supabase.from('chart_history').insert([
      { day_name: dayName.toUpperCase(), amount: Number(amount), user_id: userId }
    ])
    if (error) alert(error.message)
    else router.push('/')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0f1013] text-white p-8 flex flex-col items-center font-sans">
      <div className="w-full max-w-md bg-[#16171a] rounded-[40px] border border-white/5 p-10 shadow-2xl mt-10">
        <h2 className="text-3xl font-black italic mb-8 tracking-tighter uppercase text-center">Lançamento de Dados</h2>
        
        <div className="flex bg-[#1c1d21] p-1.5 rounded-2xl mb-8">
          <button onClick={() => setActiveTab('cards')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'cards' ? 'bg-[#6c4bff] text-white' : 'text-zinc-500'}`}>Métricas</button>
          <button onClick={() => setActiveTab('chart')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'chart' ? 'bg-[#6c4bff] text-white' : 'text-zinc-500'}`}>Gráfico</button>
        </div>

        {activeTab === 'cards' ? (
          <form onSubmit={saveCard} className="space-y-5">
            <input required placeholder="Nome (Ex: ROI)" className="w-full p-4 bg-[#1c1d21] border border-white/5 rounded-2xl outline-none focus:border-[#6c4bff] transition-all" onChange={(e) => setLabel(e.target.value)} />
            <input required placeholder="Valor (Ex: 12.500)" className="w-full p-4 bg-[#1c1d21] border border-white/5 rounded-2xl outline-none focus:border-[#6c4bff] transition-all" onChange={(e) => setValue(e.target.value)} />
            <input required placeholder="Variação (Ex: +12%)" className="w-full p-4 bg-[#1c1d21] border border-white/5 rounded-2xl outline-none focus:border-[#6c4bff] transition-all" onChange={(e) => setChange(e.target.value)} />
            <div className="flex items-center justify-between p-4 bg-[#1c1d21] rounded-2xl border border-white/5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Positivo?</span>
                <input type="checkbox" checked={isPositive} onChange={() => setIsPositive(!isPositive)} className="w-5 h-5 accent-[#00ff9d]" />
            </div>
            <button type="submit" disabled={loading} className="w-full p-5 bg-[#6c4bff] rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-[#6c4bff]/20">
                {loading ? 'Salvando...' : 'Lançar Métrica'}
            </button>
          </form>
        ) : (
          <form onSubmit={saveChart} className="space-y-5">
            <input required placeholder="Dia (Ex: SEG, TER...)" className="w-full p-4 bg-[#1c1d21] border border-white/5 rounded-2xl outline-none focus:border-[#6c4bff] transition-all" onChange={(e) => setDayName(e.target.value)} />
            <input required type="number" placeholder="Valor (Ex: 850)" className="w-full p-4 bg-[#1c1d21] border border-white/5 rounded-2xl outline-none focus:border-[#6c4bff] transition-all" onChange={(e) => setAmount(e.target.value)} />
            <button type="submit" disabled={loading} className="w-full p-5 bg-[#6c4bff] rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-[#6c4bff]/20">
                {loading ? 'Salvando...' : 'Lançar no Gráfico'}
            </button>
          </form>
        )}
        <button onClick={() => router.push('/')} className="w-full mt-6 text-[9px] font-bold text-zinc-600 uppercase tracking-widest hover:text-white transition-colors">Voltar</button>
      </div>
    </div>
  )
}