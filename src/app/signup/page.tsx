"use client";

import ErizonLogo from "@/components/ErizonLogo";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle, CheckCircle } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function garantirTrial() {
    await fetch("/api/billing/trial", { method: "POST" }).catch(() => null);
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (password !== confirmPassword) { setError("As senhas não coincidem."); setLoading(false); return; }
    if (password.length < 6) { setError("A senha deve ter no mínimo 6 caracteres."); setLoading(false); return; }
    if (!aceitouTermos) { setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar."); setLoading(false); return; }
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
      if (error) throw error;
      if (data.session) {
        await garantirTrial();
        router.push("/onboarding");
      } else {
        setSuccess(true);
      }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setError(error.message || "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    if (password.length === 0) return null;
    if (password.length < 6)  return { label: "Senha fraca",    color: "bg-red-500",     bars: 1 };
    if (password.length < 8)  return { label: "Senha razoável", color: "bg-yellow-500",  bars: 2 };
    if (password.length < 12) return { label: "Senha boa",      color: "bg-blue-500",    bars: 3 };
    return                           { label: "Senha forte",    color: "bg-emerald-500", bars: 4 };
  };
  const strength = passwordStrength();

  return (
    <div className="min-h-screen bg-[#060608] text-white flex overflow-hidden">

      {/* Glows */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-fuchsia-700/6 blur-[200px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-fuchsia-900/6 blur-[160px] rounded-full pointer-events-none" />
      <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/20 to-transparent z-50" />

      {/* ── Lado esquerdo — branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-16 border-r border-white/[0.04]">

        <Link href="/" className="flex items-center gap-3 w-fit group">
          <ErizonLogo size={40} />
          <span className="text-[18px] font-black tracking-tight text-white group-hover:text-white/70 transition-colors">
            Erizon
          </span>
        </Link>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-fuchsia-500/70 mb-5">Novo Acesso</p>
          <h2 className="text-[52px] font-black italic uppercase tracking-tighter leading-[0.88] mb-6">
            Crie sua conta<br />e comece<br /><span className="text-fuchsia-500">a escalar.</span>
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
            Acesso completo ao sistema. Configure em minutos, resultados a partir do primeiro dia.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {[
            { num: "01", label: "Crie sua conta",         active: true  },
            { num: "02", label: "Confirme seu email",     active: false },
            { num: "03", label: "Conecte o Facebook Ads", active: false },
            { num: "04", label: "Comece a operar",        active: false },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black border transition-all ${
                s.active ? "bg-gradient-to-r from-fuchsia-600 to-violet-700 border-fuchsia-600 text-white" : "border-white/10 text-gray-700"
              }`}>
                {s.num}
              </div>
              <span className={`text-[11px] font-semibold tracking-wide ${s.active ? "text-white" : "text-gray-700"}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Lado direito — formulário ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-16 overflow-y-auto">

        <div className="lg:hidden mb-10">
          <Link href="/" className="flex items-center gap-3 w-fit">
            <ErizonLogo size={36} />
            <span className="text-[17px] font-black tracking-tight text-white">Erizon</span>
          </Link>
        </div>

        <div className="w-full max-w-[380px] px-4 sm:px-0">

          {success ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <CheckCircle size={28} className="text-emerald-400" />
              </div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-3">
                Conta <span className="text-emerald-400">criada!</span>
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed mb-2">
                Enviamos um link de confirmação para
              </p>
              <p className="text-white font-semibold text-sm mb-6">{email}</p>
              <p className="text-gray-600 text-xs mb-8 leading-relaxed">
                Confirme seu email e volte para fazer login.<br />Verifique também a caixa de spam.
              </p>
              <Link href="/login">
                <button className="group w-full flex items-center justify-center gap-3 bg-gradient-to-r from-fuchsia-600 to-violet-700 hover:from-fuchsia-500 hover:to-violet-600 px-6 py-4 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-[0_0_30px_rgba(147,51,234,0.2)] hover:shadow-[0_0_50px_rgba(147,51,234,0.35)]">
                  Ir para o Login
                  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-fuchsia-500/15 bg-fuchsia-500/5 mb-6">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-fuchsia-500" />
                  </span>
                  <span className="text-[10px] font-semibold text-fuchsia-400 tracking-wide">Cadastro Gratuito</span>
                </div>
                <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-tight mb-2">
                  Criar<br /><span className="text-fuchsia-500">nova conta.</span>
                </h1>
                <p className="text-gray-600 text-sm">Preencha os dados abaixo para começar.</p>
              </div>

              {error && (
                <div className="mb-5 p-4 bg-red-500/8 border border-red-500/20 rounded-2xl flex items-center gap-3">
                  <AlertCircle size={15} className="text-red-400 shrink-0" />
                  <span className="text-sm text-red-400">{error}</span>
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 pl-1">Nome Completo</label>
                  <input
                    type="text"
                    placeholder="Seu nome"
                    className="w-full bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.14] focus:border-fuchsia-500/60 px-5 py-4 rounded-2xl outline-none transition-all text-sm text-white placeholder-gray-700"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 pl-1">Email</label>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    className="w-full bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.14] focus:border-fuchsia-500/60 px-5 py-4 rounded-2xl outline-none transition-all text-sm text-white placeholder-gray-700"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 pl-1">Senha</label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.14] focus:border-fuchsia-500/60 px-5 py-4 rounded-2xl outline-none transition-all text-sm text-white placeholder-gray-700"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  {strength && (
                    <div className="pt-1.5 space-y-1 px-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.bars ? strength.color : "bg-white/10"}`} />
                        ))}
                      </div>
                      <p className="text-[10px] font-semibold text-gray-600">{strength.label}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 pl-1">Confirmar Senha</label>
                  <input
                    type="password"
                    placeholder="Repita a senha"
                    className={`w-full bg-white/[0.03] border px-5 py-4 rounded-2xl outline-none transition-all text-sm text-white placeholder-gray-700 ${
                      confirmPassword.length > 0
                        ? password === confirmPassword ? "border-emerald-500/40" : "border-red-500/40"
                        : "border-white/[0.08] hover:border-white/[0.14] focus:border-fuchsia-500/60"
                    }`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  {confirmPassword.length > 0 && (
                    <p className={`text-[10px] font-semibold pl-1 ${password === confirmPassword ? "text-emerald-500" : "text-red-400"}`}>
                      {password === confirmPassword ? "✓ Senhas coincidem" : "✗ Senhas não coincidem"}
                    </p>
                  )}
                </div>

                {/* ── Checkbox LGPD ── */}
                <div
                  className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                    aceitouTermos
                      ? "border-fuchsia-500/30 bg-fuchsia-500/[0.04]"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.10]"
                  }`}
                  onClick={() => setAceitouTermos(v => !v)}
                >
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    aceitouTermos
                      ? "bg-gradient-to-r from-fuchsia-600 to-violet-700 border-fuchsia-600"
                      : "border-white/20 bg-transparent"
                  }`}>
                    {aceitouTermos && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <p className="text-[12px] text-white/40 leading-relaxed select-none">
                    Li e concordo com os{" "}
                    <Link
                      href="/termos"
                      target="_blank"
                      className="text-fuchsia-400 hover:text-fuchsia-300 underline underline-offset-2 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Termos de Uso
                    </Link>
                    {" "}e a{" "}
                    <Link
                      href="/privacidade"
                      target="_blank"
                      className="text-fuchsia-400 hover:text-fuchsia-300 underline underline-offset-2 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Política de Privacidade
                    </Link>
                    , incluindo o tratamento dos meus dados conforme a LGPD.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !aceitouTermos}
                    className="group w-full flex items-center justify-center gap-3 bg-gradient-to-r from-fuchsia-600 to-violet-700 hover:from-fuchsia-500 hover:to-violet-600 px-6 py-4 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-[0_0_30px_rgba(147,51,234,0.2)] hover:shadow-[0_0_50px_rgba(147,51,234,0.35)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
                  >
                    {loading ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Criando conta...</>
                    ) : (
                      <>Criar Conta <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" /></>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-8 flex flex-col items-center gap-3">
                <p className="text-sm text-gray-600">
                  Já tem uma conta?{" "}
                  <Link href="/login" className="text-fuchsia-400 hover:text-fuchsia-300 font-semibold transition-colors">Entrar</Link>
                </p>
                <Link href="/" className="text-[10px] font-semibold uppercase tracking-widest text-gray-700 hover:text-fuchsia-400 transition-colors">
                  ← Voltar ao início
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
