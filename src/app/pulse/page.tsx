'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase' // AJUSTADO: Sobe uma pasta para achar a lib
import { useRouter } from 'next/navigation'

export default function Pulse() {
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')
  const [change, setChange] = useState('')
  const [isPositive, setIsPositive] = useState(true)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('metrics')
      .insert([{ label, value, change, is_positive: isPositive }])

    if (error) {
      alert("Erro: " + error.message)
    } else {
      router.push('/')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-erizon-black text-white p-10 flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-erizon-cosmic/40 p-8 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl">
        <h2 className="text-2xl font-bold mb-8 italic text-erizon-purple">PULSE: Nova Métrica</h2>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-erizon-lunar font-bold mb-2 block">Nome da Métrica</label>
            <input required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: ROAS MÉDIO" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:border-erizon-purple outline-none transition-all" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-erizon-lunar font-bold mb-2 block">Valor Atual</label>
            <input required value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ex: 5.2x" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:border-erizon-purple outline-none transition-all" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-erizon-lunar font-bold mb-2 block">Variação (Texto)</label>
            <input required value={change} onChange={(e) => setChange(e.target.value)} placeholder="Ex: +15%" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:border-erizon-purple outline-none transition-all" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={isPositive} onChange={(e) => setIsPositive(e.target.checked)} className="w-5 h-5 accent-erizon-mint" />
            <label className="text-sm text-erizon-lunar">Resultado Positivo?</label>
          </div>
          
          <button type="submit" disabled={loading} className="w-full bg-erizon-purple p-4 rounded-xl font-bold hover:bg-opacity-80 transition-all uppercase tracking-widest text-sm shadow-lg shadow-erizon-purple/20">
            {loading ? 'Sincronizando...' : 'Lançar Métrica'}
          </button>
        </form>
      </div>
    </div>
  )
}