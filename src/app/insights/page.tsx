"use client";

// src/app/insights/page.tsx — Insights Instagram
// Seleciona cliente → busca dados reais via Graph API → exibe métricas orgânicas

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import PlanGate from "@/components/PlanGate";
import { getSupabase } from "@/lib/supabase";
import {
  Instagram, Eye, Heart, MessageCircle, Bookmark,
  Share2, Loader2, AlertTriangle, RefreshCw,
  Film, Grid3X3, Image, Users, BarChart3, Download,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Cliente {
  id: string;
  nome: string;
  cor?: string;
  ig_user_id?: string | null;
}

interface IGTimeline { date: string; reach: number; impressions: number; profile_views: number }
interface IGPost {
  id: string; caption: string; type: string; date: string;
  likes: number; comments: number; reach: number; impressions: number; saved: number; shares: number;
}
interface IGAudience {
  gender: { female: number; male: number };
  ages: { label: string; pct: number }[];
  topCities: string[];
}
interface IGData {
  account: { username: string; name: string; biography: string; followers_count: number; follows_count: number; media_count: number; profile_picture_url?: string };
  summary: { reach: number; impressions: number; profileViews: number; followers: number; mediaCount: number };
  timeline: IGTimeline[];
  topPosts: IGPost[];
  audience: IGAudience | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) { return n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}K` : String(n); }

function mediaLabel(type: string) {
  if (type === "VIDEO") return "Reels";
  if (type === "CAROUSEL_ALBUM") return "Carrossel";
  return "Foto";
}

function mediaIcon(type: string) {
  if (type === "VIDEO") return <Film size={10} className="text-purple-400" />;
  if (type === "CAROUSEL_ALBUM") return <Grid3X3 size={10} className="text-blue-400" />;
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image size={10} className="text-white/40" />;
}

// ─── SparkBar ─────────────────────────────────────────────────────────────────

function SparkBar({ data, color = "#6366f1" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-px h-7 mt-1">
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm transition-all"
          style={{ height: `${Math.max(10, (v/max)*100)}%`, background: color, opacity: 0.3 + (i/data.length)*0.7 }} />
      ))}
    </div>
  );
}

// ─── LineChart ────────────────────────────────────────────────────────────────

function LineChart({ data, color = "#6366f1" }: { data: IGTimeline[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const W = 600, H = 100, pad = { t: 8, r: 8, b: 22, l: 8 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const vals = data.map(d => d.reach);
  const max = Math.max(...vals, 1), min = Math.min(...vals);
  const pts = data.map((d, i) => ({
    x: pad.l + (i / (data.length - 1)) * iW,
    y: pad.t + iH - ((d.reach - min) / (max - min || 1)) * iH,
    label: d.date,
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L${pts[pts.length-1].x},${pad.t+iH} L${pts[0].x},${pad.t+iH} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs>
        <linearGradient id="igG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#igG)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.filter((_, i) => i % Math.ceil(pts.length / 6) === 0 || i === pts.length-1).map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="2.5" fill={color} />
          <text x={p.x} y={pad.t+iH+15} textAnchor="middle" fontSize="8" fill="#444" fontFamily="monospace">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, spark, color = "#6366f1", icon: Icon }:
  { label: string; value: string; sub?: string; spark?: number[]; color?: string; icon: React.ElementType }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-1.5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: color, opacity: 0.5 }} />
      <div className="flex items-center gap-1.5 text-[10px] text-white/30 uppercase tracking-widest">
        <Icon size={10} style={{ color }} />{label}
      </div>
      <div className="text-2xl font-bold text-white/90 font-mono">{value}</div>
      {sub && <div className="text-[11px]" style={{ color }}>{sub}</div>}
      {spark && spark.length > 0 && <SparkBar data={spark} color={color} />}
    </div>
  );
}

// ─── Painel de Insights ───────────────────────────────────────────────────────

function PainelInsights({ cliente }: { cliente: Cliente }) {
  const [igUserId, setIgUserId] = useState(cliente.ig_user_id ?? "");
  const [inputId, setInputId]   = useState(cliente.ig_user_id ?? "");
  const [salvando, setSalvando] = useState(false);
  const [period, setPeriod]     = useState<"7d"|"30d">("30d");
  const [subTab, setSubTab]     = useState<"overview"|"posts"|"audience">("overview");
  const [data, setData]         = useState<IGData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [erro, setErro]         = useState<string | null>(null);
  const [wl, setWl]             = useState<{ nome: string; logo: string | null }>({ nome: "Erizon", logo: null });
  const cor = cliente.cor ?? "#6366f1";

  // Buscar whitelabel
  useEffect(() => {
    const supabase = getSupabase();
    supabase.from("white_label_configs").select("nome_plataforma, logo_url").maybeSingle()
      .then(({ data }) => {
        if (data) setWl({ nome: data.nome_plataforma ?? "Erizon", logo: data.logo_url });
      });
  }, []);

  function exportarPDF() {
    window.print();
  }

  const buscar = useCallback(async (id: string) => {
    setLoading(true); setErro(null);
    try {
      const res  = await fetch(`/api/instagram?ig_user_id=${id}&period=${period}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao buscar dados");
      setData(json);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
    } finally { setLoading(false); }
  }, [period]);

  useEffect(() => { if (igUserId) buscar(igUserId); }, [igUserId, buscar]);

  async function salvarId() {
    if (!inputId.trim()) return;
    setSalvando(true);
    const supabase = getSupabase();
    await supabase.from("clientes").update({ ig_user_id: inputId.trim() }).eq("id", cliente.id);
    setIgUserId(inputId.trim());
    setSalvando(false);
  }

  // Sem ID configurado
  if (!igUserId) return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 flex flex-col items-center gap-5 text-center">
      <Instagram size={32} className="text-white/15" />
      <div>
        <p className="text-[13px] font-semibold text-white/60 mb-1">Configure o Instagram Business ID</p>
        <p className="text-[11px] text-white/30">Meta Business Suite → Configurações → Contas do Instagram → ID da conta</p>
      </div>
      <div className="flex items-center gap-2">
        <input value={inputId} onChange={e => setInputId(e.target.value)} placeholder="17841400000000000"
          className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[12px] text-white/80 font-mono w-52 focus:outline-none focus:border-purple-500/40" />
        <button onClick={salvarId} disabled={!inputId.trim() || salvando}
          className="px-4 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-[11px] font-semibold text-purple-400 hover:bg-purple-600/30 transition-all disabled:opacity-40">
          {salvando ? <Loader2 size={12} className="animate-spin" /> : "Salvar"}
        </button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-3 text-white/20">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-[12px]">Buscando dados via Graph API...</span>
    </div>
  );

  if (erro) return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-center gap-3">
      <AlertTriangle size={14} className="text-red-400 shrink-0" />
      <span className="text-[12px] text-red-400 flex-1">{erro}</span>
      <button onClick={() => buscar(igUserId)} className="text-[11px] text-white/30 hover:text-white flex items-center gap-1">
        <RefreshCw size={11} /> Tentar novamente
      </button>
    </div>
  );

  if (!data) return null;

  const { account, summary, timeline, topPosts, audience } = data;

  return (
    <div className="flex flex-col gap-5">
      {/* Header de impressão com whitelabel */}
      <div className="hidden print:flex items-center justify-between pb-4 mb-2 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {wl.logo
            ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={wl.logo} alt={wl.nome} className="h-8 object-contain" />
            )
            : <span className="text-[16px] font-black text-gray-900">{wl.nome}</span>
          }
        </div>
        <div className="text-right">
          <div className="text-[13px] font-semibold text-gray-700">Insights Instagram — {cliente.nome}</div>
          <div className="text-[11px] text-gray-400">Gerado em {new Date().toLocaleDateString("pt-BR")} · Período: {period === "7d" ? "7 dias" : "30 dias"}</div>
        </div>
      </div>

      {/* Header da conta */}
      <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
        {account.profile_picture_url
          ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.profile_picture_url} alt={account.username} className="w-11 h-11 rounded-full object-cover" />
          )
          : <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold" style={{ background: cor }}>{account.name?.[0]}</div>
        }
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white/90">@{account.username}</div>
          {account.biography && <div className="text-[11px] text-white/30 truncate">{account.biography}</div>}
        </div>
        <div className="flex gap-5 text-center shrink-0">
          {[["Seguidores", fmt(account.followers_count)], ["Seguindo", fmt(account.follows_count)], ["Posts", fmt(account.media_count)]].map(([l, v]) => (
            <div key={l}><div className="text-[14px] font-bold text-white/90 font-mono">{v}</div><div className="text-[10px] text-white/25">{l}</div></div>
          ))}
        </div>
      </div>

      {/* Subtabs + período */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(["overview","posts","audience"] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${subTab === t ? "bg-white/[0.08] text-white/90" : "text-white/30 hover:text-white/60"}`}>
              {t === "overview" ? "Visão Geral" : t === "posts" ? "Top Posts" : "Audiência"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {(["7d","30d"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-[11px] border transition-all ${period === p ? "border-white/[0.15] text-white/80 bg-white/[0.05]" : "border-transparent text-white/25 hover:text-white/50"}`}>
              {p === "7d" ? "7 dias" : "30 dias"}
            </button>
          ))}
          <button onClick={() => buscar(igUserId)} className="ml-1 p-1.5 text-white/20 hover:text-white/50 transition-all">
            <RefreshCw size={12} />
          </button>
          <button onClick={exportarPDF} className="no-print ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] font-medium text-white/50 hover:text-white hover:bg-white/[0.08] transition-all">
            <Download size={11} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* OVERVIEW */}
      {subTab === "overview" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Alcance" value={fmt(summary.reach)} sub="pessoas únicas" icon={Eye} color={cor} spark={timeline.slice(-14).map(d => d.reach)} />
            <MetricCard label="Impressões" value={fmt(summary.impressions)} sub="no período" icon={BarChart3} color="#7EB8C8" spark={timeline.slice(-14).map(d => d.impressions)} />
            <MetricCard label="Visitas ao Perfil" value={fmt(summary.profileViews)} sub="no período" icon={Users} color="#8AC87E" spark={timeline.slice(-14).map(d => d.profile_views)} />
            <MetricCard label="Seguidores" value={fmt(summary.followers)} sub={`${fmt(summary.mediaCount)} publicações`} icon={Instagram} color="#C87E9A" />
          </div>
          {timeline.length > 1 && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <div className="text-[12px] font-semibold text-white/60 mb-1">Evolução de Alcance</div>
              <div className="text-[10px] text-white/25 mb-3">Alcance diário no período</div>
              <LineChart data={timeline} color={cor} />
            </div>
          )}
        </div>
      )}

      {/* TOP POSTS */}
      {subTab === "posts" && (
        <div className="flex flex-col gap-2">
          {topPosts.length === 0 && <div className="text-center py-12 text-white/20 text-[12px]">Nenhum post encontrado</div>}
          {topPosts.map((post, i) => (
            <div key={post.id} className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:border-white/10 transition-all">
              <div className="w-6 h-6 rounded-lg bg-white/[0.04] flex items-center justify-center text-[10px] font-mono text-white/30 shrink-0">{i+1}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                    {mediaIcon(post.type)}<span className="text-[9px] text-white/40">{mediaLabel(post.type)}</span>
                  </div>
                  <span className="text-[10px] text-white/25 font-mono">{post.date}</span>
                </div>
                <div className="text-[12px] text-white/50 truncate">{post.caption || "—"}</div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {[
                  { icon: Eye,            val: post.reach,    color: cor,        label: "Alcance" },
                  { icon: Heart,          val: post.likes,    color: "#C87E9A",  label: "Curtidas" },
                  { icon: MessageCircle,  val: post.comments, color: "#7EB8C8",  label: "Comentários" },
                  { icon: Bookmark,       val: post.saved,    color: "#8AC87E",  label: "Salvos" },
                  { icon: Share2,         val: post.shares,   color: "#A97EC8",  label: "Shares" },
                ].map(({ icon: Icon, val, color, label }) => (
                  <div key={label} className="text-center">
                    <Icon size={10} style={{ color }} className="mx-auto mb-0.5" />
                    <div className="text-[12px] font-bold font-mono" style={{ color }}>{fmt(val)}</div>
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
        !audience ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/20">
            <Users size={24} />
            <div className="text-[12px] text-center max-w-xs">Dados demográficos não disponíveis. Verifique a permissão <code className="text-white/30">instagram_manage_insights</code>.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Faixas etárias */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <div className="text-[11px] font-semibold text-white/50 mb-4">Faixa Etária</div>
              {audience.ages.map(a => (
                <div key={a.label} className="mb-2.5">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-white/40">{a.label}</span>
                    <span style={{ color: cor }}>{a.pct}%</span>
                  </div>
                  <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${a.pct}%`, background: cor }} />
                  </div>
                </div>
              ))}
            </div>
            {/* Gênero */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <div className="text-[11px] font-semibold text-white/50 mb-4">Gênero</div>
              <div className="flex h-32 rounded-lg overflow-hidden gap-px">
                <div className="flex flex-col items-center justify-center gap-1 transition-all" style={{ width: `${audience.gender.female}%`, background: `${cor}25`, borderRight: `2px solid ${cor}50` }}>
                  <span className="text-base">♀</span>
                  <span className="text-[16px] font-bold font-mono" style={{ color: cor }}>{audience.gender.female}%</span>
                  <span className="text-[9px] text-white/30 uppercase tracking-wider">Feminino</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-1 flex-1 bg-white/[0.02]">
                  <span className="text-base">♂</span>
                  <span className="text-[16px] font-bold font-mono text-white/60">{audience.gender.male}%</span>
                  <span className="text-[9px] text-white/30 uppercase tracking-wider">Masculino</span>
                </div>
              </div>
            </div>
            {/* Top cidades */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <div className="text-[11px] font-semibold text-white/50 mb-4">Principais Cidades</div>
              {audience.topCities.map((city, i) => (
                <div key={city} className="flex items-center gap-3 mb-3">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-mono font-bold bg-white/[0.04]" style={{ color: cor }}>{i+1}</div>
                  <span className="text-[12px] text-white/60">{city}</span>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Editar IG User ID */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
        <span className="text-[10px] text-white/20">IG User ID:</span>
        <input value={inputId} onChange={e => setInputId(e.target.value)}
          className="px-2 py-0.5 bg-transparent border border-transparent hover:border-white/[0.06] focus:border-white/10 rounded text-[11px] text-white/30 font-mono focus:outline-none w-48" />
        {inputId !== igUserId && (
          <button onClick={salvarId} disabled={salvando} className="text-[10px] text-purple-400 hover:text-purple-300 transition-all">
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [clientes, setClientes]   = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [loadingC, setLoadingC]   = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("clientes")
        .select("id, nome, cor, ig_user_id")
        .order("nome");
      setClientes(data ?? []);
      setLoadingC(false);
    }
    load();
  }, []);

  const clienteAtual = clientes.find(c => c.id === clienteId);

  return (
    <PlanGate minPlan="command" feature="Insights Instagram">
      <div className="flex min-h-screen bg-[#090909] text-white">
      <style jsx global>{`
        @media print {
          body { background: #fff !important; color: #111 !important; }
          .no-print { display: none !important; }
          aside, nav { display: none !important; }
          main { margin-left: 0 !important; }
          .print-header { display: flex !important; }
          .bg-\[\#090909\] { background: #fff !important; }
          .bg-white\/\[0\.02\] { background: #f9f9f9 !important; border: 1px solid #e5e5e5 !important; }
          .text-white\/90, .text-white\/80, .text-white\/70, .text-white\/60, .text-white\/50 { color: #111 !important; }
          .text-white\/40, .text-white\/30, .text-white\/25, .text-white\/20 { color: #666 !important; }
          .border-white\/\[0\.06\], .border-white\/\[0\.05\] { border-color: #e5e5e5 !important; }
        }
        .print-header { display: none; }
      `}</style>
      <Sidebar />
      <main className="flex-1 md:ml-[60px] pb-20 md:pb-0 flex flex-col">
        {/* Header de impressão */}
        <div className="print-header items-center justify-between px-8 py-6 border-b border-gray-200 mb-2">
          <div className="flex items-center gap-3">
            {/* Logo whitelabel ou nome */}
            <div className="text-[18px] font-black text-gray-900">
              {/* wl é acessado via closure no PainelInsights */}
              Insights Instagram
            </div>
          </div>
          <div className="text-right text-[11px] text-gray-500">
            <div>Gerado em {new Date().toLocaleDateString("pt-BR")}</div>
          </div>
        </div>
        {/* Header */}
        <div className="no-print px-6 py-5 border-b border-white/[0.05]">
          <div className="flex items-center gap-2 mb-1">
            <Instagram size={16} className="text-pink-400" />
            <h1 className="text-[15px] font-semibold text-white/90">Insights Instagram</h1>
          </div>
          <p className="text-[12px] text-white/30">Dados orgânicos reais via Graph API — por cliente</p>
        </div>

        <div className="flex-1 px-6 py-6 flex flex-col gap-6 max-w-5xl w-full">
          {/* Seletor de cliente */}
          {loadingC ? (
            <div className="flex items-center gap-2 text-white/20">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-[12px]">Carregando clientes...</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {clientes.map(c => (
                <button key={c.id} onClick={() => setClienteId(c.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium border transition-all ${
                    clienteId === c.id
                      ? "border-white/20 bg-white/[0.06] text-white/90"
                      : "border-white/[0.06] text-white/40 hover:text-white/70 hover:border-white/10"
                  }`}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.cor ?? "#6366f1" }} />
                  {c.nome}
                  {c.ig_user_id && <Instagram size={10} className="text-pink-400/60" />}
                </button>
              ))}
            </div>
          )}

          {/* Painel de Insights */}
          {!clienteId ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-white/15">
              <Instagram size={36} />
              <p className="text-[13px]">Selecione um cliente para ver os Insights</p>
            </div>
          ) : clienteAtual ? (
            <PainelInsights key={clienteId} cliente={clienteAtual} />
          ) : null}
        </div>
      </main>
      </div>
    </PlanGate>
  );
}
