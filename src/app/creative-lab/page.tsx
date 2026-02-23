"use client";

// app/creative-lab/page.tsx
// Unifica Copy Engine + Script Engine em uma única página.
// Usa ChatShell para eliminar duplicação — copy.tsx e roteiros.tsx podem ser deletados.

import { useState, useRef, useEffect } from "react";
import { ChevronDown, PenTool, Film } from "lucide-react";
import ChatShell, { type Mensagem } from "@/components/ChatShell";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type ActiveTab = "copy" | "roteiro";

const TIPOS_COPY = [
  { value: "headline",     emoji: "📰", label: "Headline",     desc: "5–10 variações"     },
  { value: "cta",          emoji: "🎯", label: "CTA",          desc: "Chamada à ação"      },
  { value: "body_ad",      emoji: "📱", label: "Body Anúncio", desc: "Meta / Google Ads"   },
  { value: "vsl",          emoji: "🎬", label: "VSL",          desc: "Video Sales Letter"  },
  { value: "email",        emoji: "📧", label: "Email",        desc: "Sequência de vendas" },
  { value: "landing_page", emoji: "🌐", label: "Landing Page", desc: "Página de conversão" },
];

const TIPOS_ROTEIRO = [
  { value: "vsl_curto",    emoji: "🎬", label: "VSL Curto",    desc: "30–60 segundos"     },
  { value: "vsl_medio",    emoji: "🎥", label: "VSL Médio",    desc: "2–5 minutos"         },
  { value: "vsl_longo",    emoji: "📽️", label: "VSL Longo",    desc: "10–20 minutos"       },
  { value: "ugc",          emoji: "📱", label: "UGC",          desc: "User Generated"      },
  { value: "storytelling", emoji: "📖", label: "Storytelling", desc: "Narrativa emocional" },
  { value: "gancho",       emoji: "🪝", label: "Gancho Viral", desc: "Primeiros 3s"        },
];

const SUGESTOES = {
  copy: [
    { text: "10 headlines para lead magnet",      emoji: "📰" },
    { text: "CTA com urgência sem ser agressivo", emoji: "🎯" },
    { text: "Body para anúncio de infoproduto",   emoji: "📱" },
    { text: "Email de boas-vindas persuasivo",    emoji: "📧" },
  ],
  roteiro: [
    { text: "VSL 60s para produto digital",        emoji: "🎬" },
    { text: "5 ganchos virais para Reels fitness", emoji: "🪝" },
    { text: "Storytelling de transformação",       emoji: "📖" },
    { text: "Tutorial passo a passo humanizado",   emoji: "🎓" },
  ],
};

// ─── Dropdown de tipo ─────────────────────────────────────────────────────────
function TypeDropdown({ tipos, value, onChange }: {
  tipos: typeof TIPOS_COPY;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = tipos.find(t => t.value === value) ?? tipos[0];

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative min-w-[260px]">
      <button onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-3 bg-[#0e0e10] border px-4 py-3 rounded-xl text-xs font-semibold transition-all ${open ? "border-purple-500/50 text-white" : "border-white/[0.08] text-gray-400 hover:border-white/20 hover:text-white"}`}>
        <span className="flex items-center gap-2">
          <span>{selected.emoji}</span>
          <span>{selected.label}</span>
          <span className="text-gray-600 font-medium">· {selected.desc}</span>
        </span>
        <ChevronDown size={13} className={`text-purple-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 w-full bg-[#0e0e10] border border-white/[0.08] rounded-xl overflow-hidden z-50 shadow-2xl">
          {tipos.map((t, i) => (
            <button key={t.value} onClick={() => { onChange(t.value); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${i > 0 ? "border-t border-white/[0.04]" : ""} ${value === t.value ? "bg-purple-600/15 text-purple-300" : "text-gray-400 hover:bg-white/[0.04] hover:text-white"}`}>
              <span className="text-base w-5 shrink-0">{t.emoji}</span>
              <span className="text-xs font-semibold">{t.label}</span>
              <span className="ml-auto text-[10px] text-gray-600">{t.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ tab, onSelect }: { tab: ActiveTab; onSelect: (s: string) => void }) {
  const sugestoes = SUGESTOES[tab];
  const Icon = tab === "copy" ? PenTool : Film;
  const title = tab === "copy" ? "Que copy vamos criar?" : "Que roteiro vamos criar?";
  const subtitle = tab === "copy"
    ? "Headlines magnéticas, CTAs irresistíveis — prontos pra usar."
    : "Roteiros humanizados que convertem. Do gancho ao VSL completo.";

  return (
    <div className="h-full flex flex-col items-center justify-center py-8">
      <div className="relative mb-6">
        <div className="absolute -inset-6 bg-purple-600/[0.08] rounded-full blur-2xl animate-pulse" />
        <div className="relative w-14 h-14 rounded-2xl bg-[#0e0e10] border border-white/[0.06] flex items-center justify-center">
          <Icon size={26} className="text-purple-500/60" />
        </div>
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-700 mb-2">
        {tab === "copy" ? "Copy Engine" : "Script Engine"}
      </p>
      <h2 className="text-2xl font-black italic text-white/90 mb-1">
        <span className="text-purple-500">{title}</span>
      </h2>
      <p className="text-sm text-gray-600 mb-6">{subtitle}</p>
      <div className="grid grid-cols-2 gap-2 max-w-sm w-full">
        {sugestoes.map(s => (
          <button key={s.text} onClick={() => onSelect(s.text)}
            className="flex items-center gap-2.5 px-4 py-3 bg-[#0a0a0c] border border-white/[0.06] hover:border-purple-500/30 rounded-xl text-left transition-all hover:bg-purple-600/5 group">
            <span className="text-base shrink-0">{s.emoji}</span>
            <span className="text-xs text-gray-500 group-hover:text-white/80 transition-colors leading-snug">{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar Tabs ─────────────────────────────────────────────────────────────
function SidebarTabs({ activeTab, onChange }: { activeTab: ActiveTab; onChange: (t: ActiveTab) => void }) {
  return (
    <div className="p-3">
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] p-1 rounded-xl">
        <button onClick={() => onChange("copy")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === "copy" ? "bg-purple-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
          <PenTool size={12} /> Copy
        </button>
        <button onClick={() => onChange("roteiro")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === "roteiro" ? "bg-purple-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
          <Film size={12} /> Roteiro
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CreativeLabPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("copy");
  const [tipoCopy, setTipoCopy]   = useState("headline");
  const [tipoRoteiro, setTipoRoteiro] = useState("vsl_curto");
  const [inputExterno, setInputExterno] = useState("");

  const tipos  = activeTab === "copy" ? TIPOS_COPY : TIPOS_ROTEIRO;
  const tipo   = activeTab === "copy" ? tipoCopy : tipoRoteiro;
  const setTipo = activeTab === "copy" ? setTipoCopy : setTipoRoteiro;

  // Quando troca de aba, reseta o input externo
  useEffect(() => { setInputExterno(""); }, [activeTab]);

  const buildPayload = (input: string, msgs: Mensagem[], _extra: Record<string, any>) => {
    const tiposMap = activeTab === "copy" ? TIPOS_COPY : TIPOS_ROTEIRO;
    const tipoInfo = tiposMap.find(t => t.value === tipo);
    const contexto = `Você é um especialista de nível mundial em ${activeTab === "copy" ? "COPYWRITING" : "ROTEIROS"}.\n\nTIPO: ${tipoInfo?.label.toUpperCase()} — ${tipoInfo?.desc}\n\nHISTÓRICO:\n${msgs.slice(-5).map(m => `${m.role === "user" ? "Cliente" : "Você"}: ${m.content}`).join("\n")}\n\nEntregue conteúdo PRONTO PARA USO.`;

    if (activeTab === "copy") {
      return { mensagemUsuario: input, tipoCopy: tipo, contexto };
    }
    return { mensagemUsuario: input, tipoRoteiro: tipo, contexto };
  };

  const extractReply = (data: any) =>
    data.copy || data.roteiro || data.content || data.error || "Desculpe, ocorreu um erro.";

  return (
    <ChatShell
      key={activeTab} // força remount ao trocar de aba
      tabelaSupabase={activeTab === "copy" ? "conversas_copy" : "conversas_roteiros"}
      sidebarLabel={activeTab === "copy" ? "Nova Copy" : "Novo Roteiro"}
      headerLabel={activeTab === "copy" ? "Copy Engine" : "Script Engine"}
      placeholder={activeTab === "copy" ? "Descreva a copy que você precisa..." : "Descreva o roteiro que você precisa..."}
      showCopyButton
      copyButtonLabel={activeTab === "copy" ? "Copiar copy" : "Copiar roteiro"}
      endpoint={activeTab === "copy" ? "/api/ai-copywriter" : "/api/ai-roteirista"}
      buildPayload={buildPayload}
      extractReply={extractReply}
      sidebarTop={<SidebarTabs activeTab={activeTab} onChange={setActiveTab} />}
      headerRight={<TypeDropdown tipos={tipos} value={tipo} onChange={setTipo} />}
      emptyState={<EmptyState tab={activeTab} onSelect={setInputExterno} />}
    />
  );
}