"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  TrendingUp,
  DollarSign,
  Target,
  Loader2,
  AlertTriangle,
  Shield,
  Users,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";

interface Campanha {
  nome_campanha: string;
  status: string;
  gasto_total: number;
  total_leads: number;
  cpl: number;
  ctr: number;
  score: number;
  recomendacao: string;
}

interface LeadsData {
  total: number;
  total_fechado: number;
}

interface PortalData {
  nome: string;
  cor: string;
  campanhas: Campanha[];
  total_leads: number;
  gasto_total: number;
  cpl_medio: number;
  campanhas_ativas: number;
  ultima_atualizacao: string | null;
  crm_token?: string | null;
  business?: {
    spend30d: number;
    closedRevenue30d: number;
    roiMultiple: number | null;
  };
}

const fmtBRL = (value: number) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (value: number) => value.toLocaleString("pt-BR");
const fmtCompact = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
};

function MetricCard({ icon: Icon, label, value, sublabel, trend }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sublabel?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-purple-500/15">
          <Icon size={18} className="text-purple-400" />
        </div>
        <span className="text-[11px] uppercase tracking-[0.14em] text-white/40">{label}</span>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <p className="text-3xl font-black text-white">{value}</p>
        {trend && (
          <ArrowUpRight
            size={14}
            className={`shrink-0 ${trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-white/30"}`}
          />
        )}
      </div>
      {sublabel && <p className="mt-2 text-[11px] text-white/30">{sublabel}</p>}
    </div>
  );
}

function PortalPublicoInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const clienteId = params?.clienteId as string;
  const crmTokenParam = searchParams?.get("crm");

  const [data, setData] = useState<PortalData | null>(null);
  const [leads, setLeads] = useState<LeadsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const crmToken = crmTokenParam ?? data?.crm_token ?? null;

  useEffect(() => {
    if (!clienteId) return;

    Promise.all([
      fetch(`/api/cliente-publico/${clienteId}`),
      fetch(`/api/cliente-publico/${clienteId}/leads`),
    ])
      .then(async ([r1, r2]) => {
        if (!r1.ok) {
          const payload = await r1.json();
          throw new Error(payload.error ?? "Nao encontrado");
        }
        const [portalData, leadsData] = await Promise.all([r1.json(), r2.ok ? r2.json() : null]);
        setData(portalData as PortalData);
        if (leadsData) setLeads(leadsData as LeadsData);
      })
      .catch((error: Error) => setErro(error.message))
      .finally(() => setLoading(false));
  }, [clienteId]);

  const atualizado = data?.ultima_atualizacao
    ? new Date(data.ultima_atualizacao).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const roi = data.business?.roiMultiple;
  const faturamento = data.business?.closedRevenue30d ?? leads?.total_fechado ?? 0;
  const investimento = data.gasto_total;

  return (
    <div className="min-h-screen bg-[#040406] text-white">
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            {data && (
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: data.cor }}
              >
                {data.nome.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-semibold text-white">{data ? data.nome : "Portal do Cliente"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-white/25">
            <Shield size={11} />
            Powered by Erizon
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={24} className="animate-spin text-purple-400" />
          </div>
        ) : erro ? (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <AlertTriangle size={32} className="text-red-400/60" />
            <p className="text-sm text-white/40">Este portal nao esta disponivel.</p>
            <p className="text-xs text-white/20">{erro}</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">{data.nome}</h1>
                {atualizado && <p className="mt-1 text-[12px] text-white/30">Atualizado em {atualizado}</p>}
              </div>
            </div>

            {/* HERO: 4 metricas essenciais */}
            <div className="grid gap-4 md:grid-cols-2">
              <MetricCard
                icon={TrendingUp}
                label="Custo por Lead"
                value={data.cpl_medio > 0 ? `R$ ${fmtBRL(data.cpl_medio)}` : "—"}
                sublabel="Quanto custa cada lead gerado"
                trend={data.cpl_medio > 0 ? "neutral" : undefined}
              />
              <MetricCard
                icon={DollarSign}
                label="Faturamento Real"
                value={faturamento > 0 ? `R$ ${fmtCompact(faturamento)}` : "—"}
                sublabel="Valor fechado no ultimo mes"
                trend={faturamento > 0 ? "up" : undefined}
              />
              <MetricCard
                icon={Target}
                label="ROI"
                value={roi ? `${roi.toFixed(1)}x` : faturamento && investimento ? `R$ ${(faturamento / investimento).toFixed(1)} por R$ 1` : "—"}
                sublabel="Retorno sobre investimento"
                trend={roi && roi > 1 ? "up" : roi && roi < 1 ? "down" : undefined}
              />
              <MetricCard
                icon={Users}
                label="Total de Leads"
                value={fmtNum(data.total_leads)}
                sublabel="Leads gerados pelas campanhas"
              />
            </div>

            {/* CRM Access */}
            {crmToken && (
              <a
                href={`/crm/cliente/${crmToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-full items-center justify-between rounded-2xl border border-indigo-500/25 bg-indigo-500/10 px-5 py-4 transition-colors hover:bg-indigo-500/15"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20">
                    <Users size={16} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Acessar meu CRM</p>
                    <p className="text-[11px] text-white/40">Veja seus leads e registre fechamentos</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-white/30 transition-colors group-hover:text-white/60" />
              </a>
            )}

            {/* Resumo campanhas */}
            {data.campanhas.length > 0 && (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h2 className="text-sm font-semibold text-white">Resumo das Campanhas</h2>
                <p className="mt-0.5 text-[11px] text-white/30">{data.campanhas_ativas} campanhas ativas gerando resultado</p>
                <div className="mt-4 space-y-3">
                  {data.campanhas.slice(0, 3).map((campanha, index) => (
                    <div key={`${campanha.nome_campanha}-${index}`} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{campanha.nome_campanha}</p>
                        <p className="text-[11px] text-white/40">{fmtNum(campanha.total_leads)} leads · CPL R$ {fmtBRL(campanha.cpl)}</p>
                      </div>
                      <span className={`text-[11px] font-semibold ${campanha.score >= 70 ? "text-emerald-400" : campanha.score >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                        {campanha.score}/100
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
              <Shield size={13} className="mt-0.5 shrink-0 text-white/20" />
              <p className="text-[11px] leading-relaxed text-white/25">
                Dados atualizados em tempo real. Dúvidas? Fale com seu gestor.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function PortalPublico() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#040406] flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
        </div>
      }
    >
      <PortalPublicoInner />
    </Suspense>
  );
}
