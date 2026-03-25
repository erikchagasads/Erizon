"use client";
// src/app/settings/white-label/page.tsx
// Página de configuração white label para gestores do plano premium.

import { useEffect, useState, useMemo, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { getSupabase } from "@/lib/supabase";
import {
  Upload, Save, CheckCircle2, AlertTriangle,
  Loader2, Globe, Palette, Users, Copy,
  ToggleLeft, ToggleRight, Mail, X, ExternalLink, Zap,
  Shield,
} from "lucide-react";
import type { WhiteLabelConfig, WhiteLabelCliente } from "@/lib/white-label";
import { WL_DEFAULTS } from "@/lib/white-label";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isValidHex(s: string) { return /^#[0-9a-fA-F]{6}$/.test(s); }

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [raw, setRaw] = useState(value);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setRaw(value), [value]);

  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input type="color" value={isValidHex(raw) ? raw : "#000000"}
            onChange={e => { setRaw(e.target.value); onChange(e.target.value); }}
            className="w-10 h-10 rounded-xl cursor-pointer border border-white/[0.08] bg-transparent p-0.5"
          />
        </div>
        <input value={raw} onChange={e => { setRaw(e.target.value); if (isValidHex(e.target.value)) onChange(e.target.value); }}
          placeholder="#6366f1"
          className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[12px] font-mono text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-all"
        />
      </div>
    </div>
  );
}

// ─── Preview mini do tema ─────────────────────────────────────────────────────
function PreviewTema({ cfg }: { cfg: Partial<WhiteLabelConfig> }) {
  const p = cfg.cor_primaria   ?? WL_DEFAULTS.cor_primaria;
  const f = cfg.cor_fundo      ?? WL_DEFAULTS.cor_fundo;
  const u = cfg.cor_superficie ?? WL_DEFAULTS.cor_superficie;

  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.08]" style={{ background: f }}>
      {/* Mini sidebar */}
      <div className="flex" style={{ minHeight: 140 }}>
        <div className="w-10 flex flex-col items-center py-3 gap-2 border-r border-white/[0.06]" style={{ background: u }}>
          <div className="w-7 h-7 rounded-lg" style={{ background: p, opacity: 0.9 }}>
            {cfg.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cfg.logo_url} alt="" className="w-full h-full object-contain rounded-lg" />
            ) : null}
          </div>
          {[1,2,3,4].map(i => (
            <div key={i} className="w-5 h-5 rounded-md" style={{ background: i===1 ? p+"33" : "rgba(255,255,255,0.05)" }}/>
          ))}
        </div>

        {/* Mini content */}
        <div className="flex-1 p-3">
          <p className="text-[9px] font-bold text-white/60 mb-2">{cfg.nome_plataforma || "Minha Plataforma"}</p>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-lg p-2" style={{ background: u }}>
                <div className="w-8 h-1 rounded mb-1" style={{ background: "rgba(255,255,255,0.15)" }}/>
                <div className="w-5 h-2 rounded font-bold" style={{ background: p, opacity: 0.7 }}/>
              </div>
            ))}
          </div>
          <div className="rounded-xl p-2" style={{ background: u }}>
            <div className="w-full h-1.5 rounded mb-1" style={{ background: "rgba(255,255,255,0.08)" }}/>
            <div className="w-3/4 h-1.5 rounded" style={{ background: "rgba(255,255,255,0.05)" }}/>
          </div>
        </div>
      </div>

      <div className="px-3 py-1.5 border-t border-white/[0.05]" style={{ background: u }}>
        <p className="text-[8px] text-white/20 text-center">Preview · {cfg.dominio_custom || "seudominio.com.br"}</p>
      </div>
    </div>
  );
}

// ─── Card de cliente convidado ────────────────────────────────────────────────
function CardCliente({ c, onRevogar }: { c: WhiteLabelCliente; onRevogar: (id: string) => unknown }) {
  const statusCor = c.status === "ativo" ? "text-emerald-400" : c.status === "pendente" ? "text-amber-400" : "text-white/20";
  const statusLabel = c.status === "ativo" ? "Ativo" : c.status === "pendente" ? "Aguardando" : "Revogado";

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-white/80 truncate">{c.nome || c.email_convidado}</p>
        <p className="text-[10px] text-white/30 truncate">{c.email_convidado}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex gap-1">
          {c.ver_campanhas  && <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/30">Campanhas</span>}
          {c.ver_financeiro && <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/30">Financeiro</span>}
          {c.ver_criativo   && <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/30">Criativo</span>}
        </div>
        <span className={`text-[10px] font-semibold ${statusCor}`}>{statusLabel}</span>
        {c.status !== "revogado" && (
          <button onClick={() => onRevogar(c.id)}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <X size={11}/>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function WhiteLabelPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const fileRef  = useRef<HTMLInputElement>(null);

  const [loading,    setLoading]    = useState(true);
  const [salvando,   setSalvando]   = useState(false);
  const [uploadando, setUploadando] = useState(false);
  const [mensagem,   setMensagem]   = useState<{ tipo: "ok"|"erro"; texto: string } | null>(null);
  const [aba,        setAba]        = useState<"visual"|"dominio"|"clientes">("visual");

  // Config white label
  const [cfg, setCfg] = useState<Partial<WhiteLabelConfig>>({
    nome_plataforma: WL_DEFAULTS.nome_plataforma,
    cor_primaria:    WL_DEFAULTS.cor_primaria,
    cor_secundaria:  WL_DEFAULTS.cor_secundaria,
    cor_fundo:       WL_DEFAULTS.cor_fundo,
    cor_superficie:  WL_DEFAULTS.cor_superficie,
    dominio_custom:  null,
    ativo:           true,
    logo_url:        null,
  });
  const [configId, setConfigId] = useState<string | null>(null);

  // Clientes
  const [clientes,        setClientes]        = useState<WhiteLabelCliente[]>([]);
  const [emailConvite,    setEmailConvite]     = useState("");
  const [nomeConvite,     setNomeConvite]      = useState("");
  const [permCampanhas,   setPermCampanhas]    = useState(true);
  const [permFinanceiro,  setPermFinanceiro]   = useState(false);
  const [permCriativo,    setPermCriativo]     = useState(false);
  const [convidando,      setConvidando]       = useState(false);

  function msg(tipo: "ok"|"erro", texto: string) {
    setMensagem({ tipo, texto });
    setTimeout(() => setMensagem(null), 4000);
  }

  // ── Carregar ────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: wl }, { data: cl }] = await Promise.all([
        supabase.from("white_label_configs").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("white_label_clientes").select("*").eq("white_label_owner_id", user.id).order("convidado_em", { ascending: false }),
      ]);

      if (wl) {
        setCfg(wl as WhiteLabelConfig);
        setConfigId(wl.id);
      }
      setClientes((cl ?? []) as WhiteLabelCliente[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  // ── Upload de logo ───────────────────────────────────────────────────────────
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { msg("erro", "Logo deve ter no máximo 2MB."); return; }

    setUploadando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ext  = file.name.split(".").pop();
    const path = `white-label/${user.id}/logo.${ext}`;

    const { error } = await supabase.storage.from("white-label-assets").upload(path, file, { upsert: true });
    if (error) { msg("erro", "Erro no upload do logo."); setUploadando(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("white-label-assets").getPublicUrl(path);
    setCfg(prev => ({ ...prev, logo_url: publicUrl }));
    setUploadando(false);
    msg("ok", "Logo enviada com sucesso.");
  }

  // ── Salvar config ────────────────────────────────────────────────────────────
  async function salvar() {
    setSalvando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id:         user.id,
      nome_plataforma: cfg.nome_plataforma,
      logo_url:        cfg.logo_url,
      favicon_url:     cfg.favicon_url,
      cor_primaria:    cfg.cor_primaria,
      cor_secundaria:  cfg.cor_secundaria,
      cor_fundo:       cfg.cor_fundo,
      cor_superficie:  cfg.cor_superficie,
      dominio_custom:  cfg.dominio_custom || null,
      ativo:           cfg.ativo,
    };

    let error;
    if (configId) {
      ({ error } = await supabase.from("white_label_configs").update(payload).eq("id", configId));
    } else {
      const { data, error: e } = await supabase.from("white_label_configs").insert(payload).select().maybeSingle();
      error = e;
      if (data) setConfigId(data.id);
    }

    setSalvando(false);
    if (error) { msg("erro", "Erro ao salvar. Tente novamente."); } else { msg("ok", "Configurações salvas!"); }
  }

  // ── Convidar cliente ─────────────────────────────────────────────────────────
  async function convidar() {
    if (!emailConvite.includes("@")) { msg("erro", "E-mail inválido."); return; }
    setConvidando(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.from("white_label_clientes").insert({
      white_label_owner_id: user.id,
      email_convidado:      emailConvite.trim().toLowerCase(),
      nome:                 nomeConvite.trim() || null,
      ver_campanhas:        permCampanhas,
      ver_financeiro:       permFinanceiro,
      ver_criativo:         permCriativo,
    }).select().maybeSingle();

    setConvidando(false);
    if (error) { msg("erro", "Erro ao convidar. E-mail já pode estar cadastrado."); return; }
    if (data) setClientes(prev => [data as WhiteLabelCliente, ...prev]);
    setEmailConvite(""); setNomeConvite("");
    msg("ok", `Convite registrado para ${emailConvite}.`);
  }

  // ── Revogar cliente ──────────────────────────────────────────────────────────
  async function revogar(id: string) {
    await supabase.from("white_label_clientes").update({ status: "revogado" }).eq("id", id);
    setClientes(prev => prev.map(c => c.id === id ? { ...c, status: "revogado" } : c));
    msg("ok", "Acesso revogado.");
  }

  const linkConvite = cfg.dominio_custom
    ? `https://${cfg.dominio_custom}/signup`
    : `${typeof window !== "undefined" ? window.location.origin : ""}/signup?wl=${configId ?? ""}`;

  if (loading) return (
    <div className="flex min-h-screen bg-[#060609] text-white">
      <Sidebar/>
      <main className="md:ml-[60px] pb-20 md:pb-0 flex-1 flex items-center justify-center text-white/30">
        <Loader2 size={18} className="animate-spin mr-2"/> Carregando...
      </main>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#060609] text-white">
      <Sidebar/>
      <main className="md:ml-[60px] pb-20 md:pb-0 flex-1 flex flex-col">

        {/* Header */}
        <div className="shrink-0 px-8 py-6 border-b border-white/[0.05]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-purple-400/60 mb-1">Plano Premium</p>
              <h1 className="text-[22px] font-bold text-white">White Label</h1>
              <p className="text-[13px] text-white/30 mt-1">
                Customize a plataforma com a marca da sua agência e convide seus clientes.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setCfg(prev => ({ ...prev, ativo: !prev.ativo }))}
                className="flex items-center gap-2 text-[12px] text-white/40 hover:text-white transition-colors">
                {cfg.ativo
                  ? <><ToggleRight size={20} className="text-purple-400"/> Ativo</>
                  : <><ToggleLeft  size={20}/> Inativo</>
                }
              </button>
              <button onClick={salvar} disabled={salvando}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-[13px] font-semibold text-white transition-all shadow-lg shadow-purple-500/20 disabled:opacity-60">
                {salvando ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
                Salvar
              </button>
            </div>
          </div>

          {/* Abas */}
          <div className="flex gap-1 mt-5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
            {([
              { id: "visual",    label: "Visual & Marca",  icon: Palette },
              { id: "dominio",   label: "Domínio",         icon: Globe   },
              { id: "clientes",  label: "Clientes",        icon: Users   },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setAba(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${
                  aba === id ? "bg-white/[0.09] text-white" : "text-white/30 hover:text-white/60"
                }`}>
                <Icon size={13}/> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-auto px-8 py-6">
          <div className="max-w-5xl mx-auto">

            {/* ── ABA: Visual & Marca ───────────────────────────────────── */}
            {aba === "visual" && (
              <div className="grid gap-6 lg:grid-cols-[1fr_340px]">

                {/* Formulário */}
                <div className="space-y-6">

                  {/* Nome */}
                  <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d11] p-6 space-y-4">
                    <h2 className="text-[13px] font-semibold text-white/60 uppercase tracking-wider">Identidade</h2>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">Nome da plataforma</label>
                      <input
                        value={cfg.nome_plataforma ?? ""}
                        onChange={e => setCfg(prev => ({ ...prev, nome_plataforma: e.target.value }))}
                        placeholder="ex: Agência Performance, TrackPro..."
                        className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 transition-all"
                      />
                      <p className="text-[10px] text-white/20 mt-1.5">Aparece no título da aba, sidebar e e-mails de convite.</p>
                    </div>

                    {/* Logo */}
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">Logo</label>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center overflow-hidden shrink-0">
                          {cfg.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cfg.logo_url} alt="Logo" className="w-full h-full object-contain p-1"/>
                          ) : (
                            <Zap size={22} className="text-white/10"/>
                          )}
                        </div>
                        <div className="flex-1">
                          <button onClick={() => fileRef.current?.click()} disabled={uploadando}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.09] text-[12px] text-white/50 hover:text-white hover:border-white/20 transition-all disabled:opacity-50">
                            {uploadando ? <Loader2 size={13} className="animate-spin"/> : <Upload size={13}/>}
                            {uploadando ? "Enviando..." : "Enviar logo"}
                          </button>
                          <p className="text-[10px] text-white/20 mt-1.5">PNG ou SVG, até 2MB. Fundo transparente recomendado.</p>
                          <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden"/>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cores */}
                  <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d11] p-6 space-y-4">
                    <h2 className="text-[13px] font-semibold text-white/60 uppercase tracking-wider">Paleta de cores</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <ColorInput label="Cor primária (botões, destaques)"
                        value={cfg.cor_primaria ?? WL_DEFAULTS.cor_primaria}
                        onChange={v => setCfg(prev => ({ ...prev, cor_primaria: v }))}
                      />
                      <ColorInput label="Cor secundária (gradientes, hover)"
                        value={cfg.cor_secundaria ?? WL_DEFAULTS.cor_secundaria}
                        onChange={v => setCfg(prev => ({ ...prev, cor_secundaria: v }))}
                      />
                      <ColorInput label="Cor de fundo (background)"
                        value={cfg.cor_fundo ?? WL_DEFAULTS.cor_fundo}
                        onChange={v => setCfg(prev => ({ ...prev, cor_fundo: v }))}
                      />
                      <ColorInput label="Cor de superfície (cards, sidebar)"
                        value={cfg.cor_superficie ?? WL_DEFAULTS.cor_superficie}
                        onChange={v => setCfg(prev => ({ ...prev, cor_superficie: v }))}
                      />
                    </div>

                    {/* Presets rápidos */}
                    <div>
                      <p className="text-[10px] text-white/25 mb-2">Presets rápidos</p>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { nome: "Índigo (padrão)", p: "#6366f1", s: "#8b5cf6", f: "#060609", u: "#0d0d11" },
                          { nome: "Azul Corporativo", p: "#2563eb", s: "#3b82f6", f: "#03060f", u: "#080d18" },
                          { nome: "Verde Agência",    p: "#059669", s: "#10b981", f: "#030a06", u: "#07130b" },
                          { nome: "Laranja Bold",     p: "#ea580c", s: "#f97316", f: "#0c0602", u: "#170b05" },
                          { nome: "Rosa Premium",     p: "#db2777", s: "#ec4899", f: "#0a0307", u: "#150510" },
                          { nome: "Cinza Minimal",    p: "#6b7280", s: "#9ca3af", f: "#07070a", u: "#0f0f13" },
                        ].map(preset => (
                          <button key={preset.nome}
                            onClick={() => setCfg(prev => ({ ...prev, cor_primaria: preset.p, cor_secundaria: preset.s, cor_fundo: preset.f, cor_superficie: preset.u }))}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-[11px] text-white/40 hover:text-white/70 hover:border-white/[0.12] transition-all">
                            <div className="w-3 h-3 rounded-full" style={{ background: preset.p }}/>
                            {preset.nome}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <div className="sticky top-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/25 mb-3">Preview</p>
                    <PreviewTema cfg={cfg}/>
                    <p className="text-[10px] text-white/15 text-center mt-2">Visualização aproximada</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── ABA: Domínio ──────────────────────────────────────────── */}
            {aba === "dominio" && (
              <div className="max-w-2xl space-y-5">

                <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d11] p-6 space-y-5">
                  <div>
                    <h2 className="text-[13px] font-semibold text-white mb-1">Domínio personalizado</h2>
                    <p className="text-[12px] text-white/35">
                      Seus clientes acessam o painel pelo seu domínio, sem ver nenhuma referência ao Erizon.
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">Domínio</label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 flex-1 px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl">
                        <Globe size={13} className="text-white/20 shrink-0"/>
                        <input
                          value={cfg.dominio_custom ?? ""}
                          onChange={e => setCfg(prev => ({ ...prev, dominio_custom: e.target.value }))}
                          placeholder="painel.suaagencia.com.br"
                          className="flex-1 bg-transparent text-[13px] text-white placeholder-white/20 focus:outline-none"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-white/20 mt-1.5">
                      Só o subdomínio, sem https://
                    </p>
                  </div>

                  {/* Instruções CNAME */}
                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 space-y-3">
                    <p className="text-[11px] font-semibold text-white/50 flex items-center gap-2">
                      <Shield size={12} className="text-purple-400"/> Configuração de DNS
                    </p>
                    <p className="text-[11px] text-white/35 leading-relaxed">
                      No painel DNS do seu domínio, adicione um registro CNAME apontando para:
                    </p>
                    <div className="rounded-lg bg-black/40 border border-white/[0.06] p-3 font-mono">
                      <div className="grid grid-cols-3 gap-3 text-[10px]">
                        <div>
                          <p className="text-white/20 mb-1">Tipo</p>
                          <p className="text-emerald-400">CNAME</p>
                        </div>
                        <div>
                          <p className="text-white/20 mb-1">Nome</p>
                          <p className="text-white/70">{cfg.dominio_custom?.split(".")[0] || "painel"}</p>
                        </div>
                        <div>
                          <p className="text-white/20 mb-1">Destino</p>
                          <p className="text-white/70">cname.vercel-dns.com</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/20">
                      Após salvar, adicione o domínio no painel da Vercel → seu projeto → Settings → Domains.
                      A propagação leva até 48h.
                    </p>
                  </div>
                </div>

                {/* Link de convite */}
                {configId && (
                  <div className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] p-5">
                    <p className="text-[11px] font-semibold text-purple-300 mb-2 flex items-center gap-2">
                      <ExternalLink size={12}/> Link de acesso dos seus clientes
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 rounded-xl bg-black/30 border border-white/[0.06] font-mono text-[11px] text-white/50 truncate">
                        {linkConvite}
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(linkConvite); msg("ok", "Link copiado!"); }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/[0.08] text-white/30 hover:text-purple-400 hover:border-purple-500/30 transition-all">
                        <Copy size={13}/>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ABA: Clientes ─────────────────────────────────────────── */}
            {aba === "clientes" && (
              <div className="max-w-2xl space-y-5">

                {/* Convidar */}
                <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d11] p-6 space-y-4">
                  <h2 className="text-[13px] font-semibold text-white/60 uppercase tracking-wider">Convidar cliente</h2>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">E-mail *</label>
                      <input value={emailConvite} onChange={e => setEmailConvite(e.target.value)} placeholder="cliente@email.com"
                        className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[12px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 transition-all"/>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">Nome (opcional)</label>
                      <input value={nomeConvite} onChange={e => setNomeConvite(e.target.value)} placeholder="Nome do cliente"
                        className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[12px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 transition-all"/>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2 block">Permissões</label>
                    <div className="flex gap-3">
                      {[
                        { label: "Campanhas",  val: permCampanhas,  set: setPermCampanhas  },
                        { label: "Financeiro", val: permFinanceiro, set: setPermFinanceiro },
                        { label: "Criativo",   val: permCriativo,   set: setPermCriativo   },
                      ].map(p => (
                        <button key={p.label} onClick={() => p.set(!p.val)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-medium transition-all ${
                            p.val
                              ? "border-purple-500/40 bg-purple-500/[0.08] text-purple-300"
                              : "border-white/[0.06] text-white/30 hover:border-white/[0.12]"
                          }`}>
                          <div className={`w-2 h-2 rounded-full ${p.val ? "bg-purple-400" : "bg-white/20"}`}/>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={convidar} disabled={convidando || !emailConvite}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-[13px] font-semibold text-white transition-all disabled:opacity-50">
                    {convidando ? <Loader2 size={13} className="animate-spin"/> : <Mail size={13}/>}
                    Registrar convite
                  </button>
                </div>

                {/* Lista de clientes */}
                <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d11] overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between">
                    <h2 className="text-[13px] font-semibold text-white/60 uppercase tracking-wider">
                      Clientes ({clientes.length})
                    </h2>
                    <div className="flex gap-3 text-[10px] text-white/20">
                      <span>{clientes.filter(c => c.status === "ativo").length} ativos</span>
                      <span>{clientes.filter(c => c.status === "pendente").length} aguardando</span>
                    </div>
                  </div>

                  {clientes.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <Users size={28} className="text-white/10 mx-auto mb-3"/>
                      <p className="text-[13px] text-white/25 font-medium mb-1">Nenhum cliente convidado</p>
                      <p className="text-[11px] text-white/15">Convide clientes para acessar o painel com a sua marca.</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-2">
                      {clientes.map(c => (
                        <CardCliente key={c.id} c={c} onRevogar={revogar}/>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toast */}
        {mensagem && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-2xl text-[13px] font-medium shadow-2xl z-50 ${
            mensagem.tipo === "ok" ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"
          }`}>
            {mensagem.tipo === "ok" ? <CheckCircle2 size={14}/> : <AlertTriangle size={14}/>}
            {mensagem.texto}
          </div>
        )}
      </main>
    </div>
  );
}
