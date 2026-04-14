"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getSupabase } from "@/lib/supabase";
import { toast } from "@/components/Toast";
import { ensureBrowserPushSubscription } from "@/lib/browser-push";
import { trackProductEvent } from "@/lib/product-events";
import {
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle2,
  Bell,
  Send,
  AlertTriangle,
  Bot,
  Clock,
  Smartphone,
  MessageSquare,
} from "lucide-react";

const HORAS = Array.from({ length: 24 }, (_, index) => ({
  value: index,
  label: `${String(index).padStart(2, "0")}:00`,
}));

type WhatsAppConfig = {
  phone_number: string;
  instance_name: string;
  api_base_url: string | null;
  api_key_masked: string | null;
  has_api_key: boolean;
  ativo: boolean;
  briefing_hora: number;
};

export default function NotificacoesPage() {
  const router = useRouter();
  const supabase = getSupabase();

  const [chatId, setChatId] = useState("");
  const [limiteCpl, setLimiteCpl] = useState("40");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [ok, setOk] = useState(false);
  const [testOk, setTestOk] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushTesting, setPushTesting] = useState(false);

  const [copilotoAtivo, setCopilotoAtivo] = useState(false);
  const [briefingHora, setBriefingHora] = useState(7);
  const [savingCopiloto, setSavingCopiloto] = useState(false);
  const [copilotoOk, setCopilotoOk] = useState(false);

  const [whatsPhone, setWhatsPhone] = useState("");
  const [whatsInstance, setWhatsInstance] = useState("");
  const [whatsBaseUrl, setWhatsBaseUrl] = useState("");
  const [whatsApiKey, setWhatsApiKey] = useState("");
  const [whatsApiKeyMasked, setWhatsApiKeyMasked] = useState<string | null>(null);
  const [whatsAtivo, setWhatsAtivo] = useState(false);
  const [whatsBriefingHora, setWhatsBriefingHora] = useState(7);
  const [savingWhats, setSavingWhats] = useState(false);
  const [testingWhats, setTestingWhats] = useState(false);
  const [whatsOk, setWhatsOk] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const [configs, copiloto, whatsappRes] = await Promise.all([
          supabase.from("user_configs").select("telegram_chat_id, limite_cpl").eq("user_id", user.id).maybeSingle(),
          supabase.from("telegram_copilot_sessions").select("ativo, briefing_hora").eq("user_id", user.id).maybeSingle(),
          fetch("/api/settings/whatsapp").then((response) => response.json()).catch(() => ({ config: null })),
        ]);

        if (configs.data?.telegram_chat_id) setChatId(String(configs.data.telegram_chat_id));
        if (configs.data?.limite_cpl) setLimiteCpl(String(configs.data.limite_cpl));

        if (copiloto.data) {
          setCopilotoAtivo(copiloto.data.ativo ?? false);
          setBriefingHora(copiloto.data.briefing_hora ?? 7);
        }

        const whatsappConfig = whatsappRes?.config as WhatsAppConfig | null;
        if (whatsappConfig) {
          setWhatsPhone(whatsappConfig.phone_number ?? "");
          setWhatsInstance(whatsappConfig.instance_name ?? "");
          setWhatsBaseUrl(whatsappConfig.api_base_url ?? "");
          setWhatsApiKeyMasked(whatsappConfig.api_key_masked ?? null);
          setWhatsAtivo(whatsappConfig.ativo ?? false);
          setWhatsBriefingHora(whatsappConfig.briefing_hora ?? 7);
        }
      } catch {
        setErro("Nao foi possivel validar sua sessao agora.");
      }

      setLoading(false);
    }

    load();
  }, [router, supabase]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setPushSupported(supported);
    if (!supported) return;
    setPushPermission(Notification.permission);
    setPushEnabled(window.localStorage.getItem("erizon_browser_push") === "enabled");
  }, []);

  async function salvar() {
    setSaving(true);
    setErro(null);
    setOk(false);
    setTestOk(false);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Nao autenticado.");

      const cplNum = parseFloat(limiteCpl) || 40;
      const { error } = await supabase.from("user_configs").upsert(
        {
          user_id: user.id,
          telegram_chat_id: chatId.trim() || null,
          limite_cpl: cplNum,
        },
        { onConflict: "user_id" }
      );

      if (error) throw error;
      toast.success("Configuracoes salvas!");
      setOk(true);
      void trackProductEvent("telegram_settings_saved", "settings_notificacoes", {
        chat_id: !!chatId.trim(),
        limite_cpl: parseFloat(limiteCpl) || 40,
      });
    } catch (error: unknown) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar.");
    }
    setSaving(false);
  }

  async function salvarWhatsApp() {
    if (!whatsPhone.trim() || !whatsInstance.trim()) {
      setErro("Preencha telefone e instance name do WhatsApp.");
      return;
    }

    setSavingWhats(true);
    setErro(null);
    setWhatsOk(false);
    try {
      const response = await fetch("/api/settings/whatsapp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: whatsPhone.trim(),
          instance_name: whatsInstance.trim(),
          api_base_url: whatsBaseUrl.trim() || null,
          api_key: whatsApiKey.trim() || undefined,
          ativo: whatsAtivo,
          briefing_hora: whatsBriefingHora,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Erro ao salvar WhatsApp.");

      if (whatsApiKey.trim()) {
        setWhatsApiKey("");
        setWhatsApiKeyMasked("salva");
      }

      setWhatsOk(true);
      toast.success("WhatsApp configurado!");
      void trackProductEvent("whatsapp_configured", "settings_notificacoes", {
        ativo: whatsAtivo,
        briefing_hora: whatsBriefingHora,
      });
    } catch (error: unknown) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar WhatsApp.");
    }
    setSavingWhats(false);
  }

  async function testarTelegram() {
    if (!chatId.trim()) {
      setErro("Informe o Chat ID antes de testar.");
      return;
    }

    setTesting(true);
    setErro(null);
    setTestOk(false);
    try {
      const response = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "custom",
          chatId: chatId.trim(),
          msg: `Erizon ativo.\n\nVoce recebera alertas quando o CPL ultrapassar R$${parseFloat(limiteCpl) || 40}.`,
        }),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.error ?? "Falha no envio.");
      setTestOk(true);
      void trackProductEvent("telegram_test_sent", "settings_notificacoes");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao testar.";
      setErro(
        message.includes("chat not found")
          ? "Chat ID invalido. Abra o Telegram, envie qualquer mensagem para @userinfobot e use o numero retornado."
          : message
      );
    }
    setTesting(false);
  }

  async function testarWhatsApp() {
    setTestingWhats(true);
    setErro(null);
    try {
      const response = await fetch("/api/settings/whatsapp", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Erro ao testar WhatsApp.");
      toast.success("Mensagem enviada no WhatsApp.");
      void trackProductEvent("whatsapp_test_sent", "settings_notificacoes");
    } catch (error: unknown) {
      setErro(error instanceof Error ? error.message : "Erro ao testar WhatsApp.");
    }
    setTestingWhats(false);
  }

  async function ativarPushBrowser() {
    if (!pushSupported) {
      setErro("Este navegador nao suporta push do PWA.");
      return;
    }

    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    if (permission !== "granted") {
      setErro("Permissao de notificacao negada. Libere nas configuracoes do navegador.");
      return;
    }

    const result = await ensureBrowserPushSubscription("settings_notificacoes");
    window.localStorage.setItem("erizon_browser_push", "enabled");
    setPushEnabled(true);
    toast.success(
      result.reason === "missing_vapid"
        ? "Push local ativado. Adicione as chaves VAPID para envio pelo backend."
        : "Push do navegador ativado neste dispositivo."
    );
    void trackProductEvent("browser_push_enabled", "settings_notificacoes", {
      mode: result.reason,
    });
  }

  async function testarPushBrowser() {
    if (!pushSupported || pushPermission !== "granted") {
      setErro("Ative a permissao de notificacoes antes de testar.");
      return;
    }

    setPushTesting(true);
    setErro(null);
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const payload = await response.json();

      if (!response.ok || payload.sent === 0) {
        const registration =
          (await navigator.serviceWorker.getRegistration("/erizon-push-sw.js")) ??
          (await navigator.serviceWorker.register("/erizon-push-sw.js"));

        registration.active?.postMessage({
          type: "ERIZON_SHOW_NOTIFICATION",
          payload: {
            title: "Erizon",
            body: "Seu Daily Digest esta pronto: 2 decisoes pedem aprovacao hoje.",
            url: "/pulse",
          },
        });
      }

      window.localStorage.setItem("erizon_onboarding_push", "done");
      toast.success("Notificacao enviada para este dispositivo.");
      void trackProductEvent("browser_push_test_sent", "settings_notificacoes", {
        backend_delivery: response.ok && payload.sent > 0,
      });
    } catch {
      setErro("Nao foi possivel disparar a notificacao de teste.");
    }
    setPushTesting(false);
  }

  return (
    <div className="flex min-h-screen bg-[#060609] text-white">
      <Sidebar />
      <main className="md:ml-[60px] pb-20 md:pb-0 flex-1 max-w-2xl px-4 py-6 md:px-8 md:py-8">
        <button
          onClick={() => router.push("/settings")}
          className="mb-6 flex items-center gap-2 text-[11px] text-white/30 transition-colors hover:text-white/60"
        >
          <ArrowLeft size={13} /> Configuracoes
        </button>

        <div className="mb-7">
          <div className="mb-1 flex items-center gap-3">
            <Bell size={16} className="text-amber-400" />
            <h1 className="text-[22px] font-bold">Notificacoes</h1>
          </div>
          <p className="text-[12px] text-white/30">
            Ative alertas no navegador, Telegram e WhatsApp para transformar o Erizon em um produto que chama voce de volta.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={20} className="animate-spin text-white/30" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-500/15 bg-blue-500/[0.03] p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Smartphone size={15} className="text-blue-400" />
                  <span className="text-[13px] font-semibold">Push no navegador</span>
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-blue-300">
                    PWA
                  </span>
                </div>
                <span className={`text-[10px] font-semibold ${pushEnabled ? "text-emerald-400" : "text-white/30"}`}>
                  {pushEnabled ? "Ativo neste dispositivo" : "Inativo"}
                </span>
              </div>

              <p className="text-[11px] leading-relaxed text-white/35">
                Quando o PWA estiver instalado, o navegador pode avisar voce sobre o Daily Digest e decisoes pendentes sem depender de outro canal.
              </p>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="mb-2 text-[10px] uppercase tracking-wider text-white/25">Status do dispositivo</p>
                <div className="space-y-1 text-[11px] text-white/45">
                  <p>Suporte: {pushSupported ? "sim" : "nao"}</p>
                  <p>Permissao: {pushPermission}</p>
                  <p>Registro local: {pushEnabled ? "ativado" : "desativado"}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={ativarPushBrowser}
                  disabled={!pushSupported}
                  className="flex items-center gap-2 rounded-xl bg-blue-600/80 px-5 py-2.5 text-[13px] font-semibold transition-all hover:bg-blue-500 disabled:opacity-40"
                >
                  <Bell size={13} />
                  Ativar push
                </button>
                <button
                  onClick={testarPushBrowser}
                  disabled={!pushSupported || pushPermission !== "granted" || pushTesting}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.05] px-5 py-2.5 text-[13px] font-semibold transition-all hover:bg-white/[0.08] disabled:opacity-40"
                >
                  {pushTesting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Testar push
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquare size={15} className="text-emerald-400" />
                  <span className="text-[13px] font-semibold">WhatsApp nativo</span>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-300">
                    Evolution
                  </span>
                </div>
                <span className={`text-[10px] font-semibold ${whatsAtivo ? "text-emerald-400" : "text-white/30"}`}>
                  {whatsAtivo ? "Briefing ativo" : "Inativo"}
                </span>
              </div>

              <p className="text-[11px] leading-relaxed text-white/35">
                Configure a instancia Evolution API para receber o briefing matinal e alertas do cockpit diretamente no WhatsApp.
              </p>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/30">Telefone</label>
                  <input
                    value={whatsPhone}
                    onChange={(event) => setWhatsPhone(event.target.value)}
                    placeholder="5511999999999"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] text-white placeholder-white/20 transition-colors focus:border-emerald-500/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/30">Instance name</label>
                  <input
                    value={whatsInstance}
                    onChange={(event) => setWhatsInstance(event.target.value)}
                    placeholder="erizon-agencia"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] text-white placeholder-white/20 transition-colors focus:border-emerald-500/40 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/30">Base URL da Evolution</label>
                <input
                  value={whatsBaseUrl}
                  onChange={(event) => setWhatsBaseUrl(event.target.value)}
                  placeholder="https://evolution.seudominio.com"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] text-white placeholder-white/20 transition-colors focus:border-emerald-500/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/30">API key da Evolution</label>
                <input
                  value={whatsApiKey}
                  onChange={(event) => setWhatsApiKey(event.target.value)}
                  placeholder={whatsApiKeyMasked ? `Atual: ${whatsApiKeyMasked}` : "Cole sua API key"}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] text-white placeholder-white/20 transition-colors focus:border-emerald-500/40 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-white/25">Pode ficar vazio nas próximas edições se a chave já estiver salva.</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                    <Clock size={10} /> Horario do briefing
                  </label>
                  <select
                    value={whatsBriefingHora}
                    onChange={(event) => setWhatsBriefingHora(parseInt(event.target.value))}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-[13px] text-white transition-colors focus:border-emerald-500/40 focus:outline-none"
                  >
                    {HORAS.map((hora) => (
                      <option key={hora.value} value={hora.value}>
                        {hora.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => setWhatsAtivo((value) => !value)}
                    className={`flex h-[46px] w-full items-center justify-center rounded-xl border text-[13px] font-semibold transition-all ${
                      whatsAtivo
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-white/[0.08] bg-white/[0.03] text-white/45"
                    }`}
                  >
                    {whatsAtivo ? "Briefing WhatsApp ativo" : "Ativar briefing WhatsApp"}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={salvarWhatsApp}
                  disabled={savingWhats}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600/80 px-5 py-2.5 text-[13px] font-semibold transition-all hover:bg-emerald-500 disabled:opacity-40"
                >
                  {savingWhats ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Salvar WhatsApp
                </button>
                <button
                  onClick={testarWhatsApp}
                  disabled={testingWhats}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.05] px-5 py-2.5 text-[13px] font-semibold transition-all hover:bg-white/[0.08] disabled:opacity-40"
                >
                  {testingWhats ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Testar WhatsApp
                </button>
              </div>

              {whatsOk && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[12px] text-emerald-400">
                  <CheckCircle2 size={13} /> Canal WhatsApp configurado com sucesso.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.03] p-6 space-y-5">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500 shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.88 13.376l-2.967-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.943.21z" />
                  </svg>
                </div>
                <span className="text-[13px] font-semibold">Telegram</span>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/30">Chat ID</label>
                <input
                  value={chatId}
                  onChange={(event) => {
                    setChatId(event.target.value);
                    setOk(false);
                    setTestOk(false);
                    setErro(null);
                  }}
                  placeholder="Ex: 123456789"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] font-mono text-white placeholder-white/20 transition-colors focus:border-white/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-purple-500/15 bg-purple-500/[0.03] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot size={15} className="text-purple-400" />
                  <span className="text-[13px] font-semibold">Copiloto no Telegram</span>
                </div>
                <button
                  onClick={() => setCopilotoAtivo((value) => !value)}
                  className={`h-6 w-10 rounded-full border transition-all ${
                    copilotoAtivo ? "border-purple-500 bg-purple-600" : "border-white/[0.1] bg-white/[0.06]"
                  }`}
                >
                  <div className={`mx-1 h-4 w-4 rounded-full bg-white transition-transform ${copilotoAtivo ? "translate-x-4" : ""}`} />
                </button>
              </div>

              {copilotoAtivo && (
                <>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                      <Clock size={10} /> Horario do briefing matinal
                    </label>
                    <select
                      value={briefingHora}
                      onChange={(event) => setBriefingHora(parseInt(event.target.value))}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-[13px] text-white transition-colors focus:border-purple-500/40 focus:outline-none"
                    >
                      {HORAS.map((hora) => (
                        <option key={hora.value} value={hora.value}>
                          {hora.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {copilotoOk && (
                    <div className="flex items-center gap-2 rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-3 text-[12px] text-purple-400">
                      <CheckCircle2 size={13} /> Copiloto ativado! Briefing as {String(briefingHora).padStart(2, "0")}:00.
                    </div>
                  )}

                  <button
                    disabled={savingCopiloto || !chatId.trim()}
                    onClick={async () => {
                      setSavingCopiloto(true);
                      setCopilotoOk(false);
                      try {
                        const {
                          data: { user },
                        } = await supabase.auth.getUser();
                        if (!user) {
                          setSavingCopiloto(false);
                          return;
                        }
                        await supabase.from("telegram_copilot_sessions").upsert(
                          {
                            user_id: user.id,
                            chat_id: chatId.trim(),
                            ativo: copilotoAtivo,
                            briefing_hora: briefingHora,
                            updated_at: new Date().toISOString(),
                          },
                          { onConflict: "user_id" }
                        );
                        setCopilotoOk(true);
                        void trackProductEvent("telegram_copilot_saved", "settings_notificacoes", {
                          ativo: copilotoAtivo,
                          briefing_hora: briefingHora,
                        });
                      } catch {
                        setErro("Nao foi possivel salvar o copiloto agora.");
                      }
                      if (!chatId.trim()) {
                        setSavingCopiloto(false);
                      }
                      setSavingCopiloto(false);
                    }}
                    className="flex items-center gap-2 rounded-xl bg-purple-600/80 px-5 py-2.5 text-[13px] font-semibold transition-all hover:bg-purple-500 disabled:opacity-40"
                  >
                    {savingCopiloto ? <Loader2 size={13} className="animate-spin" /> : <Bot size={13} />}
                    Salvar configuracao do copiloto
                  </button>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
              <div className="mb-1 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-400" />
                <span className="text-[13px] font-semibold">Limite de alerta - CPL</span>
              </div>
              <p className="mb-4 text-[11px] text-white/30">Voce recebera uma notificacao quando o CPL de uma campanha ultrapassar este valor.</p>
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-semibold text-white/40">R$</span>
                <input
                  type="number"
                  min="1"
                  value={limiteCpl}
                  onChange={(event) => {
                    setLimiteCpl(event.target.value);
                    setOk(false);
                  }}
                  className="w-32 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[14px] font-bold text-white transition-colors focus:border-amber-500/40 focus:outline-none"
                />
                <span className="text-[11px] text-white/30">por lead</span>
              </div>
            </div>

            {erro && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[12px] text-red-400">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                <span>{erro}</span>
              </div>
            )}
            {ok && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[12px] text-emerald-400">
                <CheckCircle2 size={13} /> Configuracoes salvas!
              </div>
            )}
            {testOk && (
              <div className="flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-[12px] text-sky-400">
                <CheckCircle2 size={13} /> Mensagem enviada! Verifique seu Telegram.
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={salvar}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-amber-600/80 px-5 py-2.5 text-[13px] font-semibold transition-all hover:bg-amber-500 disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Salvar
              </button>
              <button
                onClick={testarTelegram}
                disabled={testing || !chatId.trim()}
                className="flex items-center gap-2 rounded-xl bg-sky-600/80 px-5 py-2.5 text-[13px] font-semibold transition-all hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {testing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Testar Telegram
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
