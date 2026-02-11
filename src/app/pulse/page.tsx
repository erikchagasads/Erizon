'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase' // AJUSTADO: volta uma pasta para achar a lib
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
    const { error } = await supabase.from('metrics').insert([{ label, value, change, is_positive: isPositive }])
    
    if (error) {
      alert('Erro: ' + error.message)
    } else {
      router.push('/')
    }
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-erizon-black p-6">
      <div className="w-full max-w-md bg-erizon-cosmic/50 p-8 rounded-2xl border border-white/10 backdrop-blur-xl">
        <h2 className="text-2xl font-bold text-erizon-purple mb-6 italic">PULSE: Nova Métrica</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <input placeholder="Ex: ROAS" className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-erizon-purple" onChange={(e) => setLabel(e.target.value)} required />
          <input placeholder="Ex: 5.2x" className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-erizon-purple" onChange={(e) => setValue(e.target.value)} required />
          <input placeholder="Ex: +12%" className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-erizon-purple" onChange={(e) => setChange(e.target.value)} required />
          <div className="flex items-center gap-4 text-erizon-lunar">
            <span>Positivo?</span>
            <input type="checkbox" checked={isPositive} onChange={(e) => setIsPositive(e.target.checked)} className="w-5 h-5 accent-erizon-mint" />
          </div>
          <button disabled={loading} className="w-full bg-erizon-ia py-3 rounded-lg font-bold text-erizon-black transition-all">
            {loading ? 'SALVANDO...' : 'LANÇAR MÉTRICA'}
          </button>
        </form>
      </div>
    </main>
  )
}