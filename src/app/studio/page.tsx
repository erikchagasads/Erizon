"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StudioPage() {
  // ESTADOS DE NAVEGAÇÃO
  const [activeTab, setActiveTab] = useState("home");
  const [showHistory, setShowHistory] = useState(false);
  
  // ESTADOS DE DADOS
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("data analyst");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [totals, setTotals] = useState({ spend: 0, cpa: 0, conv: 0, ctr: 0 });

  const fetchData = async () => {
    // Busca métricas no Supabase
    const { data: camps } = await supabase
      .from("metricas_ads")
      .select("*")
      .order("created_at", { ascending: false });

    if (camps) {
      setCampaigns(camps);
      const s = camps.reduce((acc, curr) => acc + (Number(curr.gasto_total) || 0), 0);
      const c = camps.reduce((acc, curr) => acc + (Number(curr.conversoes) || 0), 0);
      const ctrAvg = camps.length > 0 
        ? camps.reduce((acc, curr) => acc + (Number(curr.ctr) || 0), 0) / camps.length 
        : 0;
      
      setTotals({ spend: s, cpa: c > 0 ? s / c : 0, conv: c, ctr: ctrAvg });
    }

    // Busca histórico da IA
    const { data: hist } = await supabase
      .from("historico")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (hist) setHistory(hist);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('realtime-studio')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'metricas_ads' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleExecute = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: `DADOS: Gasto R$${totals.spend}, CPA R$${totals.cpa.toFixed(2)}. PERGUNTA: ${prompt}`, 
          category 
        }),
      });
      const data = await res.json();
      setResponse(data.text);
      fetchData();
    } catch (e) { 
      setResponse("Erro na análise."); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden antialiased font-sans">
      
      {/* MENU LATERAL ULTRA SLIM */}
      <nav className="w-20 border-r border-white/5 bg-black flex flex-col items-center py-10 z-20">
        <div className="text-purple-600 font-black text-xl italic mb-12 tracking-tighter">E.</div>
        <div className="flex flex-col gap-10 w-full">
          <NavButton icon="🏠" label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavButton icon="📊" label="Dados" active={activeTab === 'campaigns'} onClick={() => setActiveTab('campaigns')} />
          <NavButton icon="🧠" label="Studio" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
        </div>
      </nav>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto relative bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent">
        
        {/* HEADER */}
        <header className="flex justify-between items-center p-8 sticky top-0 bg-[#050505]/80 backdrop-blur-md z-10 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]"></div>
            <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-gray-500">Intelligence Active</span>
          </div>
          <button 
            onClick={() => setShowHistory(!showHistory)} 
            className="text-[9px] font-bold uppercase tracking-widest px-5 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-purple-600 transition-all"
          >
            {showHistory ? "Ocultar Memória" : "Memória Estratégica"}
          </button>
        </header>

        <div className="max-w-5xl mx-auto p-12">
          
          {/* ABA 1: HOME */}
          {activeTab === "home" && (
            <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="max-w-2xl">
                <h1 className="text-6xl font-extralight tracking-tighter italic leading-[1.1]">
                  Bem-vindo à <span className="text-purple-600 font-normal">Home.</span>
                </h1>
                <p className="mt-6 text-gray-500 text-lg font-light leading-relaxed italic">
                  Analisando <span className="text-white border-b border-purple-500/50">{campaigns.length} campanhas</span> em tempo real.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <MetricCard label="Investimento" value={`R$ ${totals.spend.toLocaleString('pt-BR')}`} />
                <MetricCard label="CPA Médio" value={`R$ ${totals.cpa.toFixed(2)}`} active />
                <MetricCard label="Conversões" value={totals.conv} />
                <MetricCard label="CTR Global" value={`${totals.ctr.toFixed(2)}%`} />
              </div>
            </div>
          )}

          {/* ABA 2: CAMPANHAS */}
          {activeTab === "campaigns" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h2 className="text-[10px] font-bold tracking-[0.5em] text-gray-600 uppercase mb-8">Performance Detalhada</h2>
              {campaigns.length > 0 ? campaigns.map((c, i) => (
                <div key={i} className="group bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex items-center justify-between hover:border-purple-500/30 transition-all">
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] text-purple-500 font-bold uppercase tracking-widest">Asset Ativo</span>
                    <h3 className="text-base font-light">{c.nome_campanha || "Geral"}</h3>
                  </div>
                  <div className="flex gap-12 text-right">
                    <div className="flex flex-col font-mono">
                      <span className="text-[8px] text-gray-600 uppercase">Gasto</span>
                      <span className="text-sm tracking-tighter text-white">R${c.gasto_total}</span>
                    </div>
                    <div className="flex flex-col font-mono">
                      <span className="text-[8px] text-gray-600 uppercase">CPA</span>
                      <span className="text-sm tracking-tighter text-purple-400">R${c.cpa}</span>
                    </div>
                    <div className="flex flex-col font-mono">
                      <span className="text-[8px] text-gray-600 uppercase">Conv.</span>
                      <span className="text-sm tracking-tighter text-white">{c.conversoes}</span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="p-20 border border-dashed border-white/10 rounded-3xl text-center text-gray-600 italic">
                  Nenhum dado sincronizado hoje.
                </div>
              )}
            </div>
          )}

          {/* ABA 3: STUDIO (AI) */}
          {activeTab === "ai" && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="flex gap-6 border-b border-white/5 pb-4">
                {['copywriting', 'data analyst', 'roteiros'].map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setCategory(cat)} 
                    className={`text-[10px] font-bold uppercase tracking-widest transition-all ${category === cat ? 'text-purple-500 border-b border-purple-500' : 'text-gray-600 hover:text-white'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <textarea 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)} 
                placeholder="Insira o comando estratégico..." 
                className="w-full h-48 bg-transparent text-3xl font-extralight tracking-tight focus:outline-none placeholder:text-gray-900 resize-none" 
              />
              <button 
                onClick={handleExecute} 
                disabled={loading} 
                className="w-full p-6 bg-white text-black rounded-full font-bold uppercase tracking-[0.5em] text-[10px] hover:bg-purple-600 hover:text-white transition-all disabled:opacity-20"
              >
                {loading ? "Processando..." : "Executar Consultoria"}
              </button>
              {response && (
                <div className="mt-12 pt-12 border-t border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                   <p className="text-purple-500 text-[9px] font-bold uppercase tracking-[0.5em] mb-6">Insight Gerado</p>
                   <div className="text-gray-300 text-xl font-extralight italic leading-relaxed whitespace-pre-wrap">{response}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* GAVETA LATERAL DIREITA: HISTÓRICO */}
      {showHistory && (
        <aside className="w-80 border-l border-white/5 bg-black/90 backdrop-blur-xl animate-in slide-in-from-right duration-300 z-30">
          <div className="p-8">
            <h2 className="text-[10px] font-bold tracking-[0.4em] text-purple-500 uppercase mb-10">Memória de Dados</h2>
            <div className="space-y-8">
              {history.map((h, i) => (
                <div key={i} className="group cursor-pointer border-b border-white/5 pb-6" onClick={() => { setPrompt(h.prompt); setResponse(h.resposta); setActiveTab('ai'); }}>
                  <p className="text-[8px] text-gray-600 font-mono mb-2 uppercase">{new Date(h.created_at).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-400 group-hover:text-white transition-colors line-clamp-2 leading-relaxed font-light">{h.prompt}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

// SUB-COMPONENTES
function NavButton({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`relative flex flex-col items-center gap-2 w-full py-2 transition-all ${active ? 'text-purple-500' : 'text-gray-600 hover:text-gray-300'}`}>
      <span className={`text-xl ${active ? 'scale-110' : 'scale-100'} transition-transform`}>{icon}</span>
      <span className="text-[8px] font-bold uppercase tracking-[0.2em]">{label}</span>
      {active && <div className="absolute left-0 w-[2px] h-6 bg-purple-500 rounded-r-full shadow-[0_0_12px_#7c3aed]"></div>}
    </button>
  );
}

function MetricCard({ label, value, active }: any) {
  return (
    <div className={`p-8 rounded-3xl border transition-all ${active ? 'border-purple-500/30 bg-purple-500/[0.02]' : 'border-white/5 bg-white/[0.01]'}`}>
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-4">{label}</p>
      <p className="text-3xl font-extralight tracking-tighter">{value}</p>
    </div>
  );
}