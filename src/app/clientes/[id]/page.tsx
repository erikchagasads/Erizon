"use client";

// src/app/clientes/[id]/page.tsx — Perfil do Cliente + Aba Instagram
// Aba Instagram busca dados reais via Graph API através de /api/instagram

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getSupabase } from "@/lib/supabase";
import {
  ArrowLeft, Instagram, BarChart3, Users, Eye, Heart,
  MessageCircle, Bookmark, Share2, Loader2,
  AlertTriangle, RefreshCw, ExternalLink, Image, Film, Grid3X3, Dna,
} from "lucide-react";
import { ProfitDNA } from "@/components/dados/ProfitDNA";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface Cliente {
  id: string;
  nome: string;
  cor: string;
  meta_account_id?: string;
  ig_user_id?: string;
  facebook_pixel_id?: string | null;
  whatsapp?: string | null;
  crm_token?: string | null;
  ticket_medio?: number;
  investimento_mensal?: number;
  campanhas_ativas?: number;
  cpl_medio?: number;
  roas_medio?: number;
  integracoes?: string[];
}

interface IGSummary {
  reach: number;
  impressions: number;
  profileViews: number;
  followers: number;
  mediaCount: number;
}

interface IGAccount {
  username: string;
  name: string;
  biography: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  profile_picture_url?: string;
  website?: string;
}

interface IGPost {
  id: string;
  caption: string;
  type: string;
  date: string;
  likes: number;
  comments: number;
  reach: number;
  impressions: number;
  saved: number;
  shares: number;
}

interface IGTimeline {
  date: string;
  reach: number;
  impressions: number;
  profile_views: number;
}

interface IGAudience {
  gender: { female: number; male: number };
  ages: { label: string; pct: number }[];
  topCities: string[];
}

interface IGData {
  account: IGAccount;
  summary: IGSummary;
  timeline: IGTimeline[];
  topPosts: IGPost[];
  audience: IGAudience | null;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

function mediaTypeIcon(type: string) {
  if (type === "VIDEO") return <Film size={11} className="text-purple-400" />;
  if (type === "CAROUSEL_ALBUM") return <Grid3X3 size={11} className="text-blue-400" />;
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image size={11} className="text-white/40" />;
}

function mediaTypeLabel(type: string) {
  if (type === "VIDEO") return "Reels";
  if (type === "CAROUSEL_ALBUM") return "Carrossel";
  return "Foto";
}

// ─── MINI SPARK BAR ───────────────────────────────────────────────────────────

function SparkBar({ data, color = "#6366f1" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-px h-8">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{
            height: `${Math.max(8, (v / max) * 100)}%`,
            background: color,
            opacity: 0.3 + (i / data.length) * 0.7,
          }}
        />
      ))}
    </div>
  );
}

// ─── MINI LINE CHART SVG ──────────────────────────────────────────────────────

function LineChart({ data, color = "#6366f1" }: { data: IGTimeline[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const W = 600, H = 120, pad = { t: 8, r: 8, b: 24, l: 8 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;
  const vals = data.map(d => d.reach);
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals);
  const pts = data.map((d, i) => ({
    x: pad.l + (i / (data.length - 1)) * iW,
    y: pad.t + iH - ((d.reach - min) / (max - min || 1)) * iH,
    label: d.date,
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L${pts[pts.length - 1].x},${pad.t + iH} L${pts[0].x},${pad.t + iH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs>
        <linearGradient id="igGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#igGrad)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.filter((_, i) => i % Math.ceil(pts.length / 7) === 0 || i === pts.length - 1).map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="2.5" fill={color} />
          <text x={p.x} y={pad.t + iH + 16} textAnchor="middle" fontSize="8" fill="#444" fontFamily="monospace">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── METRIC CARD ──────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, spark, color = "#6366f1", icon: Icon,
}: {
  label: string; value: string; sub?: string;
  spark?: number[]; color?: string; icon: React.ElementType;
}) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: color, opacity: 0.5 }} />
      <div className="flex items-center gap-1.5 text-[10px] text-white/30 uppercase tracking-widest">
        <Icon size={10} style={{ color }} />
        {label}
      </div>
      <div className="text-2xl font-bold text-white/90 font-mono">{value}</div>
      {sub && <div className="text-[11px]" style={{ color }}>{sub}</div>}
      {spark && spark.length > 0 && <SparkBar data={spark} color={color} />}
    </div>
  );
}

// ─── ABA INSTAGRAM ────────────────────────────────────────────────────────────

function AbaInstagram({ igUserId, cor }: { igUserId: string; cor: string }) {
  const [period, setPeriod]     = useState<"7d" | "30d" | "90d">("30d");
  const [data, setData]         = useState<IGData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [subTab, setSubTab]     = useState<"overview" | "posts" | "audience">("overview");

  const buscar = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/instagram?ig_user_id=${igUserId}&period=${period}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao buscar dados");
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [igUserId, period]);

  useEffect(() => { buscar(); }, [buscar]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-white/20">
      <Loader2 size={24} className="animate-spin" />
      <span className="text-[12px]">Buscando dados via Graph API...</span>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertTriangle size={20} className="text-red-400" />
      </div>
      <div className="text-[13px] text-white/50 text-center max-w-sm">{error}</div>
      <button onClick={buscar} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[12px] text-white/50 hover:text-white transition-all">
        <RefreshCw size={12} /> Tentar novamente
      </button>
    </div>
  );

  if (!data) return null;

  const { account, summary, timeline, topPosts, audience } = data;

  return (
    <div className="flex flex-col gap-6">

      {/* Header da conta */}
      <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
        {account.profile_picture_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={account.profile_picture_url} alt={account.username} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: cor }}>
            {account.name?.[0] ?? "I"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-white/90">@{account.username}</span>
            {account.website && (
              <a href={account.website} target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-white/50 transition-all">
                <ExternalLink size={11} />
              </a>
            )}
          </div>
          {account.biography && (
            <div className="text-[11px] text-white/30 mt-0.5 truncate">{account.biography}</div>
          )}
        </div>
        <div className="flex items-center gap-6 text-center shrink-0">
          {[
            ["Seguidores", fmt(account.followers_count)],
            ["Seguindo", fmt(account.follows_count)],
            ["Posts", fmt(account.media_count)],
          ].map(([label, val]) => (
            <div key={label}>
              <div className="text-[15px] font-bold text-white/90 font-mono">{val}</div>
              <div className="text-[10px] text-white/25">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Período + Subtabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(["overview", "posts", "audience"] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                subTab === t
                  ? "bg-white/[0.08] text-white/90"
                  : "text-white/30 hover:text-white/60"
              }`}>
              {t === "overview" ? "Visão Geral" : t === "posts" ? "Top Posts" : "Audiência"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {(["7d", "30d", "90d"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                period === p
                  ? "border-white/[0.15] text-white/80 bg-white/[0.05]"
                  : "border-transparent text-white/25 hover:text-white/50"
              }`}>
              {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "90 dias"}
            </button>
          ))}
          <button onClick={buscar} className="ml-2 p-1.5 rounded-lg text-white/20 hover:text-white/50 transition-all">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* OVERVIEW */}
      {subTab === "overview" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Alcance" value={fmt(summary.reach)} sub="pessoas únicas" icon={Eye} color={cor}
              spark={timeline.slice(-14).map(d => d.reach)} />
            <MetricCard label="Impressões" value={fmt(summary.impressions)} sub="no período" icon={BarChart3} color="#7EB8C8"
              spark={timeline.slice(-14).map(d => d.impressions)} />
            <MetricCard label="Visitas ao Perfil" value={fmt(summary.profileViews)} sub="no período" icon={Users} color="#8AC87E"
              spark={timeline.slice(-14).map(d => d.profile_views)} />
            <MetricCard label="Seguidores" value={fmt(summary.followers)} sub={`${fmt(summary.mediaCount)} publicações`} icon={Instagram} color="#C87E9A" />
          </div>

          {/* Gráfico de alcance */}
          {timeline.length > 1 && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[12px] font-semibold text-white/70">Evolução de Alcance</div>
                  <div className="text-[10px] text-white/25 mt-0.5">Alcance diário no período</div>
                </div>
                <div className="text-[10px] text-white/20 font-mono">— alcance</div>
              </div>
              <LineChart data={timeline} color={cor} />
            </div>
          )}
        </div>
      )}

      {/* TOP POSTS */}
      {subTab === "posts" && (
        <div className="flex flex-col gap-2">
          {topPosts.length === 0 && (
            <div className="text-center py-12 text-white/20 text-[12px]">Nenhum post encontrado no período</div>
          )}
          {topPosts.map((post, i) => (
            <div key={post.id} className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:border-white/10 transition-all">
              <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-[11px] font-mono text-white/30 shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                    {mediaTypeIcon(post.type)}
                    <span className="text-[10px] text-white/40">{mediaTypeLabel(post.type)}</span>
                  </div>
                  <span className="text-[10px] text-white/25 font-mono">{post.date}</span>
                </div>
                <div className="text-[12px] text-white/50 truncate">{post.caption || "—"}</div>
              </div>
              <div className="flex items-center gap-5 shrink-0">
                {[
                  { icon: Eye,        val: post.reach,      label: "Alcance",    color: cor },
                  { icon: Heart,      val: post.likes,      label: "Curtidas",   color: "#C87E9A" },
                  { icon: MessageCircle, val: post.comments, label: "Comentários", color: "#7EB8C8" },
                  { icon: Bookmark,   val: post.saved,      label: "Salvos",     color: "#8AC87E" },
                  { icon: Share2,     val: post.shares,     label: "Shares",     color: "#A97EC8" },
                ].map(({ icon: Icon, val, label, color }) => (
                  <div key={label} className="text-center">
                    <div className="flex items-center justify-center mb-0.5">
                      <Icon size={10} style={{ color }} />
                    </div>
                    <div className="text-[13px] font-bold font-mono" style={{ color }}>{fmt(val)}</div>
                    <div className="text-[9px] text-white/20">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AUDIÊNCIA */}
      {subTab === "audience" && (
        <>
          {!audience ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/20">
              <Users size={24} />
              <div className="text-[12px] text-center max-w-xs">
                Dados demográficos não disponíveis. Verifique se a conta tem permissão <code className="text-white/30">instagram_manage_insights</code>.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Faixa etária */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <div className="text-[11px] font-semibold text-white/50 mb-4">Faixa Etária</div>
                <div className="flex flex-col gap-2.5">
                  {audience.ages.map(a => (
                    <div key={a.label}>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-white/40">{a.label}</span>
                        <span style={{ color: cor }}>{a.pct}%</span>
                      </div>
                      <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${a.pct}%`, background: cor }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gênero */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <div className="text-[11px] font-semibold text-white/50 mb-4">Gênero</div>
                <div className="flex h-36 rounded-lg overflow-hidden gap-px">
                  <div className="flex flex-col items-center justify-center gap-1 transition-all" style={{ width: `${audience.gender.female}%`, background: `${cor}30`, borderRight: `2px solid ${cor}` }}>
                    <span className="text-lg">♀</span>
                    <span className="text-[18px] font-bold font-mono" style={{ color: cor }}>{audience.gender.female}%</span>
                    <span className="text-[9px] text-white/30 uppercase tracking-wider">Feminino</span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1 flex-1 bg-white/[0.02]">
                    <span className="text-lg">♂</span>
                    <span className="text-[18px] font-bold font-mono text-white/60">{audience.gender.male}%</span>
                    <span className="text-[9px] text-white/30 uppercase tracking-wider">Masculino</span>
                  </div>
                </div>
              </div>

              {/* Top cidades */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <div className="text-[11px] font-semibold text-white/50 mb-4">Principais Cidades</div>
                <div className="flex flex-col gap-3">
                  {audience.topCities.map((city, i) => (
                    <div key={city} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-mono font-bold bg-white/[0.04]" style={{ color: cor }}>
                        {i + 1}
                      </div>
                      <span className="text-[12px] text-white/60">{city}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [aba, setAba]         = useState<"overview" | "dna" | "instagram">("overview");
  const [igUserId, setIgUserId] = useState("");
  const [salvandoIg, setSalvandoIg] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const [{ data: clienteData }, { data: campanhasData }] = await Promise.all([
        supabase
          .from("clientes")
          .select("id, nome, cor, meta_account_id, ig_user_id, ticket_medio, facebook_pixel_id, whatsapp, crm_token")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("metricas_ads")
          .select("gasto_total, contatos, roas, status")
          .eq("cliente_id", id),
      ]);

      if (!clienteData) {
        setCliente(null);
        setIgUserId("");
        setLoading(false);
        return;
      }

      const campanhas = campanhasData ?? [];
      const campanhasAtivas = campanhas.filter((campanha) =>
        ["ATIVO", "ACTIVE", "ATIVA", "ativo"].includes(String(campanha.status ?? "")),
      );
      const investimentoMensal = campanhas.reduce(
        (total, campanha) => total + (Number(campanha.gasto_total) || 0),
        0,
      );
      const totalLeads = campanhas.reduce(
        (total, campanha) => total + (Number(campanha.contatos) || 0),
        0,
      );
      const roasValidos = campanhas
        .map((campanha) => Number(campanha.roas))
        .filter((roas) => Number.isFinite(roas) && roas > 0);
      const integracoes = [
        clienteData.meta_account_id ? "Meta Ads" : null,
        clienteData.ig_user_id ? "Instagram Insights" : null,
        clienteData.facebook_pixel_id ? "Meta Pixel" : null,
        clienteData.whatsapp ? "WhatsApp" : null,
        clienteData.crm_token ? "CRM" : null,
      ].filter((item): item is string => Boolean(item));

      const clienteCompleto: Cliente = {
        ...clienteData,
        investimento_mensal: investimentoMensal,
        campanhas_ativas: campanhasAtivas.length,
        cpl_medio: totalLeads > 0 ? investimentoMensal / totalLeads : undefined,
        roas_medio: roasValidos.length > 0
          ? roasValidos.reduce((sum, roas) => sum + roas, 0) / roasValidos.length
          : undefined,
        integracoes,
      };

      setCliente(clienteCompleto);
      setIgUserId(clienteData.ig_user_id ?? "");
      setLoading(false);
    }
    load();
  }, [id]);

  async function salvarIgUserId() {
    if (!cliente) return;
    setSalvandoIg(true);
    const supabase = getSupabase();
    await supabase.from("clientes").update({ ig_user_id: igUserId.trim() || null }).eq("id", cliente.id);
    setCliente(prev => prev ? { ...prev, ig_user_id: igUserId.trim() || undefined } : prev);
    setSalvandoIg(false);
  }

  if (loading) return (
    <div className="flex min-h-screen bg-[#090909]">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-white/20" />
      </div>
    </div>
  );

  if (!cliente) return (
    <div className="flex min-h-screen bg-[#090909]">
      <Sidebar />
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/20">
        <AlertTriangle size={24} />
        <span className="text-[13px]">Cliente não encontrado</span>
        <button onClick={() => router.push("/clientes")} className="text-[12px] text-white/30 hover:text-white transition-all">← Voltar</button>
      </div>
    </div>
  );

  const temIg = !!cliente.ig_user_id;

  return (
    <div className="flex min-h-screen bg-[#090909] text-white">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.05]">
          <button onClick={() => router.push("/clientes")} className="p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/[0.04] transition-all">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold" style={{ background: cliente.cor }}>
              {cliente.nome[0].toUpperCase()}
            </div>
            <div>
              <div className="text-[14px] font-semibold text-white/90">{cliente.nome}</div>
              {cliente.meta_account_id && (
                <div className="text-[10px] text-white/25 font-mono">Meta: {cliente.meta_account_id}</div>
              )}
            </div>
          </div>

          {/* Abas */}
          <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/[0.05]">
            <button onClick={() => setAba("overview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                aba === "overview" ? "bg-white/[0.08] text-white/90" : "text-white/30 hover:text-white/60"
              }`}>
              <BarChart3 size={11} /> Visão Geral
            </button>
            <button onClick={() => setAba("dna")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                aba === "dna" ? "bg-white/[0.08] text-white/90" : "text-white/30 hover:text-white/60"
              }`}>
              <Dna size={11} className={aba === "dna" ? "text-fuchsia-400" : ""} />
              Profit DNA
            </button>
            <button onClick={() => setAba("instagram")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                aba === "instagram" ? "bg-white/[0.08] text-white/90" : "text-white/30 hover:text-white/60"
              }`}>
              <Instagram size={11} className={temIg ? "text-pink-400" : ""} />
              Instagram
              {!temIg && <span className="text-[9px] text-amber-400/70">config</span>}
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-6 py-6">

          {/* ABA OVERVIEW — métricas reais do cliente */}
          {aba === "overview" && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  {
                    label: "Investimento",
                    value: typeof cliente.investimento_mensal === "number"
                      ? `R$ ${cliente.investimento_mensal.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                      : "—",
                  },
                  {
                    label: "Campanhas ativas",
                    value: cliente.campanhas_ativas ?? "—",
                  },
                  {
                    label: "CPL médio",
                    value: typeof cliente.cpl_medio === "number"
                      ? `R$ ${cliente.cpl_medio.toFixed(2)}`
                      : "—",
                  },
                  {
                    label: "ROAS médio",
                    value: typeof cliente.roas_medio === "number"
                      ? `${cliente.roas_medio.toFixed(1)}x`
                      : "—",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <span className="text-[11px] uppercase tracking-wider text-white/40">
                      {item.label}
                    </span>
                    <span className="text-xl font-semibold text-white">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h3 className="mb-3 text-[13px] font-medium text-white/60">
                  Integrações conectadas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(cliente.integracoes ?? []).length === 0 ? (
                    <span className="text-[12px] text-white/30">
                      Nenhuma integração configurada
                    </span>
                  ) : (
                    (cliente.integracoes ?? []).map((integ) => (
                      <span
                        key={integ}
                        className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-medium text-emerald-400"
                      >
                        {integ}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="py-4 text-center">
                <a
                  href={`/analytics?cliente=${id}`}
                  className="text-[12px] text-white/30 underline underline-offset-2 transition-colors hover:text-white/60"
                >
                  Ver analytics completo →
                </a>
              </div>
            </div>
          )}

          {/* ABA PROFIT DNA */}
          {aba === "dna" && (
            <ProfitDNA clientId={id!} clientName={cliente.nome} />
          )}

          {/* ABA INSTAGRAM */}
          {aba === "instagram" && (
            <>
              {/* Configuração do IG User ID */}
              {!temIg && (
                <div className="mb-6 p-4 bg-amber-500/[0.05] border border-amber-500/20 rounded-xl flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-[12px] font-semibold text-amber-400 mb-1">Configure o Instagram Business ID</div>
                    <div className="text-[11px] text-white/30">
                      Encontre o ID em: Meta Business Suite → Configurações → Contas do Instagram → ID da conta
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      value={igUserId}
                      onChange={e => setIgUserId(e.target.value)}
                      placeholder="17841400000000000"
                      className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[12px] text-white/80 font-mono w-48 focus:outline-none focus:border-amber-500/40"
                    />
                    <button
                      onClick={salvarIgUserId}
                      disabled={!igUserId.trim() || salvandoIg}
                      className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-[11px] font-semibold text-amber-400 hover:bg-amber-500/30 transition-all disabled:opacity-40"
                    >
                      {salvandoIg ? <Loader2 size={12} className="animate-spin" /> : "Salvar"}
                    </button>
                  </div>
                </div>
              )}

              {temIg ? (
                <AbaInstagram igUserId={cliente.ig_user_id!} cor={cliente.cor} />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-white/20">
                  <Instagram size={32} />
                  <div className="text-[13px]">Configure o Instagram Business ID acima para ver os dados</div>
                </div>
              )}

              {/* Editar IG User ID já configurado */}
              {temIg && (
                <div className="mt-6 pt-4 border-t border-white/[0.05] flex items-center gap-3">
                  <span className="text-[10px] text-white/20">IG User ID:</span>
                  <input
                    value={igUserId}
                    onChange={e => setIgUserId(e.target.value)}
                    className="px-2 py-1 bg-transparent border border-transparent hover:border-white/[0.06] focus:border-white/[0.1] rounded text-[11px] text-white/30 font-mono focus:outline-none w-48"
                  />
                  {igUserId !== cliente.ig_user_id && (
                    <button onClick={salvarIgUserId} disabled={salvandoIg}
                      className="text-[10px] text-blue-400 hover:text-blue-300 transition-all">
                      {salvandoIg ? "Salvando..." : "Salvar"}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
