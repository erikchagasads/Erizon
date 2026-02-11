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
        alert('Card de Métrica lançado!')
        router.push('/')
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
      alert('Erro: ' + error.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-erizon-black text-white p-10 flex flex-col items-center gap-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-erizon-purple italic">ERIZON PULSE</h1>
        <p className="text-erizon-lunar text-xs tracking-[0.3em] uppercase mt-2">Central de Lançamentos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-5xl">
        
        {/* FORMULÁRIO 1: CARDS (O QUE VOCÊ JÁ TINHA) */}
        <div className="bg-erizon-cosmic/40 p-8 rounded-3xl border border-white/10 backdrop-blur-xl">
          <h2 className="text-xl font-bold mb-6 text-erizon-purple flex items-center gap-2">⚡ Novo Card</h2>
          <form onSubmit={handleSaveMetric} className="space-y-4">
            <input required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: ROAS" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-erizon-purple" />
            <input required value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ex: 5.2x" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-erizon-purple" />
            <button className="w-full bg-erizon-purple p-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:opacity-80 transition-all">Lançar Métrica</button>
          </form>
        </div>

        {/* FORMULÁRIO 2: GRÁFICO (A NOVIDADE) */}
        <div className="bg-erizon-cosmic/40 p-8 rounded-3xl border border-white/10 backdrop-blur-xl border-dashed border-erizon-mint/30">
          <h2 className="text-xl font-bold mb-6 text-erizon-mint flex items-center gap-2">📈 Ponto no Gráfico</h2>
          <form onSubmit={handleSaveChart} className="space-y-4">
            <input required value={day} onChange={(e) => setDay(e.target.value)} placeholder="Ex: Seg ou 11/02" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-erizon-mint" />
            <input required type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex: 1500" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-erizon-mint" />
            <button className="w-full bg-erizon-mint text-black p-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:opacity-80 transition-all">Atualizar Gráfico</button>
          </form>
        </div>

      </div>

      <button onClick={() => router.push('/')} className="text-erizon-lunar hover:text-white text-xs uppercase tracking-widest transition-colors">← Voltar para o Dashboard</button>
    </div>
  )
}