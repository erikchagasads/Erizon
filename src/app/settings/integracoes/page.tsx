"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getSupabase } from "@/lib/supabase";
import { toast } from "@/components/Toast";
import {
  ArrowLeft, Save, Loader2, CheckCircle2, Link2,
  Eye, EyeOff, ChevronDown, ChevronUp, ExternalLink,
  AlertTriangle, Copy, Check, Clock, Key, RefreshCw, Trash2,
} from "lucide-react";

// ── helpers ────────────────────────────────────────────────────────────────

function CodigoInline({ children }: { children: string }) {
  const [copiado, setCopiado] = useState(false);
  function copiar() {
    navigator.clipboard.writeText(children);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }
  return (
    <span
      onClick={copiar}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-white/70 font-mono text-[11px] cursor-pointer hover:bg-white/[0.1] transition-all"
      title="Clique para copiar"
    >
      {children}
      {copiado ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} className="text-white/30" />}
    </span>
  );
}

function Passo({ num, titulo, children }: { num: number; titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[11px] font-bold text-emerald-400 shrink-0">{num}</div>
        <div className="w-px flex-1 bg-white/[0.05] mt-2" />
      </div>
      <div className="pb-6 flex-1">
        <p className="text-[13px] font-semibold text-white/80 mb-1.5">{titulo}</p>
        <div className="text-[12px] text-white/40 leading-relaxed space-y-1">{children}</div>
      </div>
    </div>
  );
}

// ── types ──────────────────────────────────────────────────────────────────

interface WebhookIntegration {
  id: string;
  platform: string;
  ativo: boolean;
  shop_domain: string | null;
  created_at?: string;
}

// ── plataformas ────────────────────────────────────────────────────────────

const PLATAFORMAS_ADS = [
  { id: "meta",    nome: "Meta Ads",    cor: "#1877F2", sigla: "f",  disponivel: true  },
  { id: "google",  nome: "Google Ads",  cor: "#EA4335", sigla: "G",  disponivel: true  },
  { id: "tiktok",  nome: "TikTok Ads",  cor: "#69C9D0", sigla: "T",  disponivel: true  },
  { id: "linkedin",nome: "LinkedIn Ads",cor: "#0A66C2", sigla: "in", disponivel: true  },
] as const;

const PLATAFORMAS_WEBHOOK = [
  { id: "hotmart",   nome: "Hotmart",     cor: "#E13B2A", sigla: "H",  needsDomain: false },
  { id: "kirvano",   nome: "Kirvano",     cor: "#6C47FF", sigla: "K",  needsDomain: false },
  { id: "shopify",   nome: "Shopify",     cor: "#96BF48", sigla: "S",  needsDomain: true  },
  { id: "nuvemshop", nome: "Nuvemshop",   cor: "#01C4C4", sigla: "N",  needsDomain: true  },
] as const;

type AdsPlatformId    = (typeof PLATAFORMAS_ADS)[number]["id"];
type WebhookPlatformId = (typeof PLATAFORMAS_WEBHOOK)[number]["id"];
type AtivaId = AdsPlatformId | WebhookPlatformId;

// ── component ──────────────────────────────────────────────────────────────

export default function IntegracoesPage() {
  const router   = useRouter();
  const supabase = getSupabase();

  // Meta fields
  const [token, setToken]         = useState("");
  const [accountId, setAccountId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [guiaAberto, setGuiaAberto] = useState(false);

  // Webhook state
  const [webhookIntegrations, setWebhookIntegrations] = useState<WebhookIntegration[]>([]);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [shopDomain, setShopDomain]       = useState("");
  const [showSecret, setShowSecret]       = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [deletingWebhook, setDeletingWebhook] = useState(false);

  // API key state
  const [apiKeyMasked, setApiKeyMasked]   = useState<string | null>(null);
  const [hasApiKey, setHasApiKey]         = useState(false);
  const [newApiKey, setNewApiKey]         = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [apiKeyCopied, setApiKeyCopied]   = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [ok, setOk]           = useState(false);
  const [erro, setErro]       = useState<string | null>(null);

  // Plataforma selecionada para exibir detalhes
  const [ativa, setAtiva] = useState<AtivaId>("meta");

  const loadWebhookIntegrations = useCallback(async () => {
    const res = await fetch("/api/settings/integrations");
    if (res.ok) {
      const json = await res.json();
      setWebhookIntegrations(json.integrations ?? []);
    }
  }, []);

  const loadApiKey = useCallback(async () => {
    const res = await fetch("/api/settings/api-key");
    if (res.ok) {
      const json = await res.json();
      setHasApiKey(json.has_key);
      setApiKeyMasked(json.masked);
    }
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("user_settings")
        .select("meta_access_token, meta_ad_account_id, google_ads_access_token, tiktok_ads_access_token, linkedin_ads_access_token")
        .eq("user_id", user.id).maybeSingle();
      if (data) {
        setToken(data.meta_access_token ?? "");
        setAccountId(data.meta_ad_account_id ?? "");
        setGoogleConectado(!!data.google_ads_access_token);
        setTiktokConectado(!!data.tiktok_ads_access_token);
        setLinkedinConectado(!!data.linkedin_ads_access_token);
      }
      // Verifica se voltou de OAuth com sucesso
      const params = new URLSearchParams(window.location.search);
      const success = params.get("success");
      if (success === "google")   { setGoogleConectado(true);   setAtiva("google");   toast.success("Google Ads conectado!"); }
      if (success === "tiktok")   { setTiktokConectado(true);   setAtiva("tiktok");   toast.success("TikTok Ads conectado!"); }
      if (success === "linkedin") { setLinkedinConectado(true); setAtiva("linkedin"); toast.success("LinkedIn Ads conectado!"); }
      const oauthError = params.get("error");
      if (oauthError) {
        const notConfigured = oauthError.endsWith("_not_configured");
        toast.error(notConfigured
          ? "Plataforma não configurada no servidor. Adicione as variáveis de ambiente no Vercel."
          : "Erro ao conectar plataforma. Tente novamente."
        );
      }
      await Promise.all([loadWebhookIntegrations(), loadApiKey()]);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When switching to a webhook platform, pre-fill secret field (hidden, just reset)
  useEffect(() => {
    setWebhookSecret("");
    setShopDomain("");
    setShowSecret(false);
  }, [ativa]);

  async function salvar() {
    setSaving(true); setErro(null); setOk(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado.");
      const { error } = await supabase.from("user_settings").upsert({
        user_id:            user.id,
        meta_access_token:  token.trim(),
        meta_ad_account_id: accountId.trim() || null,
      }, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Salvo com sucesso!");
      setOk(true);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    }
    setSaving(false);
  }

  async function salvarWebhook() {
    if (!webhookSecret.trim()) {
      toast.error("Informe o secret/token da plataforma.");
      return;
    }
    setSavingWebhook(true);
    try {
      const body: Record<string, string> = { platform: ativa, secret: webhookSecret };
      const platInfo = PLATAFORMAS_WEBHOOK.find(p => p.id === ativa);
      if (platInfo?.needsDomain) {
        if (!shopDomain.trim()) {
          toast.error("Informe o domínio da loja.");
          setSavingWebhook(false);
          return;
        }
        body.shop_domain = shopDomain.trim();
      }
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Erro ao salvar");
      }
      toast.success("Integração salva!");
      setWebhookSecret("");
      setShopDomain("");
      await loadWebhookIntegrations();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    }
    setSavingWebhook(false);
  }

  async function removerWebhook(id: string) {
    setDeletingWebhook(true);
    try {
      const res = await fetch(`/api/settings/integrations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao remover");
      toast.success("Integração removida.");
      await loadWebhookIntegrations();
    } catch {
      toast.error("Erro ao remover integração.");
    }
    setDeletingWebhook(false);
  }

  async function gerarApiKey() {
    setGeneratingKey(true);
    setNewApiKey(null);
    try {
      const res = await fetch("/api/settings/api-key", { method: "POST" });
      if (!res.ok) throw new Error("Erro ao gerar");
      const json = await res.json();
      setNewApiKey(json.api_key);
      setHasApiKey(true);
      setApiKeyMasked(null); // will reload after copy
      await loadApiKey();
    } catch {
      toast.error("Erro ao gerar API key.");
    }
    setGeneratingKey(false);
  }

  function copiarApiKey() {
    if (!newApiKey) return;
    navigator.clipboard.writeText(newApiKey);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
    toast.success("API key copiada!");
  }

  const tokenConfigurado = token.length > 10;
  const contaConfigurada = accountId.length > 3;
  const metaConectado    = tokenConfigurado && contaConfigurada;

  // Estado das plataformas OAuth
  const [googleConectado, setGoogleConectado]   = useState(false);
  const [tiktokConectado, setTiktokConectado]   = useState(false);
  const [linkedinConectado, setLinkedinConectado] = useState(false);
  const [syncingPlat, setSyncingPlat]           = useState<string | null>(null);

  function statusMeta() {
    if (metaConectado) return "connected";
    if (tokenConfigurado || contaConfigurada) return "partial";
    return "disconnected";
  }

  function statusPlat(id: string) {
    if (id === "google")   return googleConectado   ? "connected" : "disconnected";
    if (id === "tiktok")   return tiktokConectado   ? "connected" : "disconnected";
    if (id === "linkedin") return linkedinConectado ? "connected" : "disconnected";
    return "disconnected";
  }

  async function syncPlataforma(plat: string) {
    setSyncingPlat(plat);
    try {
      const res = await fetch(`/api/${plat}-ads-sync`, { method: "POST" });
      const json = await res.json();
      if (res.ok) toast.success(`${json.synced} campanhas sincronizadas!`);
      else toast.error(json.error ?? "Erro ao sincronizar");
    } catch {
      toast.error("Erro de conexão");
    }
    setSyncingPlat(null);
  }

  async function desconectarPlat(plat: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const updates: Record<string, null> = {
      google:   { google_ads_access_token: null, google_ads_refresh_token: null, google_ads_customer_id: null },
      tiktok:   { tiktok_ads_access_token: null, tiktok_ads_advertiser_id: null },
      linkedin: { linkedin_ads_access_token: null, linkedin_ads_refresh_token: null, linkedin_ads_account_id: null },
    }[plat] ?? {};
    await supabase.from("user_settings").update(updates).eq("user_id", user.id);
    if (plat === "google")   setGoogleConectado(false);
    if (plat === "tiktok")   setTiktokConectado(false);
    if (plat === "linkedin") setLinkedinConectado(false);
    toast.success("Plataforma desconectada.");
  }

  function getWebhookStatus(platformId: string) {
    const found = webhookIntegrations.find(i => i.platform === platformId);
    return found ? "connected" : "disconnected";
  }

  const isWebhookPlatform = (id: AtivaId): id is WebhookPlatformId =>
    PLATAFORMAS_WEBHOOK.some(p => p.id === id);

  const currentWebhookPlat = isWebhookPlatform(ativa)
    ? PLATAFORMAS_WEBHOOK.find(p => p.id === ativa)
    : null;

  const currentWebhookIntegration = isWebhookPlatform(ativa)
    ? webhookIntegrations.find(i => i.platform === ativa) ?? null
    : null;

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
            <Link2 size={16} className="text-emerald-400" />
            <h1 className="text-[22px] font-bold">Integrações</h1>
          </div>
          <p className="text-[12px] text-white/30">Conecte suas plataformas de anúncios, e-commerce e infoprodutos.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-white/30" /></div>
        ) : (
          <div className="space-y-6">

            {/* ── API Key section ──────────────────────────────────── */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Key size={14} className="text-emerald-400" />
                <span className="text-[13px] font-semibold">API Key Erizon</span>
                {hasApiKey && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-auto" />}
              </div>

              <p className="text-[11px] text-white/30 leading-relaxed">
                Use este token para integrar com Zapier, Make ou qualquer sistema externo via{" "}
                <CodigoInline>POST /api/events</CodigoInline>. Autentique com o header{" "}
                <CodigoInline>Authorization: Bearer &lt;sua-key&gt;</CodigoInline>.
              </p>

              {/* Show new key (one-time reveal) */}
              {newApiKey && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
                    <AlertTriangle size={12} className="text-amber-400 shrink-0" />
                    <p className="text-[11px] text-amber-400 font-semibold">Copie agora — não será exibida novamente</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] font-mono text-[11px] text-emerald-400 break-all">
                      {newApiKey}
                    </div>
                    <button
                      onClick={copiarApiKey}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-[11px] font-semibold transition-all shrink-0"
                    >
                      {apiKeyCopied ? <Check size={12} /> : <Copy size={12} />}
                      {apiKeyCopied ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>
              )}

              {/* Show masked key */}
              {!newApiKey && hasApiKey && apiKeyMasked && (
                <div className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] font-mono text-[11px] text-white/40">
                  {apiKeyMasked}
                </div>
              )}

              <div className="flex gap-2">
                {!hasApiKey ? (
                  <button
                    onClick={gerarApiKey}
                    disabled={generatingKey}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600/80 hover:bg-emerald-500 text-[12px] font-semibold rounded-xl transition-all disabled:opacity-40"
                  >
                    {generatingKey ? <Loader2 size={12} className="animate-spin" /> : <Key size={12} />}
                    Gerar API Key
                  </button>
                ) : (
                  <button
                    onClick={gerarApiKey}
                    disabled={generatingKey}
                    className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-[12px] font-semibold rounded-xl transition-all disabled:opacity-40"
                  >
                    {generatingKey ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    Regenerar
                  </button>
                )}
              </div>
            </div>

            {/* ── Seção: Plataformas de anúncios ─────────────────── */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">Plataformas de Anúncios</p>
              <div className="grid grid-cols-2 gap-3">
                {PLATAFORMAS_ADS.map(p => {
                  const isSelected = ativa === p.id;
                  const status = p.id === "meta" ? statusMeta() : statusPlat(p.id);

                  return (
                    <button
                      key={p.id}
                      onClick={() => setAtiva(p.id)}
                      className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? "border-white/[0.14] bg-white/[0.05]"
                          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1]"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-black shrink-0 ${!p.disponivel ? "opacity-50" : ""}`}
                        style={{ backgroundColor: p.cor + "33", border: `1px solid ${p.cor}44` }}
                      >
                        <span style={{ color: p.cor }}>{p.sigla}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-white/80">{p.nome}</p>
                        <p className="text-[10px] mt-0.5">
                          {status === "connected"    && <span className="text-emerald-400">● Conectado</span>}
                          {status === "partial"      && <span className="text-amber-400">● Incompleto</span>}
                          {status === "disconnected" && <span className="text-white/30">Não conectado</span>}
                        </p>
                      </div>

                      {status === "connected" && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                      {status === "partial"   && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Seção: E-commerce & Infoprodutos ───────────────── */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">E-commerce & Infoprodutos (Webhook)</p>
              <div className="grid grid-cols-2 gap-3">
                {PLATAFORMAS_WEBHOOK.map(p => {
                  const isSelected = ativa === p.id;
                  const status = getWebhookStatus(p.id);

                  return (
                    <button
                      key={p.id}
                      onClick={() => setAtiva(p.id)}
                      className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? "border-white/[0.14] bg-white/[0.05]"
                          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1]"
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-black text-white shrink-0"
                        style={{ backgroundColor: p.cor + "33", border: `1px solid ${p.cor}44` }}
                      >
                        <span style={{ color: p.cor }}>{p.sigla}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-white/80">{p.nome}</p>
                        <p className="text-[10px] mt-0.5">
                          {status === "connected"    ? <span className="text-emerald-400">Conectado</span>
                                                     : <span className="text-white/30">Não conectado</span>}
                        </p>
                      </div>

                      {status === "connected" && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Painel da plataforma selecionada ─────────────────── */}

            {/* Meta Ads */}
            {ativa === "meta" && (
              <div className="space-y-4">
                {/* Status banner */}
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                  metaConectado
                    ? "bg-emerald-500/[0.04] border-emerald-500/20"
                    : "bg-amber-500/[0.04] border-amber-500/20"
                }`}>
                  {metaConectado ? (
                    <>
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                      <p className="text-[12px] text-emerald-400">Meta Ads conectado — campanhas sincronizando automaticamente</p>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                      <p className="text-[12px] text-amber-400">
                        {!tokenConfigurado ? "Token de acesso não configurado" : "ID da conta não configurado"}
                        {" "}— preencha os campos abaixo
                      </p>
                    </>
                  )}
                </div>

                {/* Formulário */}
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-[11px] font-black shrink-0">f</div>
                    <span className="text-[14px] font-semibold">Meta Ads</span>
                    {metaConectado && <CheckCircle2 size={13} className="text-emerald-400 ml-auto" />}
                  </div>

                  {/* Token */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">
                      Token de acesso (System User Token)
                    </label>
                    <div className="relative">
                      <input
                        type={showToken ? "text" : "password"}
                        value={token}
                        onChange={e => setToken(e.target.value)}
                        placeholder="EAAxxxxxxxxxx..."
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 pr-10 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/40 transition-colors font-mono"
                      />
                      <button onClick={() => setShowToken(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                        {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-white/20 mt-1.5">Token de longa duração do usuário do sistema no Meta Business Manager</p>
                  </div>

                  {/* Account ID */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">
                      ID da conta de anúncios
                    </label>
                    <input
                      value={accountId}
                      onChange={e => setAccountId(e.target.value)}
                      placeholder="act_940503557648538"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/40 transition-colors font-mono"
                    />
                    <p className="text-[10px] text-white/20 mt-1.5">
                      Formato: <CodigoInline>act_</CodigoInline> seguido do número da conta
                    </p>
                  </div>
                </div>

                {/* Guia passo a passo */}
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
                  <button
                    onClick={() => setGuiaAberto(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-white/70">
                        📋 Como gerar o token e encontrar o ID da conta
                      </span>
                      {!metaConectado && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 font-semibold">
                          Recomendado
                        </span>
                      )}
                    </div>
                    {guiaAberto ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
                  </button>

                  {guiaAberto && (
                    <div className="px-5 pb-2 border-t border-white/[0.05]">
                      <div className="mt-5 mb-4">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 mb-4">
                          Parte 1 — Gerar o Token de Acesso
                        </p>
                        <Passo num={1} titulo="Acesse o Meta Business Manager">
                          <p>Abra <a href="https://business.facebook.com" target="_blank" rel="noopener" className="text-emerald-400 hover:underline inline-flex items-center gap-1">business.facebook.com <ExternalLink size={10}/></a> e entre com sua conta.</p>
                        </Passo>
                        <Passo num={2} titulo='Vá em Configurações do Negócio'>
                          <p>No menu lateral, clique em <strong className="text-white/60">Configurações</strong> → <strong className="text-white/60">Configurações do Negócio</strong>.</p>
                        </Passo>
                        <Passo num={3} titulo="Crie um Usuário do Sistema">
                          <p>Vá em <strong className="text-white/60">Usuários</strong> → <strong className="text-white/60">Usuários do Sistema</strong>.</p>
                          <p className="mt-1">Clique em <strong className="text-white/60">Adicionar</strong>, dê um nome (ex: <CodigoInline>Erizon Sync</CodigoInline>) e selecione <strong className="text-white/60">Funcionário</strong>.</p>
                        </Passo>
                        <Passo num={4} titulo="Adicione as contas de anúncios ao usuário">
                          <p>Clique em <strong className="text-white/60">Adicionar ativos</strong> → <strong className="text-white/60">Contas de anúncios</strong>.</p>
                          <p className="mt-1">Dê permissão de <strong className="text-white/60">Anunciante</strong> (leitura + ação).</p>
                        </Passo>
                        <Passo num={5} titulo="Gere o token de acesso">
                          <p>Clique em <strong className="text-white/60">Gerar novo token</strong> e marque as permissões:</p>
                          <div className="mt-2 space-y-1">
                            {["ads_read", "ads_management", "business_management", "instagram_basic", "instagram_manage_insights"].map(perm => (
                              <div key={perm} className="flex items-center gap-2">
                                <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                                <CodigoInline>{perm}</CodigoInline>
                              </div>
                            ))}
                          </div>
                          <p className="mt-2 text-amber-400">⚠️ Copie o token imediatamente — ele não aparece novamente.</p>
                        </Passo>
                      </div>

                      <div className="border-t border-white/[0.05] pt-4 mb-4">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400 mb-4">
                          Parte 2 — Encontrar o ID da Conta de Anúncios
                        </p>
                        <Passo num={1} titulo="Abra o Gerenciador de Anúncios">
                          <p>Acesse <a href="https://www.facebook.com/adsmanager" target="_blank" rel="noopener" className="text-blue-400 hover:underline inline-flex items-center gap-1">facebook.com/adsmanager <ExternalLink size={10}/></a>.</p>
                        </Passo>
                        <Passo num={2} titulo="Veja o ID na URL">
                          <div className="mt-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] font-mono text-[11px] text-white/50 break-all">
                            facebook.com/adsmanager/...?act=<span className="text-blue-400">940503557648538</span>
                          </div>
                          <p className="mt-2">Cole no formato <CodigoInline>act_940503557648538</CodigoInline>.</p>
                        </Passo>
                      </div>

                      <div className="mb-5 px-4 py-3 rounded-xl bg-purple-500/[0.04] border border-purple-500/15">
                        <p className="text-[11px] text-purple-400 font-semibold mb-1">💡 Dica</p>
                        <p className="text-[11px] text-white/35">
                          O System User Token do BM não expira. Use sempre ele para garantir sync contínuo.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Erros e sucesso */}
                {erro && (
                  <div className="flex items-center gap-2 text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <AlertTriangle size={13} /> {erro}
                  </div>
                )}
                {ok && (
                  <div className="flex items-center gap-2 text-[12px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                    <CheckCircle2 size={13} /> Integração salva! O sync automático já está ativo.
                  </div>
                )}

                <button
                  onClick={salvar}
                  disabled={saving || (!token.trim() && !accountId.trim())}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600/80 hover:bg-emerald-500 text-[13px] font-semibold rounded-xl transition-all disabled:opacity-40"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Salvar integração
                </button>
              </div>
            )}

            {/* Plataformas de anúncios — OAuth */}
            {(ativa === "google" || ativa === "tiktok" || ativa === "linkedin") && (() => {
              const plat = PLATAFORMAS_ADS.find(p => p.id === ativa)!;

              const conectado = statusPlat(ativa) === "connected";
              const oauthUrl  = `/api/auth/${ativa}-ads`;

              const descricao: Record<string, string> = {
                google:   "Conecte sua conta Google Ads via OAuth. Após conectar, sincronize campanhas para ver score, CPL e ROAS ao lado do Meta.",
                tiktok:   "Conecte sua conta TikTok Ads via OAuth. Visualize campanhas de vídeo com o mesmo score unificado do Meta.",
                linkedin: "Conecte o LinkedIn Campaign Manager. Ideal para anúncios B2B com CPL e métricas de conversão integrados.",
              };

              const requisitos: Record<string, string[]> = {
                google:   ["GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_ADS_DEVELOPER_TOKEN"],
                tiktok:   ["TIKTOK_ADS_APP_ID", "TIKTOK_ADS_APP_SECRET"],
                linkedin: ["LINKEDIN_ADS_CLIENT_ID", "LINKEDIN_ADS_CLIENT_SECRET"],
              };

              return (
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
                  {/* Header */}
                  <div className="px-6 py-5 border-b border-white/[0.05] flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-[18px] font-black shrink-0"
                      style={{ backgroundColor: plat.cor + "22", border: `1px solid ${plat.cor}44` }}
                    >
                      <span style={{ color: plat.cor }}>{plat.sigla}</span>
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-white/80">{plat.nome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${conectado ? "bg-emerald-400" : "bg-white/20"}`} />
                        <p className={`text-[11px] ${conectado ? "text-emerald-400/70" : "text-white/30"}`}>
                          {conectado ? "Conectado" : "Não conectado"}
                        </p>
                      </div>
                    </div>
                    {conectado && (
                      <button
                        onClick={() => desconectarPlat(ativa)}
                        className="ml-auto flex items-center gap-1.5 text-[11px] text-white/25 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} /> Desconectar
                      </button>
                    )}
                  </div>

                  {/* Body */}
                  <div className="px-6 py-5 space-y-4">
                    <p className="text-[12px] text-white/40 leading-relaxed">{descricao[ativa]}</p>

                    {conectado ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/15">
                          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                          <p className="text-[12px] text-emerald-400">
                            {plat.nome} conectado — campanhas sincronizando automaticamente
                          </p>
                        </div>
                        <button
                          onClick={() => syncPlataforma(ativa)}
                          disabled={syncingPlat === ativa}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] text-[12px] font-semibold text-white/60 hover:text-white hover:border-white/20 transition-all disabled:opacity-40"
                        >
                          {syncingPlat === ativa
                            ? <><Loader2 size={13} className="animate-spin" /> Sincronizando...</>
                            : <><RefreshCw size={13} /> Sincronizar agora</>}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Env vars necessárias */}
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/20 mb-2">
                            Variáveis de ambiente necessárias (Vercel)
                          </p>
                          {requisitos[ativa]?.map(v => (
                            <div key={v} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                              <CodigoInline>{v}</CodigoInline>
                            </div>
                          ))}
                        </div>

                        <a
                          href={oauthUrl}
                          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-[13px] text-white transition-all hover:opacity-90"
                          style={{ backgroundColor: plat.cor, opacity: 1 }}
                        >
                          <ExternalLink size={14} /> Conectar {plat.nome} via OAuth
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Painel webhook (Hotmart, Kirvano, Shopify, Nuvemshop) */}
            {currentWebhookPlat && (
              <div className="space-y-4">
                {/* Status banner */}
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                  currentWebhookIntegration
                    ? "bg-emerald-500/[0.04] border-emerald-500/20"
                    : "bg-white/[0.02] border-white/[0.08]"
                }`}>
                  {currentWebhookIntegration ? (
                    <>
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                      <p className="text-[12px] text-emerald-400">{currentWebhookPlat.nome} conectado via webhook</p>
                      <button
                        onClick={() => removerWebhook(currentWebhookIntegration.id)}
                        disabled={deletingWebhook}
                        className="ml-auto flex items-center gap-1 text-[10px] text-white/30 hover:text-red-400 transition-colors"
                      >
                        {deletingWebhook ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                        Remover
                      </button>
                    </>
                  ) : (
                    <>
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0"
                        style={{ backgroundColor: currentWebhookPlat.cor + "33", color: currentWebhookPlat.cor }}
                      >
                        {currentWebhookPlat.sigla}
                      </div>
                      <p className="text-[12px] text-white/40">Configure o webhook do {currentWebhookPlat.nome} abaixo</p>
                    </>
                  )}
                </div>

                {/* Webhook URL to paste in the platform */}
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">
                      URL do Webhook — cole na plataforma
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] font-mono text-[11px] text-white/50 break-all">
                        {`https://erizonai.com.br/api/webhook/${currentWebhookPlat.id}`}
                      </div>
                      <CodigoInline>{`https://erizonai.com.br/api/webhook/${currentWebhookPlat.id}`}</CodigoInline>
                    </div>
                  </div>

                  {/* Secret / token field */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">
                      {currentWebhookPlat.id === "hotmart" ? "Webhook Secret (Hotmart)" :
                       currentWebhookPlat.id === "kirvano" ? "Token de autenticação (Kirvano)" :
                       currentWebhookPlat.id === "shopify"  ? "Webhook Secret (Shopify)" :
                       "Token de autenticação (Nuvemshop)"}
                    </label>
                    <div className="relative">
                      <input
                        type={showSecret ? "text" : "password"}
                        value={webhookSecret}
                        onChange={e => setWebhookSecret(e.target.value)}
                        placeholder={currentWebhookIntegration ? "••••••••••••••••••••" : "Cole o token/secret aqui..."}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 pr-10 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/40 transition-colors font-mono"
                      />
                      <button onClick={() => setShowSecret(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                        {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-white/20 mt-1.5">
                      {currentWebhookPlat.id === "hotmart"
                        ? "Encontre em Ferramentas → Webhook → Secret no painel Hotmart."
                        : currentWebhookPlat.id === "kirvano"
                        ? "Encontre em Integrações → Webhook no painel Kirvano."
                        : currentWebhookPlat.id === "shopify"
                        ? "Gerado automaticamente ao criar o webhook em Configurações → Notificações no Shopify."
                        : "Gerado nas configurações de webhook da sua loja Nuvemshop."}
                    </p>
                  </div>

                  {/* Shop domain (only for Shopify / Nuvemshop) */}
                  {currentWebhookPlat.needsDomain && (
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">
                        {currentWebhookPlat.id === "shopify" ? "Domínio da loja (ex: minha-loja.myshopify.com)" : "Domínio da loja (ex: minha-loja.lojavirtual.com.br)"}
                      </label>
                      <input
                        value={shopDomain}
                        onChange={e => setShopDomain(e.target.value)}
                        placeholder={currentWebhookPlat.id === "shopify" ? "minha-loja.myshopify.com" : "minha-loja.lojavirtual.com.br"}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/40 transition-colors font-mono"
                      />
                      {currentWebhookIntegration?.shop_domain && (
                        <p className="text-[10px] text-emerald-400/60 mt-1.5">
                          Atual: {currentWebhookIntegration.shop_domain}
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={salvarWebhook}
                    disabled={savingWebhook || !webhookSecret.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600/80 hover:bg-emerald-500 text-[13px] font-semibold rounded-xl transition-all disabled:opacity-40"
                    style={savingWebhook || !webhookSecret.trim() ? {} : { backgroundColor: currentWebhookPlat.cor + "cc" }}
                  >
                    {savingWebhook ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    {currentWebhookIntegration ? "Atualizar integração" : "Salvar integração"}
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
