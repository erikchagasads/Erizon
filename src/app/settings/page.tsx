"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { 
  Zap, BarChart3, Settings, Plus, Trash2, BrainCircuit, 
  ShieldCheck, Activity, ChevronDown, Target 
} from "lucide-react";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function SettingsPage() {
  const [monitorados, setMonitorados] = useState<any[]>([]);
  const [campanhasDisponiveis, setCampanhasDisponiveis] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState({ nome_cliente: "", cpc_max: 2.0, cpa_meta: 10.0 });

  useEffect(() => { 
    loadMonitorados();
    fetchCampanhasReais();
  }, []);

  async function fetchCampanhasReais() {
    try {
      setLoading(true);
      // Tenta buscar da tabela confirmada no seu SQL Discovery
      const { data } = await supabase.from("metricas_ads").select("nome_campanha");
      if (data) {
        const nomesUnicos = Array.from(new Set(data.map(item => item.nome_campanha)))
          .filter(nome => nome !== null && nome !== "")
          .sort() as string[];
        setCampanhasDisponiveis(nomesUnicos);
      }
    } catch (err) {
      console.error("Erro seletor:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMonitorados() {
    try {
      // Busca simplificada para evitar o erro do console {}
      const { data, error } = await supabase
        .from("clientes_config")
        .select("*");

      if (error) {
        console.error("Erro Supabase:", error.message);
        return;
      }

      setMonitorados(data || []);
    } catch (err) {
      console.error("Erro fatal ao carregar lateral:", err);
    }
  }

  async function save() {
    if(!novo.nome_cliente) return alert("Selecione uma campanha!");
    
    const { error } = await supabase.from("clientes_config").insert([{
      nome_cliente: novo.nome_cliente,
      cpc_max: novo.cpc_max,
      cpa_meta: novo.cpa_meta
    }]);

    if (error) {
      alert(`Erro: ${error.message}`);
    } else {
      setNovo({ nome_cliente: "", cpc_max: 2.0, cpa_meta: 10.0 });
      await loadMonitorados(); // Atualiza a lateral na hora
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("clientes_config").delete().eq("id", id);
    if (!error) loadMonitorados();
  }

  return (
    <div className="flex h-screen bg-[#020202] text-white overflow-hidden font-sans text-left">
      <aside className="w-[80px] border-r border-white/5 flex flex-col items-center py-10 gap-8 bg-[#050505] shrink-0">
        <div className="text-purple-600 font-black italic text-2xl uppercase">E.</div>
        <nav className="flex flex-col gap-8 items-center">
          <Link href="/pulse" className="p-4 text-gray-600 hover:text-purple-500"><Zap size={22} /></Link>
          <Link href="/dados" className="p-4 text-gray-600 hover:text-blue-400"><BarChart3 size={22} /></Link>
          <Link href="/studio" className="p-4 text-gray-600 hover:text-purple-500"><BrainCircuit size={22} /></Link>
          <div className="p-4 text-purple-500 bg-purple-600/10 rounded-2xl border border-purple-500/20"><Settings size={22} /></div>
        </nav>
      </aside>

      <div className="flex-1 p-12 overflow-y-auto">
        <header className="mb-12 max-w-4xl">
          <h1 className="text-purple-600 font-black italic text-5xl uppercase mb-4 tracking-tighter">Comando Central.</h1>
          <div className="bg-gradient-to-r from-purple-900/20 to-transparent border-l-4 border-purple-600 p-6 rounded-r-[20px] flex items-start gap-4">
            <Target className="text-purple-500 shrink-0" size={24} />
            <p className="text-sm text-gray-400">Configure as metas para as campanhas que a IA deve monitorar.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl">
          {/* LADO ESQUERDO: CADASTRO */}
          <div className="bg-[#080808] p-10 rounded-[40px] border border-white/5 h-fit shadow-2xl">
            <h2 className="text-[10px] font-black uppercase mb-8 opacity-70 tracking-[0.3em] text-purple-400">Novo Alvo</h2>
            <div className="space-y-8">
              <div className="relative">
                <label className="text-[10px] uppercase font-black text-gray-500 block mb-3">Campanha Ativa</label>
                <select 
                  value={novo.nome_cliente} 
                  onChange={e => setNovo({...novo, nome_cliente: e.target.value})}
                  className="w-full bg-black border border-white/10 p-5 rounded-2xl text-sm outline-none text-white appearance-none"
                >
                  <option value="">{loading ? "Carregando..." : "Selecione..."}</option>
                  {campanhasDisponiveis.map(nome => (
                    <option key={nome} value={nome} className="bg-[#080808]">{nome}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-black/40 p-4 rounded-3xl border border-white/[0.03]">
                  <label className="text-[9px] font-black text-gray-600 block mb-2">CPA META</label>
                  <input type="number" value={novo.cpa_meta} onChange={e => setNovo({...novo, cpa_meta: parseFloat(e.target.value)})} className="bg-transparent w-full font-bold outline-none" />
                </div>
                <div className="bg-black/40 p-4 rounded-3xl border border-white/[0.03]">
                  <label className="text-[9px] font-black text-gray-600 block mb-2">CPC TETO</label>
                  <input type="number" value={novo.cpc_max} onChange={e => setNovo({...novo, cpc_max: parseFloat(e.target.value)})} className="bg-transparent w-full font-bold outline-none" />
                </div>
              </div>
              <button onClick={save} className="w-full bg-white text-black py-6 rounded-[25px] font-black uppercase text-xs hover:bg-purple-600 hover:text-white transition-all">
                Ativar Monitoramento IA
              </button>
            </div>
          </div>

          {/* LADO DIREITO: LISTA DE PROJETOS (O QUE VOCÊ QUER) */}
          <div className="space-y-4">
            <h2 className="text-[10px] font-black uppercase opacity-50 tracking-[0.3em] flex items-center gap-2 mb-4">
              <Activity size={16} className="text-green-500" /> Ativos em Análise
            </h2>
            
            {monitorados.length > 0 ? monitorados.map(c => (
              <div key={c.id} className="bg-[#080808] p-6 rounded-[30px] flex justify-between items-center border border-white/[0.03] hover:border-purple-500/30 transition-all group">
                <div>
                  <h3 className="font-black uppercase text-xs mb-2 text-gray-300">{c.nome_cliente || "Sem Nome"}</h3>
                  <div className="flex gap-3">
                    <span className="text-[9px] text-green-500 font-black italic">CPA R$ {c.cpa_meta}</span>
                    <span className="text-[9px] text-red-500 font-black italic">CPC R$ {c.cpc_max}</span>
                  </div>
                </div>
                <button onClick={() => remove(c.id)} className="p-3 text-gray-800 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                  <Trash2 size={18} />
                </button>
              </div>
            )) : (
              <div className="border-2 border-dashed border-white/5 p-16 rounded-[40px] opacity-20 text-center text-[10px] font-black uppercase">
                Nenhum projeto monitorado.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}