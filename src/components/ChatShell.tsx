"use client";

// components/ChatShell.tsx
// Shell compartilhado por Studio, Creative Lab (copy + roteiro).
// Elimina ~70% de código duplicado entre essas páginas.

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Plus, Trash2, Loader2, Copy as CopyIcon, Sparkles, MessageSquare } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { getSupabase } from "@/lib/supabase";

export interface Mensagem {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface Conversa {
  id: number;
  titulo: string;
  mensagens: Mensagem[];
  data_criacao: string;
  tipo?: string;
}

interface ChatShellProps {
  // Identidade visual
  tabelaSupabase: string;       // ex: "conversas_copy"
  sidebarLabel: string;         // ex: "Nova Copy"
  headerLabel: string;          // ex: "Copy Engine"
  placeholder: string;          // ex: "Descreva a copy que você precisa..."
  showCopyButton?: boolean;      // mostra botão "Copiar" nas msgs da IA
  copyButtonLabel?: string;      // ex: "Copiar copy"

  // Slots de customização
  headerRight?: React.ReactNode;        // dropdown de tipo (copy/roteiro)
  headerBottom?: React.ReactNode;       // métricas (studio)
  sidebarTop?: React.ReactNode;         // abas copy/roteiro
  emptyState?: React.ReactNode;         // empty state customizado
  extraData?: Record<string, any>;      // dados extras para o endpoint

  // Endpoint da IA e builder de payload
  endpoint: string;
  buildPayload: (input: string, msgs: Mensagem[], extra: Record<string, any>) => Record<string, any>;
  extractReply: (data: any) => string;
}

function parseMensagens(raw: any): Mensagem[] {
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [];
  }
}

export default function ChatShell({
  tabelaSupabase,
  sidebarLabel,
  headerLabel,
  placeholder,
  showCopyButton = false,
  copyButtonLabel = "Copiar",
  headerRight,
  headerBottom,
  sidebarTop,
  emptyState,
  extraData = {},
  endpoint,
  buildPayload,
  extractReply,
}: ChatShellProps) {
  const supabase = getSupabase();
  const [conversas, setConversas]         = useState<Conversa[]>([]);
  const [conversaAtual, setConversaAtual] = useState<Conversa | null>(null);
  const [mensagens, setMensagens]         = useState<Mensagem[]>([]);
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [copied, setCopied]               = useState<number | null>(null);
  const messagesEndRef                    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const carregarConversas = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from(tabelaSupabase)
      .select("*")
      .eq("user_id", user.id)
      .order("data_criacao", { ascending: false });
    if (data) {
      setConversas(data.map((c: Conversa) => ({ ...c, mensagens: parseMensagens(c.mensagens) })));
    }
  }, [supabase, tabelaSupabase]);

  useEffect(() => { carregarConversas(); }, [carregarConversas]);

  const novaConversa = () => { setConversaAtual(null); setMensagens([]); setInput(""); };
  const carregarConversa = (conv: Conversa) => { setConversaAtual(conv); setMensagens(conv.mensagens); };

  const deletarConversa = async (id: number) => {
    if (!confirm("Deletar esta conversa?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from(tabelaSupabase).delete().eq("id", id).eq("user_id", user.id);
    setConversas(prev => prev.filter(c => c.id !== id));
    if (conversaAtual?.id === id) novaConversa();
  };

  const salvarConversa = async (msgs: Mensagem[]) => {
    const titulo = msgs[0]?.content.substring(0, 50) || sidebarLabel;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      if (conversaAtual) {
        const { data } = await supabase
          .from(tabelaSupabase)
          .update({ mensagens: JSON.stringify(msgs) })
          .eq("id", conversaAtual.id)
          .select().single();
        if (data) setConversas(prev => prev.map(c => c.id === data.id ? { ...data, mensagens: msgs } : c));
      } else {
        const { data, error } = await supabase
          .from(tabelaSupabase)
          .insert([{ titulo, mensagens: JSON.stringify(msgs), data_criacao: new Date().toISOString(), user_id: user.id, ...extraData }])
          .select().single();
        if (data && !error) {
          const nc: Conversa = { ...data, mensagens: msgs };
          setConversaAtual(nc);
          setConversas(prev => [nc, ...prev]);
        }
      }
    } catch (e) { console.error("salvarConversa:", e); }
  };

  const copiarTexto = (texto: string, idx: number) => {
    navigator.clipboard.writeText(texto);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const enviarMensagem = async () => {
    if (!input.trim() || loading) return;
    const mensagemUser: Mensagem = { role: "user", content: input, timestamp: new Date() };
    const novasMensagens = [...mensagens, mensagemUser];
    setMensagens(novasMensagens);
    const pergunta = input;
    setInput("");
    setLoading(true);
    try {
      const payload = buildPayload(pergunta, novasMensagens, extraData);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const resText = await res.text();
      let data: any;
      try { data = JSON.parse(resText); } catch { data = { error: "Resposta inválida da API." }; }
      const reply = extractReply(data);
      const respostaIA: Mensagem = { role: "assistant", content: reply, timestamp: new Date() };
      const finais = [...novasMensagens, respostaIA];
      setMensagens(finais);
      await salvarConversa(finais);
    } catch {
      setMensagens(prev => [...prev, { role: "assistant", content: "❌ Erro ao gerar resposta.", timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarMensagem(); }
  };

  return (
    <div className="flex h-screen bg-[#060608] text-white overflow-hidden font-sans">
      <Sidebar />

      {/* ── History Sidebar ── */}
      <aside className="w-64 ml-24 border-r border-white/[0.04] bg-[#040406] flex flex-col">
        {sidebarTop && (
          <div className="border-b border-white/[0.04]">{sidebarTop}</div>
        )}
        <div className="p-3 border-b border-white/[0.04]">
          <button onClick={novaConversa}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            <Plus size={13} /> {sidebarLabel}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {conversas.length > 0 ? conversas.map(conv => (
            <div key={conv.id} onClick={() => carregarConversa(conv)}
              className={`group relative p-3.5 rounded-xl cursor-pointer transition-all border ${conversaAtual?.id === conv.id ? "bg-purple-600/10 border-purple-500/20" : "bg-transparent hover:bg-white/[0.02] border-transparent hover:border-white/[0.05]"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white/80 truncate mb-0.5">{conv.titulo}</p>
                  <p className="text-[10px] text-gray-700">{new Date(conv.data_criacao).toLocaleDateString("pt-BR")}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); deletarConversa(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 rounded-lg transition-all" aria-label="Deletar">
                  <Trash2 size={12} className="text-red-500/60" />
                </button>
              </div>
            </div>
          )) : (
            <div className="text-center py-16 text-gray-700">
              <MessageSquare size={28} className="mx-auto mb-2 opacity-20" />
              <p className="text-[10px] font-semibold uppercase tracking-widest">Nenhum histórico</p>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-8 py-4 border-b border-white/[0.04] bg-[#040406] shrink-0">
          <div className="flex items-center justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] font-semibold text-gray-700 tracking-widest uppercase">{headerLabel}</p>
                <div className="flex items-center gap-1.5 bg-emerald-500/[0.08] border border-emerald-500/15 px-2 py-0.5 rounded-full">
                  <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-semibold text-emerald-400">Online</span>
                </div>
              </div>
              <h1 className="text-xl font-black italic tracking-tight uppercase truncate">
                {conversaAtual ? conversaAtual.titulo : <span className="text-gray-600">{sidebarLabel}</span>}
              </h1>
            </div>
            {headerRight}
          </div>
          {headerBottom}
        </header>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {mensagens.length === 0 ? (
            emptyState ?? (
              <div className="h-full flex items-center justify-center">
                <p className="text-white/20 text-sm">Faça uma pergunta para começar.</p>
              </div>
            )
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              {mensagens.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center shrink-0 shadow-[0_0_14px_rgba(168,85,247,0.3)]">
                      <Sparkles size={14} />
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5 max-w-lg">
                    <div className={`px-5 py-3.5 rounded-2xl ${msg.role === "user" ? "bg-purple-600 text-white rounded-tr-sm" : "bg-[#0e0e10] border border-white/[0.06] text-gray-200 rounded-tl-sm"}`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-[9px] text-white/20 mt-1.5 font-mono">{msg.timestamp.toLocaleTimeString("pt-BR")}</p>
                    </div>
                    {showCopyButton && msg.role === "assistant" && (
                      <button onClick={() => copiarTexto(msg.content, idx)}
                        className={`self-end flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[10px] font-semibold transition-all ${copied === idx ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/[0.03] border-white/[0.06] text-gray-600 hover:bg-purple-600/[0.08] hover:border-purple-500/20 hover:text-purple-400"}`}>
                        <CopyIcon size={11} />
                        {copied === idx ? "Copiado!" : copyButtonLabel}
                      </button>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 font-bold text-[10px] text-gray-600">VC</div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center shrink-0">
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                  <div className="px-5 py-3.5 rounded-2xl rounded-tl-sm bg-[#0e0e10] border border-white/[0.06] flex items-center gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-8 py-4 border-t border-white/[0.04] bg-[#040406] shrink-0">
          <div className="max-w-2xl mx-auto relative">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full bg-[#0e0e10] border border-white/[0.08] focus:border-purple-500/40 rounded-2xl py-3.5 px-5 pr-14 text-sm text-white placeholder-gray-700 outline-none resize-none transition-all"
              rows={1}
              disabled={loading}
            />
            <button
              onClick={enviarMensagem}
              disabled={loading || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-white/[0.04] disabled:cursor-not-allowed text-white rounded-xl transition-all hover:shadow-[0_0_14px_rgba(168,85,247,0.4)]"
              aria-label="Enviar">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-700 mt-2">Shift + Enter para nova linha</p>
        </div>
      </main>
    </div>
  );
}