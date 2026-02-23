"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, AlertCircle } from "lucide-react";
import Image from "next/image";

export default function RegisterPage() {
  const [formData, setFormData] = useState({ email: "", password: "", nome: "" });
  const [loading, setLoading]   = useState(false);
  const [erro, setErro]         = useState("");
  const router = useRouter();

  // FIX: createBrowserClient em vez de createClient genérico
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro("");

    const { error } = await supabase.auth.signUp({
      email:    formData.email,
      password: formData.password,
      options:  { data: { full_name: formData.nome } },
    });

    if (error) {
      // FIX: erro visível na UI em vez de alert()
      setErro(error.message);
      setLoading(false);
      return;
    }

    // FIX: vai para /onboarding após cadastro (não /login)
    router.push("/onboarding");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white flex flex-col items-center justify-center p-6">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-600/10 blur-[100px] rounded-full" />

      <div className="mb-8 z-10">
        <Image src="/logo-erizon.png" alt="Erizon Logo" width={150} height={150} />
      </div>

      <div className="max-w-[380px] w-full space-y-6 z-10">
        <h2 className="text-center text-[10px] font-bold uppercase tracking-[0.4em] text-gray-500">
          Crie sua Credencial
        </h2>

        {erro && (
          <div className="flex items-center gap-2 p-4 bg-red-500/[0.08] border border-red-500/20 rounded-2xl">
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <span className="text-sm text-red-400">{erro}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="relative">
            <input
              required
              className="w-full bg-white/[0.03] border border-white/10 p-5 rounded-2xl outline-none focus:border-purple-600 transition-all font-light text-sm pl-12"
              placeholder="Nome Completo"
              onChange={e => setFormData({ ...formData, nome: e.target.value })}
            />
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
          </div>
          <div className="relative">
            <input
              type="email" required
              className="w-full bg-white/[0.03] border border-white/10 p-5 rounded-2xl outline-none focus:border-purple-600 transition-all font-light text-sm pl-12"
              placeholder="E-mail"
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
          </div>
          <div className="relative">
            <input
              type="password" required
              className="w-full bg-white/[0.03] border border-white/10 p-5 rounded-2xl outline-none focus:border-purple-600 transition-all font-light text-sm pl-12"
              placeholder="Crie uma Senha"
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-purple-600 text-white font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl hover:bg-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processando..." : "Finalizar Cadastro"}
          </button>
        </form>
      </div>
    </div>
  );
}