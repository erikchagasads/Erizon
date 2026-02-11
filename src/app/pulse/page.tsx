'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Pulse() {
  const [activeTab, setActiveTab] = useState<'cards' | 'chart'>('cards')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')
  const [change, setChange] = useState('')
  const [isPositive, setIsPositive] = useState(true)
  const [dayName, setDayName] = useState('')
  const [amount, setAmount] = useState('')

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) router.push('/login')
      else setUserId(session.user.id)
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
    <div className="min-h-screen bg-[#0a0a0b] text-white p-8 flex flex-col items-center justify-center font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#6c4bff]/5 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md bg-[#16171a]/80 backdrop-blur-2xl rounded-[50px] border border-white/5 p-12 shadow-2xl z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Data_Pulse</h2>
          <p className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.4em] mt-4 text-center">Injeção de Telemetria</p>
        </div>
        
        <div className="flex bg-[#1c1d21] p-2 rounded-[25px] mb-10 border border-white/5 shadow-inner">
          <button onClick={() => setActiveTab('cards')} className={`flex-1 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'cards' ? 'bg-[#6c4bff] text-white shadow-lg' : 'text-zinc-500'}`}>Cards</button>
          <button onClick={() => setActiveTab('chart')} className={`flex-1 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'chart' ? 'bg-[#6c4bff] text-white shadow-lg' : 'text-zinc-500'}`}>Gráfico</button>
        </div>

        {activeTab === 'cards' ? (
          <form onSubmit={saveCard} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-4">Nome_Métrica</label>
              <input required placeholder="EX: VENDAS" className="w-full p-5 bg-[#1c1d21] border border-white/5 rounded-[22px] outline-none focus:border-[#6c4bff]/50 text-white transition-all text-sm font-bold" onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-4">Valor</label>
                <input required placeholder="10.500" className="w-full p-5 bg-[#1c1d21] border border-white/5 rounded-[22px] outline-none focus:border-[#6c4bff]/50 text-white transition-all text-sm font-bold" onChange={(e) => setValue(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-4">Var</label>
                <input required placeholder="+15%" className="w-full p-5 bg-[#1c1d21] border border-white/5 rounded-[22px] outline-none focus:border-[#6c4bff]/50 text-white transition-all text-sm font-bold" onChange={(e) => setChange(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between p-5 bg-[#1c1d21] rounded-[22px] border border-white/5">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Growth_Status</span>
                <input type="checkbox" checked={isPositive} onChange={() => setIsPositive(!isPositive)} className="w-5 h-5 accent-[#00ff9d]" />
            </div>
            <button type="submit" disabled={loading} className="w-full p-6 bg-[#6c4bff] rounded-[22px] font-black text-xs uppercase tracking-[0.3em] shadow-lg shadow-[#6c4bff]/20 active:scale-95 transition-all mt-4">
                {loading ? 'Sincronizando...' : 'Executar Lançamento'}
            </button>
          </form>
        ) : (
          <form onSubmit={saveChart} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-4">Dia_Semana</label>
              <input required placeholder="EX: SEG" className="w-full p-5 bg-[#1c1d21] border border-white/5 rounded-[22px] outline-none focus:border-[#6c4bff]/50 text-white transition-all text-sm font-bold" onChange={(e) => setDayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-4">Telemetria_Valor</label>
              <input required type="number" placeholder="000" className="w-full p-5 bg-[#1c1d21] border border-white/5 rounded-[22px] outline-none focus:border-[#6c4bff]/50 text-white transition-all text-sm font-bold" onChange={(e) => setAmount(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="w-full p-6 bg-[#6c4bff] rounded-[22px] font-black text-xs uppercase tracking-[0.3em] shadow-lg shadow-[#6c4bff]/20 active:scale-95 transition-all mt-6">
                {loading ? 'Sincronizando...' : 'Atualizar Gráfico'}
            </button>
          </form>
        )}
        <button onClick={() => router.push('/')} className="w-full mt-8 text-[9px] font-black text-zinc-700 uppercase tracking-[0.3em] hover:text-white transition-colors">Abortar Operação</button>
      </div>
    </div>
  )
}