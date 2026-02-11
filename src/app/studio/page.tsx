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
    if (!prompt) return alert("Por favor, digite seu comando!")
    setLoading(true)
    setResult("Conectando ao núcleo da IA...")

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab, prompt }),
      })
      const data = await res.json()
      setResult(data.text || "Sem resposta da IA.")
    } catch (error) {
      setResult("Erro crítico de conexão.")
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
    <div className="min-h-screen bg-[#0f1012] text-white p-8">
      <h1 className="text-4xl font-black italic mb-10 uppercase">ERIZON <span className="text-[#6c4bff]">STUDIO</span></h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-[#1c1d21] p-10 rounded-[45px] border border-white/5 relative overflow-hidden">
          <div className="grid grid-cols-2 gap-3 mb-10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 p-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  activeTab === tab.id ? "bg-[#6c4bff] text-white" : "bg-white/5 text-zinc-500"
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          <textarea 
            className="w-full h-48 bg-black/20 border border-white/5 rounded-[30px] p-6 text-zinc-300 focus:outline-none"
            placeholder="Digite aqui seu comando..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />

          <button 
            onClick={generateAI}
            disabled={loading}
            className="w-full mt-8 p-6 bg-[#6c4bff] text-white rounded-[25px] font-black text-xs uppercase tracking-[0.4em] disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Executar Comando'}
          </button>
        </div>

        <div className="bg-[#1c1d21] p-10 rounded-[45px] border border-white/5 min-h-[500px] flex flex-col">
          <h3 className="text-[10px] font-black text-[#6c4bff] uppercase tracking-[0.3em] mb-6 italic">Output_Data</h3>
          <div className="text-zinc-300 text-sm flex-1 overflow-y-auto whitespace-pre-wrap">
            {result || "Aguardando entrada..."}
          </div>
          {result && !loading && (
            <button onClick={copyToClipboard} className="mt-6 flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase">
              <ClipboardCheck size={14} /> [ Copiar Resultado ]
            </button>
          )}
        </div>
      </div>
    </div>
  )
}