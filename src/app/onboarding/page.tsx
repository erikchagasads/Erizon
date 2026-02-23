"use client";

// /app/onboarding/page.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  CheckCircle2, Loader2, AlertCircle,
  Zap, DollarSign, Bell
} from "lucide-react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Passo {
  id: number;
  titulo: string;
  descricao: string;
  icon: React.ElementType;
}

const PASSOS: Passo[] = [
  { id: 1, titulo: "Conectar Meta Ads",     descricao: "Token de acesso e ID da conta",    icon: Zap        },
  { id: 2, titulo: "Configurar financeiro", descricao: "Ticket médio e taxa de conversão", icon: DollarSign },
  { id: 3, titulo: "Alertas Telegram",      descricao: "CPL limite e chat ID (opcional)",  icon: Bell       },
];

function StepIndicator({ passo, atual }: { passo: Passo; atual: number }) {
  const concluido = atual > passo.id;
  const ativo     = atual === passo.id;
  const Icon      = passo.icon;
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
        concluido ? "bg-emerald-500/20 border-emerald-500/40" :
        ativo     ? "bg-white/10 border-white/20" :
                    "bg-white/[0.03] border-white/[0.06]"
      }`}>
        {concluido
          ? <CheckCircle2 size={16} className="text-emerald-400" />
          : <Icon size={16} className={ativo ? "text-white" : "text-white/20"} />
        }
      </div>
      <div>
        <p className={`text-[13px] font-semibold ${ativo ? "text-white" : concluido ? "text-white/50" : "text-white/20"}`}>
          {passo.titulo}
        </p>
        <p className="text-[11px] text-white/25">{passo.descricao}</p>
      </div>
    </div>
  );
}

// ── Passo 1: Meta ─────────────────────────────────────────────
function Passo1({ onNext }: { onNext: () => void }) {
  const [token, setToken]         = useState("");
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading]     = useState(false);
  const [erro, setErro]           = useState("");
  const [validado, setValidado]   = useState(false);

  async function validarEAvancar() {
    if (!token.trim() || !accountId.trim()) {
      setErro("Preencha o token e o Account ID.");
      return;
    }
    setLoading(true);
    setErro("");
    try {
      // ✅ Chama API route server-side (evita erro 405/CORS do browser)
      const res = await fetch("/api/meta-validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), accountId: accountId.trim() }),
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        const code = result.error?.code;
        if (code === 190)      setErro("Token inválido ou expirado. Gere um novo no Meta Business.");
        else if (code === 100) setErro("Account ID inválido. Verifique o ID da conta de anúncios.");
        else                   setErro(`Erro Meta: ${result.error?.message ?? "Resposta inválida"}`);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setErro("Sessão expirada. Faça login novamente."); setLoading(false); return; }

      const { error: dbError } = await supabase.from("user_settings").upsert({
        user_id:            user.id,
        meta_access_token:  token.trim(),
        meta_ad_account_id: accountId.trim(),
      }, { onConflict: "user_id" });

      if (dbError) {
        setErro("Erro ao salvar credenciais: " + dbError.message);
        setLoading(false);
        return;
      }

      setValidado(true);
      setTimeout(onNext, 800);
    } catch {
      setErro("Erro ao validar. Verifique sua conexão.");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] text-white/30 mb-1.5">Token de acesso Meta</p>
        <input
          type="password"
          placeholder="EAAxxxxxxxxxx..."
          value={token}
          onChange={e => setToken(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors font-mono"
        />
        <p className="text-[10px] text-white/20 mt-1.5">
          Gere em: Meta Business → Configurações → Usuários do sistema → Gerar token
        </p>
      </div>
      <div>
        <p className="text-[11px] text-white/30 mb-1.5">Account ID</p>
        <input
          type="text"
          placeholder="act_xxxxxxxxxx"
          value={accountId}
          onChange={e => setAccountId(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors font-mono"
        />
        <p className="text-[10px] text-white/20 mt-1.5">
          Encontre em: Meta Ads Manager → URL da página (act_123456789)
        </p>
      </div>

      {erro && (
        <div className="flex items-center gap-2 p-3 bg-red-500/[0.06] border border-red-500/15 rounded-xl">
          <AlertCircle size={13} className="text-red-400 shrink-0" />
          <p className="text-[12px] text-red-400">{erro}</p>
        </div>
      )}

      {validado && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/[0.06] border border-emerald-500/15 rounded-xl">
          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
          <p className="text-[12px] text-emerald-400">Token validado com sucesso!</p>
        </div>
      )}

      <button
        onClick={validarEAvancar}
        disabled={loading || validado}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.07] border border-white/[0.12] text-[13px] font-semibold text-white hover:bg-white/[0.10] transition-all disabled:opacity-50"
      >
        {loading  ? <><Loader2 size={14} className="animate-spin" /> Validando...</> :
         validado ? <><CheckCircle2 size={14} className="text-emerald-400" /> Validado!</> :
                    <><Zap size={14} /> Validar e conectar</>}
      </button>
    </div>
  );
}

// ── Passo 2: Financeiro ───────────────────────────────────────
function Passo2({ onNext }: { onNext: () => void }) {
  const [ticket, setTicket]   = useState("");
  const [conv, setConv]       = useState("4");
  const [loading, setLoading] = useState(false);
  const [erro, setErro]       = useState("");

  async function salvarEAvancar() {
    const t = parseFloat(ticket);
    const c = parseFloat(conv) / 100;
    if (!t || t <= 0)     { setErro("Informe um ticket médio válido."); return; }
    if (c <= 0 || c > 1)  { setErro("Taxa de conversão deve ser entre 0 e 100%."); return; }

    setLoading(true);
    setErro("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErro("Sessão expirada. Faça login novamente."); setLoading(false); return; }

    const { error } = await supabase.from("user_configs").upsert({
      user_id:             user.id,
      ticket_medio_global: t,
      taxa_conversao:      c,
    }, { onConflict: "user_id" });

    if (error) { setErro("Erro ao salvar: " + error.message); setLoading(false); return; }
    setLoading(false);
    onNext();
  }

  const ticketNum = parseFloat(ticket) || 0;
  const convNum   = parseFloat(conv) / 100 || 0.04;
  const cplIdeal  = ticketNum > 0 ? (ticketNum * convNum * 0.3).toFixed(0) : "—";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] text-white/30 mb-1.5">Ticket médio do cliente (R$)</p>
        <input
          type="number"
          placeholder="450"
          value={ticket}
          onChange={e => setTicket(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
        />
        <p className="text-[10px] text-white/20 mt-1.5">
          Valor médio que um lead converte em receita
        </p>
      </div>
      <div>
        <p className="text-[11px] text-white/30 mb-1.5">Taxa de conversão de leads (%)</p>
        <input
          type="number"
          placeholder="4"
          value={conv}
          onChange={e => setConv(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
        />
        <p className="text-[10px] text-white/20 mt-1.5">
          % dos leads que viram clientes pagantes
        </p>
      </div>

      {ticketNum > 0 && (
        <div className="p-4 bg-emerald-500/[0.04] border border-emerald-500/10 rounded-xl">
          <p className="text-[11px] text-white/30 mb-1">Com esses valores, seu CPL ideal é:</p>
          <p className="text-[20px] font-black font-mono text-emerald-400">R$ {cplIdeal}</p>
          <p className="text-[10px] text-white/20 mt-0.5">
            Campanhas acima desse CPL serão sinalizadas como risco
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
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.07] border border-white/[0.12] text-[13px] font-semibold text-white hover:bg-white/[0.10] transition-all disabled:opacity-50"
      >
        {loading
          ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
          : <><DollarSign size={14} /> Salvar e continuar</>}
      </button>
    </div>
  );
}

// ── Passo 3: Telegram ─────────────────────────────────────────
function Passo3({ onConcluir }: { onConcluir: () => void }) {
  const [chatId, setChatId]       = useState("");
  const [limiteCpl, setLimiteCpl] = useState("40");
  const [loading, setLoading]     = useState(false);
  const [testando, setTestando]   = useState(false);
  const [testOk, setTestOk]       = useState(false);
  const [erro, setErro]           = useState("");

  async function testarTelegram() {
    if (!chatId.trim()) return;
    setTestando(true);
    setErro("");
    try {
      const res = await fetch("/api/telegram-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campanha: "Teste Erizon",
          sinal:    "Configuração inicial",
          msg:      "✅ Telegram conectado com sucesso! Você receberá alertas aqui.",
          chatId:   chatId.trim(),
        }),
      });
      if (res.ok) {
        setTestOk(true);
      } else {
        setErro("Não foi possível enviar mensagem. Verifique o Chat ID.");
      }
    } catch {
      setErro("Erro de conexão ao testar Telegram.");
    }
    setTestando(false);
  }

  async function concluirOnboarding() {
    setLoading(true);
    setErro("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErro("Sessão expirada. Faça login novamente."); setLoading(false); return; }

    const { error } = await supabase.from("user_configs").upsert({
      user_id:             user.id,
      limite_cpl:          parseFloat(limiteCpl) || 40,
      telegram_chat_id:    chatId.trim() || null,
      onboarding_completo: true,
    }, { onConflict: "user_id" });

    if (error) { setErro("Erro ao finalizar: " + error.message); setLoading(false); return; }
    setLoading(false);
    onConcluir();
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] text-white/30 mb-1.5">CPL limite para alertas (R$)</p>
        <input
          type="number"
          placeholder="40"
          value={limiteCpl}
          onChange={e => setLimiteCpl(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
        />
        <p className="text-[10px] text-white/20 mt-1.5">
          Você será alertado quando o CPL ultrapassar esse valor
        </p>
      </div>
      <div>
        <p className="text-[11px] text-white/30 mb-1.5">
          Chat ID do Telegram <span className="text-white/15">(opcional)</span>
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="-100xxxxxxxxx"
            value={chatId}
            onChange={e => { setChatId(e.target.value); setTestOk(false); setErro(""); }}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors font-mono"
          />
          <button
            onClick={testarTelegram}
            disabled={!chatId.trim() || testando}
            className="px-4 py-3 rounded-xl border border-white/[0.08] text-[12px] font-medium text-white/50 hover:text-white hover:border-white/20 transition-all disabled:opacity-30"
          >
            {testando ? <Loader2 size={13} className="animate-spin" /> : testOk ? "✓ OK" : "Testar"}
          </button>
        </div>
        <p className="text-[10px] text-white/20 mt-1.5">
          Use @userinfobot no Telegram para descobrir seu Chat ID
        </p>
      </div>

      {erro && (
        <div className="flex items-center gap-2 p-3 bg-red-500/[0.06] border border-red-500/15 rounded-xl">
          <AlertCircle size={13} className="text-red-400 shrink-0" />
          <p className="text-[12px] text-red-400">{erro}</p>
        </div>
      )}

      {testOk && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/[0.06] border border-emerald-500/15 rounded-xl">
          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
          <p className="text-[12px] text-emerald-400">Mensagem de teste enviada com sucesso!</p>
        </div>
      )}

      <button
        onClick={concluirOnboarding}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[13px] font-semibold text-emerald-400 hover:bg-emerald-500/15 transition-all disabled:opacity-50"
      >
        {loading
          ? <><Loader2 size={14} className="animate-spin" /> Finalizando...</>
          : <><CheckCircle2 size={14} /> Concluir configuração</>}
      </button>

      <button
        onClick={concluirOnboarding}
        disabled={loading}
        className="w-full text-[12px] text-white/20 hover:text-white/40 transition-colors py-1"
      >
        Pular por agora
      </button>
    </div>
  );
}

// ── Page principal ────────────────────────────────────────────
export default function OnboardingPage() {
  const [passoAtual, setPassoAtual] = useState(1);
  const router = useRouter();

  function avancar()  { setPassoAtual(p => Math.min(p + 1, 3)); }
  function concluir() { router.push("/pulse"); }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0b0b0d] to-[#0a0a0a] text-white flex items-center justify-center p-5">
      <div className="w-full max-w-[480px]">

        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
            <Zap size={20} className="text-white/60" />
          </div>
          <h1 className="text-[22px] font-bold text-white mb-1">Configurar Erizon</h1>
          <p className="text-[13px] text-white/30">3 passos para ativar o copiloto de decisão</p>
        </div>

        <div className="flex flex-col gap-4 mb-8 p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
          {PASSOS.map((p, i) => (
            <div key={p.id}>
              <StepIndicator passo={p} atual={passoAtual} />
              {i < PASSOS.length - 1 && (
                <div className="w-px h-4 bg-white/[0.06] ml-5 mt-2" />
              )}
            </div>
          ))}
        </div>

        <div className="bg-[#111113] border border-white/[0.07] rounded-[24px] p-6">
          <div className="mb-6">
            <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1">
              Passo {passoAtual} de 3
            </p>
            <h2 className="text-[17px] font-bold text-white">
              {PASSOS[passoAtual - 1].titulo}
            </h2>
          </div>

          {passoAtual === 1 && <Passo1 onNext={avancar} />}
          {passoAtual === 2 && <Passo2 onNext={avancar} />}
          {passoAtual === 3 && <Passo3 onConcluir={concluir} />}
        </div>

      </div>
    </div>
  );
}