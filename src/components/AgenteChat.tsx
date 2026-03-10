"use client";

// src/components/AgenteChat.tsx — v2
// Chat flutuante com:
// ✦ Sino de alertas com badge
// ✦ Briefing proativo ao abrir (o que mudou nas últimas horas)
// ✦ Memória visual — agente lembra quem você é
// ✦ Painel de alertas separado
// ✦ Geração de PDF automática

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X, Send, Sparkles, Loader2, ChevronDown,
  FileText, BarChart3, AlertCircle, Zap,
  Minimize2, Maximize2, RotateCcw, Bell,
  TrendingUp, TrendingDown, Shield, ChevronRight,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  pdfDados?: Record<string, unknown> | null;
  timestamp: Date;
}

interface Alerta {
  id: string;
  tipo: "critico" | "oportunidade" | "anomalia" | "melhora" | "meta_atingida";
  titulo: string;
  descricao: string;
  impacto_brl: number;
  urgencia: number;
  campanha_nome?: string;
  cliente_nome?: string;
  created_at: string;
  lido: boolean;
}

interface Memoria {
  resumo_contexto?: string;
  metas?: Record<string, number>;
  decisoes?: Array<Record<string, string>>;
  historico_analises?: Array<Record<string, unknown>>;
}

interface Props {
  clienteId?: string;
}

// ─── Sugestões rápidas ─────────────────────────────────────────────────────────
const SUGESTOES = [
  { icon: BarChart3,   texto: "Analisar minha conta agora",          prompt: "Analisa minha conta agora e me diz o que está crítico e o que posso escalar." },
  { icon: AlertCircle, texto: "Quais campanhas estão queimando $?",   prompt: "Quais campanhas estão com score crítico e queimando dinheiro? Me dá o diagnóstico completo." },
  { icon: Zap,         texto: "Onde posso escalar hoje?",             prompt: "Quais campanhas têm melhor ROAS e estão prontas para escalar? Quero ver as oportunidades." },
  { icon: FileText,    texto: "Gerar relatório PDF",                  prompt: "Gera um relatório PDF completo de todas as minhas campanhas." },
];

// ─── Gerador de PDF ────────────────────────────────────────────────────────────
async function gerarPDF(dados: {
  titulo: string; cliente: string; dataGeracao: string;
  totais: { campanhas: number; investimento: number; leads: number; receita: number; cplMedio: number; roasMedio: number };
  campanhas: Array<{ nome: string; status: string; gasto: number; leads: number; cpl: number; roas: number; score: number }>;
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297, H = 210;
  const fmtN = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtI = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

  doc.setFillColor(10, 10, 10); doc.rect(0, 0, W, H, "F");
  doc.setFillColor(99, 102, 241); doc.rect(0, 0, 8, H, "F");
  doc.setFontSize(20); doc.setTextColor(255,255,255); doc.setFont("helvetica","bold");
  doc.text("RELATÓRIO ERIZON AI", 18, 22);
  doc.setFontSize(12); doc.setTextColor(180,180,200); doc.setFont("helvetica","normal");
  doc.text(dados.cliente, 18, 30);
  doc.setFontSize(8); doc.setTextColor(100,100,120);
  doc.text(`Gerado via Agente IA · ${dados.dataGeracao} · ${dados.totais.campanhas} campanhas`, 18, 37);
  doc.setDrawColor(99,102,241); doc.setLineWidth(0.4); doc.line(18, 41, W-14, 41);

  const cards = [
    { l: "Investimento",  v: `R$ ${fmtN(dados.totais.investimento)}` },
    { l: "Leads",         v: fmtI(dados.totais.leads) },
    { l: "CPL Medio",     v: dados.totais.cplMedio > 0 ? `R$ ${fmtN(dados.totais.cplMedio)}` : "—" },
    { l: "ROAS Medio",    v: dados.totais.roasMedio > 0 ? `${dados.totais.roasMedio.toFixed(2)}x` : "—" },
    { l: "Campanhas",     v: String(dados.totais.campanhas) },
  ];
  const cW = (W - 32 - 16) / cards.length;
  cards.forEach((c, i) => {
    const x = 18 + i * (cW + 4);
    doc.setFillColor(18,18,22); doc.roundedRect(x, 47, cW, 20, 2, 2, "F");
    doc.setFontSize(7); doc.setTextColor(120,120,140); doc.setFont("helvetica","normal");
    doc.text(c.l.toUpperCase(), x+3, 53);
    doc.setFontSize(10); doc.setTextColor(255,255,255); doc.setFont("helvetica","bold");
    doc.text(c.v, x+3, 63);
  });

  const headers = ["#","Campanha","Status","Score","Investimento","Leads","CPL","ROAS"];
  const colW    = [7,72,20,14,32,18,28,20];
  const sY = 78, rH = 7.5;
  doc.setFillColor(18,18,28); doc.rect(18, sY-4, W-32, rH, "F");
  let xP = 18;
  headers.forEach((h, i) => {
    doc.setFontSize(6.5); doc.setTextColor(100,100,140); doc.setFont("helvetica","bold");
    doc.text(h, xP+2, sY); xP += colW[i];
  });
  const maxR = Math.floor((H - sY - 18) / rH);
  dados.campanhas.slice(0, maxR).forEach((c, idx) => {
    const y = sY + (idx+1) * rH;
    if (idx % 2 === 0) { doc.setFillColor(13,13,16); doc.rect(18, y-4, W-32, rH, "F"); }
    const sC: [number,number,number] = c.score >= 70 ? [16,185,129] : c.score >= 45 ? [245,158,11] : [239,68,68];
    xP = 18;
    doc.setFontSize(6.5); doc.setTextColor(80,80,100); doc.setFont("helvetica","normal");
    doc.text(String(idx+1), xP+2, y); xP += colW[0];
    const nt = c.nome.length > 40 ? c.nome.substring(0,37)+"..." : c.nome;
    doc.setTextColor(210,210,230); doc.text(nt, xP+2, y); xP += colW[1];
    const ia = ["ATIVO","ACTIVE","ATIVA"].includes(c.status?.toUpperCase?.() ?? "");
    doc.setTextColor(ia?16:100,ia?185:100,ia?129:120); doc.text(ia?"Ativa":"Pausada", xP+2, y); xP += colW[2];
    doc.setTextColor(...sC); doc.text(String(c.score), xP+2, y); xP += colW[3];
    doc.setTextColor(200,200,220); doc.text(`R$ ${fmtN(c.gasto)}`, xP+2, y); xP += colW[4];
    doc.setTextColor(c.leads>0?100:80,c.leads>0?180:80,c.leads>0?240:100);
    doc.text(c.leads>0?fmtI(c.leads):"—", xP+2, y); xP += colW[5];
    const cC: [number,number,number] = c.cpl===0?[80,80,100]:c.cpl<30?[16,185,129]:c.cpl<60?[200,200,220]:[239,68,68];
    doc.setTextColor(...cC); doc.text(c.cpl>0?`R$ ${fmtN(c.cpl)}`:"—", xP+2, y); xP += colW[6];
    const rC: [number,number,number] = c.roas>=3?[16,185,129]:c.roas>=2?[200,200,220]:c.roas>0?[245,158,11]:[80,80,100];
    doc.setTextColor(...rC); doc.text(c.roas>0?`${c.roas.toFixed(2)}x`:"—", xP+2, y);
  });
  doc.setFontSize(7); doc.setTextColor(60,60,80);
  doc.text(`Erizon AI Agent · Relatório confidencial · ${dados.dataGeracao}`, 18, H-6);
  doc.save(`Erizon_${dados.cliente.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.pdf`);
}

// ─── Renderer markdown simples ────────────────────────────────────────────────
function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.trim() === "") return <div key={i} className="h-1.5"/>;
    if (line.startsWith("- ") || line.startsWith("• ")) {
      const content = line.slice(2);
      const parts = content.split(/(\*\*[^*]+\*\*)/g);
      return (
        <div key={i} className="flex items-start gap-2 mb-1">
          <span className="text-purple-400 shrink-0 mt-[3px] text-[10px]">▸</span>
          <span className="text-white/75 text-[13px] leading-relaxed">
            {parts.map((p, j) => p.startsWith("**") ? <strong key={j} className="text-white font-semibold">{p.slice(2,-2)}</strong> : p)}
          </span>
        </div>
      );
    }
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-white/75 text-[13px] leading-relaxed mb-0.5">
        {parts.map((p, j) => p.startsWith("**") ? <strong key={j} className="text-white font-semibold">{p.slice(2,-2)}</strong> : p)}
      </p>
    );
  });
}

// ─── AlertaCard ────────────────────────────────────────────────────────────────
function AlertaCard({ alerta, onPerguntar }: { alerta: Alerta; onPerguntar: (a: Alerta) => void }) {
  const configs = {
    critico:      { cor: "border-red-500/25 bg-red-500/[0.04]",      icon: AlertCircle,   iconCor: "text-red-400",    label: "Crítico" },
    oportunidade: { cor: "border-emerald-500/25 bg-emerald-500/[0.04]", icon: TrendingUp,  iconCor: "text-emerald-400", label: "Oportunidade" },
    anomalia:     { cor: "border-amber-500/25 bg-amber-500/[0.04]",   icon: Zap,           iconCor: "text-amber-400",  label: "Anomalia" },
    melhora:      { cor: "border-sky-500/25 bg-sky-500/[0.04]",       icon: TrendingUp,    iconCor: "text-sky-400",    label: "Melhora" },
    meta_atingida:{ cor: "border-purple-500/25 bg-purple-500/[0.04]", icon: Shield,        iconCor: "text-purple-400", label: "Meta" },
  };
  const cfg = configs[alerta.tipo] ?? configs.anomalia;
  const Icon = cfg.icon;
  const tempo = (() => {
    const diff = Date.now() - new Date(alerta.created_at).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "agora";
    if (h < 24) return `${h}h atrás`;
    return `${Math.floor(h/24)}d atrás`;
  })();

  return (
    <div className={`p-3 rounded-xl border ${cfg.cor} mb-2`}>
      <div className="flex items-start gap-2.5">
        <Icon size={13} className={`${cfg.iconCor} shrink-0 mt-0.5`}/>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-white leading-snug">{alerta.titulo}</p>
          <p className="text-[11px] text-white/40 mt-0.5 leading-relaxed">{alerta.descricao}</p>
          {alerta.impacto_brl > 0 && (
            <p className={`text-[10px] font-bold mt-1 ${alerta.tipo === "oportunidade" ? "text-emerald-400" : "text-red-400"}`}>
              {alerta.tipo === "oportunidade" ? "+" : "-"}R${alerta.impacto_brl.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[9px] text-white/20">{tempo}</span>
            <button onClick={() => onPerguntar(alerta)}
              className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors">
              Analisar <ChevronRight size={10}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function AgenteChat({ clienteId }: Props) {
  const [aberto, setAberto]         = useState(false);
  const [aba, setAba]               = useState<"chat" | "alertas">("chat");
  const [maximizado, setMaximizado] = useState(false);
  const [msgs, setMsgs]             = useState<Msg[]>([]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  // ── MELHORIA: mostra qual tool está rodando no loading ─────────────────────
  const [toolAtiva, setToolAtiva]   = useState<string | null>(null);

  // Memória e alertas
  const [alertas, setAlertas]           = useState<Alerta[]>([]);
  const [totalNaoLidos, setTotalNaoLidos] = useState(0);
  const [memoria, setMemoria]           = useState<Memoria | null>(null);
  const [briefingFeito, setBriefingFeito] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // ── Carrega memória e alertas ao montar ───────────────────────────────────
  useEffect(() => {
    async function carregar() {
      try {
        const res  = await fetch("/api/agente/memoria");
        const json = await res.json();
        if (json.memoria) setMemoria(json.memoria);
        if (json.alertas) setAlertas(json.alertas);
        if (json.totalNaoLidos) setTotalNaoLidos(json.totalNaoLidos);
      } catch {}
    }
    carregar();
    // Recarrega alertas a cada 5 minutos
    const t = setInterval(carregar, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // ── Briefing proativo ao abrir ────────────────────────────────────────────
  useEffect(() => {
    if (!aberto || briefingFeito) return;
    setBriefingFeito(true);

    const alertasUrgentes = alertas.filter(a => a.urgencia === 3);
    const alertasOport    = alertas.filter(a => a.tipo === "oportunidade");
    const ultimaAnalise   = memoria?.historico_analises?.[0];

    let boasVindas = "Olá! Fiquei de olho nas suas campanhas enquanto você estava fora.\n\n";

    if (alertasUrgentes.length > 0) {
      boasVindas += `**🔴 ${alertasUrgentes.length} alerta${alertasUrgentes.length > 1 ? "s" : ""} urgente${alertasUrgentes.length > 1 ? "s" : ""}** precisam da sua atenção:\n`;
      alertasUrgentes.slice(0, 2).forEach(a => {
        boasVindas += `- ${a.titulo}\n`;
      });
      boasVindas += "\n";
    }

    if (alertasOport.length > 0) {
      boasVindas += `**🚀 ${alertasOport.length} oportunidade${alertasOport.length > 1 ? "s" : ""}** de escala identificada${alertasOport.length > 1 ? "s" : ""}.\n\n`;
    }

    if (ultimaAnalise) {
      const dataStr = new Date(ultimaAnalise.data as string).toLocaleDateString("pt-BR");
      boasVindas += `Última análise em ${dataStr}: ${ultimaAnalise.resumo}\n\n`;
    }

    if (alertasUrgentes.length === 0 && alertasOport.length === 0) {
      boasVindas = `Oi! ${memoria?.resumo_contexto ? "Tudo monitorado. " : ""}Como posso te ajudar agora?`;
    } else {
      boasVindas += "Quer que eu analise tudo em detalhes?";
    }

    setMsgs([{
      id: "briefing",
      role: "assistant",
      content: boasVindas,
      timestamp: new Date(),
    }]);

    setTimeout(() => inputRef.current?.focus(), 150);
  }, [aberto, briefingFeito, alertas, memoria]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // ── Marca alertas como lidos ao abrir painel ──────────────────────────────
  async function marcarAlertasLidos() {
    if (totalNaoLidos === 0) return;
    try {
      await fetch("/api/agente/memoria", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marcar_todos: true }),
      });
      setTotalNaoLidos(0);
      setAlertas(prev => prev.map(a => ({ ...a, lido: true })));
    } catch {}
  }

  // ── MELHORIA: Labels amigáveis para cada tool ─────────────────────────────
  const toolLabels: Record<string, string> = {
    buscar_campanhas:  "buscando campanhas...",
    buscar_clientes:   "carregando clientes...",
    analisar_conta:    "analisando conta...",
    gerar_relatorio:   "gerando relatório...",
    salvar_decisao:    "salvando decisão...",
    atualizar_metas:   "atualizando metas...",
  };

  const enviar = useCallback(async (texto?: string) => {
    const conteudo = (texto ?? input).trim();
    if (!conteudo || loading) return;
    setInput("");
    if (aba !== "chat") setAba("chat");

    const userMsg: Msg = { id: Date.now().toString(), role: "user", content: conteudo, timestamp: new Date() };
    setMsgs(prev => [...prev, userMsg]);
    setLoading(true);
    setToolAtiva(null);

    // ID da mensagem do assistente que vai sendo construída em stream
    const assistantId = (Date.now() + 1).toString();

    try {
      const historico = [...msgs, userMsg]
        .filter(m => m.id !== "briefing" || m.role !== "assistant")
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/agente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historico, cliente_id: clienteId }),
      });

      // ── Se a rota retornou erro, pode ser JSON normal (não SSE) ─────────────
      // Ex: Groq retorna 401/500 como JSON mesmo quando a rota usa stream
      if (!res.ok) {
        let errMsg = "Erro ao chamar agente.";
        try {
          const contentType = res.headers.get("content-type") ?? "";
          if (contentType.includes("application/json")) {
            const errJson = await res.json();
            errMsg = errJson.error ?? errMsg;
          } else {
            errMsg = await res.text();
          }
        } catch {}
        throw new Error(errMsg);
      }

      if (!res.body) throw new Error("Resposta sem corpo.");

      // ── Lê o stream SSE ───────────────────────────────────────────────────
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";
      let conteudoAcumulado = "";
      let pdfDadosLocal: Record<string, unknown> | null = null;
      let msgCriada = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === "tool_start") {
              setToolAtiva(toolLabels[event.tool] ?? `${event.tool}...`);
            }

            if (event.type === "tool_done") {
              setToolAtiva(null);
            }

            if (event.type === "delta") {
              conteudoAcumulado += event.content;
              if (!msgCriada) {
                // Cria a mensagem do assistente na primeira chegada de texto
                setMsgs(prev => [...prev, {
                  id: assistantId,
                  role: "assistant",
                  content: conteudoAcumulado,
                  timestamp: new Date(),
                }]);
                msgCriada = true;
              } else {
                // Atualiza conteúdo da mensagem já existente
                setMsgs(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: conteudoAcumulado } : m
                ));
              }
            }

            if (event.type === "done") {
              pdfDadosLocal = event.pdfDados ?? null;
              if (pdfDadosLocal) {
                setMsgs(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, pdfDados: pdfDadosLocal } : m
                ));
              }
            }

            if (event.type === "error") {
              throw new Error(event.message);
            }
          } catch (parseErr) {
            // Ignora falhas de parse de linha SSE individual
            // mas re-lança se for um erro real (ex: event.type === error)
            if (parseErr instanceof Error && parseErr.message !== "") {
              const msg = parseErr.message;
              // Se não é erro de JSON parse, é erro real — re-lança
              if (!msg.includes("JSON") && !msg.includes("token")) throw parseErr;
            }
          }
        }
      }

      // Se não recebeu nenhum conteúdo, insere mensagem de fallback
      if (!msgCriada) {
        setMsgs(prev => [...prev, {
          id: assistantId,
          role: "assistant",
          content: "Não consegui processar. Tente novamente.",
          timestamp: new Date(),
        }]);
      }

      // Gera PDF se vier nos dados
      if (pdfDadosLocal) {
        setGerandoPDF(true);
        try { await gerarPDF(pdfDadosLocal as Parameters<typeof gerarPDF>[0]); } catch {}
        setGerandoPDF(false);
      }

    } catch {
      setMsgs(prev => [...prev, {
        id: assistantId,
        role: "assistant",
        content: "Tive um problema ao acessar os dados. Verifique sua conexão.",
        timestamp: new Date(),
      }]);
    }

    setToolAtiva(null);
    setLoading(false);
  }, [input, loading, msgs, clienteId, aba]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  }

  function resetar() {
    setMsgs([]); setBriefingFeito(false);
    setTimeout(() => setBriefingFeito(false), 50);
  }

  function perguntarSobreAlerta(alerta: Alerta) {
    setAba("chat");
    const prompt = `Me explica o alerta: "${alerta.titulo}" — ${alerta.descricao}. O que devo fazer?`;
    enviar(prompt);
  }

  // ── Botão flutuante ────────────────────────────────────────────────────────
  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="fixed bottom-6 right-6 z-50 group" aria-label="Abrir Erizon AI">
        <div className="absolute inset-0 rounded-2xl bg-purple-500/25 blur-xl scale-125 group-hover:bg-purple-500/40 transition-all duration-500"/>
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shadow-2xl shadow-purple-500/40 transition-transform duration-200 group-hover:scale-105">
          <Sparkles size={22} className="text-white"/>
        </div>
        {/* Badge de alertas */}
        {totalNaoLidos > 0 && (
          <div className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full bg-red-500 border-2 border-[#0a0a0a] flex items-center justify-center">
            <span className="text-[10px] font-black text-white">{totalNaoLidos > 9 ? "9+" : totalNaoLidos}</span>
          </div>
        )}
        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0a0a0a]"/>
        {/* Tooltip */}
        <div className="absolute right-16 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          <div className="bg-[#111113] border border-white/[0.08] text-white/70 text-[11px] px-3 py-1.5 rounded-xl shadow-xl">
            {totalNaoLidos > 0 ? `${totalNaoLidos} alerta${totalNaoLidos > 1 ? "s" : ""} novo${totalNaoLidos > 1 ? "s" : ""}` : "Erizon AI · Parceiro de anúncios"}
          </div>
        </div>
      </button>
    );
  }

  const chatW = maximizado ? "w-[700px]" : "w-[420px]";
  const chatH = maximizado ? "h-[82vh]" : "h-[580px]";

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${chatW} ${chatH} flex flex-col bg-[#0f0f12] border border-white/[0.07] rounded-[26px] shadow-2xl shadow-black/70 overflow-hidden transition-all duration-300`}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.05] bg-[#111115] shrink-0">
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
            <Sparkles size={15} className="text-white"/>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#111115]"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-white">Erizon AI</p>
          <p className="text-[10px] text-white/25">
            {toolAtiva ? <span className="text-purple-400">{toolAtiva}</span>
              : loading ? <span className="text-purple-400">processando...</span>
              : gerandoPDF ? <span className="text-purple-400">gerando PDF...</span>
              : memoria?.resumo_contexto ? "memória ativa · online" : "online · acesso aos dados"}
          </p>
        </div>

        {/* Abas + ações */}
        <div className="flex items-center gap-1">
          {/* Sino de alertas */}
          <button
            onClick={() => { setAba("alertas"); marcarAlertasLidos(); }}
            className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              aba === "alertas" ? "bg-purple-500/20 text-purple-400" : "text-white/20 hover:text-white/50 hover:bg-white/[0.06]"
            }`}>
            <Bell size={14}/>
            {totalNaoLidos > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                <span className="text-[9px] font-black text-white">{totalNaoLidos > 9 ? "9+" : totalNaoLidos}</span>
              </div>
            )}
          </button>

          <button onClick={resetar} title="Nova conversa"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-all">
            <RotateCcw size={13}/>
          </button>
          <button onClick={() => setMaximizado(v => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-all">
            {maximizado ? <Minimize2 size={13}/> : <Maximize2 size={13}/>}
          </button>
          <button onClick={() => setAberto(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-all">
            <X size={14}/>
          </button>
        </div>
      </div>

      {/* ── Aba de Alertas ── */}
      {aba === "alertas" && (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25">
              Alertas das últimas 48h
            </p>
            {alertas.length > 0 && (
              <button onClick={() => setAba("chat")}
                className="text-[11px] text-purple-400 hover:text-purple-300 transition-colors">
                Ver no chat →
              </button>
            )}
          </div>

          {alertas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield size={24} className="text-white/10 mb-3"/>
              <p className="text-[13px] text-white/20">Nenhum alerta no momento</p>
              <p className="text-[11px] text-white/10 mt-1">O worker monitora a cada hora</p>
            </div>
          ) : (
            alertas.map(a => (
              <AlertaCard key={a.id} alerta={a} onPerguntar={perguntarSobreAlerta}/>
            ))
          )}

          {/* Memória resumo */}
          {memoria?.resumo_contexto && (
            <div className="mt-4 p-3 rounded-xl bg-purple-500/[0.04] border border-purple-500/15">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-400/60 mb-1.5">Contexto salvo</p>
              <p className="text-[11px] text-white/40 leading-relaxed">{memoria.resumo_contexto}</p>
              {memoria.metas && Object.keys(memoria.metas).length > 0 && (
                <div className="flex gap-3 mt-2 flex-wrap">
                  {memoria.metas.cpl_alvo && (
                    <span className="text-[10px] text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-lg">CPL alvo: R${memoria.metas.cpl_alvo}</span>
                  )}
                  {memoria.metas.roas_minimo && (
                    <span className="text-[10px] text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-lg">ROAS mín: {memoria.metas.roas_minimo}×</span>
                  )}
                  {memoria.metas.budget_diario && (
                    <span className="text-[10px] text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-lg">Budget: R${memoria.metas.budget_diario}/dia</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Aba de Chat ── */}
      {aba === "chat" && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}>

            {msgs.map(msg => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={11} className="text-white"/>
                  </div>
                )}
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-white/[0.07] border border-white/[0.07] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-white/40">U</span>
                  </div>
                )}

                <div className={`max-w-[86%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-purple-600/75 border border-purple-500/25 rounded-tr-sm"
                    : "bg-white/[0.04] border border-white/[0.05] rounded-tl-sm"
                }`}>
                  {msg.role === "assistant"
                    ? <div>{renderMarkdown(msg.content)}</div>
                    : <p className="text-[13px] text-white leading-relaxed">{msg.content}</p>
                  }

                  {msg.pdfDados && (
                    <button
                      onClick={async () => {
                        setGerandoPDF(true);
                        await gerarPDF(msg.pdfDados as Parameters<typeof gerarPDF>[0]);
                        setGerandoPDF(false);
                      }}
                      disabled={gerandoPDF}
                      className="mt-2.5 flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-300 text-[11px] font-medium hover:bg-purple-500/25 transition-all disabled:opacity-50 w-full justify-center">
                      {gerandoPDF ? <Loader2 size={11} className="animate-spin"/> : <FileText size={11}/>}
                      {gerandoPDF ? "Gerando PDF..." : "Baixar relatório PDF"}
                    </button>
                  )}

                  <p className="text-[9px] text-white/15 mt-1.5">
                    {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}

            {loading && !msgs.find(m => m.role === "assistant" && msgs.indexOf(m) === msgs.length - 1) && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shrink-0">
                  <Sparkles size={11} className="text-white"/>
                </div>
                <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400/50 animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }}/>
                      ))}
                    </div>
                    {/* Mostra qual tool está sendo executada */}
                    <span className="text-[11px] text-white/20">
                      {toolAtiva ?? "consultando dados..."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Sugestões iniciais */}
            {msgs.length <= 1 && !loading && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] text-white/15 text-center uppercase tracking-wider mb-2">Ações rápidas</p>
                {SUGESTOES.map((s, i) => (
                  <button key={i} onClick={() => enviar(s.prompt)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:border-purple-500/20 hover:bg-purple-500/[0.03] transition-all text-left group">
                    <s.icon size={12} className="text-white/20 group-hover:text-purple-400 transition-colors shrink-0"/>
                    <span className="text-[12px] text-white/40 group-hover:text-white/70 transition-colors">{s.texto}</span>
                    <ChevronDown size={10} className="text-white/10 ml-auto -rotate-90 shrink-0"/>
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/[0.04] bg-[#0f0f12] shrink-0">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={loading}
                  rows={1}
                  placeholder="Pergunte sobre campanhas, metas, corretor..."
                  style={{ resize: "none", minHeight: "40px", maxHeight: "110px" }}
                  className="w-full bg-white/[0.05] border border-white/[0.07] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder-white/15 focus:outline-none focus:border-purple-500/35 transition-all disabled:opacity-40"
                  onInput={e => {
                    const el = e.target as HTMLTextAreaElement;
                    el.style.height = "auto";
                    el.style.height = Math.min(el.scrollHeight, 110) + "px";
                  }}
                />
              </div>
              <button
                onClick={() => enviar()}
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-25 flex items-center justify-center transition-all shrink-0 shadow-lg shadow-purple-500/20">
                {loading ? <Loader2 size={14} className="animate-spin text-white"/> : <Send size={14} className="text-white"/>}
              </button>
            </div>
            <p className="text-[9px] text-white/10 text-center mt-1.5">
              Erizon AI · dados em tempo real · memória ativa · Enter para enviar
            </p>
          </div>
        </>
      )}
    </div>
  );
}