"use client";

import Image from "next/image";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) { router.push("/pulse"); router.refresh(); }
    } catch (error: any) {
      setError(error.message || "Credenciais inválidas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060608] text-white flex overflow-hidden">

      {/* Glows sutis */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-purple-700/6 blur-[200px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-purple-900/6 blur-[160px] rounded-full pointer-events-none" />
      <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent z-50" />

      {/* ── Lado esquerdo — branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-16 border-r border-white/[0.04] relative">

        <Link href="/">
          <Image src="/logo-erizon.png" alt="Erizon" width={140} height={46} className="object-contain opacity-90 hover:opacity-60 transition-opacity" priority />
        </Link>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-purple-500/70 mb-5">War Room Access</p>
          <h2 className="text-[52px] font-black italic uppercase tracking-tighter leading-[0.88] mb-6">
            Seus dados.<br />
            Seu império.<br />
            <span className="text-purple-500">Sua escala.</span>
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
            Entre no sistema e transforme dados brutos em decisões que geram crescimento real.
          </p>
        </div>

        {/* Métricas decorativas */}
        <div className="flex gap-8">
          {[
            { value: "3.2x", label: "ROI Médio" },
            { value: "89%", label: "Precisão IA" },
            { value: "24/7", label: "Monitoramento" },
          ].map((m) => (
            <div key={m.label} className="flex flex-col gap-1.5">
              <span className="text-3xl font-black italic text-white">{m.value}</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Lado direito — formulário ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-20">

        <div className="lg:hidden mb-10">
          <Link href="/">
            <Image src="/logo-erizon.png" alt="Erizon" width={120} height={40} className="object-contain" priority />
          </Link>
        </div>

        <div className="w-full max-w-[380px]">

          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-purple-500/15 bg-purple-500/5 mb-8">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500" />
            </span>
            <span className="text-[10px] font-semibold text-purple-400 tracking-wide">Sistema Online</span>
          </div>

          <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-tight mb-2">
            Bem-vindo<br /><span className="text-purple-500">de volta.</span>
          </h1>
          <p className="text-gray-600 text-sm mb-10">Acesse sua conta para continuar operando.</p>

          {/* Erro */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/8 border border-red-500/20 rounded-2xl flex items-center gap-3">
              <AlertCircle size={15} className="text-red-400 shrink-0" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 pl-1">Email</label>
              <input
                type="email"
                placeholder="seu@email.com"
                className="w-full bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.14] focus:border-purple-500/60 px-5 py-4 rounded-2xl outline-none transition-all text-sm text-white placeholder-gray-700"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 pl-1">Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.14] focus:border-purple-500/60 px-5 py-4 rounded-2xl outline-none transition-all text-sm text-white placeholder-gray-700"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="group w-full flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-500 px-6 py-4 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-[0_0_30px_rgba(147,51,234,0.2)] hover:shadow-[0_0_50px_rgba(147,51,234,0.35)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    Entrar no Sistema
                    <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-sm text-gray-600">
              Não tem conta?{" "}
              <Link href="/signup" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
                Criar agora
              </Link>
            </p>
            <Link href="/" className="text-[10px] font-semibold uppercase tracking-widest text-gray-700 hover:text-purple-400 transition-colors">
              ← Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}