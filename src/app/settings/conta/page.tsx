"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getSupabase } from "@/lib/supabase";
import {
  ArrowLeft, Save, Loader2, CheckCircle2, User,
  Mail, Calendar, KeyRound, AlertTriangle, Zap,
} from "lucide-react";

export default function ContaPage() {
  const router   = useRouter();
  const supabase = getSupabase();

  const [nome, setNome]               = useState("");
  const [email, setEmail]             = useState("");
  const [criadoEm, setCriadoEm]       = useState<string | null>(null);
  const [plano, setPlano]             = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [resetting, setResetting]     = useState(false);
  const [ok, setOk]                   = useState(false);
  const [resetOk, setResetOk]         = useState(false);
  const [erro, setErro]               = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setEmail(user.email ?? "");
      setNome(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "");
      setCriadoEm(user.created_at ?? null);

      // Buscar plano no billing
      try {
        const res = await fetch("/api/billing");
        if (res.ok) {
          const d = await res.json();
          setPlano(d.plano ?? null);
        }
      } catch { /* ignora */ }

      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salvar() {
    setSaving(true); setErro(null); setOk(false);
    const { error } = await supabase.auth.updateUser({ data: { full_name: nome } });
    if (error) setErro(error.message);
    else setOk(true);
    setSaving(false);
  }

  async function redefinirSenha() {
    if (!email) return;
    setResetting(true); setErro(null); setResetOk(false);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings/conta`,
    });
    if (error) setErro(error.message);
    else setResetOk(true);
    setResetting(false);
  }

  function fmtData(iso: string | null) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  }

  function planoLabel(p: string | null) {
    if (!p) return "Gratuito";
    const map: Record<string, string> = { core: "Core", pro: "Pro", command: "Command", gestor: "Pro", agencia: "Command", agency: "Command" };
    return map[p] ?? p;
  }

  const iniciais = nome
    ? nome.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase()).join("")
    : email[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex min-h-screen bg-[#060609] text-white">
      <Sidebar />
      <main className="ml-[60px] flex-1 px-8 py-8 max-w-2xl">
        <button onClick={() => router.push("/settings")}
          className="flex items-center gap-2 text-[11px] text-white/30 hover:text-white/60 transition-colors mb-6">
          <ArrowLeft size={13} /> Configurações
        </button>

        <div className="mb-7">
          <div className="flex items-center gap-3 mb-1">
            <User size={16} className="text-blue-400" />
            <h1 className="text-[22px] font-bold">Dados Pessoais</h1>
          </div>
          <p className="text-[12px] text-white/30">Gerencie suas informações de conta e segurança.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={20} className="animate-spin text-white/30" />
          </div>
        ) : (
          <div className="space-y-4">

            {/* ── Avatar + metadados ──────────────────────────────── */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
              <div className="flex items-center gap-4">
                {/* Iniciais */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600/60 to-blue-600/60 border border-white/[0.08] flex items-center justify-center text-[20px] font-black text-white/90 shrink-0">
                  {iniciais}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-bold truncate">{nome || "—"}</p>
                  <p className="text-[12px] text-white/40 truncate">{email}</p>
                </div>

                {/* Plano badge */}
                <div className={`text-[10px] font-bold px-3 py-1 rounded-full border shrink-0 ${
                  plano === "command" ? "bg-sky-500/10 border-sky-500/20 text-sky-400" :
                  plano === "pro"     ? "bg-purple-500/10 border-purple-500/20 text-purple-400" :
                  plano === "core"    ? "bg-white/[0.06] border-white/[0.1] text-white/50" :
                                       "bg-white/[0.04] border-white/[0.06] text-white/30"
                }`}>
                  {planoLabel(plano)}
                </div>
              </div>

              {/* Metadados */}
              <div className="mt-5 pt-4 border-t border-white/[0.05] grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Mail size={12} className="text-white/25 shrink-0" />
                  <div>
                    <p className="text-[9px] text-white/25 uppercase tracking-wider font-semibold">E-mail</p>
                    <p className="text-[12px] text-white/60 truncate">{email}</p>
                  </div>
                </div>
                {criadoEm && (
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-white/25 shrink-0" />
                    <div>
                      <p className="text-[9px] text-white/25 uppercase tracking-wider font-semibold">Membro desde</p>
                      <p className="text-[12px] text-white/60">{fmtData(criadoEm)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Zap size={12} className="text-white/25 shrink-0" />
                  <div>
                    <p className="text-[9px] text-white/25 uppercase tracking-wider font-semibold">Plano</p>
                    <p className="text-[12px] text-white/60">{planoLabel(plano)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Editar nome ─────────────────────────────────────── */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 space-y-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/25">Editar informações</p>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">
                  Nome completo
                </label>
                <input
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">
                  E-mail
                </label>
                <input
                  value={email}
                  disabled
                  className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3 text-[13px] text-white/40 cursor-not-allowed"
                />
                <p className="text-[10px] text-white/20 mt-1.5">O e-mail não pode ser alterado diretamente.</p>
              </div>

              {erro && (
                <div className="flex items-center gap-2 text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <AlertTriangle size={13} /> {erro}
                </div>
              )}
              {ok && (
                <div className="flex items-center gap-2 text-[12px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                  <CheckCircle2 size={13} /> Nome atualizado com sucesso!
                </div>
              )}

              <button
                onClick={salvar}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600/80 hover:bg-blue-500 text-[13px] font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Salvar alterações
              </button>
            </div>

            {/* ── Redefinir senha ──────────────────────────────────── */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <KeyRound size={13} className="text-amber-400" />
                    <p className="text-[13px] font-semibold">Redefinir senha</p>
                  </div>
                  <p className="text-[11px] text-white/30">
                    Enviaremos um link de redefinição para <span className="text-white/50">{email}</span>.
                  </p>
                </div>

                <button
                  onClick={redefinirSenha}
                  disabled={resetting}
                  className="shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-500/[0.08] hover:bg-amber-500/[0.14] border border-amber-500/20 text-[12px] font-semibold text-amber-400 rounded-xl transition-all disabled:opacity-50"
                >
                  {resetting ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
                  Enviar link
                </button>
              </div>

              {resetOk && (
                <div className="mt-4 flex items-center gap-2 text-[12px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                  <CheckCircle2 size={13} />
                  Link enviado! Verifique seu e-mail e siga as instruções.
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
