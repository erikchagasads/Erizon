'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Pulse() {
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')
  const [day, setDay] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSaveMetric = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('metrics').insert([{ label, value, change: '+0%', is_positive: true }])
    if (!error) {
        alert('Métrica lançada com sucesso!')
        router.push('/')
    } else {
        alert('Erro ao lançar: ' + error.message)
    }
    setLoading(false)
  }

  const handleSaveChart = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('chart_history').insert([{ day_name: day, amount: Number(amount) }])
    if (!error) {
      alert('Ponto no gráfico adicionado!')
      setDay('')
      setAmount('')
    } else {
      alert('Erro no gráfico: ' + error.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-10 flex flex-col items-center gap-10">
      <div className="text-center">
        <h1 className="text-4xl font-black italic tracking-tighter italic uppercase">ERIZON PULSE</h1>
        <p className="text-gray-500 text-[10px] tracking-[0.4em] uppercase font-bold mt-2">Central de Lançamentos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
        {/* CARD FORM */}
        <div className="bg-[#0d0d12] p-10 rounded-[40px] border border-white/5 shadow-2xl">
          <h2 className="text-xl font-bold mb-8 flex items-center gap-3 italic">
            <span className="text-orange-500">⚡</span> Novo Card
          </h2>
          <form onSubmit={handleSaveMetric} className="space-y-6">
            <input required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: ROAS" className="w-full bg-white/[0.03] border border-white/10 p-5 rounded-2xl outline-none focus:border-orange-500/50 transition-all" />
            <input required value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ex: 5.2x" className="w-full bg-white/[0.03] border border-white/10 p-5 rounded-2xl outline-none focus:border-orange-500/50 transition-all" />
            <button className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-500 hover:text-white transition-all">Lançar Métrica</button>
          </form>
        </div>

        {/* CHART FORM */}
        <div className="bg-[#0d0d12] p-10 rounded-[40px] border border-white/5 shadow-2xl">
          <h2 className="text-xl font-bold mb-8 flex items-center gap-3 italic">
            <span className="text-blue-500">📈</span> Ponto no Gráfico
          </h2>
          <form onSubmit={handleSaveChart} className="space-y-6">
            <input required value={day} onChange={(e) => setDay(e.target.value)} placeholder="Ex: Seg ou 11/02" className="w-full bg-white/[0.03] border border-white/10 p-5 rounded-2xl outline-none focus:border-blue-500/50 transition-all" />
            <input required type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex: 1500" className="w-full bg-white/[0.03] border border-white/10 p-5 rounded-2xl outline-none focus:border-blue-500/50 transition-all" />
            <button className="w-full bg-white/5 text-gray-400 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-500 hover:text-white transition-all">Atualizar Gráfico</button>
          </form>
        </div>
      </div>

      <button onClick={() => router.push('/')} className="mt-10 text-[10px] font-bold uppercase tracking-[0.3em] text-gray-600 hover:text-white transition-colors">← Voltar para o Dashboard</button>
    </div>
  )
}