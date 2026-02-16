"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  PenTool, Send, Plus, Trash2, Loader2, Copy as CopyIcon,
  Zap, BarChart3, MessageSquare, BrainCircuit, Settings,
  Sparkles, ChevronRight, Target, TrendingUp, Flame
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

export default function CopyEnginePage() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAtual, setConversaAtual] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tipoCopy, setTipoCopy] = useState<string>("headline");
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
        .from("conversas_copy")
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
    if (!confirm("Deletar esta conversa?")) return;
    
    await supabase.from("conversas_copy").delete().eq('id', id);
    setConversas(prev => prev.filter(c => c.id !== id));
    
    if (conversaAtual?.id === id) {
      novaConversa();
    }
  };

  // Salvar conversa
  const salvarConversa = async (msgs: Mensagem[]) => {
    const titulo = msgs[0]?.content.substring(0, 50) || "Nova copy";
    
    try {
      if (conversaAtual) {
        const { data } = await supabase
          .from("conversas_copy")
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
          .from("conversas_copy")
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
    alert("✅ Copy copiada!");
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
      // Contexto para copywriting
      const contexto = `
Você é um COPYWRITER ESPECIALISTA de nível MUNDIAL, expert em:
- Direct Response
- Storytelling persuasivo
- Ganchos virais
- Headlines magnéticas
- CTAs irresistíveis
- Copy para anúncios (Meta Ads, Google Ads)
- VSL (Video Sales Letters)
- Emails de vendas

TIPO DE COPY SOLICITADO: ${tipoCopy.toUpperCase()}

HISTÓRICO DA CONVERSA:
${novasMensagens.slice(-5).map(m => `${m.role === 'user' ? 'Cliente' : 'Você'}: ${m.content}`).join('\n')}

INSTRUÇÕES:
- Seja CONVERSACIONAL e CRIATIVO
- Use técnicas comprovadas de persuasão (AIDA, PAS, 4Ps, etc)
- Adapte o tom ao tipo de copy solicitado
- Se for headline: crie 5-10 opções diferentes
- Se for CTA: crie variações testáveis
- Se for body copy: estruture com quebras de objeção
- Use emojis quando apropriado
- SEMPRE entregue conteúdo PRONTO PARA USO

Responda AGORA:
`;

      const res = await fetch("/api/ai-copywriter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          mensagemUsuario: input,
          tipoCopy: tipoCopy,
          contexto: contexto
        }),
      });

      const data = await res.json();
      const respostaIA: Mensagem = {
        role: "assistant",
        content: data.copy || data.error || "Desculpe, ocorreu um erro.",
        timestamp: new Date()
      };

      const mensagensFinais = [...novasMensagens, respostaIA];
      setMensagens(mensagensFinais);
      
      // Salvar no banco
      await salvarConversa(mensagensFinais);

    } catch (e) {
      const erroMsg: Mensagem = {
        role: "assistant",
        content: "❌ Erro ao gerar copy. Tente novamente.",
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
          <SideLink href="/copy" icon={<PenTool size={22}/>} active={true} label="Copy Engine" />
          <SideLink href="/roteiros" icon={<MessageSquare size={22}/>} label="Roteiros" />
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
            Nova Copy
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
              <PenTool size={40} className="mx-auto mb-4 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">
                Nenhuma copy
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
                <p className="text-[10px] font-black text-gray-600 tracking-[0.5em] uppercase">Growth OS / Copy Engine</p>
                <div className="flex items-center gap-2 bg-purple-600/10 border border-purple-500/20 px-3 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                  <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">Llama 3.3 Online</span>
                </div>
              </div>
              <h1 className="text-4xl font-black italic tracking-tighter uppercase">
                {conversaAtual ? conversaAtual.titulo : "Nova Copy"}
              </h1>
            </div>

            {/* SELETOR DE TIPO DE COPY */}
            <div className="relative group min-w-[300px]">
              <div className="absolute -inset-1 bg-purple-600/20 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <select 
                value={tipoCopy} 
                onChange={(e) => setTipoCopy(e.target.value)}
                className="relative w-full bg-[#0A0A0A] border border-white/10 py-4 px-6 rounded-full text-[10px] font-black uppercase tracking-widest outline-none focus:border-purple-500 appearance-none transition-all cursor-pointer"
              >
                <option value="headline" className="bg-[#0A0A0A]">📰 HEADLINE</option>
                <option value="cta" className="bg-[#0A0A0A]">🎯 CTA</option>
                <option value="body_ad" className="bg-[#0A0A0A]">📱 BODY ANÚNCIO</option>
                <option value="vsl" className="bg-[#0A0A0A]">🎬 VSL</option>
                <option value="email" className="bg-[#0A0A0A]">📧 EMAIL</option>
                <option value="landing_page" className="bg-[#0A0A0A]">🌐 LANDING PAGE</option>
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
                <PenTool size={100} className="relative text-purple-500/20" />
              </div>
              <h2 className="text-2xl font-black italic text-white/80 mb-4">Que copy vamos criar hoje?</h2>
              <p className="text-sm text-gray-600 font-medium max-w-md text-center mb-8">
                Headlines magnéticas, CTAs irresistíveis, bodys persuasivos... tudo pronto pra usar!
              </p>
              
              {/* SUGESTÕES */}
              <div className="grid grid-cols-2 gap-4 max-w-2xl">
                {[
                  "10 headlines para anúncio de lead magnet",
                  "CTA que gera urgência sem ser agressivo",
                  "Body para anúncio de infoproduto",
                  "Email de boas-vindas persuasivo"
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
                        Copiar
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
                    <p className="text-sm text-gray-400 italic">Criando copy...</p>
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
              placeholder="Descreva a copy que você precisa... (Shift+Enter para nova linha)"
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