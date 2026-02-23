// settings/page.tsx — atualizado com valor_lead_qualificado
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Save, AlertCircle, CheckCircle, ChevronDown, ChevronUp,
  ExternalLink, Plus, Trash2, Building2, Pencil, X,
  Bell, MessageCircle, Zap, Loader2, SlidersHorizontal,
  Users, Globe, TrendingUp, Home, DollarSign
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BMAccount {
  id: string; nome: string; access_token: string;
  ad_account_id: string; ativo: boolean; criado_em: string;
}
interface FormState { nome: string; access_token: string; ad_account_id: string; }
interface UserConfig { telegram_chat_id: string; limite_cpl: string; }
interface EngineConfigState {
  ticket_medio_cliente: string;
  ticket_medio_global: string;
  taxa_conversao: string;
  valor_lead_qualificado: string;   // novo campo
  tipo_negocio: "padrao" | "alto_valor"; // controla qual modo usar
}

type TabAtiva = "bm" | "alertas" | "engine";

const EMPTY_FORM: FormState = { nome: "", access_token: "", ad_account_id: "" };
const EMPTY_ENGINE: EngineConfigState = {
  ticket_medio_cliente: "", ticket_medio_global: "", taxa_conversao: "",
  valor_lead_qualificado: "", tipo_negocio: "padrao",
};

function GuideStep({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex-shrink-0 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">{num}</span>
      <div>
        <p className="text-sm font-semibold text-white mb-1">{title}</p>
        {children}
      </div>
    </div>
  );
}

function BMCard({ bm, onSetAtivo, onEdit, onDelete }: {
  bm: BMAccount; onSetAtivo: (id: string) => void; onEdit: (bm: BMAccount) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className={`flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${bm.ativo ? "border-purple-500/30 bg-purple-600/5" : "border-white/[0.06] bg-black/20 hover:border-white/[0.10]"}`}>
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bm.ativo ? "bg-purple-600 text-white" : "bg-white/5 text-gray-500"}`}>
          <Building2 size={17} />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-bold text-white text-sm">{bm.nome}</p>
            {bm.ativo && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-600/15 border border-purple-500/25 rounded-full">
                <span className="w-1 h-1 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-[9px] font-semibold text-purple-400">Ativa</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-600 font-mono">{bm.ad_account_id}</p>
          <p className="text-[10px] text-gray-700 mt-0.5">Token: {bm.access_token.slice(0, 14)}•••</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!bm.ativo && (
          <button onClick={() => onSetAtivo(bm.id)} className="px-3 py-1.5 bg-purple-600/10 border border-purple-500/20 text-purple-400 hover:bg-purple-600 hover:text-white hover:border-purple-600 rounded-xl text-xs font-semibold transition-all">Ativar</button>
        )}
        <button onClick={() => onEdit(bm)} className="p-2 bg-white/5 border border-white/[0.08] text-gray-500 hover:text-white hover:border-white/20 rounded-xl transition-all"><Pencil size={13} /></button>
        <button onClick={() => onDelete(bm.id)} className="p-2 bg-red-500/5 border border-red-500/15 text-red-500/40 hover:text-red-400 hover:border-red-500/30 rounded-xl transition-all"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

function EngineField({ icon: Icon, label, description, prefix, suffix, placeholder, value, onChange, accent = "purple" }: {
  icon: React.ElementType; label: string; description: string; prefix?: string; suffix?: string;
  placeholder: string; value: string; onChange: (v: string) => void; accent?: "purple" | "emerald" | "amber" | "blue";
}) {
  const accentMap = {
    purple:  { icon: "text-purple-400",  border: "focus:border-purple-500/50",  bg: "bg-purple-600/10 border-purple-500/20"  },
    emerald: { icon: "text-emerald-400", border: "focus:border-emerald-500/50", bg: "bg-emerald-600/10 border-emerald-500/20" },
    amber:   { icon: "text-amber-400",   border: "focus:border-amber-500/40",   bg: "bg-amber-600/10 border-amber-500/20"    },
    blue:    { icon: "text-blue-400",    border: "focus:border-blue-500/40",    bg: "bg-blue-600/10 border-blue-500/20"      },
  }[accent];
  return (
    <div className="p-5 rounded-2xl bg-black/20 border border-white/[0.05]">
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${accentMap.bg}`}>
          <Icon size={13} className={accentMap.icon} />
        </div>
        <div>
          <p className="text-[12px] font-bold text-white">{label}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="relative">
        {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-sm font-semibold pointer-events-none">{prefix}</span>}
        <input type="number" min="0" step="0.01" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full bg-black/50 border border-white/[0.08] rounded-xl ${prefix ? "pl-9" : "pl-4"} ${suffix ? "pr-10" : "pr-4"} py-3 text-white text-sm placeholder-gray-700 focus:outline-none ${accentMap.border} transition-all`} />
        {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 text-xs font-semibold pointer-events-none">{suffix}</span>}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [bms, setBms]                             = useState<BMAccount[]>([]);
  const [loadingData, setLoadingData]             = useState(true);
  const [saving, setSaving]                       = useState(false);
  const [savingConfig, setSavingConfig]           = useState(false);
  const [savingEngine, setSavingEngine]           = useState(false);
  const [error, setError]                         = useState("");
  const [success, setSuccess]                     = useState("");
  const [configSuccess, setConfigSuccess]         = useState("");
  const [engineSuccess, setEngineSuccess]         = useState("");
  const [modalOpen, setModalOpen]                 = useState(false);
  const [editingId, setEditingId]                 = useState<string | null>(null);
  const [form, setForm]                           = useState<FormState>(EMPTY_FORM);
  const [showTokenGuide, setShowTokenGuide]       = useState(false);
  const [showAccountGuide, setShowAccountGuide]   = useState(false);
  const [showTelegramGuide, setShowTelegramGuide] = useState(false);
  const [userConfig, setUserConfig]               = useState<UserConfig>({ telegram_chat_id: "", limite_cpl: "" });
  const [engineConfig, setEngineConfig]           = useState<EngineConfigState>(EMPTY_ENGINE);
  const [tabAtiva, setTabAtiva]                   = useState<TabAtiva>("bm");

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Não autenticado"); return; }
      const [{ data: bmsData, error: bmsError }, { data: configData }] = await Promise.all([
        supabase.from("bm_accounts").select("*").eq("user_id", user.id).order("criado_em", { ascending: false }),
        supabase.from("user_configs").select("telegram_chat_id, limite_cpl, ticket_medio_cliente, ticket_medio_global, taxa_conversao, valor_lead_qualificado").eq("user_id", user.id).single(),
      ]);
      if (bmsError) throw bmsError;
      setBms(bmsData || []);
      if (configData) {
        setUserConfig({ telegram_chat_id: configData.telegram_chat_id || "", limite_cpl: configData.limite_cpl?.toString() || "" });
        const vlq = configData.valor_lead_qualificado;
        setEngineConfig({
          ticket_medio_cliente: configData.ticket_medio_cliente?.toString() || "",
          ticket_medio_global:  configData.ticket_medio_global?.toString()  || "",
          taxa_conversao:       configData.taxa_conversao != null ? (configData.taxa_conversao * 100).toString() : "",
          valor_lead_qualificado: vlq?.toString() || "",
          tipo_negocio: vlq && vlq > 0 ? "alto_valor" : "padrao",
        });
      }
    } catch { setError("Erro ao carregar configurações"); }
    finally { setLoadingData(false); }
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  function openCreate() { setEditingId(null); setForm(EMPTY_FORM); setShowTokenGuide(false); setShowAccountGuide(false); setModalOpen(true); }
  function openEdit(bm: BMAccount) { setEditingId(bm.id); setForm({ nome: bm.nome, access_token: bm.access_token, ad_account_id: bm.ad_account_id }); setShowTokenGuide(false); setShowAccountGuide(false); setModalOpen(true); }

  async function handleSaveConfig() {
    if (!userConfig.telegram_chat_id.trim() && !userConfig.limite_cpl.trim()) { setError("Preencha pelo menos um campo"); return; }
    setSavingConfig(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      await supabase.from("user_configs").upsert({ user_id: user.id, telegram_chat_id: userConfig.telegram_chat_id.trim() || null, limite_cpl: userConfig.limite_cpl ? parseFloat(userConfig.limite_cpl) : null }, { onConflict: "user_id" });
      // telegram_chat_id já salvo em user_configs acima
      setConfigSuccess("Configurações salvas!"); setTimeout(() => setConfigSuccess(""), 3000);
    } catch (e: any) { setError(e.message || "Erro ao salvar"); }
    finally { setSavingConfig(false); }
  }

  async function handleSaveEngine() {
    const tmCliente = engineConfig.ticket_medio_cliente ? parseFloat(engineConfig.ticket_medio_cliente) : null;
    const tmGlobal  = engineConfig.ticket_medio_global  ? parseFloat(engineConfig.ticket_medio_global)  : null;
    const taxa      = engineConfig.taxa_conversao        ? parseFloat(engineConfig.taxa_conversao)        : null;
    const vlq       = engineConfig.valor_lead_qualificado ? parseFloat(engineConfig.valor_lead_qualificado) : null;

    if (taxa !== null && (taxa < 0 || taxa > 100)) { setError("Taxa de conversão deve ser entre 0 e 100%"); return; }

    setSavingEngine(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error: e } = await supabase.from("user_configs").upsert({
        user_id: user.id,
        ticket_medio_cliente: tmCliente,
        ticket_medio_global:  tmGlobal,
        taxa_conversao:       taxa !== null ? taxa / 100 : null,
        valor_lead_qualificado: vlq,
      }, { onConflict: "user_id" });
      if (e) throw e;
      setEngineSuccess("Parâmetros do Engine salvos!"); setTimeout(() => setEngineSuccess(""), 3000);
    } catch (e: any) { setError(e.message || "Erro ao salvar Engine"); }
    finally { setSavingEngine(false); }
  }

  async function handleSave() {
    if (!form.nome.trim() || !form.access_token.trim() || !form.ad_account_id.trim()) { setError("Preencha todos os campos"); return; }
    const adAccountId = form.ad_account_id.trim();
    if (!adAccountId.startsWith("act_") || adAccountId.length < 8) { setError("Ad Account ID deve começar com act_"); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      if (editingId) {
        await supabase.from("bm_accounts").update({ nome: form.nome.trim(), access_token: form.access_token.trim(), ad_account_id: adAccountId }).eq("id", editingId).eq("user_id", user.id);
        setSuccess("Conta atualizada!");
        const bmAtiva = bms.find(b => b.id === editingId && b.ativo);
        if (bmAtiva) await supabase.from("user_settings").upsert({ user_id: user.id, meta_access_token: form.access_token.trim(), meta_ad_account_id: adAccountId }, { onConflict: "user_id" });
      } else {
        const isFirst = bms.length === 0;
        await supabase.from("bm_accounts").insert({ user_id: user.id, nome: form.nome.trim(), access_token: form.access_token.trim(), ad_account_id: adAccountId, ativo: isFirst });
        setSuccess("Conta adicionada!");
        if (isFirst) await supabase.from("user_settings").upsert({ user_id: user.id, meta_access_token: form.access_token.trim(), meta_ad_account_id: adAccountId }, { onConflict: "user_id" });
      }
      setModalOpen(false); setForm(EMPTY_FORM); await loadData(); setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) { setError(e.message || "Erro ao salvar"); }
    finally { setSaving(false); }
  }

  async function handleSetAtivo(id: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("bm_accounts").update({ ativo: false }).eq("user_id", user.id);
      await supabase.from("bm_accounts").update({ ativo: true }).eq("id", id).eq("user_id", user.id);
      const bmAtivada = bms.find(b => b.id === id);
      if (bmAtivada) await supabase.from("user_settings").upsert({ user_id: user.id, meta_access_token: bmAtivada.access_token, meta_ad_account_id: bmAtivada.ad_account_id }, { onConflict: "user_id" });
      await loadData(); setSuccess("Conta ativa atualizada!"); setTimeout(() => setSuccess(""), 3000);
    } catch { setError("Erro ao atualizar conta ativa"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta conta?")) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("bm_accounts").delete().eq("id", id).eq("user_id", user.id);
      await loadData();
    } catch { setError("Erro ao remover conta"); }
  }

  const TABS: { id: TabAtiva; label: string; icon: React.ElementType }[] = [
    { id: "bm", label: "Business Managers", icon: Building2 },
    { id: "alertas", label: "Alertas", icon: Bell },
    { id: "engine", label: "Engine", icon: SlidersHorizontal },
  ];

  if (loadingData) return (
    <div className="flex min-h-screen bg-[#060608] text-white items-center justify-center">
      <div className="w-7 h-7 border-[1.5px] border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Preview engine
  const previewTicket = parseFloat(engineConfig.ticket_medio_cliente || engineConfig.ticket_medio_global || "0");
  const previewTaxa   = parseFloat(engineConfig.taxa_conversao || "0") / 100;
  const previewVLQ    = parseFloat(engineConfig.valor_lead_qualificado || "0");
  const isAltoValor   = engineConfig.tipo_negocio === "alto_valor" && previewVLQ > 0;

  return (
    <div className="flex min-h-screen bg-[#060608] text-white font-sans">
      <Sidebar />
      <main className="flex-1 ml-24 p-10">
        <div className="max-w-2xl mx-auto">
          <header className="mb-8 pb-8 border-b border-white/[0.05]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-500/70 mb-3">Configurações</p>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">Erizon <span className="text-purple-500">Settings</span></h1>
            <p className="text-gray-600 text-sm mt-2">Gerencie suas contas, alertas e parâmetros do engine</p>
          </header>

          {error && (
            <div className="mb-5 p-4 bg-red-500/8 border border-red-500/20 rounded-2xl flex items-center gap-3">
              <AlertCircle size={15} className="text-red-400 shrink-0" />
              <span className="text-sm text-red-400">{error}</span>
              <button onClick={() => setError("")} className="ml-auto text-red-500/40 hover:text-red-400"><X size={14} /></button>
            </div>
          )}
          {success && (
            <div className="mb-5 p-4 bg-emerald-500/8 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
              <CheckCircle size={15} className="text-emerald-400 shrink-0" />
              <span className="text-sm text-emerald-400">{success}</span>
            </div>
          )}

          <div className="flex items-center gap-1 bg-[#0c0c0e] border border-white/[0.06] p-1 rounded-2xl mb-6">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => { setTabAtiva(tab.id); setError(""); }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-150 ${tabAtiva === tab.id ? "bg-white/[0.07] text-white" : "text-white/25 hover:text-white/50"}`}>
                  <Icon size={13} /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* ══ BM ══ */}
          {tabAtiva === "bm" && (
            <div className="bg-[#0c0c0e] border border-white/[0.06] p-8 rounded-3xl">
              <div className="flex items-center justify-between mb-6">
                <p className="text-xs text-gray-600 font-semibold">{bms.length} {bms.length === 1 ? "conta configurada" : "contas configuradas"}</p>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(147,51,234,0.15)]">
                  <Plus size={14} /> Adicionar BM
                </button>
              </div>
              {bms.length === 0 ? (
                <div className="text-center py-14 border border-dashed border-white/[0.08] rounded-2xl">
                  <Building2 size={32} className="mx-auto mb-3 text-gray-700" />
                  <p className="font-semibold text-gray-600 text-sm mb-1">Nenhuma conta configurada</p>
                  <p className="text-gray-700 text-xs mb-5">Adicione sua primeira Business Manager para começar</p>
                  <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm rounded-xl transition-all">
                    <Plus size={13} /> Adicionar primeira BM
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">{bms.map(bm => <BMCard key={bm.id} bm={bm} onSetAtivo={handleSetAtivo} onEdit={openEdit} onDelete={handleDelete} />)}</div>
              )}
              <div className="mt-6 p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                <h3 className="font-semibold text-xs text-gray-500 mb-3">Recursos úteis</h3>
                <div className="space-y-2">
                  <a href="https://developers.facebook.com/docs/marketing-apis/overview" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm transition-colors"><ExternalLink size={13} /> Documentação da API do Facebook</a>
                  <a href="https://developers.facebook.com/tools/debug/accesstoken/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm transition-colors"><ExternalLink size={13} /> Debugger de Access Token</a>
                </div>
              </div>
            </div>
          )}

          {/* ══ ALERTAS ══ */}
          {tabAtiva === "alertas" && (
            <div className="bg-[#0c0c0e] border border-white/[0.06] p-8 rounded-3xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center"><Bell size={15} className="text-purple-400" /></div>
                <div><h2 className="text-sm font-bold text-white">Alertas e Notificações</h2><p className="text-[11px] text-gray-600">Configure onde e quando receber alertas do monitor IA</p></div>
              </div>
              {configSuccess && <div className="mb-5 p-3.5 bg-emerald-500/8 border border-emerald-500/20 rounded-xl flex items-center gap-3"><CheckCircle size={14} className="text-emerald-400 shrink-0" /><span className="text-xs text-emerald-400 font-medium">{configSuccess}</span></div>}
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-2"><span className="flex items-center gap-1.5"><MessageCircle size={11} className="text-purple-400" />Telegram Chat ID</span></label>
                  <input type="text" value={userConfig.telegram_chat_id} onChange={e => setUserConfig(c => ({ ...c, telegram_chat_id: e.target.value }))} placeholder="Ex: 6638448595" className="w-full bg-black/50 border border-white/[0.08] rounded-2xl px-5 py-3.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-purple-500/50 transition-all font-mono" />
                  <button onClick={() => setShowTelegramGuide(!showTelegramGuide)} className="mt-2 flex items-center gap-1.5 text-[11px] text-purple-400 hover:text-purple-300 transition-colors">
                    {showTelegramGuide ? <ChevronUp size={12} /> : <ChevronDown size={12} />}{showTelegramGuide ? "Ocultar guia" : "Como encontrar meu Chat ID?"}
                  </button>
                  {showTelegramGuide && (
                    <div className="mt-3 p-5 bg-purple-600/5 border border-purple-500/15 rounded-2xl space-y-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400 mb-2">Passo a Passo</p>
                      <GuideStep num={1} title="Abra o Telegram"><p className="text-gray-500 text-xs">Pesquise por <span className="text-purple-400 font-mono">@userinfobot</span></p></GuideStep>
                      <GuideStep num={2} title="Inicie o bot"><p className="text-gray-500 text-xs">Clique em Start ou envie qualquer mensagem</p></GuideStep>
                      <GuideStep num={3} title="Copie o ID"><p className="text-gray-500 text-xs">O bot vai responder com seu <span className="text-white font-semibold">Id</span> numérico. Cole aqui.</p></GuideStep>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-2"><span className="flex items-center gap-1.5"><Zap size={11} className="text-amber-400" />CPL Limite para Alerta (R$)</span></label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 text-sm font-semibold pointer-events-none">R$</span>
                    <input type="number" min="0" step="0.01" value={userConfig.limite_cpl} onChange={e => setUserConfig(c => ({ ...c, limite_cpl: e.target.value }))} placeholder="0.00" className="w-full bg-black/50 border border-white/[0.08] rounded-2xl pl-10 pr-5 py-3.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-amber-500/40 transition-all" />
                  </div>
                </div>
              </div>
              <button onClick={handleSaveConfig} disabled={savingConfig} className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-sm rounded-2xl transition-all">
                {savingConfig ? <><Loader2 size={14} className="animate-spin" />Salvando...</> : <><Save size={14} />Salvar Alertas</>}
              </button>
            </div>
          )}

          {/* ══ ENGINE ══ */}
          {tabAtiva === "engine" && (
            <div className="bg-[#0c0c0e] border border-white/[0.06] p-8 rounded-3xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center"><SlidersHorizontal size={15} className="text-purple-400" /></div>
                <div><h2 className="text-sm font-bold text-white">Parâmetros do Engine</h2><p className="text-[11px] text-gray-600">Calibre o motor financeiro com os dados reais do seu negócio</p></div>
              </div>

              <div className="my-5 p-4 bg-purple-600/5 border border-purple-500/15 rounded-xl">
                <p className="text-[11px] text-purple-300/70 leading-relaxed">
                  Esses valores são usados pelo <strong className="text-purple-300">algoritmo</strong> para calcular receita estimada, margem e ROAS com base no seu negócio real.
                </p>
              </div>

              {engineSuccess && <div className="mb-5 p-3.5 bg-emerald-500/8 border border-emerald-500/20 rounded-xl flex items-center gap-3"><CheckCircle size={14} className="text-emerald-400 shrink-0" /><span className="text-xs text-emerald-400 font-medium">{engineSuccess}</span></div>}

              {/* Seletor de modo */}
              <div className="mb-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-3">Tipo de negócio</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setEngineConfig(c => ({ ...c, tipo_negocio: "padrao" }))}
                    className={`flex flex-col items-start gap-1 p-4 rounded-2xl border transition-all ${engineConfig.tipo_negocio === "padrao" ? "border-purple-500/40 bg-purple-600/8" : "border-white/[0.06] bg-black/20 hover:border-white/[0.10]"}`}>
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className={engineConfig.tipo_negocio === "padrao" ? "text-purple-400" : "text-gray-600"} />
                      <span className={`text-[12px] font-bold ${engineConfig.tipo_negocio === "padrao" ? "text-white" : "text-gray-600"}`}>Padrão</span>
                    </div>
                    <p className="text-[10px] text-gray-600">Infoproduto, serviços, e-commerce</p>
                    <p className="text-[10px] text-gray-700">Ticket × Taxa de conversão</p>
                  </button>
                  <button onClick={() => setEngineConfig(c => ({ ...c, tipo_negocio: "alto_valor" }))}
                    className={`flex flex-col items-start gap-1 p-4 rounded-2xl border transition-all ${engineConfig.tipo_negocio === "alto_valor" ? "border-blue-500/40 bg-blue-600/8" : "border-white/[0.06] bg-black/20 hover:border-white/[0.10]"}`}>
                    <div className="flex items-center gap-2">
                      <Home size={14} className={engineConfig.tipo_negocio === "alto_valor" ? "text-blue-400" : "text-gray-600"} />
                      <span className={`text-[12px] font-bold ${engineConfig.tipo_negocio === "alto_valor" ? "text-white" : "text-gray-600"}`}>Alto Valor</span>
                    </div>
                    <p className="text-[10px] text-gray-600">Imóveis, veículos, B2B premium</p>
                    <p className="text-[10px] text-gray-700">Valor fixo por lead qualificado</p>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {engineConfig.tipo_negocio === "padrao" ? (
                  <>
                    <EngineField icon={Users} label="Ticket Médio do Cliente" description="Valor médio pago por cada cliente desta conta. Tem prioridade sobre o global." prefix="R$" placeholder="Ex: 800,00" value={engineConfig.ticket_medio_cliente} onChange={v => setEngineConfig(c => ({ ...c, ticket_medio_cliente: v }))} accent="purple" />
                    <EngineField icon={Globe} label="Ticket Médio Global" description="Valor padrão usado quando não há ticket específico configurado." prefix="R$" placeholder="Ex: 450,00" value={engineConfig.ticket_medio_global} onChange={v => setEngineConfig(c => ({ ...c, ticket_medio_global: v }))} accent="emerald" />
                    <EngineField icon={TrendingUp} label="Taxa de Conversão" description="De cada 100 leads gerados, quantos viram clientes pagantes." suffix="%" placeholder="Ex: 4" value={engineConfig.taxa_conversao} onChange={v => setEngineConfig(c => ({ ...c, taxa_conversao: v }))} accent="amber" />
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-blue-500/5 border border-blue-500/15 rounded-xl space-y-2">
                      <p className="text-[11px] text-blue-300/70 leading-relaxed">
                        <strong className="text-blue-300">Modo Alto Valor:</strong> Para imóveis, veículos e B2B premium, o ciclo de venda pode demorar meses — por isso não faz sentido usar ticket × taxa de conversão. Em vez disso, configure <strong className="text-blue-300">quanto vale cada lead qualificado</strong> que entra no seu funil (quem chegou em uma reunião, visita técnica ou atendimento real).
                      </p>
                      <p className="text-[11px] text-blue-300/50">
                        O algoritmo multiplica os leads gerados por esse valor para calcular o ROAS real de cada campanha.
                      </p>
                    </div>

                    {/* Calculadora visual — como chegar no valor do lead */}
                    <div className="p-5 bg-[#0a0a0c] border border-white/[0.06] rounded-2xl">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20 mb-4">Como calcular o valor do seu lead?</p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02]">
                          <span className="text-[13px] shrink-0">🏢</span>
                          <div>
                            <p className="text-[11px] font-bold text-white/60">Imóvel / Veículo de alto valor</p>
                            <p className="text-[10px] text-white/30 mt-0.5">Ticket R$2M · Comissão 3% = R$60k por venda · 1 em cada 40 leads fecha</p>
                            <p className="text-[11px] font-bold text-blue-400 mt-1">→ Valor do lead: R$1.500 por lead</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02]">
                          <span className="text-[13px] shrink-0">🏭</span>
                          <div>
                            <p className="text-[11px] font-bold text-white/60">B2B Premium / Contratos anuais</p>
                            <p className="text-[10px] text-white/30 mt-0.5">Contrato médio R$50k/ano · 1 em cada 20 leads qualificados fecha</p>
                            <p className="text-[11px] font-bold text-blue-400 mt-1">→ Valor do lead: R$2.500 por lead</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-500/[0.05] border border-purple-500/10">
                          <span className="text-[13px] shrink-0">📐</span>
                          <div>
                            <p className="text-[11px] font-bold text-white/60">Fórmula simples</p>
                            <p className="text-[10px] text-white/50 font-mono mt-1">(Ticket × Comissão%) ÷ leads necessários para 1 venda</p>
                            <p className="text-[10px] text-white/30 mt-1">Se não tem histórico, comece com 1% do ticket médio como estimativa conservadora.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <EngineField icon={Home} label="Valor por Lead Qualificado" description="Quanto vale um lead que chegou numa visita, reunião ou atendimento real. Use a fórmula acima para calcular. O algoritmo usa esse valor direto no ROAS." prefix="R$" placeholder="Ex: 1500,00" value={engineConfig.valor_lead_qualificado} onChange={v => setEngineConfig(c => ({ ...c, valor_lead_qualificado: v }))} accent="blue" />
                    <EngineField icon={Users} label="Ticket Médio (opcional)" description="Usado como referência para projeções de longo prazo." prefix="R$" placeholder="Ex: 2500000" value={engineConfig.ticket_medio_cliente} onChange={v => setEngineConfig(c => ({ ...c, ticket_medio_cliente: v }))} accent="purple" />
                  </>
                )}

                {/* Preview dinâmico */}
                {((engineConfig.tipo_negocio === "padrao" && previewTicket > 0 && previewTaxa > 0) || (engineConfig.tipo_negocio === "alto_valor" && previewVLQ > 0)) && (
                  <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20 mb-4">Preview — simulação com 100 leads</p>
                    <div className="grid grid-cols-3 gap-4">
                      {isAltoValor ? (
                        <>
                          <div className="text-center p-3 rounded-xl bg-black/20">
                            <p className="text-[10px] text-white/20 mb-1.5">Valor por lead</p>
                            <p className="text-lg font-black text-blue-400 font-mono">R${previewVLQ.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</p>
                          </div>
                          <div className="text-center p-3 rounded-xl bg-black/20">
                            <p className="text-[10px] text-white/20 mb-1.5">Receita (100 leads)</p>
                            <p className="text-lg font-black text-emerald-400 font-mono">R${(100 * previewVLQ).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</p>
                          </div>
                          <div className="text-center p-3 rounded-xl bg-black/20">
                            <p className="text-[10px] text-white/20 mb-1.5">ROAS (ex: R$500 gasto)</p>
                            <p className="text-lg font-black text-purple-400 font-mono">{(100 * previewVLQ / 500).toFixed(1)}×</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-center p-3 rounded-xl bg-black/20">
                            <p className="text-[10px] text-white/20 mb-1.5">Clientes fechados</p>
                            <p className="text-lg font-black text-white font-mono">{Math.round(100 * previewTaxa)}</p>
                          </div>
                          <div className="text-center p-3 rounded-xl bg-black/20">
                            <p className="text-[10px] text-white/20 mb-1.5">Ticket aplicado</p>
                            <p className="text-lg font-black text-emerald-400 font-mono">R${previewTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div className="text-center p-3 rounded-xl bg-black/20">
                            <p className="text-[10px] text-white/20 mb-1.5">Receita estimada</p>
                            <p className="text-lg font-black text-purple-400 font-mono">R${(Math.round(100 * previewTaxa) * previewTicket).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleSaveEngine} disabled={savingEngine} className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-sm rounded-2xl transition-all">
                {savingEngine ? <><Loader2 size={14} className="animate-spin" />Salvando...</> : <><Save size={14} />Salvar Parâmetros do Engine</>}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Modal BM */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#0c0c0e] border border-white/[0.08] rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-7">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">{editingId ? "Editar" : "Nova"} <span className="text-purple-500">BM</span></h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-xl text-gray-600 hover:text-white hover:bg-white/5 transition-all"><X size={17} /></button>
            </div>
            <div className="mb-6">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-2">Nome da Conta *</label>
              <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Cliente X — BM Principal" className="w-full bg-black/50 border border-white/[0.08] rounded-2xl px-5 py-4 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-purple-500/50 transition-all" />
            </div>
            <div className="mb-6">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-2">Facebook Access Token *</label>
              <input type="password" value={form.access_token} onChange={e => setForm(f => ({ ...f, access_token: e.target.value }))} placeholder="EAAxxxxxxxxxx..." className="w-full bg-black/50 border border-white/[0.08] rounded-2xl px-5 py-4 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-purple-500/50 transition-all" />
              <button onClick={() => setShowTokenGuide(!showTokenGuide)} className="mt-2 flex items-center gap-1.5 text-[11px] text-purple-400 hover:text-purple-300 transition-colors">
                {showTokenGuide ? <ChevronUp size={13} /> : <ChevronDown size={13} />}{showTokenGuide ? "Ocultar guia" : "Como obter o Access Token?"}
              </button>
              {showTokenGuide && (
                <div className="mt-3 p-5 bg-purple-600/5 border border-purple-500/15 rounded-2xl space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400 mb-2">Passo a Passo</p>
                  <GuideStep num={1} title="Acesse o Facebook Developers"><a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-purple-400 text-xs flex items-center gap-1 mt-0.5">developers.facebook.com/tools/explorer <ExternalLink size={10} /></a></GuideStep>
                  <GuideStep num={2} title="Selecione seu App"><p className="text-gray-500 text-xs">Clique em Meta App e escolha seu aplicativo</p></GuideStep>
                  <GuideStep num={3} title="Gere o Token"><p className="text-gray-500 text-xs">Clique em Generate Access Token e autorize</p></GuideStep>
                  <GuideStep num={4} title="Copie o Token"><p className="text-gray-500 text-xs">O token começa com EAA...</p></GuideStep>
                  <div className="p-3 bg-yellow-500/8 border border-yellow-500/20 rounded-xl"><p className="text-xs text-yellow-400">⚠️ Tokens curtos expiram em 1 hora. Gere um token de longa duração.</p></div>
                </div>
              )}
            </div>
            <div className="mb-8">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-2">Facebook Ad Account ID *</label>
              <input type="text" value={form.ad_account_id} onChange={e => setForm(f => ({ ...f, ad_account_id: e.target.value }))} placeholder="act_123456789..." className="w-full bg-black/50 border border-white/[0.08] rounded-2xl px-5 py-4 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-purple-500/50 transition-all" />
              {form.ad_account_id && !form.ad_account_id.startsWith("act_") && (
                <p className="mt-1.5 text-[11px] text-amber-400 flex items-center gap-1"><AlertCircle size={11} /> Deve começar com <span className="font-mono font-bold">act_</span></p>
              )}
              <button onClick={() => setShowAccountGuide(!showAccountGuide)} className="mt-2 flex items-center gap-1.5 text-[11px] text-purple-400 hover:text-purple-300 transition-colors">
                {showAccountGuide ? <ChevronUp size={13} /> : <ChevronDown size={13} />}{showAccountGuide ? "Ocultar guia" : "Como encontrar o Ad Account ID?"}
              </button>
              {showAccountGuide && (
                <div className="mt-3 p-5 bg-purple-600/5 border border-purple-500/15 rounded-2xl space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400 mb-2">Passo a Passo</p>
                  <GuideStep num={1} title="Acesse o Ads Manager"><a href="https://business.facebook.com/adsmanager/" target="_blank" rel="noopener noreferrer" className="text-purple-400 text-xs flex items-center gap-1 mt-0.5">business.facebook.com/adsmanager <ExternalLink size={10} /></a></GuideStep>
                  <GuideStep num={2} title="Abra Configurações"><p className="text-gray-500 text-xs">Menu superior → Configurações de anúncios</p></GuideStep>
                  <GuideStep num={3} title="Copie o ID"><p className="text-gray-500 text-xs">Formato: act_123456789 (inclua o prefixo act_)</p></GuideStep>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-3.5 border border-white/[0.08] text-gray-500 hover:text-white font-semibold text-sm rounded-2xl transition-all">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm rounded-2xl transition-all disabled:opacity-50">
                {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvando...</> : <><Save size={14} />{editingId ? "Salvar Alterações" : "Adicionar Conta"}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}