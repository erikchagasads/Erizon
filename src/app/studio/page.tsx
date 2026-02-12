"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Inicializa o cliente Supabase no Frontend
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StudioPage() {
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("copywriting");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // 1. Função para buscar histórico do banco
  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from("historico")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) setHistory(data);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // 2. Função para o Botão Executar
  const handleExecute = async () => {
    if (!prompt) return;
    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, category }),
      });

      const data = await res.json();
      setResponse(data.text);
      fetchHistory(); // Atualiza a lista lateral após a resposta
    } catch (error) {
      setResponse("Erro ao processar comando.");
    } finally {
      setLoading(false);
    }
  };

  // 3. FUNÇÃO QUE VOCÊ PEDIU: Clicar no card e abrir a conversa
  const handleSelectHistory = (item: any) => {
    setPrompt(item.prompt);
    setResponse(item.resposta);
    setCategory(item.categoria || "copywriting");
    // Feedback visual opcional: rolar para cima se estiver no mobile
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
      
      {/* BARRA LATERAL: RECENT MEMORY */}
      <aside className="w-80 border-r border-white/10 bg-black/40 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xs font-bold tracking-[0.2em] text-purple-500 uppercase">
            Recent Memory
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {history.length === 0 && (
            <p className="p-6 text-gray-500 text-sm">Nenhum registro encontrado.</p>
          )}
          {history.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelectHistory(item)}
              className="p-5 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all group"
            >
              <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">
                {item.categoria}
              </span>
              <h3 className="text-sm mt-1 text-gray-300 group-hover:text-white truncate">
                {item.prompt}
              </h3>
              <p className="text-[10px] text-gray-600 mt-2 italic">
                {new Date(item.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-12 bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a]">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <header>
            <h1 className="text-4xl font-light tracking-tighter italic">ERIZON<span className="text-purple-600">.STUDIO</span></h1>
            <p className="text-gray-500 text-sm mt-2">Growth OS for High Performance Teams.</p>
          </header>

          {/* INPUT AREA */}
          <section className="space-y-4">
            <div className="flex gap-4">
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-black border border-white/10 p-3 rounded-lg text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="copywriting">Copywriting</option>
                <option value="data analyst">Data Analyst</option>
                <option value="roteiros">Roteiros</option>
              </select>
              
              <button 
                onClick={() => { setPrompt(""); setResponse(""); }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Limpar Tela
              </button>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Digite seu comando estratégico..."
              className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 text-lg focus:outline-none focus:border-purple-500 transition-all placeholder:text-gray-700 resize-none"
            />

            <button
              onClick={handleExecute}
              disabled={loading}
              className={`w-full p-4 rounded-2xl font-bold tracking-widest uppercase text-sm transition-all ${
                loading ? "bg-gray-800 text-gray-500" : "bg-white text-black hover:bg-purple-600 hover:text-white shadow-lg shadow-purple-500/20"
              }`}
            >
              {loading ? "Processando..." : "Executar Comando"}
            </button>
          </section>

          {/* OUTPUT AREA */}
          {response && (
            <section className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="p-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-3xl">
                <div className="bg-[#0f0f0f] rounded-[22px] p-8">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mb-6">Output Data</h4>
                  <div className="prose prose-invert max-w-none text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {response}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}