"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Inicializa o Supabase no Client (Use suas variáveis do .env)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StudioPage() {
  const [prompt, setPrompt] = useState("");
  const [resposta, setResposta] = useState("");
  const [loading, setLoading] = useState(false);
  const [categoria, setCategoria] = useState("copywriting"); // Categoria padrão
  const [historico, setHistorico] = useState<any[]>([]);

  // 1. Carregar histórico do Supabase
  const carregarHistorico = async () => {
    const { data, error } = await supabase
      .from("historico")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    if (!error) setHistorico(data);
  };

  useEffect(() => {
    carregarHistorico();
  }, []);

  // 2. Executar Comando da IA
  const executarIA = async () => {
    if (!prompt) return;
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, category: categoria }),
      });

      const data = await res.json();
      setResposta(data.text);
      
      // Recarrega o histórico para mostrar a nova gravação
      carregarHistorico(); 
    } catch (err) {
      console.error("Erro ao chamar IA:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans p-6 gap-6">
      
      {/* COLUNA ESQUERDA: INPUT E BOTÕES */}
      <div className="flex-1 flex flex-col gap-6">
        <h1 className="text-4xl font-black italic tracking-tighter">
          ERIZON <span className="text-purple-500">STUDIO</span>
        </h1>

        {/* Grid de Categorias */}
        <div className="grid grid-cols-2 gap-4">
          {["copywriting", "roteiros", "criativos", "data analyst"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoria(cat)}
              className={`p-4 rounded-xl border text-xs font-bold uppercase transition-all ${
                categoria === cat 
                ? "bg-purple-600 border-purple-400 text-white" 
                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Input de Texto */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`Digite seu comando para ${categoria}...`}
          className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-6 text-lg focus:outline-none focus:border-purple-500 transition-all resize-none"
        />

        <button
          onClick={executarIA}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 py-6 rounded-3xl font-black text-xl uppercase tracking-widest transition-all disabled:opacity-50"
        >
          {loading ? "PROCESSANDO..." : "EXECUTAR COMANDO"}
        </button>
      </div>

      {/* COLUNA DIREITA: OUTPUT E HISTÓRICO */}
      <div className="w-[400px] flex flex-col gap-6">
        
        {/* Output Data */}
        <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-6 overflow-y-auto">
          <span className="text-[10px] font-bold text-purple-400 tracking-widest uppercase block mb-4">
            OUTPUT_DATA
          </span>
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
            {resposta || "Aguardando comando..."}
          </p>
        </div>

        {/* Histórico Rápido */}
        <div className="h-[250px] bg-white/5 border border-white/10 rounded-3xl p-6">
          <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase block mb-4">
            RECENT_MEMORY
          </span>
          <div className="space-y-3 overflow-y-auto h-full pr-2">
            {historico.map((item) => (
              <div key={item.id} className="text-[11px] p-3 rounded-lg bg-white/5 border border-white/5">
                <div className="flex justify-between text-purple-500 font-bold mb-1">
                  <span>{item.categoria.toUpperCase()}</span>
                  <span className="text-gray-600 font-normal">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-400 line-clamp-1 italic">"{item.prompt}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}