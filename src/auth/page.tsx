"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Zap, Mail, Lock, Loader2, ArrowRight, Sparkles } from "lucide-react";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/studio"); // Redireciona após login
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
        });
        if (error) throw error;
        alert("Verifique seu e-mail para confirmar o cadastro!");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 rounded-3xl bg-purple-600 shadow-[0_0_30px_rgba(168,85,247,0.4)] mb-6">
            <Zap size={32} className="fill-white" />
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2">
            Growth <span className="text-purple-500">OS</span>
          </h1>
          <p className="text-gray-500 text-xs font-black uppercase tracking-[0.3em]">
            {isLogin ? "Bem-vindo de volta, comandante" : "Inicie sua jornada de escala"}
          </p>
        </div>

        <div className="bg-[#0A0A0A] border border-white/5 rounded-[40px] p-10 backdrop-blur-xl shadow-2xl">
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Email Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-14 pr-6 text-sm outline-none focus:border-purple-500 focus:bg-white/[0.08] transition-all"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Senha de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-14 pr-6 text-sm outline-none focus:border-purple-500 focus:bg-white/[0.08] transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase p-4 rounded-2xl text-center">
                {error}
              </div>
            )}

            <button 
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-800 py-5 rounded-full font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-[0_10px_20px_rgba(168,85,247,0.2)] active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  {isLogin ? "Acessar Painel" : "Criar Conta Elite"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-purple-400 transition-colors"
            >
              {isLogin ? "Não tem conta? Comece agora →" : "Já é membro? Fazer login →"}
            </button>
          </div>
        </div>

        <div className="mt-12 flex justify-center gap-8 opacity-20">
          <Sparkles size={20} />
          <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-white to-transparent self-center"></div>
          <Sparkles size={20} />
        </div>
      </div>
    </div>
  );
}