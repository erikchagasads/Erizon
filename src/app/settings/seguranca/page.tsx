"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { SkeletonPage } from "@/components/ops/AppShell";
import { getSupabase } from "@/lib/supabase";
import { toast } from "@/components/Toast";
import { useSessionGuard } from "@/app/hooks/useSessionGuard";
import {
  ArrowLeft, Shield, Loader2, CheckCircle2, LogOut,
  KeyRound, Smartphone, ShieldCheck, ShieldOff,
  AlertTriangle, RefreshCw, Mail,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Etapa   = "inativo" | "codigo_enviado" | "ativo";
type MFAConf = { email: string; ativo: boolean } | null;

// ─── Input OTP — 6 campos separados estilo Instagram ─────────────────────────
function InputOTP({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key === "Backspace") {
      if (value[idx]) {
        onChange(value.slice(0, idx) + value.slice(idx + 1));
      } else if (idx > 0) {
        (document.getElementById(`otp-${idx - 1}`) as HTMLInputElement)?.focus();
        onChange(value.slice(0, idx - 1) + value.slice(idx));
      }
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>, idx: number) {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    if (!char) return;
    const next = value.slice(0, idx) + char + value.slice(idx + 1);
    onChange(next.slice(0, 6));
    if (idx < 5) {
      (document.getElementById(`otp-${idx + 1}`) as HTMLInputElement)?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) { onChange(pasted); e.preventDefault(); }
  }

  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={e => handleChange(e, i)}
          onKeyDown={e => handleKey(e, i)}
          onFocus={e => e.target.select()}
          className={`
            w-11 h-14 rounded-2xl text-center text-[22px] font-bold font-mono
            border outline-none transition-all
            ${d
              ? "border-purple-500/60 bg-purple-500/[0.08] text-white"
              : "border-white/[0.10] bg-white/[0.03] text-white/20"
            }
            focus:border-purple-400 focus:bg-purple-500/[0.10]
            disabled:opacity-40
          `}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SegurancaPage() {
  const router   = useRouter();
  const supabase = getSupabase();

  useSessionGuard();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [userId, setUserId]   = useState("");
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(true);

  // ── Senha ─────────────────────────────────────────────────────────────────
  const [enviando, setEnviando]   = useState(false);
  const [senhaOk, setSenhaOk]     = useState(false);
  const [senhaErro, setSenhaErro] = useState<string | null>(null);

  // ── 2FA ───────────────────────────────────────────────────────────────────
  const [mfaConf, setMfaConf]           = useState<MFAConf>(null);
  const [etapa, setEtapa]               = useState<Etapa>("inativo");
  const [codigo, setCodigo]             = useState("");
  const [mfaLoading, setMfaLoad]        = useState(false);
  const [mfaErro, setMfaErro]           = useState<string | null>(null);
  const [reenvioTimer, setTimer]        = useState(0);
  const [confirmDesativar, setConfirm]  = useState(false);

  // ── Carrega config MFA ────────────────────────────────────────────────────
  const carregarMFA = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("user_mfa_config")
      .select("*")
      .eq("user_id", uid)
      .eq("ativo", true)
      .maybeSingle();
    if (data) {
      setMfaConf(data as MFAConf);
      setEtapa("ativo");
    }
  }, [supabase]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      setEmail(user.email ?? "");
      await carregarMFA(user.id);
      setLoading(false);
    }
    load();
  }, [supabase, router, carregarMFA]);

  // ── Countdown reenvio ─────────────────────────────────────────────────────
  useEffect(() => {
    if (reenvioTimer <= 0) return;
    const t = setTimeout(() => setTimer(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [reenvioTimer]);

  // ── Alterar senha ─────────────────────────────────────────────────────────
  async function enviarResetSenha() {
    setEnviando(true); setSenhaErro(null); setSenhaOk(false);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings/seguranca`,
    });
    if (error) setSenhaErro(error.message);
    else setSenhaOk(true);
    setEnviando(false);
  }

  async function sairDeTudo() {
    await supabase.auth.signOut({ scope: "global" });
    router.push("/login");
  }

  // ── Enviar OTP (Supabase nativo — gratuito) ───────────────────────────────
  async function enviarCodigo() {
    setMfaLoad(true); setMfaErro(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setCodigo("");
      setEtapa("codigo_enviado");
      setTimer(60);
    } catch (e: unknown) {
      setMfaErro(e instanceof Error ? e.message : "Erro ao enviar o código.");
    }
    setMfaLoad(false);
  }

  // ── Verificar OTP ─────────────────────────────────────────────────────────
  async function verificarCodigo() {
    if (codigo.length < 6) return;
    setMfaLoad(true); setMfaErro(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: codigo,
        type: "email",
      });
      if (error) throw error;

      await supabase.from("user_mfa_config").upsert({
        user_id:    userId,
        canal:      "email",
        email,
        ativo:      true,
        ativado_em: new Date().toISOString(),
      }, { onConflict: "user_id" });

      setMfaConf({ email, ativo: true });
      setEtapa("ativo");
      setCodigo("");
      toast.success("2FA ativado! Sua conta está protegida.");
    } catch (e: unknown) {
      setMfaErro(e instanceof Error ? e.message : "Código inválido. Tente novamente.");
      setCodigo("");
      setTimeout(() => (document.getElementById("otp-0") as HTMLInputElement)?.focus(), 50);
    }
    setMfaLoad(false);
  }

  // ── Desativar 2FA ─────────────────────────────────────────────────────────
  async function desativarMFA() {
    setMfaLoad(true);
    await supabase.from("user_mfa_config").update({ ativo: false }).eq("user_id", userId);
    setMfaConf(null);
    setEtapa("inativo");
    setCodigo(""); setConfirm(false);
    setMfaLoad(false);
    toast.success("2FA desativado.");
  }

  function reiniciar() {
    setEtapa("inativo");
    setCodigo(""); setMfaErro(null);
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return <SkeletonPage cols={1} />;

  return (
    <div className="flex min-h-screen bg-[#060609] text-white">
      <Sidebar />
      <main className="md:ml-[60px] pb-20 md:pb-0 flex-1 px-8 py-8 max-w-2xl">

        {/* Voltar */}
        <button onClick={() => router.push("/settings")}
          className="flex items-center gap-2 text-[11px] text-white/30 hover:text-white/60 transition-colors mb-6">
          <ArrowLeft size={13} /> Configurações
        </button>

        {/* Título */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-1">
            <Shield size={16} className="text-rose-400" />
            <h1 className="text-[22px] font-bold">Segurança</h1>
          </div>
          <p className="text-[12px] text-white/30">Gerencie sua senha, sessões e autenticação de dois fatores.</p>
        </div>

        <div className="space-y-4">

          {/* ─── Alterar senha ─────────────────────────────────── */}
          <div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.03] p-6">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound size={14} className="text-rose-400" />
              <span className="text-[14px] font-semibold">Alterar senha</span>
            </div>
            <p className="text-[12px] text-white/30 mb-4">
              Enviaremos um link de redefinição para{" "}
              <span className="text-white/50">{email}</span>.
            </p>

            {senhaErro && (
              <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-3">
                {senhaErro}
              </p>
            )}
            {senhaOk && (
              <div className="flex items-center gap-2 text-[12px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-3">
                <CheckCircle2 size={13} /> E-mail enviado! Verifique sua caixa de entrada.
              </div>
            )}

            <button onClick={enviarResetSenha} disabled={enviando}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600/80 hover:bg-rose-500 text-[13px] font-semibold rounded-xl transition-all disabled:opacity-50">
              {enviando ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
              Enviar link de redefinição
            </button>
          </div>

          {/* ─── 2FA ───────────────────────────────────────────── */}
          <div className={`rounded-2xl border p-6 transition-all ${
            etapa === "ativo"
              ? "border-emerald-500/20 bg-emerald-500/[0.03]"
              : "border-purple-500/15 bg-purple-500/[0.03]"
          }`}>

            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Smartphone size={14} className={etapa === "ativo" ? "text-emerald-400" : "text-purple-400"} />
                <span className="text-[14px] font-semibold">Autenticação de dois fatores</span>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                etapa === "ativo"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : etapa === "codigo_enviado"
                  ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                  : "bg-white/[0.04] border-white/[0.07] text-white/30"
              }`}>
                {etapa === "ativo" ? "Ativo" : etapa === "codigo_enviado" ? "Verificando..." : "Inativo"}
              </span>
            </div>

            <p className="text-[12px] text-white/30 mb-5">
              Além da senha, você confirma o acesso com um código enviado ao seu e-mail — gratuito e sem necessidade de app.
            </p>

            {/* Erro */}
            {mfaErro && (
              <div className="flex items-center gap-2 text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
                <AlertTriangle size={13} className="shrink-0" /> {mfaErro}
              </div>
            )}

            {/* ── INATIVO ── */}
            {etapa === "inativo" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-purple-500/[0.06] border border-purple-500/15">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Mail size={16} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white/80">Código por e-mail</p>
                    <p className="text-[11px] text-white/30 mt-0.5">{email}</p>
                  </div>
                </div>

                <button onClick={enviarCodigo} disabled={mfaLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-[13px] font-semibold text-white transition-all disabled:opacity-50 shadow-[0_0_24px_rgba(168,85,247,0.2)]">
                  {mfaLoading
                    ? <><Loader2 size={14} className="animate-spin" /> Enviando código...</>
                    : <><ShieldCheck size={14} /> Ativar 2FA — enviar código</>
                  }
                </button>
              </div>
            )}

            {/* ── CÓDIGO ENVIADO ── */}
            {etapa === "codigo_enviado" && (
              <div className="space-y-6">
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-purple-500/[0.06] border border-purple-500/20">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Mail size={15} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-purple-300">Código enviado!</p>
                    <p className="text-[12px] text-white/35 mt-1 leading-relaxed">
                      Verifique sua caixa de entrada em{" "}
                      <span className="text-white/60 font-medium">{email}</span>.
                      O código tem 6 dígitos e expira em 10 minutos.
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25 mb-4 text-center">
                    Digite o código do e-mail
                  </p>
                  <InputOTP value={codigo} onChange={setCodigo} disabled={mfaLoading} />
                </div>

                <button
                  onClick={verificarCodigo}
                  disabled={mfaLoading || codigo.length < 6}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-[13px] font-semibold text-white transition-all disabled:opacity-40 shadow-[0_0_24px_rgba(168,85,247,0.25)]">
                  {mfaLoading
                    ? <><Loader2 size={14} className="animate-spin" /> Verificando...</>
                    : <><ShieldCheck size={14} /> Verificar e ativar 2FA</>
                  }
                </button>

                <div className="flex items-center justify-between text-[12px]">
                  <button onClick={reiniciar}
                    className="flex items-center gap-1.5 text-white/25 hover:text-white/50 transition-colors">
                    <ArrowLeft size={11} /> Cancelar
                  </button>
                  {reenvioTimer > 0 ? (
                    <span className="text-white/20 tabular-nums">Reenviar em {reenvioTimer}s</span>
                  ) : (
                    <button onClick={enviarCodigo} disabled={mfaLoading}
                      className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors disabled:opacity-30">
                      <RefreshCw size={11} /> Reenviar código
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── ATIVO ── */}
            {etapa === "ativo" && mfaConf && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-emerald-500/[0.05] border border-emerald-500/15 rounded-2xl">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Mail size={18} className="text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[13px] font-semibold text-emerald-300">Código por e-mail</p>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 uppercase tracking-wider">
                        Ativo
                      </span>
                    </div>
                    <p className="text-[12px] text-white/35">{mfaConf.email}</p>
                  </div>
                  <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                </div>

                <p className="text-[12px] text-white/30 leading-relaxed">
                  Ao fazer login, você receberá um código de 6 dígitos neste e-mail para confirmar seu acesso.
                </p>

                {!confirmDesativar ? (
                  <button onClick={() => setConfirm(true)}
                    className="flex items-center gap-2 text-[12px] text-red-400/60 hover:text-red-400 transition-colors mt-2">
                    <ShieldOff size={12} /> Desativar autenticação de dois fatores
                  </button>
                ) : (
                  <div className="p-4 bg-red-500/[0.06] border border-red-500/20 rounded-2xl space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={13} className="text-red-400 mt-0.5 shrink-0" />
                      <p className="text-[12px] text-red-300 leading-relaxed">
                        Tem certeza? Desativar o 2FA deixa sua conta menos protegida.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={desativarMFA} disabled={mfaLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-600/80 hover:bg-red-500 text-[12px] font-semibold rounded-xl transition-all disabled:opacity-40 text-white">
                        {mfaLoading ? <Loader2 size={12} className="animate-spin" /> : <ShieldOff size={12} />}
                        Sim, desativar
                      </button>
                      <button onClick={() => setConfirm(false)}
                        className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-[12px] font-semibold rounded-xl transition-all text-white/40">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── Encerrar sessões ───────────────────────────────── */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <div className="flex items-center gap-2 mb-1">
              <LogOut size={14} className="text-white/40" />
              <span className="text-[14px] font-semibold">Encerrar todas as sessões</span>
            </div>
            <p className="text-[12px] text-white/30 mb-4">
              Desconecta sua conta em todos os dispositivos.
            </p>
            <button onClick={sairDeTudo}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-[13px] font-semibold rounded-xl transition-all text-white/60 hover:text-white">
              <LogOut size={13} /> Sair de todos os dispositivos
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
