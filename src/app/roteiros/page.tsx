"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  MessageSquare, Send, Plus, Trash2, Loader2, Copy as CopyIcon,
  Zap, BarChart3, BrainCircuit, PenTool, Settings,
  Sparkles, ChevronRight, Video, Film, Clock
} from "lucide-react";
import Link from "next/link";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

interface Mensagem {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Conversa {
  id: number;
  titulo: string;
  mensagens: Mensagem[];
  data_criacao: string;
}

// --- COMPONENTE DO LINK LATERAL ---
function SideLink({ href, icon, active, label }: { href: string, icon: any, active?: boolean, label: string }) {
  return (
    <Link href={href} className="group relative flex flex-col items-center">
      <div className={`
        p-4 rounded-2xl transition-all duration-500 relative z-10
        ${active 
          ? 'bg-purple-600 text-white shadow-[0_0_25px_rgba(168,85,247,0.5)]' 
          : 'text-gray-500 hover:text-white hover:bg-white/5'}
      `}>
        {icon}
      </div>
      <span className="absolute left-20 bg-purple-600 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none tracking-widest z-50 whitespace-nowrap">
        {label}
      </span>
      {active && (
        <div className="absolute -left-10 w-1.5 h-8 bg-purple-600 rounded-r-full shadow-[5px_0_15px_#a855f7]"></div>
      )}
    </Link>
  );
}

export default function RoteirosEnginePage() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAtual, setConversaAtual] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tipoRoteiro, setTipoRoteiro] = useState<string>("vsl_curto");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automático
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  // Carregar conversas
  useEffect(() => {
    async function carregar() {
      const { data: convData } = await supabase
        .from("conversas_roteiros")
        .select("*")
        .order('data_criacao', { ascending: false });
      
      if (convData) {
        setConversas(convData.map(c => ({
          ...c,
          mensagens: JSON.parse(c.mensagens)
        })));
      }
    }
    carregar();
  }, []);

  // Nova conversa
  const novaConversa = () => {
    setConversaAtual(null);
    setMensagens([]);
    setInput("");
  };

  // Carregar conversa antiga
  const carregarConversa = (conversa: Conversa) => {
    setConversaAtual(conversa);
    setMensagens(conversa.mensagens);
  };

  // Deletar conversa
  const deletarConversa = async (id: number) => {
    if (!confirm("Deletar este roteiro?")) return;
    
    await supabase.from("conversas_roteiros").delete().eq('id', id);
    setConversas(prev => prev.filter(c => c.id !== id));
    
    if (conversaAtual?.id === id) {
      novaConversa();
    }
  };

  // Salvar conversa
  const salvarConversa = async (msgs: Mensagem[]) => {
    const titulo = msgs[0]?.content.substring(0, 50) || "Novo roteiro";
    
    try {
      if (conversaAtual) {
        const { data } = await supabase
          .from("conversas_roteiros")
          .update({ mensagens: JSON.stringify(msgs) })
          .eq('id', conversaAtual.id)
          .select()
          .single();

        if (data) {
          const conversaAtualizada = { ...data, mensagens: msgs };
          setConversas(prev => prev.map(c => c.id === data.id ? conversaAtualizada : c));
        }
      } else {
        const { data, error } = await supabase
          .from("conversas_roteiros")
          .insert([{
            titulo,
            mensagens: JSON.stringify(msgs),
            data_criacao: new Date().toISOString()
          }])
          .select()
          .single();

        if (data && !error) {
          const novaConv: Conversa = {
            id: data.id,
            titulo: data.titulo,
            mensagens: msgs,
            data_criacao: data.data_criacao
          };
          setConversaAtual(novaConv);
          setConversas(prev => [novaConv, ...prev]);
        }
      }
    } catch (e: any) {
      // Silencioso
    }
  };

  // Copiar texto
  const copiarTexto = (texto: string) => {
    navigator.clipboard.writeText(texto);
    alert("✅ Roteiro copiado!");
  };

  // Enviar mensagem
  const enviarMensagem = async () => {
    if (!input.trim() || loading) return;

    const mensagemUser: Mensagem = {
      role: "user",
      content: input,
      timestamp: new Date()
    };

    const novasMensagens = [...mensagens, mensagemUser];
    setMensagens(novasMensagens);
    setInput("");
    setLoading(true);

    try {
      const contexto = `
Você é um ROTEIRISTA EXPERT especializado em vídeos de ALTA CONVERSÃO.

TIPO DE ROTEIRO: ${tipoRoteiro.toUpperCase().replace('_', ' ')}

HISTÓRICO DA CONVERSA:
${novasMensagens.slice(-5).map(m => `${m.role === 'user' ? 'Cliente' : 'Você'}: ${m.content}`).join('\n')}

MISSÃO:
Criar roteiros 100% HUMANIZADOS que:
- Prendem atenção nos primeiros 3 segundos
- Contam histórias que geram conexão emocional
- Quebram objeções naturalmente
- Levam à ação sem ser agressivo
- Soam NATURAIS, como uma conversa real

Responda de forma CONVERSACIONAL e entregue roteiro PRONTO PARA GRAVAR.
`;

      const res = await fetch("/api/ai-roteirista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          mensagemUsuario: input,
          tipoRoteiro: tipoRoteiro,
          contexto: contexto
        }),
      });

      const data = await res.json();
      const respostaIA: Mensagem = {
        role: "assistant",
        content: data.roteiro || data.error || "Desculpe, ocorreu um erro.",
        timestamp: new Date()
      };

      const mensagensFinais = [...novasMensagens, respostaIA];
      setMensagens(mensagensFinais);
      
      // Salvar no banco
      await salvarConversa(mensagensFinais);

    } catch (e) {
      const erroMsg: Mensagem = {
        role: "assistant",
        content: "❌ Erro ao gerar roteiro. Tente novamente.",
        timestamp: new Date()
      };
      setMensagens(prev => [...prev, erroMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Enter para enviar
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem();
    }
  };

  return (
    <div className="flex h-screen bg-[#020202] text-white overflow-hidden font-sans">
      
      {/* SIDEBAR FIXA */}
      <aside className="w-24 border-r border-white/[0.03] flex flex-col items-center py-10 fixed h-full bg-black/40 backdrop-blur-3xl z-50">
        <div className="mb-16 text-3xl font-black italic text-purple-600 tracking-tighter">E.</div>
        <nav className="flex flex-col gap-8 flex-1">
          <SideLink href="/pulse" icon={<Zap size={22}/>} label="Pulse" />
          <SideLink href="/dados" icon={<BarChart3 size={22}/>} label="Dados" />
          <SideLink href="/studio" icon={<BrainCircuit size={22}/>} label="Studio IA" />
          <SideLink href="/copy" icon={<PenTool size={22}/>} label="Copy Engine" />
          <SideLink href="/roteiros" icon={<MessageSquare size={22}/>} active={true} label="Script Engine" />
          <SideLink href="/settings" icon={<Settings size={22}/>} label="Settings" />
        </nav>
      </aside>

      {/* HISTÓRICO SIDEBAR */}
      <aside className="w-80 ml-24 border-r border-white/5 bg-[#050505]/50 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <button
            onClick={novaConversa}
            className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase text-[10px] tracking-widest rounded-[20px] flex items-center justify-center gap-2 transition-all"
          >
            <Plus size={16} />
            Novo Roteiro
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {conversas.length > 0 ? (
            conversas.map((conv) => (
              <div
                key={conv.id}
                className={`group relative p-4 rounded-[20px] cursor-pointer transition-all ${
                  conversaAtual?.id === conv.id
                    ? 'bg-purple-600/20 border-2 border-purple-500'
                    : 'bg-white/5 hover:bg-white/10 border-2 border-transparent'
                }`}
                onClick={() => carregarConversa(conv)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-white truncate mb-1">
                      {conv.titulo}
                    </p>
                    <p className="text-[9px] text-gray-500 font-medium">
                      {new Date(conv.data_criacao).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletarConversa(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-600/20 rounded-lg transition-all"
                  >
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 text-gray-600">
              <Video size={40} className="mx-auto mb-4 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">
                Nenhum roteiro
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* ÁREA DE CHAT */}
      <main className="flex-1 flex flex-col">
        
        {/* HEADER */}
        <header className="px-12 py-6 border-b border-white/5 bg-black/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <p className="text-[10px] font-black text-gray-600 tracking-[0.5em] uppercase">Growth OS / Script Engine</p>
                <div className="flex items-center gap-2 bg-purple-600/10 border border-purple-500/20 px-3 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                  <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">Llama 3.3 Online</span>
                </div>
              </div>
              <h1 className="text-4xl font-black italic tracking-tighter uppercase">
                {conversaAtual ? conversaAtual.titulo : "Novo Roteiro"}
              </h1>
            </div>

            {/* SELETOR DE TIPO DE ROTEIRO */}
            <div className="relative group min-w-[350px]">
              <div className="absolute -inset-1 bg-purple-600/20 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <select 
                value={tipoRoteiro} 
                onChange={(e) => setTipoRoteiro(e.target.value)}
                className="relative w-full bg-[#0A0A0A] border border-white/10 py-4 px-6 rounded-full text-[10px] font-black uppercase tracking-widest outline-none focus:border-purple-500 appearance-none transition-all cursor-pointer"
              >
                <option value="vsl_curto" className="bg-[#0A0A0A]">🎬 VSL CURTO (30-60s)</option>
                <option value="vsl_medio" className="bg-[#0A0A0A]">🎥 VSL MÉDIO (2-5min)</option>
                <option value="vsl_longo" className="bg-[#0A0A0A]">📽️ VSL LONGO (10-20min)</option>
                <option value="ugc" className="bg-[#0A0A0A]">📱 UGC (User Generated)</option>
                <option value="storytelling" className="bg-[#0A0A0A]">📖 STORYTELLING</option>
                <option value="tutorial" className="bg-[#0A0A0A]">🎓 TUTORIAL/EDUCATIVO</option>
                <option value="gancho" className="bg-[#0A0A0A]">🪝 GANCHO VIRAL</option>
              </select>
              <ChevronRight size={14} className="absolute right-6 top-1/2 -translate-y-1/2 text-purple-600 pointer-events-none rotate-90" />
            </div>
          </div>
        </header>

        {/* MENSAGENS */}
        <div className="flex-1 overflow-y-auto px-12 py-8">
          {mensagens.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="relative mb-8">
                <div className="absolute -inset-10 bg-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
                <Film size={100} className="relative text-purple-500/20" />
              </div>
              <h2 className="text-2xl font-black italic text-white/80 mb-4">Que roteiro vamos criar?</h2>
              <p className="text-sm text-gray-600 font-medium max-w-md text-center mb-8">
                Roteiros 100% humanizados que convertem. Do gancho viral ao VSL completo!
              </p>
              
              {/* SUGESTÕES */}
              <div className="grid grid-cols-2 gap-4 max-w-2xl">
                {[
                  "Roteiro VSL 60s para produto digital",
                  "5 ganchos virais para Reels sobre fitness",
                  "Storytelling emocional de transformação",
                  "Tutorial passo a passo humanizado"
                ].map((sugestao, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(sugestao)}
                    className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 rounded-[20px] text-left text-sm text-gray-400 hover:text-white transition-all"
                  >
                    <ChevronRight size={14} className="inline mr-2 text-purple-500" />
                    {sugestao}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {mensagens.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                      <Sparkles size={18} />
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2 max-w-2xl">
                    <div
                      className={`p-6 rounded-[25px] ${
                        msg.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-[#0A0A0A] border border-white/10 text-gray-200'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-[9px] text-gray-500 mt-3 font-mono">
                        {msg.timestamp.toLocaleTimeString('pt-BR')}
                      </p>
                    </div>
                    
                    {/* Botão copiar só em mensagens da IA */}
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => copiarTexto(msg.content)}
                        className="self-end flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        <CopyIcon size={12} />
                        Copiar Roteiro
                      </button>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 font-black text-sm">
                      VC
                    </div>
                  )}
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                    <Loader2 size={18} className="animate-spin" />
                  </div>
                  <div className="max-w-2xl p-6 rounded-[25px] bg-[#0A0A0A] border border-white/10">
                    <p className="text-sm text-gray-400 italic">Escrevendo roteiro...</p>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* INPUT */}
        <div className="p-8 border-t border-white/5 bg-black/20">
          <div className="max-w-4xl mx-auto relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Descreva o roteiro que você precisa... (Shift+Enter para nova linha)"
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-[30px] py-5 px-8 pr-20 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500 resize-none transition-all"
              rows={1}
              disabled={loading}
            />
            <button
              onClick={enviarMensagem}
              disabled={loading || !input.trim()}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-full transition-all"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}