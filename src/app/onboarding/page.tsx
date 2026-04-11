"use client";

// src/app/onboarding/page.tsx
// CORRIGIDO: adicionado Passo 2.5 — seleção de nicho que salva em workspaces.niche
// Isso alimenta o Network Intelligence com dados reais por segmento

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  CheckCircle2, Loader2, AlertCircle,
  Zap, DollarSign, Users, ArrowRight,
  ChevronRight, Sparkles, TrendingUp, Building2,
} from "lucide-react";
import ErizonLogo from "@/components/ErizonLogo";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CORES = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"];

const NICHOS = [
  { valor: "imobiliario",   label: "Imobiliário",      emoji: "🏠" },
  { valor: "arquitetura",   label: "Arquitetura",      emoji: "🏛️" },
  { valor: "estetica",      label: "Estética & Beleza", emoji: "💅" },
  { valor: "ecommerce",     label: "E-commerce",       emoji: "🛒" },
  { valor: "educacao",      label: "Educação",         emoji: "📚" },
  { valor: "saude",         label: "Saúde & Clínicas", emoji: "🏥" },
  { valor: "advocacia",     label: "Advocacia",        emoji: "⚖️" },
  { valor: "consultoria",   label: "Consultoria",      emoji: "💼" },
  { valor: "gastronomia",   label: "Gastronomia",      emoji: "🍽️" },
  { valor: "tecnologia",    label: "Tecnologia / SaaS",emoji: "💻" },
  { valor: "moda",          label: "Moda & Vestuário", emoji: "👗" },
  { valor: "geral",         label: "Outro / Geral",    emoji: "🌐" },
];

// ── Progress bar ───────────────────────────────────────────────────────────────
function ProgressBar({ passo, total }: { passo: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-all duration-500 ${
            i < passo ? "bg-purple-500" : i === passo ? "bg-purple-500/40" : "bg-white/[0.06]"
          }`}
        />
      ))}
    </div>
  );
}

// ── Passo 1: Boas-vindas + primeiro cliente ────────────────────────────────────
function Passo1({ onNext }: { onNext: (nomeCliente: string, cor: string) => void }) {
  const [nome, setNome] = useState("");
  const [cor, setCor]   = useState(CORES[0]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function avancar() {
    if (!nome.trim()) { setErro("Coloca o nome do seu primeiro cliente."); return; }
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), cor }),
      });
      if (!res.ok) {
        const json = await res.json();
        setErro(json.error ?? "Erro ao criar cliente.");
        setSalvando(false);
        return;
      }
      onNext(nome.trim(), cor);
    } catch {
      setErro("Erro de conexão.");
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-bold text-white mb-1">Bem-vindo ao Erizon</h2>
        <p className="text-[14px] text-white/40 leading-relaxed">
          Vamos começar pelo mais simples: qual é o nome do seu primeiro cliente?
        </p>
      </div>

      <div className="space-y-3">
        <input
          autoFocus
          value={nome}
          onChange={e => { setNome(e.target.value); setErro(""); }}
          onKeyDown={e => e.key === "Enter" && avancar()}
          placeholder="Ex: Clínica São Paulo, Loja do João..."
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[14px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 focus:bg-white/[0.06] transition-all"
        />

        <div className="flex items-center gap-2">
          <p className="text-[11px] text-white/25 mr-1">Cor:</p>
          {CORES.map(c => (
            <button
              key={c}
              onClick={() => setCor(c)}
              className="w-5 h-5 rounded-md transition-all"
              style={{
                backgroundColor: c,
                outline: cor === c ? `2px solid ${c}` : "none",
                outlineOffset: "2px",
                opacity: cor === c ? 1 : 0.45,
              }}
            />
          ))}
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-2 p-3 bg-red-500/[0.06] border border-red-500/15 rounded-xl">
          <AlertCircle size={13} className="text-red-400 shrink-0" />
          <p className="text-[12px] text-red-400">{erro}</p>
        </div>
      )}

      <button
        onClick={avancar}
        disabled={salvando || !nome.trim()}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-[14px] font-semibold text-white transition-all disabled:opacity-40"
      >
        {salvando
          ? <><Loader2 size={15} className="animate-spin" /> Salvando...</>
          : <><ArrowRight size={15} /> Continuar</>}
      </button>

      <p className="text-[11px] text-white/20 text-center">
        Você pode adicionar mais clientes depois
      </p>
    </div>
  );
}

// ── Passo 2: Financeiro ────────────────────────────────────────────────────────
function Passo2({ onNext }: { onNext: () => void }) {
  const [ticket, setTicket] = useState("");
  const [conv, setConv]     = useState("4");
  const [loading, setLoading] = useState(false);
  const [erro, setErro]       = useState("");

  const ticketNum = parseFloat(ticket) || 0;
  const convNum   = parseFloat(conv) / 100 || 0.04;
  const cplIdeal  = ticketNum > 0 ? Math.round(ticketNum * convNum * 0.3) : null;

  async function salvarEAvancar() {
    const t = parseFloat(ticket);
    const c = parseFloat(conv) / 100;
    if (!t || t <= 0)   { setErro("Informe um ticket médio válido."); return; }
    if (c <= 0 || c > 1){ setErro("Taxa deve ser entre 0 e 100%.");  return; }

    setLoading(true);
    setErro("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErro("Sessão expirada."); setLoading(false); return; }

    const { error } = await supabase.from("user_configs").upsert({
      user_id:             user.id,
      ticket_medio_global: t,
      taxa_conversao:      c,
    }, { onConflict: "user_id" });

    if (error) { setErro("Erro ao salvar: " + error.message); setLoading(false); return; }
    setLoading(false);
    onNext();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-bold text-white mb-1">Financeiro do negócio</h2>
        <p className="text-[14px] text-white/40 leading-relaxed">
          Com esses dois números o Erizon calcula o CPL ideal e sinaliza campanhas em risco automaticamente.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[11px] text-white/35 block mb-1.5">Ticket médio (R$)</label>
          <input
            autoFocus
            type="number"
            placeholder="450"
            value={ticket}
            onChange={e => { setTicket(e.target.value); setErro(""); }}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[14px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 focus:bg-white/[0.06] transition-all"
          />
          <p className="text-[10px] text-white/20 mt-1">Valor médio que um lead converte em receita</p>
        </div>

        <div>
          <label className="text-[11px] text-white/35 block mb-1.5">Taxa de conversão de leads (%)</label>
          <input
            type="number"
            placeholder="4"
            value={conv}
            onChange={e => { setConv(e.target.value); setErro(""); }}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[14px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 focus:bg-white/[0.06] transition-all"
          />
          <p className="text-[10px] text-white/20 mt-1">% dos leads que viram clientes pagantes</p>
        </div>
      </div>

      {cplIdeal !== null && (
        <div className="p-4 bg-emerald-500/[0.05] border border-emerald-500/15 rounded-2xl">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={13} className="text-emerald-400" />
            <p className="text-[11px] text-emerald-400/70 font-medium uppercase tracking-wider">CPL ideal calculado</p>
          </div>
          <p className="text-[32px] font-black font-mono text-emerald-400">R$ {cplIdeal}</p>
          <p className="text-[11px] text-white/25 mt-1">
            Campanhas acima de R$ {cplIdeal} serão sinalizadas como risco pelo Erizon
          </p>
        </div>
      )}

      {erro && (
        <div className="flex items-center gap-2 p-3 bg-red-500/[0.06] border border-red-500/15 rounded-xl">
          <AlertCircle size={13} className="text-red-400 shrink-0" />
          <p className="text-[12px] text-red-400">{erro}</p>
        </div>
      )}

      <button
        onClick={salvarEAvancar}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-[14px] font-semibold text-white transition-all disabled:opacity-40"
      >
        {loading
          ? <><Loader2 size={15} className="animate-spin" /> Salvando...</>
          : <><ArrowRight size={15} /> Continuar</>}
      </button>
    </div>
  );
}

// ── Passo 2.5 (novo): Seleção de nicho ────────────────────────────────────────
// Salva em workspaces.niche para alimentar o Network Intelligence
function Passo2b({ onNext }: { onNext: () => void }) {
  const [nicho, setNicho]   = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro]       = useState("");

  async function salvarEAvancar() {
    if (!nicho) { setErro("Selecione o nicho principal dos seus clientes."); return; }

    setLoading(true);
    setErro("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setErro("Sessão expirada."); setLoading(false); return; }

      // Busca o workspace do usuário
      const { data: wsMember } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!wsMember?.workspace_id) {
        setErro("Workspace não encontrado. Tente recarregar a página.");
        setLoading(false);
        return;
      }

      // Atualiza o niche no workspace
      const { error } = await supabase
        .from("workspaces")
        .update({ niche: nicho })
        .eq("id", wsMember.workspace_id);

      if (error) { setErro("Erro ao salvar: " + error.message); setLoading(false); return; }

      onNext();
    } catch {
      setErro("Erro de conexão.");
    }

    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-bold text-white mb-1">Qual é o seu nicho principal?</h2>
        <p className="text-[14px] text-white/40 leading-relaxed">
          Isso permite ao Erizon comparar suas campanhas com benchmarks reais do seu mercado.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {NICHOS.map(n => (
          <button
            key={n.valor}
            onClick={() => { setNicho(n.valor); setErro(""); }}
            className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-left transition-all ${
              nicho === n.valor
                ? "border-purple-500/50 bg-purple-500/[0.08] text-white"
                : "border-white/[0.07] bg-white/[0.02] text-white/40 hover:border-white/[0.12] hover:text-white/60"
            }`}
          >
            <span className="text-[16px]">{n.emoji}</span>
            <span className="text-[12px] font-medium leading-tight">{n.label}</span>
            {nicho === n.valor && (
              <CheckCircle2 size={12} className="text-purple-400 ml-auto shrink-0" />
            )}
          </button>
        ))}
      </div>

      {erro && (
        <div className="flex items-center gap-2 p-3 bg-red-500/[0.06] border border-red-500/15 rounded-xl">
          <AlertCircle size={13} className="text-red-400 shrink-0" />
          <p className="text-[12px] text-red-400">{erro}</p>
        </div>
      )}

      <button
        onClick={salvarEAvancar}
        disabled={loading || !nicho}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-[14px] font-semibold text-white transition-all disabled:opacity-40"
      >
        {loading
          ? <><Loader2 size={15} className="animate-spin" /> Salvando...</>
          : <><ArrowRight size={15} /> Continuar</>}
      </button>

      <p className="text-[11px] text-white/20 text-center">
        Você pode alterar isso depois em Configurações
      </p>
    </div>
  );
}

// ── Passo 3: Meta Ads (pode pular) ────────────────────────────────────────────
function Passo3({ onNext, onPular }: { onNext: () => void; onPular: () => void }) {
  const [token, setToken]         = useState("");
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading]     = useState(false);
  const [validado, setValidado]   = useState(false);
  const [erro, setErro]           = useState("");

  async function conectar() {
    if (!token.trim()) { setErro("Cole o token de acesso."); return; }
    setLoading(true);
    setErro("");
    try {
      const res = await fetch("/api/meta-validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), accountId: accountId.trim() || "act_0" }),
      });
      const result = await res.json();

      if (!res.ok || result.error) {
        const code = result.error?.code;
        if (code === 190)      setErro("Token inválido ou expirado. Gere um novo no Meta Business.");
        else if (code === 100) setErro("Account ID inválido. Confira o ID da conta de anúncios.");
        else                   setErro(`Erro: ${result.error?.message ?? "Resposta inválida"}`);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setErro("Sessão expirada."); setLoading(false); return; }

      await supabase.from("user_settings").upsert({
        user_id:            user.id,
        meta_access_token:  token.trim(),
        meta_ad_account_id: accountId.trim() || null,
      }, { onConflict: "user_id" });

      setValidado(true);
      setTimeout(onNext, 900);
    } catch {
      setErro("Erro de conexão.");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-bold text-white mb-1">Conectar Meta Ads</h2>
        <p className="text-[14px] text-white/40 leading-relaxed">
          Conecte sua conta para o Erizon começar a monitorar suas campanhas automaticamente.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[11px] text-white/35 block mb-1.5">Token de acesso</label>
          <input
            autoFocus
            value={token}
            onChange={e => { setToken(e.target.value); setErro(""); }}
            placeholder="EAAxxxxxxx..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 focus:bg-white/[0.06] transition-all font-mono"
          />
        </div>

        <div>
          <label className="text-[11px] text-white/35 block mb-1.5">ID da conta de anúncios</label>
          <input
            value={accountId}
            onChange={e => { setAccountId(e.target.value); setErro(""); }}
            placeholder="act_123456789"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 focus:bg-white/[0.06] transition-all font-mono"
          />
        </div>
      </div>

      {validado && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/[0.06] border border-emerald-500/15 rounded-xl">
          <CheckCircle2 size={13} className="text-emerald-400" />
          <p className="text-[12px] text-emerald-400">Meta Ads conectado com sucesso!</p>
        </div>
      )}

      {erro && (
        <div className="flex items-center gap-2 p-3 bg-red-500/[0.06] border border-red-500/15 rounded-xl">
          <AlertCircle size={13} className="text-red-400 shrink-0" />
          <p className="text-[12px] text-red-400">{erro}</p>
        </div>
      )}

      <button
        onClick={conectar}
        disabled={loading || validado}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-[14px] font-semibold text-white transition-all disabled:opacity-40"
      >
        {loading
          ? <><Loader2 size={15} className="animate-spin" /> Validando...</>
          : validado
          ? <><CheckCircle2 size={15} /> Conectado!</>
          : <><Zap size={15} /> Conectar Meta Ads</>}
      </button>

      <button
        onClick={onPular}
        className="w-full text-[12px] text-white/20 hover:text-white/40 transition-colors py-1 text-center"
      >
        Pular por agora — conectar depois em Configurações
      </button>
    </div>
  );
}

// ── Passo 4: Tela de conclusão ─────────────────────────────────────────────────
function Passo4({ nomeCliente }: { nomeCliente: string }) {
  return (
    <div className="space-y-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
        <Sparkles size={24} className="text-emerald-400" />
      </div>

      <div>
        <h2 className="text-[22px] font-bold text-white mb-2">Tudo pronto!</h2>
        <p className="text-[14px] text-white/40 leading-relaxed">
          {nomeCliente ? `${nomeCliente} já está configurado.` : "Sua conta está configurada."}{" "}
          O Erizon começa a trabalhar agora.
        </p>
      </div>

      <div className="flex flex-col gap-2 text-left p-4 bg-white/[0.03] border border-white/[0.05] rounded-2xl">
        {[
          { icon: Zap,         texto: "Score de campanha em tempo real", ok: true },
          { icon: TrendingUp,  texto: "CPL ideal calculado",             ok: true },
          { icon: Users,       texto: "Primeiro cliente criado",         ok: true },
          { icon: Building2,   texto: "Nicho configurado",               ok: true },
        ].map(({ icon: Icon, texto, ok }) => (
          <div key={texto} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${ok ? "bg-emerald-500/15" : "bg-white/[0.04]"}`}>
              <Icon size={12} className={ok ? "text-emerald-400" : "text-white/20"} />
            </div>
            <p className={`text-[12px] ${ok ? "text-white/60" : "text-white/20"}`}>{texto}</p>
            {ok && <CheckCircle2 size={12} className="text-emerald-400 ml-auto" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page principal ─────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const [passo, setPasso]             = useState(1);
  const [nomeCliente, setNomeCliente] = useState("");
  const router = useRouter();

  const TOTAL = 4; // agora são 4 passos (adicionado passo de nicho)

  function irPara(n: number) { setPasso(n); }

  async function concluir() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("user_configs").upsert({
        user_id:             user.id,
        onboarding_completo: true,
      }, { onConflict: "user_id" });
    }
    setPasso(5);
    setTimeout(() => router.push("/pulse"), 2200);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#09090b] via-[#0b0b0e] to-[#09090b] text-white flex items-center justify-center p-5">
      <div className="w-full max-w-[460px]">

        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <ErizonLogo size={32} />
          <span className="text-[15px] font-semibold text-white/60">Erizon</span>
          {passo <= TOTAL && (
            <span className="ml-auto text-[11px] text-white/20">
              {passo}/{TOTAL}
            </span>
          )}
        </div>

        {/* Progress */}
        {passo <= TOTAL && <ProgressBar passo={passo - 1} total={TOTAL} />}

        {/* Conteúdo */}
        <div className="bg-[#111114] border border-white/[0.07] rounded-[24px] p-7">
          {passo === 1 && (
            <Passo1
              onNext={(nome, cor) => {
                setNomeCliente(nome);
                void cor;
                irPara(2);
              }}
            />
          )}
          {passo === 2 && <Passo2   onNext={() => irPara(3)} />}
          {passo === 3 && <Passo2b  onNext={() => irPara(4)} />}
          {passo === 4 && <Passo3   onNext={concluir} onPular={concluir} />}
          {passo === 5 && <Passo4   nomeCliente={nomeCliente} />}
        </div>

        {/* Voltar */}
        {passo > 1 && passo <= TOTAL && (
          <button
            onClick={() => setPasso(p => p - 1)}
            className="mt-4 w-full text-[11px] text-white/15 hover:text-white/35 transition-colors py-1 text-center"
          >
            ← Voltar
          </button>
        )}

      </div>
    </div>
  );
}