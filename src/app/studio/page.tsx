"use client"

import { useState } from "react"
import { Sparkles, Layout, Video, BarChart3, ClipboardCheck } from "lucide-react"

export default function AIStudio() {
  const [activeTab, setActiveTab] = useState('copy')
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const tabs = [
    { id: 'copy', label: 'Copywriting', icon: Sparkles },
    { id: 'creative', label: 'Criativos', icon: Layout },
    { id: 'script', label: 'Roteiros', icon: Video },
    { id: 'analyst', label: 'Data Analyst', icon: BarChart3 },
  ]

  const generateAI = async () => {
    if (!prompt) return alert("Por favor, digite seu comando primeiro!")

    setLoading(true)
    setResult("Sincronizando com o núcleo da ERIZON AI...")

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab, prompt }),
      })

      const data = await res.json()

      if (!res.ok) {
        setResult(`Erro do Servidor: ${data.text || "Erro ao processar solicitação"}`)
      } else {
        setResult(data.text)
      }
    } catch (error) {
      setResult("Erro crítico: Verifique a conexão ou se a GEMINI_API_KEY está ativa na Vercel.")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (!result) return
    navigator.clipboard.writeText(result)
    alert("Copiado!")
  }

  return (
    <div className="min-h-screen bg-[#0f1012] text-white p-8 md:p-12 font-sans">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-black italic tracking-tighter mb-2 uppercase">
          ERIZON <span className="text-[#6c4bff]">STUDIO</span>
        </h1>
        <p className="text-zinc-500 text-sm font-medium">O motor de inteligência artificial para escala de operações.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Painel de Controle */}
        <div className="bg-[#1c1d21] p-10 rounded-[45px] border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-[10px] font-black text-[#6c4bff] uppercase tracking-[0.3em] mb-8 italic">Config_Engine</h3>
            
            <div className="grid grid-cols-2 gap-3 mb-10">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 p-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                    activeTab === tab.id 
                    ? "bg-[#6c4bff] text-white shadow-lg shadow-[#6c4bff]/20" 
                    : "bg-white/5 text-zinc-500 hover:bg-white/10"
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            <h3 className="text-[10px] font-black text-[#6c4bff] uppercase tracking-[0.3em] mb-4 italic">Comando_Input</h3>
            <textarea 
              className="w-full h-48 bg-black/20 border border-white/5 rounded-[30px] p-6 text-zinc-300 text-sm focus:outline-none focus:border-[#6c4bff]/50 transition-all resize-none"
              placeholder="Descreva o que você precisa..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            <button 
              onClick={generateAI}
              disabled={loading}
              className="w-full mt-8 p-6 bg-[#6c4bff] text-white rounded-[25px] font-black text-xs uppercase tracking-[0.4em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#6c4bff]/30 disabled:opacity-50"
            >
              {loading ? 'Sincronizando IA...' : 'Executar Comando'}
            </button>
          </div>
          <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-[#6c4bff]/5 blur-[80px] rounded-full"></div>
        </div>

        {/* Quadro de Resposta */}
        <div className="bg-[#1c1d21] p-10 rounded-[45px] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">
          <div className="relative z-10 flex flex-col h-full">
            <h3 className="text-[10px] font-black text-[#6c4bff] uppercase tracking-[0.3em] mb-6 italic">Output_Data</h3>
            <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-medium flex-1 overflow-y-auto">
              {result || "Aguardando entrada de dados para processar..."}
            </div>
            
            {result && !loading && (
              <button 
                onClick={copyToClipboard}
                className="mt-6 flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-[#6c4bff] transition-colors w-fit"
              >
                <ClipboardCheck size={14} />
                [ Copiar Resultado ]
              </button>
            )}
          </div>
          <div className="absolute bottom-[-5%] right-[-5%] w-64 h-64 bg-[#6c4bff]/5 blur-[80px] rounded-full"></div>
        </div>
      </div>
    </div>
  )
}