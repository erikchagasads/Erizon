'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert('Acesso negado: ' + error.message)
    else router.push('/')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* Efeito de Glow de Fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#6c4bff]/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#6c4bff]/5 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-[400px] z-10">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black italic tracking-tighter text-white uppercase leading-none">
            ERIZON
          </h1>
          <div className="flex justify-center mt-4">
            <div className="h-[2px] w-12 bg-[#6c4bff] rounded-full"></div>
          </div>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.5em] mt-6">
            Intelligence Command
          </p>
        </div>

        <div className="bg-[#16171a]/80 backdrop-blur-xl border border-white/5 p-10 rounded-[45px] shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Email_ID</label>
              <input 
                required
                type="email"
                placeholder="nome@exemplo.com"
                className="w-full mt-2 p-5 bg-[#1c1d21] border border-white/5 rounded-[22px] outline-none focus:border-[#6c4bff]/50 text-white transition-all placeholder:text-zinc-700"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Chave_Acesso</label>
              <input 
                required
                type="password"
                placeholder="••••••••"
                className="w-full mt-2 p-5 bg-[#1c1d21] border border-white/5 rounded-[22px] outline-none focus:border-[#6c4bff]/50 text-white transition-all placeholder:text-zinc-700"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full p-5 bg-[#6c4bff] text-white rounded-[22px] font-black text-xs uppercase tracking-[0.3em] shadow-lg shadow-[#6c4bff]/20 hover:scale-[1.02] active:scale-95 transition-all mt-4"
            >
              {loading ? 'Autenticando...' : 'Entrar no Sistema'}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-zinc-600 text-[9px] font-bold uppercase tracking-widest">
              Acesso Restrito a Operadores Autorizados
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}