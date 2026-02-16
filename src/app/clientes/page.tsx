"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Users, Plus, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const motivacionais = [
  "O tráfego flui para onde a atenção é capturada. Vamos escalar hoje?",
  "Dados vencem opiniões. Deixa a IA decidir o próximo passo.",
  "Escalar não é sobre gastar mais, é sobre converter melhor.",
  "O mercado recompensa a velocidade. O Pulse está pronto, e tu?",
  "A tua próxima campanha estrela está a um insight de distância.",
  "Gestão de tráfego é a arte de transformar cliques em património."
];

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fraseDia = motivacionais[new Date().getDate() % motivacionais.length];

  useEffect(() => {
    const fetchClientes = async () => {
      const { data } = await supabase.from("clientes_config").select("*");
      if (data) setClientes(data);
      setLoading(false);
    };
    fetchClientes();
  }, []);

  return (
    <div className="min-h-screen bg-[#020202] text-white p-6 md:p-12 font-sans">
      {/* HEADER & MOTIVAÇÃO */}
      <header className="max-w-7xl mx-auto mb-16 space-y-4">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <span className="text-purple-600 font-black italic text-2xl tracking-tighter">ERIZON REDE.</span>
            <h1 className="text-4xl font-light italic text-gray-400">Olá, <span className="text-white">Erik.</span></h1>
          </div>
          <Link href="/config" className="bg-white text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all flex items-center gap-2">
            <Plus size={14} /> Novo Cliente
          </Link>
        </div>
        
        <div className="bg-purple-600/5 border border-purple-500/10 p-6 rounded-3xl">
          <p className="text-sm italic text-purple-400 font-light tracking-wide italic">"{fraseDia}"</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-20 opacity-20 uppercase text-[10px] tracking-[0.5em]">Mapeando Rede...</div>
          ) : (
            clientes.map((cliente) => (
              <div key={cliente.id} className="group bg-[#050505] border border-white/5 p-8 rounded-[40px] hover:border-purple-500/30 transition-all relative overflow-hidden">
                <div className="flex justify-between items-start mb-8">
                  <div className="space-y-1">
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Client ID: {cliente.fb_ad_account_id.slice(-5)}</p>
                    <h3 className="text-2xl font-light italic group-hover:text-purple-400 transition-colors uppercase tracking-tighter">{cliente.nome_cliente}</h3>
                  </div>
                  <div className="p-2 bg-green-500/10 rounded-full">
                    <CheckCircle2 size={16} className="text-green-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    <p className="text-[8px] text-gray-600 uppercase mb-1 font-bold tracking-widest">Status</p>
                    <p className="text-xs font-mono text-green-500 uppercase">Sincronizado</p>
                  </div>
                  <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    <p className="text-[8px] text-gray-600 uppercase mb-1 font-bold tracking-widest">Plano</p>
                    <p className="text-xs font-mono text-purple-500 uppercase tracking-tighter italic font-bold text-[10px]">Pro Agency</p>
                  </div>
                </div>

                <Link 
                  href={`/pulse?id=${cliente.id}`}
                  className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-white hover:text-black transition-all"
                >
                  Abrir Pulse <TrendingUp size={12} />
                </Link>

                {/* Efeito Visual de Fundo */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-600/5 blur-[60px] rounded-full group-hover:bg-purple-600/20 transition-all" />
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}