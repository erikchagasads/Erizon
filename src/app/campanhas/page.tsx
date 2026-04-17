"use client";

// src/app/clientes/page.tsx — Gerenciador de Anúncios Erizon
// Interface inspirada no Meta Ads Manager

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Search, RefreshCw, Download, BarChart3, ChevronDown, ChevronUp,
  Loader2, X, Eye, ArrowUpDown,
  AlertTriangle, CheckCircle, Target, Zap, Clock,
  Sparkles, ImageIcon, ThumbsUp, ThumbsDown, Lightbulb,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { fetchSafe } from "@/lib/fetchSafe";
import { useSessionGuard } from "@/app/hooks/useSessionGuard";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnaliseCriativoIA {
  score: number;
  tipo_criativo: "imagem" | "video";
  hook: string;
  pontos_fortes: string[];
  problemas: string[];
  sugestoes: string[];
  resumo: string;
  analisado_em: string;
}

interface Campanha {
  id: string;
  nome_campanha: string;
  status: string;
  gasto_total: number;
  contatos: number;
  receita_estimada: number;
  ctr?: number;
  cpm?: number;
  cpc?: number;
  impressoes?: number;
  cliques?: number;
  dias_ativo?: number;
  data_inicio?: string;
  cliente_id?: string;
  cliente_nome?: string;
  score?: number;
  meta_campaign_id?: string;
  analise_criativo?: AnaliseCriativoIA;
}

interface Cliente {
  id: string;
  nome: string;
  nome_cliente?: string;
  cor?: string;
}

// Tipo intermediário para o mapeamento da resposta da API (pode ter shape variado)
type ClienteRaw = {
  id?: unknown;
  nome?: unknown;
  nome_cliente?: unknown;
  cor?: unknown;
  [key: string]: unknown;
};

type OrdenarPor = "nome_campanha" | "gasto_total" | "contatos" | "cpl" | "roas" | "ctr" | "score" | "status";
type FiltroStatus = "todos" | "ativo" | "pausado" | "critico";
type Periodo = "hoje" | "7d" | "30d" | "90d" | "todos";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtBRL  = (v: number) => `R$\u00a0${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtBRL2 = (v: number) => `R$\u00a0${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum  = (v: number) => v.toLocaleString("pt-BR");
const fmtPct  = (v: number) => `${v.toFixed(2)}%`;
const fmtX    = (v: number) => `${v.toFixed(2)}x`;
const getPeriodoLabel = (periodo: Periodo) => {
  switch (periodo) {
    case "hoje": return "Hoje";
    case "7d": return "7 dias";
    case "30d": return "30 dias";
    case "90d": return "90 dias";
    default: return "Tudo";
  }
};

function calcScore(gasto: number, leads: number, receita: number): number {
  if (gasto === 0) return 0;
  if (leads === 0 && gasto > 50) return 20;
  const roas = gasto > 0 ? receita / gasto : 0;
  const cpl  = leads > 0 ? gasto / leads : 999;
  let score  = 50;
  if (roas >= 3) score += 25; else if (roas >= 2) score += 10; else if (roas < 1) score -= 20;
  if (cpl < 30)  score += 15; else if (cpl < 60) score += 5; else if (cpl > 120) score -= 15;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function isAtivo(status: string) {
  return ["ATIVO", "ACTIVE", "ATIVA"].includes((status ?? "").toUpperCase());
}

function nomeCurto(nome: string, max = 42): string {
  if (!nome) return "—";
  return nome.length > max ? nome.slice(0, max - 1) + "…" : nome;
}

// ─── Score Badge ──────────────────────────────────────────────────────────────
function ScoreDot({ score }: { score: number }) {
  if (score >= 70) return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]"/>
      {score}
    </span>
  );
  if (score >= 45) return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"/>
      {score}
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"/>
      {score}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const ativo = isAtivo(status);
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md tracking-wide ${
      ativo
        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        : "bg-white/[0.04] text-white/25 border border-white/[0.07]"
    }`}>
      <span className={`w-1 h-1 rounded-full ${ativo ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.9)]" : "bg-white/20"}`}/>
      {ativo ? "ATIVA" : "PAUSADA"}
    </span>
  );
}

// ─── Coluna Header ────────────────────────────────────────────────────────────
function ColHeader({
  label, campo, ordenar, setOrdenar, dir, setDir, align = "left"
}: {
  label: string; campo: OrdenarPor;
  ordenar: OrdenarPor; setOrdenar: (v: OrdenarPor) => void;
  dir: "asc" | "desc"; setDir: (v: "asc" | "desc") => void;
  align?: "left" | "right";
}) {
  const ativo = ordenar === campo;
  function toggle() {
    if (ativo) setDir(dir === "asc" ? "desc" : "asc");
    else { setOrdenar(campo); setDir("desc"); }
  }
  return (
    <button onClick={toggle} className={`flex items-center gap-1 text-[10px] font-semibold tracking-[0.12em] uppercase whitespace-nowrap transition-colors ${
      ativo ? "text-white" : "text-white/30 hover:text-white/60"
    } ${align === "right" ? "ml-auto" : ""}`}>
      {label}
      {ativo
        ? dir === "desc" ? <ChevronDown size={10}/> : <ChevronUp size={10}/>
        : <ArrowUpDown size={9} className="opacity-40"/>
      }
    </button>
  );
}

// ─── Metric Cell ──────────────────────────────────────────────────────────────
function MetricCell({ value, sub, color = "text-white/80", mono = true }: {
  value: string; sub?: string; color?: string; mono?: boolean;
}) {
  return (
    <div className={`text-right ${mono ? "font-mono" : ""}`}>
      <div className={`text-[12px] font-semibold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-white/20 mt-0.5">{sub}</div>}
    </div>
  );
}


// ─── Exportar PDF ─────────────────────────────────────────────────────────────
async function gerarPDF(campanhas: Campanha[], titulo: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297, H = 210;

  doc.setFillColor(10, 10, 12); doc.rect(0, 0, W, H, "F");
  doc.setFillColor(99, 102, 241); doc.rect(0, 0, 7, H, "F");

  doc.setFontSize(20); doc.setTextColor(255,255,255); doc.setFont("helvetica","bold");
  doc.text("GERENCIADOR DE ANÚNCIOS ERIZON", 16, 22);
  doc.setFontSize(10); doc.setTextColor(140,140,160); doc.setFont("helvetica","normal");
  doc.text(titulo, 16, 30);
  doc.text(new Date().toLocaleDateString("pt-BR", { day:"2-digit",month:"long",year:"numeric" }), W-50, 30);

  doc.setDrawColor(40,40,55); doc.setLineWidth(0.3); doc.line(16, 35, W-10, 35);

  const totInvest  = campanhas.reduce((s,c) => s + c.gasto_total, 0);
  const totLeads   = campanhas.reduce((s,c) => s + c.contatos, 0);
  const totReceita = campanhas.reduce((s,c) => s + c.receita_estimada, 0);
  const cplMedio   = totLeads > 0 ? totInvest / totLeads : 0;
  const cards = [
    { l: "Campanhas", v: String(campanhas.length) },
    { l: "Investimento", v: fmtBRL(totInvest) },
    { l: "Leads", v: fmtNum(totLeads) },
    { l: "CPL Médio", v: cplMedio > 0 ? fmtBRL2(cplMedio) : "—" },
    { l: "Receita Est.", v: fmtBRL(totReceita) },
  ];
  const cw = (W - 26 - (cards.length-1)*3) / cards.length;
  cards.forEach((card, i) => {
    const x = 16 + i*(cw+3);
    doc.setFillColor(18,18,22); doc.roundedRect(x, 39, cw, 18, 2, 2, "F");
    doc.setFontSize(6.5); doc.setTextColor(90,90,110); doc.text(card.l.toUpperCase(), x+3, 45);
    doc.setFontSize(9); doc.setTextColor(220,220,240); doc.setFont("helvetica","bold");
    doc.text(card.v, x+3, 52);
  });

  const headers = ["CAMPANHA","CLIENTE","STATUS","SCORE","INVESTIDO","LEADS","CPL","ROAS","CTR"];
  const colsW   = [62,30,18,14,28,14,24,18,14];
  let y = 68;
  doc.setFillColor(18,18,24); doc.rect(16, y-5, W-26, 9, "F");
  let xp = 16;
  headers.forEach((h, i) => {
    doc.setFontSize(6); doc.setTextColor(80,80,110); doc.setFont("helvetica","bold");
    doc.text(h, xp+2, y); xp += colsW[i];
  });
  y += 6;
  campanhas.forEach((c, idx) => {
    if (y > H - 12) return;
    if (idx%2===0) { doc.setFillColor(14,14,18); doc.rect(16, y-5, W-26, 8, "F"); }
    const cpl  = c.contatos > 0 ? c.gasto_total / c.contatos : 0;
    const roas = c.gasto_total > 0 ? c.receita_estimada / c.gasto_total : 0;
    const score = c.score ?? calcScore(c.gasto_total, c.contatos, c.receita_estimada);
    const sc: [number,number,number] = score>=70 ? [16,185,129] : score>=45 ? [245,158,11] : [239,68,68];
    xp = 16;
    doc.setFontSize(7); doc.setFont("helvetica","normal");
    doc.setTextColor(200,200,220); doc.text(nomeCurto(c.nome_campanha, 34), xp+2, y); xp += colsW[0];
    doc.setTextColor(140,140,165); doc.text(nomeCurto(c.cliente_nome??"",(colsW[1]/2.3)|0), xp+2, y); xp += colsW[1];
    const at = isAtivo(c.status);
    doc.setTextColor(at?16:90, at?185:90, at?129:110); doc.text(at?"Ativa":"Pausada", xp+2, y); xp += colsW[2];
    doc.setTextColor(...sc); doc.text(String(score), xp+2, y); xp += colsW[3];
    doc.setTextColor(200,200,220); doc.text(fmtBRL(c.gasto_total), xp+2, y); xp += colsW[4];
    doc.setTextColor(c.contatos>0?100:80, c.contatos>0?160:80, c.contatos>0?240:110);
    doc.text(c.contatos>0?fmtNum(c.contatos):"—", xp+2, y); xp += colsW[5];
    const cplC: [number,number,number] = cpl===0?[80,80,100]:cpl<30?[16,185,129]:cpl<80?[200,200,220]:[239,68,68];
    doc.setTextColor(...cplC); doc.text(cpl>0?fmtBRL2(cpl):"—", xp+2, y); xp += colsW[6];
    const rC: [number,number,number] = roas>=3?[16,185,129]:roas>=2?[200,200,220]:roas>0?[245,158,11]:[80,80,100];
    doc.setTextColor(...rC); doc.text(roas>0?fmtX(roas):"—", xp+2, y); xp += colsW[7];
    doc.setTextColor(160,160,200); doc.text(c.ctr!=null?fmtPct(c.ctr):"—", xp+2, y);
    y += 8;
  });

  for (let p = 1; p <= doc.getNumberOfPages(); p++) {
    doc.setPage(p); doc.setFontSize(6); doc.setTextColor(50,50,70);
    doc.text(`Erizon AI · Gerenciador de Anúncios · Relatório confidencial`, 16, H-4);
  }

  doc.save(`Erizon_Campanhas_${new Date().toISOString().slice(0,10)}.pdf`);
}

// ─── Painel de Análise Individual ────────────────────────────────────────────
interface AnaliseIndividual {
  camp: Campanha;
  cpl: number;
  roas: number;
  score: number;
  decisao: "pausar" | "escalar" | "monitorar" | "ok";
  titulo: string;
  descricao: string;
  impacto: string;
  corDecisao: string;
  bgDecisao: string;
  borderDecisao: string;
}

function gerarAnalise(camp: Campanha): AnaliseIndividual {
  const cpl   = camp.contatos > 0 ? camp.gasto_total / camp.contatos : 0;
  const roas  = camp.gasto_total > 0 ? camp.receita_estimada / camp.gasto_total : 0;
  const score = camp.score ?? calcScore(camp.gasto_total, camp.contatos, camp.receita_estimada);
  const ativo = isAtivo(camp.status);

  let decisao: AnaliseIndividual["decisao"] = "ok";
  let titulo = "";
  let descricao = "";
  let impacto = "";

  const gastoDiario = camp.dias_ativo && camp.dias_ativo > 0 ? camp.gasto_total / camp.dias_ativo : camp.gasto_total;

  if (!ativo) {
    decisao = "monitorar";
    titulo = "Campanha pausada";
    descricao = `Esta campanha está inativa. Investimento acumulado: ${fmtBRL2(camp.gasto_total)} com ${camp.contatos} leads gerados.`;
    impacto = cpl > 0 ? `CPL histórico: ${fmtBRL2(cpl)}` : "Sem leads registrados";
  } else if (score < 35) {
    decisao = "pausar";
    titulo = "⛔ Pausar imediatamente";
    descricao = camp.contatos === 0
      ? `${fmtBRL2(camp.gasto_total)} investidos sem nenhum lead. Esta campanha está queimando budget sem retorno.`
      : `Score ${score}/100 — CPL de ${fmtBRL2(cpl)} está muito acima do saudável. ROAS de ${fmtX(roas)} abaixo do mínimo.`;
    impacto = `~${fmtBRL(Math.round(gastoDiario * 30))} em risco este mês se mantida`;
  } else if (score < 55) {
    decisao = "monitorar";
    titulo = "⚠️ Monitorar com atenção";
    descricao = `Score ${score}/100 — performance abaixo do ideal. CPL de ${cpl > 0 ? fmtBRL2(cpl) : "—"} pode ser otimizado com ajuste de segmentação ou criativo.`;
    impacto = `Potencial de melhora de até 30% no CPL`;
  } else if (roas >= 2.5 && score >= 70) {
    decisao = "escalar";
    titulo = "🚀 Oportunidade de escala";
    descricao = `ROAS ${fmtX(roas)} com score ${score}/100. Esta campanha tem headroom para crescer — aumentar budget em 20% pode gerar retorno proporcional.`;
    impacto = `+${fmtBRL(Math.round(gastoDiario * 0.2 * roas * 30))}/mês estimado com escala de 20%`;
  } else {
    decisao = "ok";
    titulo = "✅ Performance saudável";
    descricao = `Score ${score}/100 — campanha performando dentro do esperado. CPL ${cpl > 0 ? fmtBRL2(cpl) : "—"} e ROAS ${roas > 0 ? fmtX(roas) : "—"} estáveis.`;
    impacto = `Manter estratégia atual`;
  }

  const corDecisao   = decisao === "pausar" ? "text-red-400" : decisao === "escalar" ? "text-emerald-400" : decisao === "monitorar" ? "text-amber-400" : "text-white/60";
  const bgDecisao    = decisao === "pausar" ? "bg-red-500/[0.05]" : decisao === "escalar" ? "bg-emerald-500/[0.05]" : decisao === "monitorar" ? "bg-amber-500/[0.04]" : "bg-white/[0.02]";
  const borderDecisao = decisao === "pausar" ? "border-red-500/20" : decisao === "escalar" ? "border-emerald-500/20" : decisao === "monitorar" ? "border-amber-500/15" : "border-white/[0.06]";

  return { camp, cpl, roas, score, decisao, titulo, descricao, impacto, corDecisao, bgDecisao, borderDecisao };
}

// ─── Seção de Análise de Criativo IA ─────────────────────────────────────────
function SecaoCriativo({ campanha }: { campanha: Campanha }) {
  useSessionGuard();

  const [analise, setAnalise]   = useState<AnaliseCriativoIA | null>(campanha.analise_criativo ?? null);
  const [loading, setLoading]   = useState(false);
  const [erro, setErro]         = useState<string | null>(null);

  async function analisar() {
    setLoading(true);
    setErro(null);
    try {
      const res  = await fetch("/api/ai-criativo", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ campanha_id: campanha.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErro(data.error ?? "Erro ao analisar criativo.");
      } else {
        setAnalise(data.analise);
      }
    } catch {
      setErro("Erro de conexão.");
    }
    setLoading(false);
  }

  const corScore = (s: number) => s >= 70 ? "#10b981" : s >= 45 ? "#f59e0b" : "#ef4444";
  const ctr = campanha.ctr ?? 0;
  const cpl = campanha.contatos > 0 ? campanha.gasto_total / campanha.contatos : 0;
  const precisaAnalise = ctr < 0.8 || cpl > 60;

  return (
    <div className="px-6 mt-5 shrink-0">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/20 flex items-center gap-1.5">
          <Sparkles size={10} className="text-purple-400"/>
          Análise de Criativo IA
        </p>
        {analise && (
          <button onClick={analisar} disabled={loading}
            className="text-[9px] text-white/20 hover:text-purple-400 transition-colors flex items-center gap-1">
            <RefreshCw size={9} className={loading ? "animate-spin" : ""}/>
            Reanalisar
          </button>
        )}
      </div>

      {!analise && !loading && (
        <div className={`rounded-xl border p-4 flex flex-col gap-3 ${precisaAnalise ? "border-purple-500/20 bg-purple-500/[0.04]" : "border-white/[0.06] bg-white/[0.02]"}`}>
          {precisaAnalise && (
            <div className="flex items-start gap-2">
              <ImageIcon size={12} className="text-purple-400 mt-0.5 shrink-0"/>
              <p className="text-[11px] text-purple-300/70 leading-relaxed">
                {ctr < 0.8 ? "CTR baixo detectado." : "CPL alto detectado."} A IA pode identificar problemas no criativo desta campanha.
              </p>
            </div>
          )}
          <button onClick={analisar}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-[12px] font-semibold text-white transition-all">
            <Sparkles size={12}/> Analisar criativo agora
          </button>
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 flex flex-col items-center gap-3">
          <Loader2 size={20} className="text-purple-400 animate-spin"/>
          <p className="text-[11px] text-white/30">Buscando criativo e analisando...</p>
        </div>
      )}

      {erro && !loading && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-3 flex items-start gap-2">
          <AlertTriangle size={12} className="text-red-400 mt-0.5 shrink-0"/>
          <div>
            <p className="text-[11px] text-red-400 font-medium">{erro}</p>
            <button onClick={analisar} className="text-[10px] text-white/30 hover:text-white mt-1 transition-colors">
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {analise && !loading && (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          {/* Score + tipo + resumo */}
          <div className="p-4 border-b border-white/[0.05] flex items-start gap-3">
            <div className="shrink-0 flex flex-col items-center gap-1">
              <div className="relative" style={{ width: 44, height: 44 }}>
                <svg width={44} height={44} className="-rotate-90">
                  <circle cx={22} cy={22} r={17} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={3}/>
                  <circle cx={22} cy={22} r={17} fill="none" stroke={corScore(analise.score)} strokeWidth={3}
                    strokeDasharray={`${(analise.score/100)*(2*Math.PI*17)} ${2*Math.PI*17}`} strokeLinecap="round"/>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-white">{analise.score}</span>
              </div>
              <span className="text-[8px] text-white/20 uppercase tracking-wider">
                {analise.tipo_criativo === "video" ? "vídeo" : "imagem"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-purple-300/60 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Zap size={9}/> Hook visual
              </p>
              <p className="text-[12px] text-white/70 leading-relaxed">{analise.hook}</p>
            </div>
          </div>

          {/* Resumo */}
          <div className="px-4 py-3 border-b border-white/[0.05]">
            <p className="text-[11px] text-white/50 leading-relaxed italic">&quot;{analise.resumo}&quot;</p>
          </div>

          {/* Pontos fortes */}
          {analise.pontos_fortes.length > 0 && (
            <div className="px-4 py-3 border-b border-white/[0.05]">
              <p className="text-[9px] text-emerald-400/60 uppercase tracking-wider mb-2 flex items-center gap-1">
                <ThumbsUp size={9}/> Pontos fortes
              </p>
              <div className="space-y-1">
                {analise.pontos_fortes.map((p, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-emerald-500/50 mt-1.5 shrink-0"/>
                    <p className="text-[11px] text-white/40 leading-relaxed">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Problemas */}
          {analise.problemas.length > 0 && (
            <div className="px-4 py-3 border-b border-white/[0.05]">
              <p className="text-[9px] text-red-400/60 uppercase tracking-wider mb-2 flex items-center gap-1">
                <ThumbsDown size={9}/> Problemas identificados
              </p>
              <div className="space-y-1">
                {analise.problemas.map((p, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-red-500/50 mt-1.5 shrink-0"/>
                    <p className="text-[11px] text-white/40 leading-relaxed">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sugestões */}
          {analise.sugestoes.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-[9px] text-amber-400/60 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Lightbulb size={9}/> Sugestões de melhoria
              </p>
              <div className="space-y-1.5">
                {analise.sugestoes.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[9px] text-amber-500/40 font-bold mt-0.5 shrink-0">{i+1}.</span>
                    <p className="text-[11px] text-white/50 leading-relaxed">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="px-4 py-2 bg-white/[0.02] border-t border-white/[0.04]">
            <p className="text-[9px] text-white/15">
              Analisado em {new Date(analise.analisado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PainelAnaliseIndividual({ analise, onFechar }: {
  analise: AnaliseIndividual;
  onFechar: () => void;
}) {
  const { camp, cpl, roas, score, titulo, descricao, impacto, corDecisao, bgDecisao, borderDecisao } = analise;

  const r = 20, circ = 2 * Math.PI * r;
  const corScore = score >= 70 ? "#10b981" : score >= 45 ? "#f59e0b" : "#ef4444";

  const metricas = [
    { label: "Investido",  value: fmtBRL(camp.gasto_total),                  color: "text-white/80" },
    { label: "Resultados", value: camp.contatos > 0 ? fmtNum(camp.contatos) : "—", color: camp.contatos > 0 ? "text-sky-400" : "text-white/20" },
    { label: "CPL derivado", value: cpl > 0 ? fmtBRL2(cpl) : "—",              color: cpl === 0 ? "text-white/20" : cpl < 30 ? "text-emerald-400" : cpl < 80 ? "text-white/70" : "text-red-400" },
    { label: "ROAS derivado", value: roas > 0 ? fmtX(roas) : "—",               color: roas === 0 ? "text-white/20" : roas >= 3 ? "text-emerald-400" : roas >= 2 ? "text-white/70" : "text-amber-400" },
    { label: "CTR",        value: camp.ctr && camp.ctr > 0 ? fmtPct(camp.ctr) : "—", color: !camp.ctr || camp.ctr === 0 ? "text-white/20" : camp.ctr > 2 ? "text-emerald-400" : "text-white/60" },
    { label: "CPM",        value: camp.cpm && camp.cpm > 0 ? fmtBRL2(camp.cpm) : "—", color: "text-white/50" },
    { label: "Impressões", value: camp.impressoes && camp.impressoes > 0 ? fmtNum(camp.impressoes) : "—", color: "text-white/50" },
    { label: "Dias ativo", value: camp.dias_ativo && camp.dias_ativo > 0 ? `${camp.dias_ativo}d` : "—", color: "text-white/40" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onFechar}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
      <div
        className="relative ml-auto w-full max-w-[480px] bg-[#0c0c0f] border-l border-white/[0.07] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between px-6 py-5 border-b border-white/[0.05]">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-[10px] text-white/25 mb-1 uppercase tracking-wider font-medium">
              {camp.cliente_nome || "—"}
            </p>
            <h2 className="text-[14px] font-bold text-white leading-snug" title={camp.nome_campanha}>
              {camp.nome_campanha}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={camp.status}/>
              {camp.dias_ativo && camp.dias_ativo > 0 && (
                <span className="text-[10px] text-white/20 flex items-center gap-1">
                  <Clock size={9}/>{camp.dias_ativo} dias
                </span>
              )}
            </div>
          </div>

          {/* Score ring */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="relative" style={{ width: 52, height: 52 }}>
              <svg width={52} height={52} className="-rotate-90">
                <circle cx={26} cy={26} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={3.5}/>
                <circle cx={26} cy={26} r={r} fill="none" stroke={corScore} strokeWidth={3.5}
                  strokeDasharray={`${(score/100)*circ} ${circ}`} strokeLinecap="round"/>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[13px] font-black text-white">{score}</span>
            </div>
            <span className="text-[9px] text-white/20">score derivado</span>
          </div>

          <button onClick={onFechar}
            className="ml-3 w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.08] transition-all shrink-0 self-start">
            <X size={14} className="text-white/40"/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
        {/* Decisão derivada */}
        <div className={`mx-6 mt-5 p-4 rounded-2xl border ${borderDecisao} ${bgDecisao} shrink-0`}>
          <p className={`text-[12px] font-bold mb-1.5 ${corDecisao}`}>{titulo}</p>
          <p className="text-[11px] text-white/40 leading-relaxed mb-2">{descricao}</p>
          <div className="flex items-center gap-2 pt-2 border-t border-white/[0.05]">
            <Target size={10} className={corDecisao}/>
            <p className={`text-[10px] font-medium ${corDecisao} opacity-70`}>{impacto}</p>
          </div>
        </div>

        {/* Métricas grid */}
        <div className="px-6 mt-5 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/20 mb-3">Métricas detalhadas da base sincronizada</p>
          <div className="grid grid-cols-2 gap-2">
            {metricas.map(m => (
              <div key={m.label} className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <p className="text-[9px] text-white/20 uppercase tracking-wider mb-1">{m.label}</p>
                <p className={`text-[13px] font-bold font-mono ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Análise de eficiência derivada */}
        {camp.gasto_total > 0 && (
          <div className="px-6 mt-5 shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/20 mb-3">Eficiência derivada</p>
            <div className="space-y-2">
              {[
                {
                  label: "Custo por resultado",
                  pct: cpl > 0 ? Math.min((30 / cpl) * 100, 100) : 0,
                  cor: cpl < 30 ? "#10b981" : cpl < 80 ? "#f59e0b" : "#ef4444",
                  meta: "Meta: < R$30",
                },
                {
                  label: "ROAS derivado",
                  pct: Math.min((roas / 4) * 100, 100),
                  cor: roas >= 3 ? "#10b981" : roas >= 2 ? "#f59e0b" : "#ef4444",
                  meta: "Meta: 3×+",
                },
                {
                  label: "CTR",
                  pct: camp.ctr ? Math.min((camp.ctr / 3) * 100, 100) : 0,
                  cor: (camp.ctr ?? 0) > 2 ? "#10b981" : (camp.ctr ?? 0) > 1 ? "#f59e0b" : "#ef4444",
                  meta: "Meta: 2%+",
                },
              ].map(bar => (
                <div key={bar.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-white/30">{bar.label}</span>
                    <span className="text-[10px] text-white/20">{bar.meta}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${bar.pct}%`, backgroundColor: bar.cor }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Análise de Criativo IA */}
        <SecaoCriativo campanha={camp} />

        {/* Ações */}
        <div className="px-6 mt-5 mb-6 flex flex-col gap-2 shrink-0">
          <button
            onClick={() => { window.location.href = `/dados?cliente=${camp.cliente_id}`; }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white transition-all">
            <BarChart3 size={14}/> Análise completa em Dados
          </button>
          <button onClick={onFechar}
            className="w-full py-3 rounded-xl border border-white/[0.07] text-[12px] text-white/30 hover:text-white transition-all">
            Fechar
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE PRINCIPAL ───────────────────────────────────────────────────────────
export default function GerenciadorAnunciosPage() {
  const [campanhas, setCampanhas]       = useState<Campanha[]>([]);
  const [clientes, setClientes]         = useState<Cliente[]>([]);
  const [loading, setLoading]           = useState(true);
  const [exportando, setExportando]     = useState(false);
  const [erro, setErro]                 = useState("");
  const [sucesso, setSucesso]           = useState("");
  const [campanhaSelecionada, setCampanhaSelecionada] = useState<Campanha | null>(null);

  // Filtros
  const [busca, setBusca]               = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [filtroCliente, setFiltroCliente] = useState<string>("todos");
  const [periodo, setPeriodo]           = useState<Periodo>("30d");
  const [ordenar, setOrdenar]           = useState<OrdenarPor>("gasto_total");
  const [dir, setDir]                   = useState<"asc"|"desc">("desc");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [syncingId, setSyncingId]       = useState<string|null>(null);

  // ── Carregar campanhas de todos os clientes ──────────────────────────────────
  async function carregar() {
    setLoading(true);
    try {
      // Carrega clientes primeiro
      const { data: dadosClientes } = await fetchSafe<{ clientes: Cliente[] }>("/api/clientes");

      // FIX: uso de ClienteRaw para evitar erro TS2345 no .map()
      const rawClientes = (dadosClientes?.clientes ?? (dadosClientes as unknown as ClienteRaw[]) ?? []) as ClienteRaw[];
      const listaClientes: Cliente[] = (Array.isArray(rawClientes) ? rawClientes : []).map((c: ClienteRaw) => ({
        id:           String(c.id ?? ""),
        nome:         String(c.nome ?? c.nome_cliente ?? ""),
        nome_cliente: String(c.nome_cliente ?? c.nome ?? ""),
        cor:          c.cor ? String(c.cor) : undefined,
      }));
      setClientes(listaClientes);

      // Carrega campanhas de todos os clientes (via relatorio-pdf sem filtro)
      const res  = await fetch("/api/relatorio-pdf");
      const json = await res.json();
      const camps: Campanha[] = (json.relatorio?.campanhas ?? []).map((c: ClienteRaw) => {
        const cl = listaClientes.find(x => x.id === String(c.cliente_id ?? ""));
        return {
          id:               String(c.id ?? ""),
          nome_campanha:    String(c.nome ?? "—"),
          status:           String(c.status ?? "PAUSADO"),
          gasto_total:      Number(c.gasto ?? 0),
          contatos:         Number(c.leads ?? 0),
          receita_estimada: Number(c.receita ?? 0),
          ctr:              Number(c.ctr ?? 0),
          cpm:              Number(c.cpm ?? 0),
          impressoes:       Number(c.impressoes ?? 0),
          dias_ativo:       Number(c.diasAtivo ?? 0),
          data_inicio:      c.dataInicio ? String(c.dataInicio) : undefined,
          cliente_id:       String(c.cliente_id ?? ""),
          cliente_nome:     cl ? (cl.nome_cliente ?? cl.nome) : "",
          score:            c.score != null
            ? Number(c.score)
            : calcScore(Number(c.gasto ?? 0), Number(c.leads ?? 0), Number(c.receita ?? 0)),
          meta_campaign_id: c.meta_campaign_id ? String(c.meta_campaign_id) : undefined,
          analise_criativo: c.analise_criativo as AnaliseCriativoIA | undefined,
        };
      });
      setCampanhas(camps);
    } catch {
      setErro("Erro ao carregar campanhas.");
    }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregar(); }, []);

  // ── Filtros e ordenação ───────────────────────────────────────────────────────
  const campanhasFiltradas = useMemo(() => {
    let lista = [...campanhas];

    if (busca.trim()) {
      const b = busca.toLowerCase();
      lista = lista.filter(c =>
        c.nome_campanha.toLowerCase().includes(b) ||
        (c.cliente_nome ?? "").toLowerCase().includes(b)
      );
    }

    if (filtroStatus === "ativo")   lista = lista.filter(c => isAtivo(c.status));
    if (filtroStatus === "pausado") lista = lista.filter(c => !isAtivo(c.status));
    if (filtroStatus === "critico") lista = lista.filter(c => (c.score ?? 0) < 45);

    if (filtroCliente !== "todos") lista = lista.filter(c => c.cliente_id === filtroCliente);

    lista.sort((a, b) => {
      let va = 0, vb = 0;
      switch (ordenar) {
        case "nome_campanha": return dir === "asc"
          ? a.nome_campanha.localeCompare(b.nome_campanha)
          : b.nome_campanha.localeCompare(a.nome_campanha);
        case "gasto_total": va = a.gasto_total; vb = b.gasto_total; break;
        case "contatos":    va = a.contatos;    vb = b.contatos; break;
        case "cpl":         va = a.contatos > 0 ? a.gasto_total/a.contatos : 999;
                            vb = b.contatos > 0 ? b.gasto_total/b.contatos : 999; break;
        case "roas":        va = a.gasto_total > 0 ? a.receita_estimada/a.gasto_total : 0;
                            vb = b.gasto_total > 0 ? b.receita_estimada/b.gasto_total : 0; break;
        case "ctr":         va = a.ctr ?? 0; vb = b.ctr ?? 0; break;
        case "score":       va = a.score ?? 0; vb = b.score ?? 0; break;
        case "status":      va = isAtivo(a.status) ? 1 : 0; vb = isAtivo(b.status) ? 1 : 0; break;
      }
      return dir === "asc" ? va - vb : vb - va;
    });

    return lista;
  }, [campanhas, busca, filtroStatus, filtroCliente, ordenar, dir]);

  // ── Totais ────────────────────────────────────────────────────────────────────
  const totais = useMemo(() => {
    const lista = campanhasFiltradas;
    const invest  = lista.reduce((s,c) => s + c.gasto_total, 0);
    const leads   = lista.reduce((s,c) => s + c.contatos, 0);
    const receita = lista.reduce((s,c) => s + c.receita_estimada, 0);
    const ativas  = lista.filter(c => isAtivo(c.status)).length;
    const criticas = lista.filter(c => (c.score??0) < 45).length;
    return { invest, leads, receita, ativas, criticas, total: lista.length,
      cpl: leads > 0 ? invest/leads : 0,
      roas: invest > 0 ? receita/invest : 0,
    };
  }, [campanhasFiltradas]);

  // ── Seleção ───────────────────────────────────────────────────────────────────
  function toggleSel(id: string) {
    setSelecionados(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) { novo.delete(id); } else { novo.add(id); }
      return novo;
    });
  }
  function toggleTodos() {
    if (selecionados.size === campanhasFiltradas.length) setSelecionados(new Set());
    else setSelecionados(new Set(campanhasFiltradas.map(c => c.id)));
  }

  // ── Exportar ──────────────────────────────────────────────────────────────────
  async function handleExportar() {
    setExportando(true);
    const lista = selecionados.size > 0
      ? campanhasFiltradas.filter(c => selecionados.has(c.id))
      : campanhasFiltradas;
    const titulo = busca ? `Busca: "${busca}"` :
      filtroCliente !== "todos" ? (clientes.find(c=>c.id===filtroCliente)?.nome_cliente ?? "") :
      "Todas as campanhas";
    await gerarPDF(lista, titulo);
    setExportando(false);
  }

  // ── Sincronizar ───────────────────────────────────────────────────────────────
  async function sincronizar() {
    setSyncingId("all");
    try {
      await fetch("/api/ads-sync");
      await carregar();
      setSucesso("Campanhas sincronizadas!");
      setTimeout(() => setSucesso(""), 3000);
    } catch { setErro("Erro ao sincronizar."); }
    setSyncingId(null);
  }

  const periodos: { label: string; value: Periodo }[] = [
    { label: "Hoje",   value: "hoje" },
    { label: "7 dias", value: "7d" },
    { label: "30 dias",value: "30d" },
    { label: "90 dias",value: "90d" },
    { label: "Tudo",   value: "todos"},
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      <Sidebar/>

      <main className="flex flex-col overflow-hidden min-h-screen ml-24">

        {/* ── Top Bar ── */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-[#0c0c0f]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <Zap size={13} className="text-white"/>
              </div>
              <span className="text-[15px] font-bold text-white tracking-tight">Gerenciador de Anúncios</span>
              <span className="text-[10px] text-white/20 font-medium px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">ERIZON</span>
            </div>
            <p className="hidden xl:block text-[11px] text-white/30">
              Base atual: última sincronização real. A janela {getPeriodoLabel(periodo)} ainda organiza a leitura visual da tela.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Período */}
            <div className="flex items-center gap-0.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              {periodos.map(p => (
                <button key={p.value} onClick={() => setPeriodo(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    periodo === p.value
                      ? "bg-white/[0.10] text-white"
                      : "text-white/30 hover:text-white/60"
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>

            <button onClick={sincronizar} disabled={syncingId === "all"}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] text-[11px] font-medium text-white/40 hover:text-white hover:border-white/20 transition-all disabled:opacity-40">
              <RefreshCw size={12} className={syncingId === "all" ? "animate-spin" : ""}/>
              Sincronizar
            </button>

            <Link
              href="/campanhas/nova"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-purple-500/25 bg-purple-500/10 text-[11px] font-semibold text-purple-300 hover:bg-purple-500/15 hover:border-purple-400/35 transition-all"
            >
              <Zap size={12} />
              Pre-flight
            </Link>

            <button onClick={handleExportar} disabled={exportando}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[11px] font-semibold text-white transition-all disabled:opacity-50">
              {exportando ? <Loader2 size={12} className="animate-spin"/> : <Download size={12}/>}
              Exportar PDF
            </button>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div className="shrink-0 grid grid-cols-7 border-b border-white/[0.05] divide-x divide-white/[0.04]">
          {[
            { label: "Campanhas",  value: String(totais.total),       sub: `${totais.ativas} ativas`, color: "text-white" },
            { label: "Críticas",   value: String(totais.criticas),    sub: "score derivado < 45",   color: totais.criticas > 0 ? "text-red-400" : "text-white/25" },
            { label: "Investido",  value: fmtBRL(totais.invest),      sub: "base sincronizada", color: "text-white" },
            { label: "Resultados", value: fmtNum(totais.leads),       sub: "contatos importados",color: "text-sky-400" },
            { label: "CPL deriv.",  value: totais.cpl > 0 ? fmtBRL2(totais.cpl) : "—", sub: "custo por resultado", color: totais.cpl > 80 ? "text-red-400" : totais.cpl > 40 ? "text-amber-400" : "text-emerald-400" },
            { label: "ROAS deriv.", value: totais.roas > 0 ? fmtX(totais.roas) : "—", sub: "sobre receita estimada",     color: totais.roas >= 3 ? "text-emerald-400" : totais.roas >= 2 ? "text-amber-400" : "text-red-400" },
            { label: "Receita estim.",value: fmtBRL(totais.receita),    sub: "não é faturamento real",     color: "text-purple-400" },
          ].map(m => (
            <div key={m.label} className="px-5 py-4">
              <p className="text-[10px] font-medium text-white/25 tracking-wider uppercase mb-1.5">{m.label}</p>
              <p className={`text-[16px] font-black font-mono tracking-tight ${m.color}`}>{m.value}</p>
              <p className="text-[10px] text-white/15 mt-0.5">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Toolbar de Filtros ── */}
        <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-white/[0.04] bg-[#0c0c0e]">
          <div className="relative flex-1 max-w-[380px]">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20"/>
            {busca && (
              <button onClick={() => setBusca("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60">
                <X size={12}/>
              </button>
            )}
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar campanha ou corretor..."
              className="w-full pl-10 pr-9 py-2 bg-white/[0.04] border border-white/[0.07] rounded-xl text-[12px] text-white placeholder-white/20 focus:outline-none focus:border-white/15 focus:bg-white/[0.06] transition-all"
            />
          </div>

          {/* Status */}
          <div className="flex items-center gap-0.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            {([
              { label: "Todas", value: "todos" },
              { label: "● Ativas", value: "ativo" },
              { label: "Pausadas", value: "pausado" },
              { label: "⚠ Críticas", value: "critico" },
            ] as const).map(f => (
              <button key={f.value} onClick={() => setFiltroStatus(f.value)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                  filtroStatus === f.value
                    ? f.value === "ativo"   ? "bg-emerald-500/15 text-emerald-400"
                      : f.value === "critico" ? "bg-red-500/15 text-red-400"
                      : "bg-white/[0.10] text-white"
                    : "text-white/25 hover:text-white/50"
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Filtro por cliente */}
          <select
            value={filtroCliente}
            onChange={e => setFiltroCliente(e.target.value)}
            className="px-3 py-2 bg-white/[0.04] border border-white/[0.07] rounded-xl text-[11px] text-white/60 focus:outline-none focus:border-white/15 appearance-none cursor-pointer min-w-[140px]"
          >
            <option value="todos">Todos os clientes</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nome_cliente ?? c.nome}</option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-2 text-[11px] text-white/20">
            {selecionados.size > 0 && (
              <span className="px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
                {selecionados.size} selecionada{selecionados.size !== 1 ? "s" : ""}
              </span>
            )}
            <span>{campanhasFiltradas.length} campanhas</span>
          </div>
        </div>

        {/* ── Tabela ── */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full gap-3">
              <Loader2 size={18} className="animate-spin text-white/20"/>
              <span className="text-[13px] text-white/20">Carregando campanhas...</span>
            </div>
          ) : campanhasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Target size={32} className="text-white/10"/>
              <p className="text-[14px] text-white/25 font-medium">
                {busca ? `Nenhuma campanha com "${busca}"` : "Nenhuma campanha encontrada"}
              </p>
              {busca && (
                <button onClick={() => setBusca("")} className="text-[12px] text-blue-400 hover:text-blue-300">
                  Limpar busca
                </button>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse" style={{ minWidth: 1100 }}>
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f0f12] border-b border-white/[0.06]"><th className="w-10 px-4 py-3"><input type="checkbox" checked={selecionados.size === campanhasFiltradas.length && campanhasFiltradas.length > 0} onChange={toggleTodos} className="w-3.5 h-3.5 rounded accent-blue-500 cursor-pointer"/></th><th className="w-2 px-0"/><th className="px-4 py-3 text-left w-[260px]"><ColHeader label="Campanha" campo="nome_campanha" ordenar={ordenar} setOrdenar={setOrdenar} dir={dir} setDir={setDir}/></th><th className="px-4 py-3 text-left w-[140px]"><span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30">Cliente</span></th><th className="px-4 py-3 text-left w-[100px]"><ColHeader label="Status" campo="status" ordenar={ordenar} setOrdenar={setOrdenar} dir={dir} setDir={setDir}/></th><th className="px-4 py-3 w-[80px]"><ColHeader label="Score deriv." campo="score" ordenar={ordenar} setOrdenar={setOrdenar} dir={dir} setDir={setDir}/></th><th className="px-4 py-3 text-right w-[120px]"><ColHeader label="Investido" campo="gasto_total" ordenar={ordenar} setOrdenar={setOrdenar} dir={dir} setDir={setDir} align="right"/></th><th className="px-4 py-3 text-right w-[90px]"><ColHeader label="Resultados" campo="contatos" ordenar={ordenar} setOrdenar={setOrdenar} dir={dir} setDir={setDir} align="right"/></th><th className="px-4 py-3 text-right w-[110px]"><ColHeader label="CPL deriv." campo="cpl" ordenar={ordenar} setOrdenar={setOrdenar} dir={dir} setDir={setDir} align="right"/></th><th className="px-4 py-3 text-right w-[90px]"><ColHeader label="ROAS deriv." campo="roas" ordenar={ordenar} setOrdenar={setOrdenar} dir={dir} setDir={setDir} align="right"/></th><th className="px-4 py-3 text-right w-[80px]"><ColHeader label="CTR" campo="ctr" ordenar={ordenar} setOrdenar={setOrdenar} dir={dir} setDir={setDir} align="right"/></th><th className="px-4 py-3 text-right w-[100px]"><span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30 float-right">CPM</span></th><th className="px-4 py-3 w-[80px]"/></tr>
              </thead>

              <tbody className="divide-y divide-white/[0.03]">
                {campanhasFiltradas.map((camp) => {
                  const cpl    = camp.contatos > 0 ? camp.gasto_total / camp.contatos : 0;
                  const roas   = camp.gasto_total > 0 ? camp.receita_estimada / camp.gasto_total : 0;
                  const score  = camp.score ?? calcScore(camp.gasto_total, camp.contatos, camp.receita_estimada);
                  const ativo  = isAtivo(camp.status);
                  const critico = score < 45;
                  const sel    = selecionados.has(camp.id);

                  const trClass = `group cursor-pointer transition-colors ${sel ? "bg-blue-600/[0.06]" : critico && ativo ? "bg-red-500/[0.025] hover:bg-red-500/[0.04]" : "hover:bg-white/[0.02]"}`;
                  const barClass = `w-[3px] h-full min-h-[44px] ${ativo && critico ? "bg-red-500" : ativo ? "bg-emerald-500" : "bg-transparent"}`;
                  return (
                    <tr key={camp.id} onClick={() => toggleSel(camp.id)} className={trClass}><td className="px-4 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={sel} onChange={() => toggleSel(camp.id)} className="w-3.5 h-3.5 rounded accent-blue-500 cursor-pointer"/></td><td className="w-[3px] p-0"><div className={barClass}/></td><td className="px-4 py-3 max-w-[260px]"><div className="flex flex-col gap-0.5"><span className="text-[12px] font-semibold text-white/85 leading-snug truncate" title={camp.nome_campanha}>{nomeCurto(camp.nome_campanha, 40)}</span>{camp.dias_ativo != null && camp.dias_ativo > 0 && (<span className="text-[10px] text-white/20 flex items-center gap-1"><Clock size={9}/>{camp.dias_ativo}d ativo</span>)}</div></td><td className="px-4 py-3">{camp.cliente_nome ? (<span className="text-[11px] text-white/40 font-medium truncate block max-w-[130px]" title={camp.cliente_nome}>{nomeCurto(camp.cliente_nome, 18)}</span>) : (<span className="text-[11px] text-white/15">—</span>)}</td><td className="px-4 py-3"><StatusBadge status={camp.status}/></td><td className="px-4 py-3 text-center"><ScoreDot score={score}/></td><td className="px-4 py-3"><MetricCell value={fmtBRL(camp.gasto_total)} color="text-white/80"/></td><td className="px-4 py-3"><MetricCell value={camp.contatos > 0 ? fmtNum(camp.contatos) : "—"} color={camp.contatos > 0 ? "text-sky-400" : "text-white/20"}/></td><td className="px-4 py-3"><MetricCell value={cpl > 0 ? fmtBRL2(cpl) : "—"} color={cpl === 0 ? "text-white/20" : cpl < 30 ? "text-emerald-400" : cpl < 80 ? "text-white/70" : "text-red-400"}/></td><td className="px-4 py-3"><MetricCell value={roas > 0 ? fmtX(roas) : "—"} color={roas === 0 ? "text-white/20" : roas >= 3 ? "text-emerald-400" : roas >= 2 ? "text-white/70" : "text-amber-400"}/></td><td className="px-4 py-3"><MetricCell value={camp.ctr != null && camp.ctr > 0 ? fmtPct(camp.ctr) : "—"} color={!camp.ctr || camp.ctr === 0 ? "text-white/20" : camp.ctr > 2 ? "text-emerald-400" : "text-white/60"}/></td><td className="px-4 py-3"><MetricCell value={camp.cpm != null && camp.cpm > 0 ? fmtBRL2(camp.cpm) : "—"} color={!camp.cpm || camp.cpm === 0 ? "text-white/20" : "text-white/60"}/></td><td className="px-4 py-3" onClick={e => e.stopPropagation()}><div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { window.location.href = `/dados?cliente=${camp.cliente_id}`; }} title="Análise completa" className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.07] hover:bg-blue-500/10 hover:border-blue-500/25 transition-all"><BarChart3 size={11} className="text-white/30 hover:text-blue-400"/></button><button title="Ver análise rápida" onClick={() => setCampanhaSelecionada(camp)} className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.07] hover:bg-purple-500/10 hover:border-purple-500/25 transition-all"><Eye size={11} className="text-white/30 hover:text-purple-400"/></button></div></td></tr>
                  );
                })}
              </tbody>

              {/* Footer com totais da seleção */}
              {selecionados.size > 0 && (() => {
                const sel = campanhasFiltradas.filter(c => selecionados.has(c.id));
                const si  = sel.reduce((s,c) => s + c.gasto_total, 0);
                const sl  = sel.reduce((s,c) => s + c.contatos, 0);
                const sr  = sel.reduce((s,c) => s + c.receita_estimada, 0);
                return (
                  <tfoot>
                    <tr className="bg-blue-600/[0.06] border-t border-blue-500/20 sticky bottom-0"><td colSpan={6} className="px-4 py-3"><span className="text-[11px] font-semibold text-blue-400">{selecionados.size} campanhas selecionadas</span></td><td className="px-4 py-3"><div className="text-right text-[12px] font-mono font-semibold text-white/70">{fmtBRL(si)}</div></td><td className="px-4 py-3"><div className="text-right text-[12px] font-mono font-semibold text-sky-400">{fmtNum(sl)}</div></td><td className="px-4 py-3"><div className="text-right text-[12px] font-mono font-semibold text-white/70">{sl > 0 ? fmtBRL2(si/sl) : "—"}</div></td><td className="px-4 py-3"><div className="text-right text-[12px] font-mono font-semibold text-white/70">{si > 0 ? fmtX(sr/si) : "—"}</div></td><td colSpan={3} className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={handleExportar} disabled={exportando} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-[11px] font-semibold text-white transition-all disabled:opacity-50">{exportando ? <Loader2 size={10} className="animate-spin"/> : <Download size={10}/>}Exportar seleção</button><button onClick={() => setSelecionados(new Set())} className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-[11px] text-white/30 hover:text-white transition-all">Limpar</button></div></td></tr>
                  </tfoot>
                );
              })()}
            </table>
          )}
        </div>

        {/* Painel de análise individual */}
        {campanhaSelecionada && (
          <PainelAnaliseIndividual
            analise={gerarAnalise(campanhaSelecionada)}
            onFechar={() => setCampanhaSelecionada(null)}
          />
        )}

        {/* Toasts */}
        {erro && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 bg-red-500/90 backdrop-blur rounded-2xl text-[13px] text-white font-medium shadow-2xl z-50">
            <AlertTriangle size={14}/> {erro}
          </div>
        )}
        {sucesso && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 bg-emerald-500/90 backdrop-blur rounded-2xl text-[13px] text-white font-medium shadow-2xl z-50">
            <CheckCircle size={14}/> {sucesso}
          </div>
        )}
      </main>
    </div>
  );
}
