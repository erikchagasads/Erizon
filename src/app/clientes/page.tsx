"use client";

import React, { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { SkeletonPage } from "@/components/ops/AppShell";
import { StrategicMoatPanel } from "@/components/StrategicMoatPanel";
import { useSessionGuard } from "@/app/hooks/useSessionGuard";
import {
  Plus, X, Loader2, Check, AlertTriangle, Users,
  Link, Unlink, RefreshCw, Pencil, Trash2,
  BarChart3, Target, DollarSign, CheckSquare, Square,
  Search, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Copy, ExternalLink,
} from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
  nome_cliente?: string;
  cor: string;
  crm_token?: string | null;
  meta_account_id?: string;
  ig_user_id?: string | null;
  campanha_keywords?: string | null;
  ticket_medio?: number;
  total_campanhas?: number;
  campanhas_ativas?: number;
  campanhas_criticas?: number;
  gasto_total?: number;
  total_leads?: number;
  cpl_medio?: number;
  total_alcance?: number;
  total_impressoes?: number;
  whatsapp?: string | null;
  whatsapp_mensagem?: string | null;
  facebook_pixel_id?: string | null;
}

interface CampanhaAtiva {
  id: string;
  nome_campanha: string;
  status: string;
  gasto_total: number;
  contatos: number;
  cpl: number;
}

interface CampanhaItem {
  id: string;
  nome: string;
  status: string;
  gasto: number;
  leads: number;
  cliente_id: string | null;
}

const fmtBRL0 = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const CORES = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"];

// â”€â”€â”€ Modal Cadastro/EdiÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ModalCliente({ cliente, onClose, onSave }: {
  cliente?: Cliente | null; onClose: () => void; onSave: () => void;
}) {
  useSessionGuard();

  const [nome, setNome]         = useState(cliente?.nome ?? "");
  const [metaId, setMetaId]     = useState(cliente?.meta_account_id ?? "");
  const [igUserId, setIgUserId] = useState(cliente?.ig_user_id ?? "");
  const [keywords, setKeywords] = useState(cliente?.campanha_keywords ?? "");
  const [ticket, setTicket]     = useState(cliente?.ticket_medio ? String(cliente.ticket_medio) : "");
  const [cor, setCor]           = useState(cliente?.cor ?? CORES[0]);
  const [whatsapp, setWhatsapp] = useState(cliente?.whatsapp ?? "");
  const [waMensagem, setWaMensagem] = useState(cliente?.whatsapp_mensagem ?? "");
  const [facebookPixelId, setFacebookPixelId] = useState(cliente?.facebook_pixel_id ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState<string | null>(null);

  async function salvar() {
    if (!nome.trim()) { setErro("Nome Ã© obrigatÃ³rio."); return; }
    setSalvando(true); setErro(null);
    try {
      const body = { nome: nome.trim(), meta_account_id: metaId.trim() || null, ig_user_id: igUserId.trim() || null, campanha_keywords: keywords.trim() || null, ticket_medio: ticket ? parseFloat(ticket) : null, cor, whatsapp: whatsapp.trim() || null, whatsapp_mensagem: waMensagem.trim() || null, facebook_pixel_id: facebookPixelId.trim() || null };
      const res = cliente
        ? await fetch(`/api/clientes?id=${cliente.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/clientes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao salvar");
      onSave(); onClose();
    } catch (e: unknown) { setErro(e instanceof Error ? e.message : "Erro ao salvar"); }
    finally { setSalvando(false); }
  }

  if (salvando) return <SkeletonPage cols={3} />;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="my-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e0e12] shadow-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-white">{cliente ? "Editar cliente" : "Novo cliente"}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X size={16} /></button>
        </div>
        <div className="max-h-[calc(100vh-10rem)] space-y-4 overflow-y-auto px-4 py-4 sm:max-h-[calc(100vh-11rem)] sm:px-6 sm:py-5">
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Nome do cliente *</label>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: ClÃ­nica SÃ£o Paulo"
              className="w-full px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 transition-all" />
          </div>
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">
              Meta Account ID <span className="text-white/20 normal-case">(vÃ­nculo automÃ¡tico)</span>
            </label>
            <input value={metaId} onChange={e => setMetaId(e.target.value)} placeholder="Ex: act_123456789"
              className="w-full px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 transition-all font-mono" />
            <p className="text-[10px] text-white/25 mt-1">Meta Ads Manager â†’ ConfiguraÃ§Ãµes da conta â†’ ID da conta</p>
          </div>
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">
              Instagram Business ID <span className="text-white/20 normal-case">(Insights orgÃ¢nicos)</span>
            </label>
            <input value={igUserId} onChange={e => setIgUserId(e.target.value)} placeholder="Ex: 17841400000000000"
              className="w-full px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-pink-500/40 transition-all font-mono" />
            <p className="text-[10px] text-white/25 mt-1">Meta Business Suite â†’ ConfiguraÃ§Ãµes â†’ Contas do Instagram â†’ ID da conta</p>
          </div>
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">
              Keywords de campanha <span className="text-white/20 normal-case">(vÃ­nculo automÃ¡tico)</span>
            </label>
            <input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Ex: clinica, saopaulo, estetica"
              className="w-full px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/40 transition-all" />
            <p className="text-[10px] text-white/25 mt-1">Palavras separadas por vÃ­rgula. Campanhas com esses termos no nome serÃ£o vinculadas automaticamente no prÃ³ximo sync.</p>
          </div>
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">
              Ticket mÃ©dio (R$) <span className="text-white/20 normal-case">(cÃ¡lculo de ROAS)</span>
            </label>
            <input value={ticket} onChange={e => setTicket(e.target.value)} placeholder="Ex: 297" type="number"
              className="w-full px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 transition-all" />
          </div>
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">
              WhatsApp do cliente <span className="text-white/20 normal-case">(redirect automÃ¡tico do lead)</span>
            </label>
            <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="Ex: 11999990000"
              className="w-full px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/40 transition-all font-mono" />
            <p className="text-[10px] text-white/25 mt-1">SÃ³ nÃºmeros, com DDD. Ex: 11999990000. O lead serÃ¡ redirecionado para este nÃºmero apÃ³s preencher o formulÃ¡rio.</p>
          </div>
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">
              Mensagem WhatsApp <span className="text-white/20 normal-case">(opcional)</span>
            </label>
            <input value={waMensagem} onChange={e => setWaMensagem(e.target.value)}
              placeholder="Ex: Olá {nome}! Vi seu interesse no conjunto {conjunto} da campanha {campanha}."
              className="w-full px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/40 transition-all" />
            <p className="text-[10px] text-white/25 mt-1">Variáveis disponíveis: {"{nome}"}, {"{campanha}"}, {"{conjunto}"}, {"{conjunto_anuncio}"}, {"{adset}"}, {"{anuncio}"}, {"{ad}"}, {"{telefone}"}. Se a mensagem personalizada não usar origem do anúncio, a referência será anexada automaticamente.</p>
          </div>
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">
              Pixel do Facebook <span className="text-white/20 normal-case">(Meta Pixel ID)</span>
            </label>
            <input value={facebookPixelId} onChange={e => setFacebookPixelId(e.target.value)} placeholder="Ex: 953096617304991"
              className="w-full px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-sky-500/40 transition-all font-mono" />
            <p className="text-[10px] text-white/25 mt-1">Use apenas o ID numÃ©rico. A landing do cliente dispara PageView e Lead automaticamente.</p>
          </div>


          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-2">Cor</label>
            <div className="flex items-center gap-2">
              {CORES.map(c => (
                <button key={c} onClick={() => setCor(c)} className="w-7 h-7 rounded-lg transition-all"
                  style={{ backgroundColor: c, outline: cor === c ? `2px solid ${c}` : "none", outlineOffset: "2px", opacity: cor === c ? 1 : 0.5 }} />
              ))}
            </div>
          </div>
          {erro && <p className="text-[12px] text-red-400 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2">{erro}</p>}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-white/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:px-6 sm:py-5">
          <button onClick={salvar} disabled={salvando}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold transition-all">
            {salvando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {salvando ? "Salvando..." : cliente ? "Salvar" : "Criar cliente"}
          </button>
          <button onClick={onClose} className="w-full rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-white/40 transition-all hover:text-white sm:w-auto">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Painel de Campanhas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PainelCampanhas({ cliente, onClose }: { cliente: Cliente; onClose: () => void }) {
  const [vinculadas, setVinculadas]     = useState<CampanhaItem[]>([]);
  const [todas, setTodas]               = useState<CampanhaItem[]>([]);
  const [buscaInput, setBuscaInput]     = useState("");
  const [busca, setBusca]               = useState("");
  const [sel, setSel]                   = useState<Set<string>>(new Set());
  const [loadingV, setLoadingV]         = useState(true);
  const [loadingT, setLoadingT]         = useState(false);
  const [vinculando, setVinculando]     = useState(false);
  const [progresso, setProgresso]       = useState<string | null>(null);
  const [msg, setMsg]                   = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);

  // campanhas sem cliente (livres)
  const livres = useMemo(() =>
    todas.filter(c => !c.cliente_id),
  [todas]);

  const livresFiltradas = useMemo(() => {
    if (!busca.trim()) return livres;
    const q = busca.toLowerCase();
    return livres.filter(c => c.nome.toLowerCase().includes(q));
  }, [livres, busca]);

  const todasSelecionadas = livresFiltradas.length > 0 && livresFiltradas.every(c => sel.has(c.id));

  async function carregarVinculadas() {
    setLoadingV(true);
    const res = await fetch(`/api/relatorio-pdf?cliente_id=${cliente.id}`);
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const camps: CampanhaItem[] = (json.relatorio?.campanhas ?? []).map((c: any) => ({
      id: String(c.id ?? ""), nome: String(c.nome ?? "â€”"),
      status: String(c.status ?? ""), gasto: Number(c.gasto ?? 0),
      leads: Number(c.leads ?? 0), cliente_id: cliente.id,
    }));
    setVinculadas(camps);
    setLoadingV(false);
  }

  async function carregarTodas(termo = "") {
    setLoadingT(true);
    const url = termo.trim()
      ? `/api/relatorio-pdf?busca=${encodeURIComponent(termo.trim())}`
      : `/api/relatorio-pdf`;
    const res  = await fetch(url);
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const camps: CampanhaItem[] = (json.relatorio?.campanhas ?? []).map((c: any) => ({
      id: String(c.id ?? ""), nome: String(c.nome ?? "â€”"),
      status: String(c.status ?? ""), gasto: Number(c.gasto ?? 0),
      leads: Number(c.leads ?? 0), cliente_id: c.cliente_id ?? null,
    }));
    setTodas(camps);
    setLoadingT(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { carregarVinculadas(); carregarTodas(); }, []);

  // debounce busca
  useEffect(() => {
    const t = setTimeout(() => {
      setBusca(buscaInput);
      carregarTodas(buscaInput);
    }, 400);
    return () => clearTimeout(t);
  }, [buscaInput]);

  function toggleSel(id: string) {
    setSel(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  }

  function toggleTodas() {
    if (todasSelecionadas) {
      setSel(prev => { const n = new Set(prev); livresFiltradas.forEach(c => n.delete(c.id)); return n; });
    } else {
      setSel(prev => { const n = new Set(prev); livresFiltradas.forEach(c => n.add(c.id)); return n; });
    }
  }

  async function vincularSelecionadas() {
    if (sel.size === 0) return;
    setVinculando(true); setMsg(null);
    setProgresso(`Vinculando ${sel.size} campanhas...`);
    const res = await fetch("/api/clientes/vincular-campanhas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cliente_id: cliente.id, campanha_ids: Array.from(sel) }),
    });
    const json = await res.json();
    setProgresso(null);
    setMsg(json.ok
      ? { tipo: "ok", texto: `${json.vinculadas} campanha${json.vinculadas !== 1 ? "s" : ""} vinculada${json.vinculadas !== 1 ? "s" : ""} com sucesso.` }
      : { tipo: "err", texto: json.error });
    if (json.ok) { setSel(new Set()); carregarVinculadas(); carregarTodas(buscaInput); }
    setVinculando(false);
  }

  async function desvincular(ids: string[]) {
    setVinculando(true);
    const res = await fetch("/api/clientes/vincular-campanhas", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campanha_ids: ids }),
    });
    const json = await res.json();
    setMsg(json.ok ? { tipo: "ok", texto: "Desvinculada." } : { tipo: "err", texto: json.error });
    if (json.ok) { carregarVinculadas(); carregarTodas(buscaInput); }
    setVinculando(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-white/[0.08] bg-[#0e0e12] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg shrink-0" style={{ backgroundColor: cliente.cor }} />
            <div>
              <h2 className="text-base font-semibold text-white">{cliente.nome}</h2>
              <p className="text-[11px] text-white/30">
                {vinculadas.length} campanha{vinculadas.length !== 1 ? "s" : ""} vinculada{vinculadas.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Mensagem de status */}
          {(msg || progresso) && (
            <div className="px-6 pt-4">
              {progresso && (
                <div className="flex items-center gap-2 text-[12px] text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
                  <Loader2 size={12} className="animate-spin" />{progresso}
                </div>
              )}
              {msg && (
                <p className={`text-[12px] px-3 py-2 rounded-lg border ${
                  msg.tipo === "ok" ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/15" : "text-red-400 bg-red-500/5 border-red-500/15"
                }`}>
                  {msg.tipo === "ok" ? "âœ… " : "âš ï¸ "}{msg.texto}
                </p>
              )}
            </div>
          )}

          {/* Vinculadas */}
          <div className="px-6 pt-5 pb-3">
            <p className="text-[11px] text-white/30 uppercase tracking-wider font-medium mb-2">
              Vinculadas ({loadingV ? "â€¦" : vinculadas.length})
            </p>
            {loadingV ? (
              <div className="flex items-center justify-center py-4"><Loader2 size={14} className="animate-spin text-white/20" /></div>
            ) : vinculadas.length === 0 ? (
              <p className="text-[12px] text-white/20 py-2 text-center">Nenhuma campanha vinculada ainda.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {vinculadas.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-white/[0.05] bg-white/[0.02]">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-[12px] text-white/80 truncate">{c.nome}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-white/30">{fmtBRL0(c.gasto)}</span>
                      <span className="text-[11px] text-white/25">{c.leads}L</span>
                      <button onClick={() => desvincular([c.id])} disabled={vinculando}
                        className="text-white/20 hover:text-red-400 disabled:opacity-30 transition-colors">
                        <Unlink size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.05] mx-6" />

          {/* Buscar e vincular */}
          <div className="px-6 pt-4 pb-5 space-y-3">
            {/* Header da seÃ§Ã£o com aÃ§Ãµes em massa */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-white/30 uppercase tracking-wider font-medium">
                Campanhas sem cliente
                {!loadingT && livres.length > 0 && (
                  <span className="ml-1.5 text-white/20">({livresFiltradas.length}{busca ? ` de ${livres.length}` : ""})</span>
                )}
              </p>
              {sel.size > 0 && (
                <button onClick={vincularSelecionadas} disabled={vinculando}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-[11px] font-semibold transition-all shrink-0">
                  {vinculando ? <Loader2 size={11} className="animate-spin" /> : <Link size={11} />}
                  Vincular {sel.size}
                </button>
              )}
            </div>

            {/* Campo de busca */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
              <input
                value={buscaInput}
                onChange={e => setBuscaInput(e.target.value)}
                placeholder="Buscar por nome da campanha..."
                className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 transition-all"
              />
              {loadingT && (
                <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-white/25" />
              )}
            </div>

            {/* Selecionar todos */}
            {livresFiltradas.length > 0 && (
              <button onClick={toggleTodas}
                className="flex items-center gap-2 text-[11px] text-white/40 hover:text-white transition-colors">
                {todasSelecionadas
                  ? <CheckSquare size={13} className="text-purple-400" />
                  : <Square size={13} />}
                {todasSelecionadas ? "Desmarcar todos" : `Selecionar todos (${livresFiltradas.length})`}
              </button>
            )}

            {/* Lista de campanhas livres */}
            {loadingT && livres.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={14} className="animate-spin text-white/20" />
              </div>
            ) : livresFiltradas.length === 0 ? (
              <p className="text-[12px] text-white/20 py-4 text-center">
                {buscaInput.trim()
                  ? "Nenhuma campanha encontrada para essa busca."
                  : livres.length === 0
                    ? "Todas as campanhas jÃ¡ estÃ£o vinculadas a um cliente. ðŸŽ‰"
                    : "Nenhuma campanha disponÃ­vel."}
              </p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {livresFiltradas.map(c => (
                  <div key={c.id} onClick={() => toggleSel(c.id)}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none ${
                      sel.has(c.id)
                        ? "border-purple-500/30 bg-purple-500/[0.06]"
                        : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.10]"
                    }`}>
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-all ${
                        sel.has(c.id) ? "bg-purple-600 border-purple-500" : "border-white/20"
                      }`}>
                        {sel.has(c.id) && <Check size={9} className="text-white" />}
                      </div>
                      <span className="text-[12px] text-white/75 truncate">{c.nome}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-white/30">{fmtBRL0(c.gasto)}</span>
                      <span className="text-[10px] text-white/20">{c.leads}L</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] shrink-0 flex items-center gap-2">
          {sel.size > 0 && (
            <button onClick={vincularSelecionadas} disabled={vinculando}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-semibold transition-all">
              {vinculando ? <Loader2 size={14} className="animate-spin" /> : <Link size={14} />}
              {vinculando ? "Vinculando..." : `Vincular ${sel.size} campanha${sel.size !== 1 ? "s" : ""}`}
            </button>
          )}
          <button onClick={onClose}
            className={`py-2.5 rounded-xl border border-white/[0.08] text-white/40 hover:text-white text-sm transition-all ${sel.size > 0 ? "px-4" : "flex-1"}`}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Modal Importar CSV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TEMPLATE_CSV = `nome,meta_account_id,ticket_medio,cor
ClÃ­nica SÃ£o Paulo,act_123456789,297,#6366f1
Ecom Moda Feminina,act_987654321,150,#ec4899
ConsultÃ³rio Odonto,,450,#10b981`;

const CORES_DEFAULT = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"];

interface LinhaCSV {
  linha: number;
  nome: string;
  meta_account_id: string;
  ticket_medio: number | null;
  cor: string;
  erro: string | null;
}

function parseCSV(texto: string): LinhaCSV[] {
  const linhas = texto.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (linhas.length === 0) return [];
  // pula header
  const dados = linhas[0].toLowerCase().includes("nome") ? linhas.slice(1) : linhas;
  return dados.map((l, i) => {
    const cols = l.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const nome     = cols[0] ?? "";
    const metaId   = cols[1] ?? "";
    const ticketRaw = cols[2] ?? "";
    const corRaw   = cols[3] ?? "";
    const ticket   = ticketRaw ? parseFloat(ticketRaw) : null;
    const cor      = /^#[0-9a-fA-F]{6}$/.test(corRaw) ? corRaw : CORES_DEFAULT[i % CORES_DEFAULT.length];
    let erro: string | null = null;
    if (!nome.trim()) erro = "Nome obrigatÃ³rio";
    else if (ticketRaw && isNaN(Number(ticketRaw))) erro = "Ticket deve ser nÃºmero";
    return { linha: i + 2, nome, meta_account_id: metaId, ticket_medio: ticket, cor, erro };
  });
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "template_clientes_erizon.csv";
  a.click(); URL.revokeObjectURL(url);
}

function ModalImportCSV({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [linhas, setLinhas]           = useState<LinhaCSV[]>([]);
  const [importando, setImportando]   = useState(false);
  const [resultado, setResultado]     = useState<{ ok: number; erros: string[] } | null>(null);
  const [dragging, setDragging]       = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const validas   = linhas.filter(l => !l.erro);
  const invalidas = linhas.filter(l => l.erro);

  function processarArquivo(file: File) {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      alert("Use um arquivo .csv"); return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const texto = e.target?.result as string;
      setLinhas(parseCSV(texto));
      setResultado(null);
    };
    reader.readAsText(file, "UTF-8");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processarArquivo(file);
  }

  async function importar() {
    if (validas.length === 0) return;
    setImportando(true);
    const errosImport: string[] = [];
    let ok = 0;
    for (const l of validas) {
      try {
        const res = await fetch("/api/clientes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: l.nome,
            meta_account_id: l.meta_account_id || null,
            ticket_medio: l.ticket_medio,
            cor: l.cor,
          }),
        });
        const json = await res.json();
        if (res.ok) ok++;
        else errosImport.push(`Linha ${l.linha} (${l.nome}): ${json.error ?? "Erro"}`);
      } catch {
        errosImport.push(`Linha ${l.linha} (${l.nome}): falha de rede`);
      }
    }
    setResultado({ ok, erros: errosImport });
    setImportando(false);
    if (ok > 0) onSave();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-white/[0.08] bg-[#0e0e12] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={16} className="text-emerald-400" />
            <h2 className="text-base font-semibold text-white">Importar clientes via CSV</h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Template */}
          <div className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div>
              <p className="text-[13px] font-semibold text-white mb-1">Baixar template</p>
              <p className="text-[11px] text-white/35 leading-relaxed">
                Preencha o arquivo com seus clientes. Colunas: <span className="font-mono text-white/50">nome, meta_account_id, ticket_medio, cor</span>
              </p>
              <p className="text-[10px] text-white/25 mt-1">Apenas &quot;nome&quot; Ã© obrigatÃ³rio. meta_account_id e ticket_medio sÃ£o opcionais.</p>
            </div>
            <button onClick={downloadTemplate}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 text-[12px] font-semibold hover:bg-emerald-500/15 transition-all shrink-0">
              <Download size={13} />Template
            </button>
          </div>

          {/* Drop zone */}
          {!resultado && (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed cursor-pointer transition-all p-8 text-center ${
                dragging ? "border-purple-500/50 bg-purple-500/5" : "border-white/[0.08] hover:border-white/20 bg-white/[0.01]"
              }`}>
              <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) processarArquivo(f); }} />
              <Upload size={24} className="text-white/20 mx-auto mb-3" />
              <p className="text-[13px] text-white/50 font-medium">Arraste o CSV aqui ou clique para selecionar</p>
              <p className="text-[11px] text-white/25 mt-1">Arquivos .csv ou .txt Â· UTF-8</p>
            </div>
          )}

          {/* Preview das linhas */}
          {linhas.length > 0 && !resultado && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] text-white/30 uppercase tracking-wider font-medium">
                  Preview â€” {linhas.length} linha{linhas.length > 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-emerald-400">{validas.length} vÃ¡lidas</span>
                  {invalidas.length > 0 && <span className="text-red-400">{invalidas.length} com erro</span>}
                </div>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {linhas.map((l, i) => (
                  <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-[12px] ${
                    l.erro ? "border-red-500/20 bg-red-500/5" : "border-white/[0.05] bg-white/[0.02]"
                  }`}>
                    <div className="w-4 h-4 rounded shrink-0" style={{ backgroundColor: l.cor }} />
                    <span className={`flex-1 truncate ${l.erro ? "text-white/40" : "text-white/75"}`}>{l.nome || "(sem nome)"}</span>
                    {l.meta_account_id && <span className="text-white/25 font-mono text-[10px] shrink-0">{l.meta_account_id}</span>}
                    {l.ticket_medio && <span className="text-white/25 text-[10px] shrink-0">R${l.ticket_medio}</span>}
                    {l.erro
                      ? <span className="text-red-400 text-[10px] shrink-0 flex items-center gap-1"><XCircle size={11} />{l.erro}</span>
                      : <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resultado da importaÃ§Ã£o */}
          {resultado && (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <p className="text-[14px] font-semibold text-emerald-400">
                    {resultado.ok} cliente{resultado.ok !== 1 ? "s" : ""} importado{resultado.ok !== 1 ? "s" : ""} com sucesso
                  </p>
                </div>
                <p className="text-[11px] text-white/30 ml-6">JÃ¡ aparecem na lista de clientes.</p>
              </div>
              {resultado.erros.length > 0 && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <p className="text-[12px] font-semibold text-red-400 mb-2">{resultado.erros.length} erro{resultado.erros.length > 1 ? "s" : ""}:</p>
                  <ul className="space-y-1">
                    {resultado.erros.map((e, i) => <li key={i} className="text-[11px] text-red-300/70">â€¢ {e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] shrink-0 flex items-center gap-2">
          {!resultado && validas.length > 0 && (
            <button onClick={importar} disabled={importando}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-semibold transition-all">
              {importando ? <><Loader2 size={14} className="animate-spin" />Importando...</> : <><Upload size={14} />Importar {validas.length} cliente{validas.length > 1 ? "s" : ""}</>}
            </button>
          )}
          <button onClick={resultado ? onClose : onClose}
            className={`py-2.5 rounded-xl border border-white/[0.08] text-white/40 hover:text-white text-sm transition-all ${(!resultado && validas.length > 0) ? "px-4" : "flex-1"}`}>
            {resultado ? "Fechar" : "Cancelar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Card do Cliente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ClienteCard({ c, onEdit, onDelete, onVincular }: {
  c: Cliente; onEdit: () => unknown; onDelete: () => unknown; onVincular: () => unknown;
}) {
  const [campanhas, setCampanhas] = useState<CampanhaAtiva[]>([]);
  const [loadingCamps, setLoadingCamps] = useState(true);
  const [expandido, setExpandido] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/clientes/campanhas?cliente_id=${c.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.campanhas) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setCampanhas(json.campanhas.map((camp: any) => ({
            id: camp.id,
            nome_campanha: camp.nome_campanha,
            status: camp.status ?? "ATIVO",
            gasto_total: camp.gasto_total ?? 0,
            contatos: camp.total_leads ?? 0,
            cpl: camp.cpl ?? 0,
          })));
        }
      })
      .finally(() => setLoadingCamps(false));
  }, [c.id]);

  const campanhasVisiveis = expandido ? campanhas : campanhas.slice(0, 3);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden group">
      <div className="h-0.5" style={{ backgroundColor: c.cor }} />
      <div className="p-5">

        {/* Header do cliente */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: c.cor }}>
              {c.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{c.nome}</h3>
              {c.meta_account_id
                ? <p className="text-[10px] text-white/25 font-mono mt-0.5">{c.meta_account_id}</p>
                : <p className="text-[10px] text-amber-500/50 mt-0.5">Sem Meta Account ID</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
            <button onClick={onEdit} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.05] transition-all"><Pencil size={12} /></button>
            <button onClick={onDelete} className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/[0.06] transition-all"><Trash2 size={12} /></button>
          </div>
        </div>

        {/* MÃ©tricas resumo */}
        <div className="grid grid-cols-2 gap-2 mb-4 sm:grid-cols-3">
          {[
            { icon: BarChart3, label: "Ativas", value: String(c.campanhas_ativas ?? 0) },
            { icon: DollarSign, label: "Investido", value: fmtBRL0(c.gasto_total ?? 0) },
            { icon: Target, label: "Leads", value: String(c.total_leads ?? 0) },
          ].map(m => (
            <div key={m.label} className="rounded-xl border border-white/[0.04] bg-white/[0.01] px-3 py-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <m.icon size={9} className="text-white/20" />
                <p className="text-[9px] text-white/20 uppercase tracking-wider">{m.label}</p>
              </div>
              <p className="text-[13px] font-semibold text-white/80">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Lista de campanhas ativas */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Campanhas ativas</p>
            {loadingCamps && <Loader2 size={10} className="animate-spin text-white/20" />}
          </div>

          {!loadingCamps && campanhas.length === 0 && (
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] px-3 py-3 text-center space-y-1.5">
              <p className="text-[11px] text-white/20">Nenhuma campanha ativa vinculada</p>
              <p className="text-[10px] text-white/15">Use &quot;Gerenciar&quot; para vincular manualmente</p>
              <a
                href={`/api/clientes/campanhas?cliente_id=${c.id}&debug=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[9px] text-purple-400/50 hover:text-purple-400 underline mt-1"
              >
                ver diagnÃ³stico
              </a>
            </div>
          )}

          {campanhasVisiveis.map((camp, i) => {
            const cpl = camp.cpl ?? (camp.contatos > 0 ? camp.gasto_total / camp.contatos : 0);
            const cplBom = cpl < 30;
            return (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/[0.04] bg-white/[0.01] mb-1.5 last:mb-0">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white/80 truncate font-medium">{camp.nome_campanha}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {fmtBRL0(camp.gasto_total)} Â· {camp.contatos} leads
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-[11px] font-semibold ${cplBom ? "text-emerald-400" : "text-amber-400"}`}>
                    {camp.contatos > 0 ? `CPL ${fmtBRL0(cpl)}` : "â€”"}
                  </p>
                </div>
              </div>
            );
          })}

          {campanhas.length > 3 && (
            <button onClick={() => setExpandido(e => !e)}
              className="w-full flex items-center justify-center gap-1.5 mt-1.5 py-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors">
              {expandido
                ? <><ChevronUp size={11} /> Mostrar menos</>
                : <><ChevronDown size={11} /> Ver mais {campanhas.length - 3} campanha{campanhas.length - 3 > 1 ? "s" : ""}</>}
            </button>
          )}
        </div>

        {(c.campanhas_criticas ?? 0) > 0 && (
          <div className="flex items-center gap-2 mb-3 rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-1.5">
            <AlertTriangle size={10} className="text-amber-400 shrink-0" />
            <p className="text-[11px] text-amber-400">{c.campanhas_criticas} crÃ­tica{(c.campanhas_criticas ?? 0) > 1 ? "s" : ""}</p>
          </div>
        )}

        {/* Links rÃ¡pidos CRM */}
        {c.crm_token && (
          <div className="mb-2 space-y-1.5">
            {[
              {
                label: "CRM do cliente",
                url: `${typeof window !== "undefined" ? window.location.origin : ""}/crm/cliente/${c.crm_token}`,
                key: "crm",
                color: "text-indigo-400",
                borderColor: "border-indigo-500/20",
                bgColor: "bg-indigo-500/[0.04]",
              },
              {
                label: "Portal + CRM",
                url: `${typeof window !== "undefined" ? window.location.origin : ""}/share/portal/${c.id}?crm=${c.crm_token}`,
                key: "portal",
                color: "text-purple-400",
                borderColor: "border-purple-500/20",
                bgColor: "bg-purple-500/[0.04]",
              },
            ].map(item => (
              <div key={item.key} className={`flex items-center gap-2 rounded-xl border ${item.borderColor} ${item.bgColor} px-3 py-1.5`}>
                <span className={`text-[10px] ${item.color} flex-1 truncate`}>{item.label}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(item.url);
                    setCopiado(item.key);
                    setTimeout(() => setCopiado(null), 2000);
                  }}
                  className="text-white/25 hover:text-white transition-colors"
                  title="Copiar link"
                >
                  {copiado === item.key ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                </button>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-white/25 hover:text-white transition-colors">
                  <ExternalLink size={11} />
                </a>
              </div>
            ))}
          </div>
        )}

        <button onClick={onVincular}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-purple-500/20 bg-purple-500/[0.04] text-purple-400 text-xs font-medium hover:bg-purple-500/10 transition-all">
          <Link size={11} />
          Gerenciar campanhas ({c.total_campanhas ?? 0})
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function ClientesPage() {
  const [clientes, setClientes]               = useState<Cliente[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [modalNovo, setModalNovo]             = useState(false);
  const [modalImport, setModalImport]         = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [clienteVincular, setClienteVincular] = useState<Cliente | null>(null);

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/clientes");
    const json = await res.json();
    setClientes(json.clientes ?? []);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregar(); }, []);

  async function excluir(id: string) {
    if (!confirm("Remover este cliente? As campanhas vinculadas nÃ£o serÃ£o apagadas.")) return;
    await fetch(`/api/clientes?id=${id}`, { method: "DELETE" });
    carregar();
  }

  return (
    <>
      <Sidebar />
      <div className="md:ml-[60px] pb-20 md:pb-0 min-h-screen bg-[#040406] text-white">
        <div className="max-w-5xl mx-auto px-4 py-6 md:px-6 md:py-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] text-purple-400 font-semibold uppercase tracking-wider mb-1">Clientes</p>
              <h1 className="text-2xl font-bold text-white">GestÃ£o de Clientes</h1>
              <p className="text-sm text-white/40 mt-1">Cadastre clientes e vincule as campanhas de cada um.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={carregar} className="p-2 rounded-xl border border-white/[0.06] text-white/30 hover:text-white transition-all"><RefreshCw size={14} /></button>
              <button onClick={() => setModalImport(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/15 transition-all">
                <FileSpreadsheet size={14} />Importar CSV
              </button>
              <button onClick={() => setModalNovo(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-all">
                <Plus size={14} />Novo cliente
              </button>
            </div>
          </div>

          {/* Banner de instruÃ§Ãµes */}
            <StrategicMoatPanel />
            <div className="rounded-2xl border border-blue-500/15 bg-blue-500/[0.04] p-5 mb-6">
            <p className="text-[11px] text-blue-400 font-semibold uppercase tracking-wider mb-3">Fluxo de uso</p>
            <div className="flex items-start gap-6 flex-wrap">
              {[
                { n: "1", t: "Crie o cliente", d: "Nome e cor. Meta Account ID Ã© opcional." },
                { n: "2", t: "Vincule campanhas", d: "Busca por nome + selecionar todos de uma vez." },
                { n: "3", t: "RelatÃ³rio e Portal", d: "Dados automÃ¡ticos por cliente em /relatorios e /portal." },
              ].map(s => (
                <div key={s.n} className="flex items-start gap-3 flex-1 min-w-[160px]">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{s.n}</div>
                  <div>
                    <p className="text-[12px] font-semibold text-white/80">{s.t}</p>
                    <p className="text-[11px] text-white/30 mt-0.5 leading-relaxed">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={20} className="animate-spin text-purple-400" />
            </div>
          ) : clientes.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
              <Users size={36} className="text-white/15 mx-auto mb-4" />
              <p className="text-white/40 text-sm">Nenhum cliente cadastrado ainda.</p>
              <p className="text-white/25 text-xs mt-1 mb-5">Crie o primeiro cliente para comeÃ§ar.</p>
              <button onClick={() => setModalNovo(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-all">
                <Plus size={14} />Criar primeiro cliente
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clientes.map(c => (
                <ClienteCard key={c.id} c={c}
                  onEdit={() => setClienteEditando(c)}
                  onDelete={() => excluir(c.id)}
                  onVincular={() => setClienteVincular(c)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {modalNovo && <ModalCliente onClose={() => setModalNovo(false)} onSave={carregar} />}
      {modalImport && <ModalImportCSV onClose={() => setModalImport(false)} onSave={carregar} />}
      {clienteEditando && <ModalCliente cliente={clienteEditando} onClose={() => setClienteEditando(null)} onSave={carregar} />}
      {clienteVincular && (
        <PainelCampanhas cliente={clienteVincular} onClose={() => { setClienteVincular(null); carregar(); }} />
      )}
    </>
  );
}
