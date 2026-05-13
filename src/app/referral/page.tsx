// src/app/referral/page.tsx
// Página de indicações — mostra link, stats e créditos acumulados.

"use client";

import { useEffect, useState } from "react";
import { Gift, Copy, CheckCheck, Users, TrendingUp, DollarSign, ExternalLink } from "lucide-react";

const REFERRAL_CREDIT_LABEL = "R$10";

interface ReferralStats {
  clicks: number;
  signups: number;
  conversions: number;
  creditBRL: number;
}

interface ReferralData {
  code: string;
  referralLink: string;
  stats: ReferralStats;
}

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const stats = data?.stats;

  useEffect(() => {
    fetch("/api/referral")
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((payload) => {
        if (payload && typeof payload === "object" && "referralLink" in payload) {
          setData(payload as ReferralData);
          return;
        }

        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function copyLink() {
    if (!data?.referralLink) return;
    await navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-zinc-500 text-sm">Carregando...</div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-violet-400" />
          <h1 className="text-xl font-medium text-white">Programa de Indicação</h1>
        </div>
        <p className="text-sm text-zinc-400">
          Indique gestores de tráfego e ganhe <span className="text-violet-400 font-medium">{REFERRAL_CREDIT_LABEL} de crédito</span> por cada assinante que você trouxer.
        </p>
      </div>

      {/* Link de indicação */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
        <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Seu link de indicação</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 truncate">
            {data?.referralLink ?? "—"}
          </code>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors shrink-0"
          >
            {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
        <p className="text-xs text-zinc-600">Código: <span className="text-zinc-400 font-mono">{data?.code}</span></p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-zinc-500">
            <ExternalLink className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Cliques</span>
          </div>
          <p className="text-2xl font-medium text-white">{stats?.clicks ?? 0}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-zinc-500">
            <Users className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Cadastros</span>
          </div>
          <p className="text-2xl font-medium text-white">{stats?.signups ?? 0}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-zinc-500">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Conversões pagas</span>
          </div>
          <p className="text-2xl font-medium text-emerald-400">{stats?.conversions ?? 0}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-zinc-500">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Crédito acumulado</span>
          </div>
          <p className="text-2xl font-medium text-violet-400">
            {(stats?.creditBRL ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
      </div>

      {/* Como funciona */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <p className="text-sm font-medium text-white">Como funciona</p>
        <div className="space-y-3">
          {[
            { step: "1", label: "Compartilhe seu link com gestores de tráfego" },
            { step: "2", label: "Eles se cadastram e testam o Erizon por 7 dias grátis" },
            { step: "3", label: `Quando assinam qualquer plano, você recebe ${REFERRAL_CREDIT_LABEL} de crédito` },
            { step: "4", label: "Crédito é descontado automaticamente na sua próxima fatura" },
          ].map(({ step, label }) => (
            <div key={step} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-violet-900/50 border border-violet-700 text-violet-300 text-xs flex items-center justify-center shrink-0 font-medium">
                {step}
              </span>
              <p className="text-sm text-zinc-400 leading-relaxed">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sugestão de mensagem */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
        <p className="text-sm font-medium text-white">Mensagem pronta para compartilhar</p>
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">{`Tô usando o Erizon pra gerir as campanhas dos meus clientes e mudou muito o processo. A IA detecta campanhas problemáticas, sugere ações e aprende o perfil de cada cliente ao longo do tempo.

Tem 7 dias grátis pra testar:
${data?.referralLink ?? "..."}`}</p>
        </div>
        <button
          onClick={async () => {
            const msg = `Tô usando o Erizon pra gerir as campanhas dos meus clientes e mudou muito o processo. A IA detecta campanhas problemáticas, sugere ações e aprende o perfil de cada cliente ao longo do tempo.\n\nTem 7 dias grátis pra testar:\n${data?.referralLink ?? ""}`;
            await navigator.clipboard.writeText(msg);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
        >
          <Copy className="w-3 h-3" /> Copiar mensagem completa
        </button>
      </div>
    </div>
  );
}
