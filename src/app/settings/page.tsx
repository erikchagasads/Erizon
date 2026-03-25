"use client";

import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {
  Sparkles, Bell, Shield, Link2,
  ChevronRight, Zap, User,
} from "lucide-react";

const ITEMS = [
  {
    href: "/settings/plano",
    icon: Zap,
    label: "Plano & Billing",
    descricao: "Gerencie sua assinatura, faça upgrade ou cancele.",
    badge: null,
    cor: "text-fuchsia-400",
    bg: "bg-fuchsia-500/[0.06]",
    border: "border-fuchsia-500/20",
    badgeCor: "",
  },
  {
    href: "/settings/integracoes",
    icon: Link2,
    label: "Integrações",
    descricao: "Conecte o Meta Ads e configure o token de acesso.",
    badge: null,
    cor: "text-emerald-400",
    bg: "bg-emerald-500/[0.05]",
    border: "border-emerald-500/15",
    badgeCor: "",
  },
  {
    href: "/settings/notificacoes",
    icon: Bell,
    label: "Notificações",
    descricao: "Alertas via Telegram, e-mail e push.",
    badge: null,
    cor: "text-amber-400",
    bg: "bg-amber-500/[0.05]",
    border: "border-amber-500/15",
    badgeCor: "",
  },
  {
    href: "/settings/conta",
    icon: User,
    label: "Conta",
    descricao: "Dados pessoais, senha e preferências da conta.",
    badge: null,
    cor: "text-blue-400",
    bg: "bg-blue-500/[0.05]",
    border: "border-blue-500/15",
    badgeCor: "",
  },
  {
    href: "/settings/white-label",
    icon: Sparkles,
    label: "White Label",
    descricao: "Personalize a plataforma com sua marca, cores e domínio próprio.",
    badge: "Command",
    cor: "text-purple-400",
    bg: "bg-purple-500/[0.07]",
    border: "border-purple-500/20",
    badgeCor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
  {
    href: "/settings/seguranca",
    icon: Shield,
    label: "Segurança",
    descricao: "Autenticação em dois fatores e sessões ativas.",
    badge: null,
    cor: "text-rose-400",
    bg: "bg-rose-500/[0.05]",
    border: "border-rose-500/15",
    badgeCor: "",
  },
];

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-[#060609] text-white">
      <Sidebar/>
      <main className="md:ml-[60px] pb-20 md:pb-0 flex-1 px-8 py-8 max-w-3xl">

        <div className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-1">Erizon</p>
          <h1 className="text-[24px] font-bold text-white">Configurações</h1>
          <p className="text-[13px] text-white/30 mt-1">Gerencie sua conta, integrações e personalização da plataforma.</p>
        </div>

        <div className="space-y-3">
          {ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-5 px-5 py-4 rounded-2xl border ${item.border} ${item.bg} hover:opacity-90 transition-all text-left group`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.06] shrink-0`}>
                  <Icon size={16} className={item.cor}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[14px] font-semibold text-white">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${item.badgeCor} uppercase tracking-wider`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-white/35">{item.descricao}</p>
                </div>
                <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors shrink-0"/>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}