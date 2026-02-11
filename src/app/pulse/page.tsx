'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
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

    const { error } = await supabase.from('metrics').insert([
      { label, value, change, is_positive: isPositive }
    ])

    if (error) {
      alert("Erro ao salvar: " + error.message)
    } else {
      router.push('/')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0f1013] text-[#e4e4e7] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-[#16171a] p-10 rounded-[40px] border border-white/5 shadow-2xl">
        <h2 className="text-3xl font-extrabold italic mb-8 text-white tracking-tighter">Novo Lançamento</h2>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-2">Nome da Métrica</label>
            <input 
              required
              className="w-full mt-2 p-4 bg-[#1c1d21] border border-white/5 rounded-2xl focus:border-[#6c4bff] outline-none transition-all"
              placeholder="Ex: Vendas Totais"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-2">Valor</label>
              <input 
                required
                className="w-full mt-2 p-4 bg-[#1c1d21] border border-white/5 rounded-2xl focus:border-[#6c4bff] outline-none transition-all"
                placeholder="Ex: 520000"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-2">Variação</label>
              <input 
                required
                className="w-full mt-2 p-4 bg-[#1c1d21] border border-white/5 rounded-2xl focus:border-[#6c4bff] outline-none transition-all"
                placeholder="Ex: +15%"
                value={change}
                onChange={(e) => setChange(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-[#1c1d21] rounded-2xl border border-white/5">
            <span className="text-xs font-bold flex-1">Tendência Positiva?</span>
            <button 
              type="button"
              onClick={() => setIsPositive(!isPositive)}
              className={`w-12 h-6 rounded-full transition-all relative ${isPositive ? 'bg-[#00ff9d]' : 'bg-zinc-700'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${isPositive ? 'right-1' : 'left-1'}`} />
            </button>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={() => router.push('/')}
              className="flex-1 p-4 bg-zinc-800 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-700 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 p-4 bg-[#6c4bff] rounded-2xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-[#6c4bff]/20"
            >
              {loading ? 'Salvando...' : 'Lançar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}