'use client'
import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert('Erro ao acessar a galáxia: ' + error.message)
    } else {
      router.push('/') // Manda para a home se der certo
    }
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-erizon-black p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-white/10 bg-erizon-cosmic/50 p-8 backdrop-blur-xl shadow-2xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-erizon-white">Bem-vindo à <span className="text-erizon-purple">ERIZON</span></h2>
          <p className="mt-2 text-erizon-lunar">Inicie sua jornada data-driven</p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Seu e-mail estelar"
              className="w-full rounded-lg bg-erizon-black/50 border border-white/10 p-3 text-white outline-none focus:border-erizon-purple transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Sua senha secreta"
              className="w-full rounded-lg bg-erizon-black/50 border border-white/10 p-3 text-white outline-none focus:border-erizon-purple transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-erizon-ia py-3 font-bold text-erizon-black hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'AUTENTICANDO...' : 'ENTRAR NO SISTEMA'}
          </button>
        </form>
      </div>
    </main>
  )
}