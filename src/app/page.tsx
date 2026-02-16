"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Zap, Target, BarChart3 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-purple-500/30 overflow-x-hidden">
      {/* Luzes de Fundo (Glow) - Otimizadas para performance */}
      <div className="absolute top-0 right-0 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-purple-600/10 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[250px] md:w-[500px] h-[250px] md:h-[500px] bg-purple-900/10 blur-[130px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      {/* Navegação / Header */}
      <nav className="relative z-20 flex justify-between items-center px-6 md:px-12 py-8 max-w-7xl mx-auto">
        <div className="relative w-[120px] md:w-[150px] h-[40px] md:h-[50px]">
          {/* Adicionei uma verificação para não quebrar se a imagem não existir */}
          <div className="text-xl font-black italic tracking-tighter flex items-center gap-2">
            ERIZON<span className="text-purple-600">.</span>
          </div>
        </div>
        
        <Link href="/login">
          <button className="group relative px-6 md:px-8 py-3 bg-white text-black font-black uppercase text-[9px] md:text-[10px] tracking-[0.2em] rounded-full transition-all hover:bg-purple-600 hover:text-white active:scale-95">
            Acessar Sistema
            <ArrowRight className="inline-all ml-2 group-hover:translate-x-1 transition-transform" size={14} />
          </button>
        </Link>
      </nav>

      {/* Conteúdo Principal */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-16 md:pt-24 pb-32 flex flex-col items-center text-center">
        {/* Badge de Versão */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-white/5 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-purple-300">V.2.0 Growth Intelligence</span>
        </div>

        {/* Título de Alto Impacto */}
        <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.9] mb-8">
          Escala Sem <br />
          <span className="text-purple-600 drop-shadow-[0_0_30px_rgba(147,51,234,0.3)]">Fronteiras.</span>
        </h1>

        <p className="max-w-2xl text-gray-500 font-medium text-base md:text-lg mb-12 leading-relaxed">
          O primeiro sistema de inteligência preditiva focado em <span className="text-white">Growth & Performance</span>. 
          Transforme seus dados brutos em decisões que geram escala real.
        </p>

        {/* Botão de Ação Principal */}
        <Link href="/login">
          <button className="px-10 py-6 bg-purple-600 text-white font-black uppercase text-[11px] tracking-[0.3em] rounded-2xl hover:bg-purple-700 transition-all shadow-[0_0_40px_rgba(147,51,234,0.2)] hover:shadow-purple-600/40 active:scale-95">
            Iniciar Operação
          </button>
        </Link>

        {/* Grid de Diferenciais */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-12 w-full border-t border-white/5 pt-16">
          <div className="flex flex-col items-center space-y-4 group">
            <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-purple-600/10 transition-colors">
              <Zap className="text-purple-500" size={28} />
            </div>
            <div>
              <h3 className="font-black italic uppercase tracking-widest text-sm text-white">Velocidade IA</h3>
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-2 leading-loose">Análises preditivas em<br/>tempo recorde</p>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-4 group">
             <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-purple-600/10 transition-colors">
              <Target className="text-purple-500" size={28} />
            </div>
            <div>
              <h3 className="font-black italic uppercase tracking-widest text-sm text-white">Precisão Absoluta</h3>
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-2 leading-loose">Algoritmos focados em<br/>ROI e conversão</p>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-4 group">
            <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-purple-600/10 transition-colors">
              <BarChart3 className="text-purple-500" size={28} />
            </div>
            <div>
              <h3 className="font-black italic uppercase tracking-widest text-sm text-white">War Room Dash</h3>
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-2 leading-loose">Visualização tática<br/>em tempo real</p>
            </div>
          </div>
        </div>
      </main>

      {/* Rodapé Simples */}
      <footer className="relative z-10 py-12 border-t border-white/5 text-center">
        <p className="text-[9px] text-gray-700 font-black uppercase tracking-[0.4em]">
          © 2026 Erizon Growth Intelligence — Todos os direitos reservados
        </p>
      </footer>
    </div>
  );
}