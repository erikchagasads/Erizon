"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getSupabase } from "@/lib/supabase";
import { toast } from "@/components/Toast";
import { ArrowLeft, Save, Loader2, CheckCircle2, Bell, Send, AlertTriangle, Bot, Clock } from "lucide-react";

const HORAS = Array.from({ length: 24 }, (_, i) => ({ value: i, label: `${String(i).padStart(2, "0")}:00` }));

export default function NotificacoesPage() {
  const router   = useRouter();
  const supabase = getSupabase();

  const [chatId, setChatId]       = useState("");
  const [limiteCpl, setLimiteCpl] = useState("40");
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [testing, setTesting]     = useState(false);
  const [ok, setOk]               = useState(false);
  const [testOk, setTestOk]       = useState(false);
  const [erro, setErro]           = useState<string | null>(null);

  // Copiloto Telegram
  const [copilotoAtivo, setCopilotoAtivo] = useState(false);
  const [briefingHora, setBriefingHora]   = useState(7);
  const [savingCopiloto, setSavingCopiloto] = useState(false);
  const [copilotoOk, setCopilotoOk]         = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const [configs, copiloto] = await Promise.all([
        supabase.from("user_configs").select("telegram_chat_id, limite_cpl").eq("user_id", user.id).maybeSingle(),
        supabase.from("telegram_copilot_sessions").select("ativo, briefing_hora").eq("user_id", user.id).maybeSingle(),
      ]);
      if (configs.data?.telegram_chat_id) setChatId(String(configs.data.telegram_chat_id));
      if (configs.data?.limite_cpl)       setLimiteCpl(String(configs.data.limite_cpl));
      if (copiloto.data) {
        setCopilotoAtivo(copiloto.data.ativo ?? false);
        setBriefingHora(copiloto.data.briefing_hora ?? 7);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salvar() {
    setSaving(true); setErro(null); setOk(false); setTestOk(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado.");

      const cplNum = parseFloat(limiteCpl) || 40;

      const { error } = await supabase
        .from("user_configs")
        .upsert({
          user_id:          user.id,
          telegram_chat_id: chatId.trim() || null,
          limite_cpl:       cplNum,
        }, { onConflict: "user_id" });

      if (error) throw error;
      toast.success("Salvo com sucesso!");
      setOk(true);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    }
    setSaving(false);
  }

  async function testar() {
    if (!chatId.trim()) { setErro("Informe o Chat ID antes de testar."); return; }
    setTesting(true); setErro(null); setTestOk(false);
    try {
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo:   "custom",
          chatId: chatId.trim(),
          msg:    `✅ *Erizon* — Notificações ativas!\n\nVocê receberá alertas quando o CPL ultrapassar R$${parseFloat(limiteCpl) || 40}.`,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Falha no envio.");
      setTestOk(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao testar.";
      // Traduz erros comuns do Telegram
      if (msg.includes("chat not found")) {
        setErro("Chat ID inválido. Abra o Telegram, envie qualquer mensagem para @userinfobot e use o número que ele retornar.");
      } else {
        setErro(msg);
      }
    }
    setTesting(false);
  }

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
            <Bell size={16} className="text-amber-400" />
            <h1 className="text-[22px] font-bold">Notificações</h1>
          </div>
          <p className="text-[12px] text-white/30">Receba alertas no Telegram quando campanhas precisarem de atenção.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={20} className="animate-spin text-white/30" />
          </div>
        ) : (
          <div className="space-y-4">

            {/* Telegram */}
            <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.03] p-6 space-y-5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-sky-500 flex items-center justify-center shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.88 13.376l-2.967-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.943.21z"/>
                  </svg>
                </div>
                <span className="text-[13px] font-semibold">Telegram</span>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">
                  Chat ID
                </label>
                <input
                  value={chatId}
                  onChange={e => { setChatId(e.target.value); setOk(false); setTestOk(false); setErro(null); }}
                  placeholder="Ex: 123456789"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors font-mono"
                />
                <div className="mt-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <p className="text-[10px] text-white/40 font-semibold mb-1">Como obter seu Chat ID:</p>
                  <ol className="text-[10px] text-white/30 space-y-0.5 list-decimal list-inside">
                    <li>Abra o Telegram e busque <span className="text-white/50 font-mono">@userinfobot</span></li>
                    <li>Envie qualquer mensagem para ele</li>
                    <li>Copie o número que aparecer em <span className="text-white/50">Id:</span></li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Copiloto Telegram */}
            <div className="rounded-2xl border border-purple-500/15 bg-purple-500/[0.03] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot size={15} className="text-purple-400" />
                  <span className="text-[13px] font-semibold">Copiloto no Telegram</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/20 text-purple-400 font-bold uppercase">Novo</span>
                </div>
                <button onClick={() => setCopilotoAtivo(v => !v)}
                  className={`w-10 h-6 rounded-full border transition-all ${copilotoAtivo ? "bg-purple-600 border-purple-500" : "bg-white/[0.06] border-white/[0.1]"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${copilotoAtivo ? "translate-x-4" : ""}`} />
                </button>
              </div>

              <p className="text-[11px] text-white/35 leading-relaxed">
                Receba um briefing matinal com o resumo do portfólio + decisões pendentes. Aprove ou ignore ações diretamente pelo Telegram com um clique.
              </p>

              {copilotoAtivo && (
                <>
                  {!chatId.trim() && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/20">
                      <AlertTriangle size={12} className="text-amber-400 shrink-0" />
                      <p className="text-[11px] text-amber-400">Configure o Chat ID acima para ativar o copiloto.</p>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 flex items-center gap-1.5 block">
                      <Clock size={10} /> Horário do briefing matinal
                    </label>
                    <select
                      value={briefingHora}
                      onChange={e => setBriefingHora(parseInt(e.target.value))}
                      className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-purple-500/40 transition-colors"
                    >
                      {HORAS.map(h => (
                        <option key={h.value} value={h.value}>{h.label}</option>
                      ))}
                    </select>
                  </div>

                  {copilotoOk && (
                    <div className="flex items-center gap-2 text-[12px] text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3">
                      <CheckCircle2 size={13} /> Copiloto ativado! Briefing às {String(briefingHora).padStart(2, "0")}:00.
                    </div>
                  )}

                  <button
                    disabled={savingCopiloto || !chatId.trim()}
                    onClick={async () => {
                      setSavingCopiloto(true); setCopilotoOk(false);
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) { setSavingCopiloto(false); return; }
                      await supabase.from("telegram_copilot_sessions").upsert({
                        user_id:      user.id,
                        chat_id:      chatId.trim(),
                        ativo:        copilotoAtivo,
                        briefing_hora: briefingHora,
                        updated_at:   new Date().toISOString(),
                      }, { onConflict: "user_id" });
                      setCopilotoOk(true);
                      setSavingCopiloto(false);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600/80 hover:bg-purple-500 text-[13px] font-semibold rounded-xl transition-all disabled:opacity-40"
                  >
                    {savingCopiloto ? <Loader2 size={13} className="animate-spin" /> : <Bot size={13} />}
                    Salvar configuração do copiloto
                  </button>
                </>
              )}
            </div>

            {/* Limite CPL */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-amber-400" />
                <span className="text-[13px] font-semibold">Limite de alerta — CPL</span>
              </div>
              <p className="text-[11px] text-white/30 mb-4">
                Você receberá uma notificação quando o CPL de uma campanha ultrapassar este valor.
              </p>
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-white/40 font-semibold">R$</span>
                <input
                  type="number"
                  min="1"
                  value={limiteCpl}
                  onChange={e => { setLimiteCpl(e.target.value); setOk(false); }}
                  className="w-32 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] font-bold text-white focus:outline-none focus:border-amber-500/40 transition-colors"
                />
                <span className="text-[11px] text-white/30">por lead</span>
              </div>
            </div>

            {/* Feedback */}
            {erro && (
              <div className="flex items-start gap-2 text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                <span>{erro}</span>
              </div>
            )}
            {ok && (
              <div className="flex items-center gap-2 text-[12px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                <CheckCircle2 size={13} /> Configurações salvas!
              </div>
            )}
            {testOk && (
              <div className="flex items-center gap-2 text-[12px] text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-xl px-4 py-3">
                <CheckCircle2 size={13} /> Mensagem enviada! Verifique seu Telegram.
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={salvar} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600/80 hover:bg-amber-500 text-[13px] font-semibold rounded-xl transition-all disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Salvar
              </button>
              <button onClick={testar} disabled={testing || !chatId.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-sky-600/80 hover:bg-sky-500 text-[13px] font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {testing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Testar envio
              </button>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}