"use client"
import { createBrowserClient } from '@supabase/ssr'
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Zap, Lock, Mail, ArrowRight } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      alert("Erro no acesso: " + error.message)
      setLoading(false)
    } else {
      router.refresh() // Atualiza o estado da rota
      window.location.href = '/pulse' // Redirecionamento forçado
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#0A0A0A] border border-white/5 p-10 rounded-[45px]">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4 text-purple-600"><Zap size={40} fill="currentColor" /></div>
          <h1 className="text-3xl font-black italic uppercase">War Room Access</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" 
            placeholder="EMAIL"
            className="w-full bg-black border border-white/10 p-5 rounded-2xl outline-none focus:border-purple-600 transition-all font-bold text-xs"
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
          <input 
            type="password" 
            placeholder="SENHA"
            className="w-full bg-black border border-white/10 p-5 rounded-2xl outline-none focus:border-purple-600 transition-all font-bold text-xs"
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-purple-600 p-5 rounded-2xl font-black uppercase italic tracking-widest hover:bg-purple-500 transition-all"
          >
            {loading ? "VALIDANDO..." : "ENTRAR NO TERMINAL"}
          </button>
        </form>
      </div>
    </div>
  )
}