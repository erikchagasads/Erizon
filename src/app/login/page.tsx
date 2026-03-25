"use client";

import ErizonLogo from "@/components/ErizonLogo";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle, Mail, ShieldCheck, RefreshCw, Loader2 } from "lucide-react";

// ─── Input OTP 6 campos ───────────────────────────────────────────────────────
function InputOTP({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key === "Backspace") {
      if (value[idx]) { onChange(value.slice(0, idx) + value.slice(idx + 1)); }
      else if (idx > 0) {
        (document.getElementById(`lotp-${idx - 1}`) as HTMLInputElement)?.focus();
        onChange(value.slice(0, idx - 1) + value.slice(idx));
      }
    }
  }
  function handleChange(e: React.ChangeEvent<HTMLInputElement>, idx: number) {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    if (!char) return;
    const next = value.slice(0, idx) + char + value.slice(idx + 1);
    onChange(next.slice(0, 6));
    if (idx < 5) (document.getElementById(`lotp-${idx + 1}`) as HTMLInputElement)?.focus();
  }
  function handlePaste(e: React.ClipboardEvent) {
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (p) { onChange(p); e.preventDefault(); }
  }

  return (
    <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input key={i} id={`lotp-${i}`}
          type="text" inputMode="numeric" maxLength={1}
          value={d} disabled={disabled}
          onChange={e => handleChange(e, i)}
          onKeyDown={e => handleKey(e, i)}
          onFocus={e => e.target.select()}
          className={`w-11 h-13 rounded-xl text-center text-[20px] font-bold font-mono border outline-none transition-all
            ${d ? "border-fuchsia-500/60 bg-fuchsia-500/[0.08] text-white" : "border-white/[0.10] bg-white/[0.03] text-white/20"}
            focus:border-fuchsia-400 focus:bg-fuchsia-500/[0.10] disabled:opacity-40`}
          style={{ height: "52px" }}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);

  // 2FA
  const [etapa2FA, setEtapa2FA]       = useState<"off" | "aguardando">("off");
  const [userId2FA, setUserId2FA]     = useState("");
  const [codigo, setCodigo]           = useState("");
  const [mfaLoading, setMfaLoading]   = useState(false);
  const [mfaErro, setMfaErro]         = useState("");
  const [reenvioTimer, setTimer]      = useState(0);
  const [confiavel, setConfiavel]     = useState(false);
  const emailRef = useRef(email);
  emailRef.current = email;

  // ── Dispositivo confiável ─────────────────────────────────────────────────
  function getDeviceToken(): string {
    let t = localStorage.getItem("erizon_td");
    if (!t) { t = crypto.randomUUID(); localStorage.setItem("erizon_td", t); }
    return t;
  }

  useEffect(() => {
    if (reenvioTimer <= 0) return;
    const t = setTimeout(() => setTimer(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [reenvioTimer]);

  // ── Login normal → verifica se tem 2FA ativo ──────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Brute-force: bloqueia após 5 tentativas por 2 minutos
    if (blockedUntil && Date.now() < blockedUntil) {
      const secsLeft = Math.ceil((blockedUntil - Date.now()) / 1000);
      setError(`Muitas tentativas. Aguarde ${secsLeft}s para tentar novamente.`);
      return;
    }

    setLoading(true); setError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session) throw new Error("Sessão não criada.");

      const uid = data.user.id;

      // Verifica se tem 2FA ativo
      const { data: mfaConf } = await supabase
        .from("user_mfa_config")
        .select("ativo, email")
        .eq("user_id", uid)
        .eq("ativo", true)
        .maybeSingle();

      if (mfaConf?.ativo) {
        // Verifica se este aparelho é confiável (query enquanto ainda autenticado)
        const deviceToken = getDeviceToken();
        const { data: trusted } = await supabase
          .from("trusted_devices")
          .select("id")
          .eq("user_id", uid)
          .eq("token", deviceToken)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        if (trusted) {
          // Aparelho confiável → pula 2FA
          setAttempts(0); setBlockedUntil(null);
          router.push("/pulse"); router.refresh();
          return;
        }

        // Não confiável — envia código e pede verificação
        await supabase.auth.signOut();
        setUserId2FA(uid);
        await enviarOTP(email);
        setEtapa2FA("aguardando");
      } else {
        // Sem 2FA — login direto
        setAttempts(0); setBlockedUntil(null);
      router.push("/pulse"); router.refresh();
      }
    } catch (err: unknown) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        setBlockedUntil(Date.now() + 2 * 60 * 1000); // 2 min
        setError("Conta bloqueada temporariamente por segurança. Aguarde 2 minutos.");
      } else {
        const remaining = 5 - newAttempts;
        setError(
          (err instanceof Error ? err.message : "Credenciais inválidas.") +
          (remaining <= 2 ? ` (${remaining} tentativa${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""})` : "")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Envia OTP pelo Supabase ───────────────────────────────────────────────
  async function enviarOTP(emailAddr: string) {
    await supabase.auth.signInWithOtp({
      email: emailAddr,
      options: { shouldCreateUser: false },
    });
    setTimer(60);
  }

  // ── Verifica OTP e conclui login ─────────────────────────────────────────
  async function verificarOTP() {
    if (codigo.length < 6) return;
    setMfaLoading(true); setMfaErro("");
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: codigo,
        type: "email",
      });
      if (error) throw error;
      if (!data.session) throw new Error("Sessão não criada.");
      // Salva dispositivo confiável se solicitado
      if (confiavel && userId2FA) {
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from("trusted_devices").insert({
          user_id: userId2FA,
          token: getDeviceToken(),
          expires_at: expires,
        });
      }
      setAttempts(0); setBlockedUntil(null);
      router.push("/pulse"); router.refresh();
    } catch (err: unknown) {
      setMfaErro(err instanceof Error ? err.message : "Código inválido. Tente novamente.");
      setCodigo("");
      setTimeout(() => (document.getElementById("lotp-0") as HTMLInputElement)?.focus(), 50);
    }
    setMfaLoading(false);
  }

  // ── Auto-submit quando 6 dígitos preenchidos ─────────────────────────────
  useEffect(() => {
    if (codigo.length === 6 && etapa2FA === "aguardando" && !mfaLoading) {
      verificarOTP();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  return (
    <div className="min-h-screen bg-[#060608] text-white flex overflow-hidden">
      {/* Glows */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-fuchsia-700/6 blur-[200px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-fuchsia-900/6 blur-[160px] rounded-full pointer-events-none" />
      <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/20 to-transparent z-50" />

      {/* ── Branding esquerdo ── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-16 border-r border-white/[0.04] relative">
        <Link href="/" className="flex items-center gap-3 w-fit group">
          <ErizonLogo size={40} />
          <span className="text-[18px] font-black tracking-tight text-white group-hover:text-white/70 transition-colors">
            Erizon
          </span>
        </Link>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-fuchsia-500/70 mb-5">War Room Access</p>
          <h2 className="text-[52px] font-black italic uppercase tracking-tighter leading-[0.88] mb-6">
            Seus dados.<br />Seu império.<br /><span className="text-fuchsia-500">Sua escala.</span>
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed max-w-xs">Entre no sistema e transforme dados brutos em decisões que geram crescimento real.</p>
        </div>
        <div className="flex gap-8">
          {[{ value: "3.2x", label: "ROI Médio" }, { value: "89%", label: "Precisão IA" }, { value: "24/7", label: "Monitoramento" }].map(m => (
            <div key={m.label} className="flex flex-col gap-1.5">
              <span className="text-3xl font-black italic text-white">{m.value}</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Formulário direito ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-20">
        <div className="lg:hidden mb-10">
          <Link href="/" className="flex items-center gap-3 w-fit">
            <ErizonLogo size={36} />
            <span className="text-[17px] font-black tracking-tight text-white">Erizon</span>
          </Link>
        </div>

        <div className="w-full max-w-[380px] px-4 sm:px-0">
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-fuchsia-500/15 bg-fuchsia-500/5 mb-8">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-fuchsia-500" />
            </span>
            <span className="text-[10px] font-semibold text-fuchsia-400 tracking-wide">Sistema Online</span>
          </div>

          {/* ── ETAPA 1: Senha ── */}
          {etapa2FA === "off" && (
            <>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-tight mb-2">
                Bem-vindo<br /><span className="text-fuchsia-500">de volta.</span>
              </h1>
              <p className="text-gray-600 text-sm mb-10">Acesse sua conta para continuar operando.</p>

              {error && (
                <div className="mb-6 p-4 bg-red-500/8 border border-red-500/20 rounded-2xl flex items-center gap-3">
                  <AlertCircle size={15} className="text-red-400 shrink-0" />
                  <span className="text-sm text-red-400">{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 pl-1">Email</label>
                  <input type="email" placeholder="seu@email.com"
                    className="w-full bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.14] focus:border-fuchsia-500/60 px-5 py-4 rounded-2xl outline-none transition-all text-sm text-white placeholder-gray-700"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 pl-1">Senha</label>
                  <input type="password" placeholder="••••••••"
                    className="w-full bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.14] focus:border-fuchsia-500/60 px-5 py-4 rounded-2xl outline-none transition-all text-sm text-white placeholder-gray-700"
                    value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={loading}
                    className="group w-full flex items-center justify-center gap-3 bg-gradient-to-r from-fuchsia-600 to-violet-700 hover:from-fuchsia-500 hover:to-violet-600 px-6 py-4 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-[0_0_30px_rgba(147,51,234,0.2)] hover:shadow-[0_0_50px_rgba(147,51,234,0.35)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]">
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Validando...</>
                      : <>Entrar no Sistema <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" /></>
                    }
                  </button>
                </div>
              </form>

              <div className="mt-8 flex flex-col items-center gap-3">
                <p className="text-sm text-gray-600">
                  Não tem conta?{" "}
                  <Link href="/signup" className="text-fuchsia-400 hover:text-fuchsia-300 font-semibold transition-colors">Criar agora</Link>
                </p>
                <Link href="/" className="text-[10px] font-semibold uppercase tracking-widest text-gray-700 hover:text-fuchsia-400 transition-colors">← Voltar ao início</Link>
                <div className="flex items-center gap-3 mt-2">
                  <Link href="/privacidade" className="text-[10px] text-white/15 hover:text-white/40 transition-colors">Privacidade</Link>
                  <span className="text-white/10">·</span>
                  <Link href="/termos" className="text-[10px] text-white/15 hover:text-white/40 transition-colors">Termos de Uso</Link>
                </div>
              </div>
            </>
          )}

          {/* ── ETAPA 2: Código 2FA ── */}
          {etapa2FA === "aguardando" && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center">
                  <ShieldCheck size={18} className="text-fuchsia-400" />
                </div>
                <div>
                  <h1 className="text-[20px] font-black tracking-tight">Verificação em duas etapas</h1>
                  <p className="text-[11px] text-gray-600 mt-0.5">Sua conta está protegida com 2FA</p>
                </div>
              </div>

              {/* Instrução */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-fuchsia-500/[0.06] border border-fuchsia-500/15 mb-6">
                <Mail size={14} className="text-fuchsia-400 mt-0.5 shrink-0" />
                <p className="text-[12px] text-white/50 leading-relaxed">
                  Enviamos um código de 6 dígitos para{" "}
                  <span className="text-white/80 font-medium">{email}</span>.
                  Verifique sua caixa de entrada.
                </p>
              </div>

              {/* Erro */}
              {mfaErro && (
                <div className="flex items-center gap-2 text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
                  <AlertCircle size={13} className="shrink-0" /> {mfaErro}
                </div>
              )}

              {/* Campos OTP */}
              <div className="mb-6">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/25 mb-4 text-center">Digite o código recebido</p>
                <InputOTP value={codigo} onChange={setCodigo} disabled={mfaLoading} />
              </div>

              {/* Confiar neste dispositivo */}
              <label className="flex items-center gap-3 px-1 mb-5 cursor-pointer group">
                <div
                  onClick={() => setConfiavel(v => !v)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all
                    ${confiavel ? "bg-fuchsia-600 border-fuchsia-500" : "bg-white/[0.04] border-white/[0.12] group-hover:border-white/25"}`}
                >
                  {confiavel && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <div>
                  <p className="text-[12px] text-white/60 group-hover:text-white/80 transition-colors">Confiar neste dispositivo por 30 dias</p>
                  <p className="text-[10px] text-white/25">Você não precisará digitar o código novamente aqui</p>
                </div>
              </label>

              {/* Botão confirmar */}
              <button onClick={verificarOTP} disabled={mfaLoading || codigo.length < 6}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-700 hover:from-fuchsia-500 hover:to-violet-600 text-[13px] font-bold text-white transition-all disabled:opacity-40 shadow-[0_0_30px_rgba(147,51,234,0.2)]">
                {mfaLoading
                  ? <><Loader2 size={14} className="animate-spin" /> Verificando...</>
                  : <><ShieldCheck size={14} /> Confirmar e entrar</>
                }
              </button>

              {/* Reenviar / voltar */}
              <div className="flex items-center justify-between mt-5 text-[12px]">
                <button onClick={() => { setEtapa2FA("off"); setCodigo(""); setMfaErro(""); }}
                  className="text-white/25 hover:text-white/50 transition-colors">
                  ← Voltar ao login
                </button>
                {reenvioTimer > 0 ? (
                  <span className="text-white/20 tabular-nums">Reenviar em {reenvioTimer}s</span>
                ) : (
                  <button onClick={() => enviarOTP(email)} disabled={mfaLoading}
                    className="flex items-center gap-1.5 text-white/30 hover:text-fuchsia-400 transition-colors">
                    <RefreshCw size={11} /> Reenviar código
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
