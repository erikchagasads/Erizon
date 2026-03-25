"use client";
import { useState, useRef } from "react";
import {
  Sparkles, Loader2, Send, Copy, Check,
  ChevronDown, ChevronUp, Users, DollarSign, Target, Clock,
} from "lucide-react";

type ParsedBrief = {
  objetivo: string;
  publicoAlvo: string;
  geografia: string;
  orcamentoDiario: number;
  metaCpl: number;
  metaLeads: number;
  prazo: string;
};

type AdCreative = {
  titulo: string;
  gancho: string;
  copy: string;
  cta: string;
  formato: string;
  observacoes: string;
};

type CampaignStructure = {
  nomeCampanha: string;
  objetivo: string;
  orcamentoDiario: number;
  estrategiaBid: string;
  conjuntosAnuncio: { nome: string; publico: string; placamentos: string[]; orcamento: number }[];
  criativos: AdCreative[];
  cronograma: {
    fase1: string;
    fase2: string;
    kpisMonitorar: string[];
    gatilhoEscala: string;
    gatilhoPausa: string;
  };
};

type GeneratedCampaign = {
  parsed: ParsedBrief;
  estrutura: CampaignStructure;
  alertas: string[];
  preflightScore: number;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-white/25 hover:text-white/50 transition-colors">
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  );
}

function CreativeCard({ criativo, idx }: { criativo: AdCreative; idx: number }) {
  const [open, setOpen] = useState(idx === 0);
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-all">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-white/25 w-4">{idx + 1}</span>
          <span className="text-[12px] font-semibold text-white/70">{criativo.titulo}</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold uppercase">{criativo.formato}</span>
        </div>
        {open ? <ChevronUp size={12} className="text-white/25" /> : <ChevronDown size={12} className="text-white/25" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.05] pt-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/25 mb-1">Gancho</p>
            <div className="flex items-start justify-between gap-2">
              <p className="text-[12px] text-white/70 italic">&ldquo;{criativo.gancho}&rdquo;</p>
              <CopyButton text={criativo.gancho} />
            </div>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/25 mb-1">Copy completa</p>
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] text-white/50 leading-relaxed whitespace-pre-wrap">{criativo.copy}</p>
              <CopyButton text={criativo.copy} />
            </div>
          </div>
          <div className="flex gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/25 mb-1">CTA</p>
              <span className="text-[11px] font-semibold text-purple-400">{criativo.cta}</span>
            </div>
          </div>
          {criativo.observacoes && (
            <div className="px-3 py-2 rounded-lg bg-amber-500/[0.04] border border-amber-500/15">
              <p className="text-[10px] text-amber-400/80">{criativo.observacoes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function BriefToCampaign({ clientId }: { clientId?: string }) {
  const [brief, setBrief]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [streamText, setStreamText] = useState("");
  const [campaign, setCampaign]     = useState<GeneratedCampaign | null>(null);
  const textareaRef                 = useRef<HTMLTextAreaElement>(null);

  async function gerar() {
    if (!brief.trim() || loading) return;
    setLoading(true); setStreamText(""); setCampaign(null);

    const res = await fetch("/api/agente/brief-to-campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief, clientId }),
    });

    if (!res.body) { setLoading(false); return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      full += chunk;
      setStreamText(full);
    }

    // Parse JSON — suporta tanto JSON puro quanto markdown ```json ... ```
    try {
      // Tenta extrair de bloco de código markdown primeiro
      const mdMatch = full.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      const jsonMatch = mdMatch ? mdMatch[1] : full.match(/\{[\s\S]*\}/)?.[0];
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch) as GeneratedCampaign;
        // Garante que parsed existe mesmo se a IA retornar estrutura diferente
        if (parsed && (parsed.parsed || parsed.estrutura || parsed.alertas)) {
          setCampaign(parsed);
          setStreamText("");
        }
      }
    } catch { /* mantém streamText como fallback */ }

    setLoading(false);
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) gerar();
  };

  const fmtBRL = (v: number) => `R$${v?.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) ?? "—"}`;

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="rounded-2xl border border-purple-500/15 bg-purple-500/[0.03] overflow-hidden">
        <div className="px-5 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-purple-400" />
            <span className="text-[13px] font-bold">Brief → Campanha</span>
          </div>
          <textarea
            ref={textareaRef}
            value={brief}
            onChange={e => setBrief(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Descreva o objetivo em linguagem natural...

Ex: Quero gerar 100 leads de academia em São Paulo, público masculino 25-40 anos que treina 3x por semana, budget R$5k/mês, CPL máximo R$45, criativo de vídeo com depoimento de aluno."
            rows={5}
            className="w-full bg-transparent text-[13px] text-white placeholder-white/20 resize-none focus:outline-none leading-relaxed"
          />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
          <span className="text-[10px] text-white/20">Ctrl+Enter para gerar</span>
          <button
            onClick={gerar}
            disabled={loading || !brief.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-[12px] font-bold text-white rounded-xl transition-all disabled:opacity-40"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            {loading ? "Gerando..." : "Gerar estrutura"}
          </button>
        </div>
      </div>

      {/* Streaming raw */}
      {streamText && !campaign && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <p className="text-[11px] text-white/40 leading-relaxed font-mono whitespace-pre-wrap">{streamText}</p>
        </div>
      )}

      {/* Resultado estruturado */}
      {campaign && (
        <div className="space-y-4">
          {/* Parsed brief */}
          {campaign.parsed && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/25 mb-3">Brief interpretado</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Target size={12} />, label: "Objetivo", value: campaign.parsed.objetivo ?? "—" },
                { icon: <Users size={12} />, label: "Público", value: campaign.parsed.publicoAlvo ?? "—" },
                { icon: <DollarSign size={12} />, label: "Budget", value: campaign.parsed.orcamentoDiario ? fmtBRL(campaign.parsed.orcamentoDiario) + "/dia" : "—" },
                { icon: <Target size={12} />, label: "Meta CPL", value: campaign.parsed.metaCpl ? fmtBRL(campaign.parsed.metaCpl) : "—" },
                { icon: <Users size={12} />, label: "Meta Leads", value: campaign.parsed.metaLeads ? `${campaign.parsed.metaLeads} leads` : "—" },
                { icon: <Clock size={12} />, label: "Prazo", value: campaign.parsed.prazo || "—" },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-white/25">{icon}</span>
                  <div>
                    <p className="text-[9px] text-white/25 uppercase font-semibold">{label}</p>
                    <p className="text-[12px] text-white/60">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Estrutura da campanha */}
          {campaign.estrutura && (
            <>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/25 mb-3">Campanha</p>
                <p className="text-[14px] font-bold text-white mb-1">{campaign.estrutura.nomeCampanha}</p>
                <div className="flex gap-3 flex-wrap">
                  <span className="text-[10px] text-white/40 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.06]">
                    {campaign.estrutura.objetivo}
                  </span>
                  <span className="text-[10px] text-white/40 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.06]">
                    {fmtBRL(campaign.estrutura.orcamentoDiario)}/dia
                  </span>
                  <span className="text-[10px] text-white/40 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.06]">
                    {campaign.estrutura.estrategiaBid}
                  </span>
                </div>
              </div>

              {/* Conjuntos de anúncios */}
              {campaign.estrutura.conjuntosAnuncio?.length > 0 && (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/25">
                    Conjuntos de anúncios ({campaign.estrutura.conjuntosAnuncio.length})
                  </p>
                  {campaign.estrutura.conjuntosAnuncio.map((conj, i) => (
                    <div key={i} className="border border-white/[0.06] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[12px] font-semibold text-white/70">{conj.nome}</span>
                        <span className="text-[11px] text-white/40">{fmtBRL(conj.orcamento)}/dia</span>
                      </div>
                      <p className="text-[11px] text-white/40 mb-2">{conj.publico}</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {(conj.placamentos ?? []).map(p => (
                          <span key={p} className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">{p}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Criativos */}
              {campaign.estrutura.criativos?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/25">
                    Criativos sugeridos ({campaign.estrutura.criativos.length})
                  </p>
                  {campaign.estrutura.criativos.map((criativo, i) => (
                    <CreativeCard key={i} criativo={criativo} idx={i} />
                  ))}
                </div>
              )}

              {/* Cronograma */}
              {campaign.estrutura.cronograma && (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/25">Cronograma de otimização</p>
                  <div className="space-y-2">
                    {[
                      { label: "Fase 1 — Aprendizado", text: campaign.estrutura.cronograma.fase1, color: "text-amber-400" },
                      { label: "Fase 2 — Escala", text: campaign.estrutura.cronograma.fase2, color: "text-emerald-400" },
                      { label: "Gatilho de escala", text: campaign.estrutura.cronograma.gatilhoEscala, color: "text-blue-400" },
                      { label: "Gatilho de pausa", text: campaign.estrutura.cronograma.gatilhoPausa, color: "text-red-400" },
                    ].map(({ label, text, color }) => text ? (
                      <div key={label}>
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${color} mb-0.5`}>{label}</p>
                        <p className="text-[11px] text-white/50 leading-relaxed">{text}</p>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Alertas */}
          {campaign.alertas?.length > 0 && (
            <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.03] p-4 space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-amber-400 mb-2">Alertas</p>
              {campaign.alertas.map((a, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <p className="text-[11px] text-amber-400/80 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => { setCampaign(null); setBrief(""); }}
            className="w-full py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] text-[12px] font-semibold text-white/40 hover:text-white/60 transition-all">
            Novo brief
          </button>
        </div>
      )}
    </div>
  );
}
