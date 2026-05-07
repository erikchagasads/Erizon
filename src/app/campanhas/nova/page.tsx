"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useCliente } from "@/app/hooks/useCliente";
import Sidebar from "@/components/Sidebar";
import { getSupabase } from "@/lib/supabase";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  FileUp,
  Gauge,
  Globe,
  ImageIcon,
  Info,
  Layers,
  Link as LinkIcon,
  Loader2,
  MapPin,
  Monitor,
  MousePointerClick,
  RefreshCw,
  Rocket,
  Save,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Target,
  Users,
  Video,
  XCircle,
} from "lucide-react";
import type { PreflightResult, PreflightRisk } from "@/core/preflight-engine";

const OBJETIVOS = [
  { id: "LEADS", label: "Leads", sub: "Formulario, WhatsApp ou landing" },
  { id: "SALES", label: "Vendas", sub: "Compra, checkout ou catalogo" },
  { id: "TRAFFIC", label: "Trafego", sub: "Cliques qualificados" },
  { id: "AWARENESS", label: "Reconhecimento", sub: "Alcance e lembranca" },
  { id: "ENGAGEMENT", label: "Engajamento", sub: "Post, mensagem ou perfil" },
];

const FORMATOS = [
  { id: "video", label: "Video", icon: Video },
  { id: "imagem", label: "Imagem", icon: ImageIcon },
  { id: "carrossel", label: "Carrossel", icon: Layers },
];

const CTAS = [
  { id: "LEARN_MORE", label: "Saiba mais" },
  { id: "SIGN_UP", label: "Cadastre-se" },
  { id: "CONTACT_US", label: "Fale conosco" },
  { id: "WHATSAPP_MESSAGE", label: "Enviar mensagem" },
  { id: "SHOP_NOW", label: "Comprar agora" },
];

const PLACEMENTS = [
  { id: "facebook_feed", label: "Facebook Feed", group: "Facebook" },
  { id: "facebook_video_feeds", label: "Video Feeds", group: "Facebook" },
  { id: "facebook_marketplace", label: "Marketplace", group: "Facebook" },
  { id: "instagram_feed", label: "Instagram Feed", group: "Instagram" },
  { id: "instagram_stories", label: "Stories", group: "Instagram" },
  { id: "instagram_reels", label: "Reels", group: "Instagram" },
  { id: "messenger_inbox", label: "Messenger Inbox", group: "Messenger" },
  { id: "audience_network", label: "Audience Network", group: "Rede" },
];

const DEFAULT_PLACEMENTS = PLACEMENTS.map((placement) => placement.id);

type ForecastPayload = {
  estimatedLeads7d?: number | null;
  estimatedRevenue7d?: number | null;
  estimatedCplRange?: [number, number] | null;
  confidenceLabel?: string;
  recommendation?: string | null;
};

type DraftResponse = {
  ok?: boolean;
  draft?: { id: string };
  error?: string;
};

type PreflightResponse = {
  ok?: boolean;
  result?: PreflightResult;
  forecast?: ForecastPayload;
  error?: string;
};

type CampaignSuggestion = {
  id: string;
  clientId: string | null;
  clientName: string | null;
  title: string;
  objective: string;
  format: string;
  dailyBudget: number;
  audienceSize: number;
  audience: string;
  metaCpl: number | null;
  angle: string;
  rationale: string;
  confidence: number;
  source: "ai" | "rules";
  draft: {
    campaignName: string;
    clientId: string | null;
    objetivo: string;
    orcamentoDiario: number;
    audienciaSize: number;
    formato: string;
    temCTA: boolean;
    duracaoSegundos?: number;
    temPixel: boolean;
    publicoCustom: boolean;
    metaCpl?: number;
  };
};

type SuggestionsResponse = {
  ok?: boolean;
  suggestions?: CampaignSuggestion[];
  error?: string;
};

type AudienceMode = "ai" | "broad" | "interests" | "lookalike" | "retargeting";
type Gender = "all" | "female" | "male";

type CreativeUpload = {
  bucket: string;
  path: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  fingerprint: string;
  uploadedAt: string;
};

type PayloadOverride = {
  media?: CreativeUpload | null;
};

const inputClass =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] text-white placeholder-white/20 outline-none transition-colors focus:border-purple-500/45";

const textareaClass =
  "w-full min-h-[92px] resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] leading-relaxed text-white placeholder-white/20 outline-none transition-colors focus:border-purple-500/45";

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function fmtAudience(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(value);
}

function fmtFileSize(value: number) {
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function confidenceLabel(value: number) {
  if (value >= 0.82) return "Alta";
  if (value >= 0.68) return "Media";
  return "Inicial";
}

function fileFingerprint(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function safeStorageName(fileName: string) {
  const normalized = fileName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized.slice(0, 90) || "criativo";
}

function toggleValue<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/30">
      {children}
    </label>
  );
}

function Section({
  title,
  icon,
  right,
  children,
}: {
  title: string;
  icon: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/28">{title}</p>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function PillButton({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-[12px] font-semibold transition-all ${
        active
          ? "border-purple-500/45 bg-purple-500/[0.12] text-purple-200"
          : "border-white/[0.07] bg-white/[0.02] text-white/45 hover:bg-white/[0.05] hover:text-white/70"
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  sub,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
      <div>
        <p className="text-[12px] font-semibold text-white/72">{label}</p>
        {sub && <p className="mt-0.5 text-[10px] text-white/30">{sub}</p>}
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`h-6 w-10 rounded-full border transition-all ${checked ? "border-purple-500 bg-purple-600" : "border-white/[0.1] bg-white/[0.06]"}`}
      >
        <span className={`mx-1 block h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : ""}`} />
      </button>
    </div>
  );
}

function SeverityIcon({ s }: { s: PreflightRisk["severity"] }) {
  if (s === "critical") return <XCircle size={13} className="mt-0.5 shrink-0 text-red-400" />;
  if (s === "warning") return <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-400" />;
  return <Info size={13} className="mt-0.5 shrink-0 text-blue-400" />;
}

function ScoreGauge({ score, classification }: { score: number; classification: PreflightResult["classification"] }) {
  const color =
    classification === "excellent" ? "#34d399" :
    classification === "good" ? "#a78bfa" :
    classification === "risky" ? "#fb923c" :
    "#f87171";

  const label =
    classification === "excellent" ? "Excelente, pronto para lancar" :
    classification === "good" ? "Bom, com ajustes finos" :
    classification === "risky" ? "Arriscado, revise antes" :
    "Critico, nao lance assim";

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 326.7} 326.7`}
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[32px] font-black" style={{ color }}>{score}</span>
          <span className="-mt-1 text-[10px] font-semibold text-white/30">/ 100</span>
        </div>
      </div>
      <p className="text-center text-[13px] font-semibold" style={{ color }}>{label}</p>
    </div>
  );
}

export default function NovaPage() {
  const router = useRouter();
  const { clientes, clienteAtual, loading: loadingClientes, selecionarCliente } = useCliente();

  const [step, setStep] = useState<"form" | "result">("form");
  const [loading, setLoading] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [uploadingCreative, setUploadingCreative] = useState(false);
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [forecast, setForecast] = useState<ForecastPayload | null>(null);
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CampaignSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const [campaignName, setCampaignName] = useState("");
  const [objetivo, setObjetivo] = useState("LEADS");
  const [orcamento, setOrcamento] = useState("");
  const [metaCpl, setMetaCpl] = useState("");
  const [audiencia, setAudiencia] = useState("");

  const [audienceMode, setAudienceMode] = useState<AudienceMode>("ai");
  const [locations, setLocations] = useState("Brasil");
  const [ageMin, setAgeMin] = useState("24");
  const [ageMax, setAgeMax] = useState("55");
  const [gender, setGender] = useState<Gender>("all");
  const [interests, setInterests] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [customAudienceName, setCustomAudienceName] = useState("");
  const [lookalikeSource, setLookalikeSource] = useState("");
  const [retargetingDays, setRetargetingDays] = useState("30");

  const [advantagePlacements, setAdvantagePlacements] = useState(true);
  const [selectedPlacements, setSelectedPlacements] = useState<string[]>(DEFAULT_PLACEMENTS);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook", "instagram"]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>(["mobile", "desktop"]);

  const [formato, setFormato] = useState("video");
  const [creativeFile, setCreativeFile] = useState<File | null>(null);
  const [creativePreviewUrl, setCreativePreviewUrl] = useState<string | null>(null);
  const [creativeUpload, setCreativeUpload] = useState<CreativeUpload | null>(null);
  const [creativeUploadError, setCreativeUploadError] = useState<string | null>(null);
  const [primaryText, setPrimaryText] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [cta, setCta] = useState("LEARN_MORE");
  const [temCTA, setTemCTA] = useState(true);
  const [duracao, setDuracao] = useState("");

  const [velocidade, setVelocidade] = useState("");
  const [temPixel, setTemPixel] = useState(true);
  const [publicoCustom, setPublicoCustom] = useState(false);
  const [metaPageId, setMetaPageId] = useState("");
  const [metaPixelId, setMetaPixelId] = useState("");

  useEffect(() => {
    if (loadingClientes) return;

    const controller = new AbortController();
    async function carregarSugestoes() {
      setLoadingSuggestions(true);
      setSuggestionError(null);
      try {
        const params = clienteAtual?.id ? `?clientId=${encodeURIComponent(clienteAtual.id)}` : "";
        const res = await fetch(`/api/campaigns/suggestions${params}`, { signal: controller.signal });
        const data = (await res.json()) as SuggestionsResponse;
        if (!res.ok || !data.ok) throw new Error(data.error ?? "Nao foi possivel gerar sugestoes.");
        setSuggestions(data.suggestions ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSuggestionError(error instanceof Error ? error.message : "Nao foi possivel gerar sugestoes.");
      } finally {
        if (!controller.signal.aborted) setLoadingSuggestions(false);
      }
    }

    void carregarSugestoes();
    return () => controller.abort();
  }, [clienteAtual?.id, loadingClientes]);

  useEffect(() => {
    return () => {
      if (creativePreviewUrl) URL.revokeObjectURL(creativePreviewUrl);
    };
  }, [creativePreviewUrl]);

  useEffect(() => {
    setMetaPixelId(clienteAtual?.facebook_pixel_id ?? "");
  }, [clienteAtual?.facebook_pixel_id, clienteAtual?.id]);

  const audiencePresets = useMemo(() => {
    const baseAudience = suggestions[0]?.audience || (clienteAtual ? `${clienteAtual.nome_cliente ?? clienteAtual.nome}` : "Publico amplo qualificado");
    const baseSize = suggestions[0]?.audienceSize || 800_000;

    return [
      {
        id: "ai-balanced",
        title: "IA equilibrada",
        mode: "ai" as AudienceMode,
        size: baseSize,
        interests: baseAudience,
        note: "Usa nicho, historico e campanha sugerida.",
      },
      {
        id: "lookalike",
        title: "Lookalike",
        mode: "lookalike" as AudienceMode,
        size: 1_500_000,
        interests: "Lookalike 1-3% de leads, compradores ou CRM",
        note: "Melhor quando a conta ja tem base propria.",
      },
      {
        id: "retargeting",
        title: "Retargeting",
        mode: "retargeting" as AudienceMode,
        size: 180_000,
        interests: "Visitantes, engajados, leads abertos e carrinho",
        note: "Indicado para oferta quente e recuperacao.",
      },
    ];
  }, [clienteAtual, suggestions]);

  const selectedPlacementLabels = advantagePlacements
    ? ["Advantage+ Placements"]
    : PLACEMENTS.filter((placement) => selectedPlacements.includes(placement.id)).map((placement) => placement.label);

  const setupCompleteness = useMemo(() => {
    const checks = [
      Boolean(campaignName.trim()),
      Boolean(orcamento),
      Boolean(audiencia),
      Boolean(locations.trim()),
      audienceMode !== "interests" || Boolean(interests.trim()),
      advantagePlacements || selectedPlacements.length >= 3,
      Boolean(primaryText.trim()),
      Boolean(headline.trim()),
      Boolean(destinationUrl.trim()),
      Boolean(creativeFile || creativeUpload),
      temPixel,
      objetivo !== "SALES" || Boolean(metaPixelId.trim()),
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [
    advantagePlacements,
    audiencia,
    audienceMode,
    campaignName,
    creativeFile,
    creativeUpload,
    destinationUrl,
    headline,
    interests,
    locations,
    metaPixelId,
    orcamento,
    objetivo,
    primaryText,
    selectedPlacements.length,
    temPixel,
  ]);

  async function atualizarSugestoes() {
    setLoadingSuggestions(true);
    setSuggestionError(null);
    try {
      const params = clienteAtual?.id ? `?clientId=${encodeURIComponent(clienteAtual.id)}` : "";
      const res = await fetch(`/api/campaigns/suggestions${params}`);
      const data = (await res.json()) as SuggestionsResponse;
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Nao foi possivel gerar sugestoes.");
      setSuggestions(data.suggestions ?? []);
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : "Nao foi possivel gerar sugestoes.");
    } finally {
      setLoadingSuggestions(false);
    }
  }

  function setMode(mode: AudienceMode) {
    setAudienceMode(mode);
    if (mode === "lookalike" || mode === "retargeting") setPublicoCustom(true);
  }

  function aplicarAudienciaPreset(preset: (typeof audiencePresets)[number]) {
    setMode(preset.mode);
    setAudiencia(String(Math.round(preset.size / 1000)));
    setInterests(preset.interests);
    if (preset.mode === "lookalike") setLookalikeSource("Leads qualificados / CRM");
    if (preset.mode === "retargeting") setCustomAudienceName("Engajados 365d + visitantes 180d");
  }

  function aplicarSugestao(suggestion: CampaignSuggestion) {
    const draft = suggestion.draft;
    const suggestionClient = draft.clientId
      ? clientes.find((cliente) => cliente.id === draft.clientId)
      : null;

    if (suggestionClient) selecionarCliente(suggestionClient);
    setCampaignId(null);
    setResult(null);
    setForecast(null);
    setCampaignName(draft.campaignName || suggestion.title);
    setObjetivo(draft.objetivo || suggestion.objective || "LEADS");
    setOrcamento(String(draft.orcamentoDiario || suggestion.dailyBudget || ""));
    setAudiencia(draft.audienciaSize ? String(Math.round(draft.audienciaSize / 1000)) : "");
    setFormato(draft.formato || suggestion.format || "video");
    setTemCTA(draft.temCTA ?? true);
    setDuracao(draft.duracaoSegundos ? String(draft.duracaoSegundos) : "");
    setTemPixel(draft.temPixel ?? true);
    setPublicoCustom(draft.publicoCustom ?? true);
    setMetaCpl(draft.metaCpl ? String(draft.metaCpl) : "");
    setMode("ai");
    setInterests(suggestion.audience || "");
    setPrimaryText(suggestion.angle || suggestion.rationale || "");
    setHeadline(suggestion.title);
    setDescription(suggestion.rationale || "");
    setMetaPageId("");
    setMetaPixelId(suggestionClient?.facebook_pixel_id ?? "");
    setCreativeFile(null);
    setCreativeUpload(null);
    setCreativeUploadError(null);
    if (creativePreviewUrl) {
      URL.revokeObjectURL(creativePreviewUrl);
      setCreativePreviewUrl(null);
    }
    setErro(null);
  }

  function handleCreativeFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setCreativeFile(file);
    setCreativeUpload(null);
    setCreativeUploadError(null);

    if (creativePreviewUrl) URL.revokeObjectURL(creativePreviewUrl);
    if (file && (file.type.startsWith("image/") || file.type.startsWith("video/"))) {
      setCreativePreviewUrl(URL.createObjectURL(file));
    } else {
      setCreativePreviewUrl(null);
    }
  }

  function montarPayload(override?: PayloadOverride) {
    const media = override?.media === undefined ? creativeUpload : override.media;
    const audienceSize = audiencia ? Number(audiencia) * 1000 : undefined;
    const customAudience = audienceMode === "lookalike" || audienceMode === "retargeting" || publicoCustom;

    return {
      clientId: clienteAtual?.id,
      campaignName,
      objetivo,
      plataforma: "meta",
      orcamentoDiario: parseNumber(orcamento),
      audienciaSize: audienceSize && Number.isFinite(audienceSize) ? audienceSize : undefined,
      audience: {
        mode: audienceMode,
        locations: parseList(locations),
        ageMin: parseNumber(ageMin),
        ageMax: parseNumber(ageMax),
        gender,
        interests: parseList(interests),
        exclusions: parseList(exclusions),
        customAudienceName: customAudienceName.trim() || null,
        lookalikeSource: lookalikeSource.trim() || null,
        retargetingDays: parseNumber(retargetingDays),
      },
      placements: {
        advantagePlus: advantagePlacements,
        selected: advantagePlacements ? ["advantage_plus"] : selectedPlacements,
        platforms: selectedPlatforms,
        devices: selectedDevices,
      },
      criativo: {
        formato,
        temTexto: Boolean(primaryText.trim() || headline.trim()),
        temCTA,
        cta,
        primaryText: primaryText.trim() || null,
        headline: headline.trim() || null,
        description: description.trim() || null,
        destinationUrl: destinationUrl.trim() || null,
        duracaoSegundos: formato === "video" && duracao ? parseNumber(duracao) : undefined,
        media: media ?? (
          creativeFile
            ? {
                fileName: creativeFile.name,
                mimeType: creativeFile.type,
                sizeBytes: creativeFile.size,
                pendingUpload: true,
              }
            : null
        ),
      },
      urlDestino: destinationUrl.trim() || undefined,
      velocidadeUrl: velocidade ? parseNumber(velocidade) : undefined,
      temPixel,
      metaPageId: metaPageId.trim() || undefined,
      metaPixelId: metaPixelId.trim() || undefined,
      tracking: {
        metaPageId: metaPageId.trim() || null,
        metaPixelId: metaPixelId.trim() || null,
      },
      publicoCustom: customAudience,
      metaCpl: metaCpl ? parseNumber(metaCpl) : undefined,
      launchPackageVersion: 2,
    };
  }

  async function uploadCreativeFile(draftId: string): Promise<CreativeUpload | null> {
    if (!creativeFile) return creativeUpload;
    if (creativeUpload?.fingerprint === fileFingerprint(creativeFile)) return creativeUpload;

    setUploadingCreative(true);
    setCreativeUploadError(null);
    try {
      const supabase = getSupabase();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sessao expirada. Entre novamente para subir criativos.");

      const path = `${userId}/${draftId}/${Date.now()}-${safeStorageName(creativeFile.name)}`;
      const { error } = await supabase.storage
        .from("campaign-creatives")
        .upload(path, creativeFile, {
          upsert: true,
          contentType: creativeFile.type || "application/octet-stream",
        });

      if (error) throw new Error(error.message);

      const uploaded: CreativeUpload = {
        bucket: "campaign-creatives",
        path,
        fileName: creativeFile.name,
        mimeType: creativeFile.type,
        sizeBytes: creativeFile.size,
        fingerprint: fileFingerprint(creativeFile),
        uploadedAt: new Date().toISOString(),
      };
      setCreativeUpload(uploaded);
      return uploaded;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel subir o criativo.";
      setCreativeUploadError(message);
      throw new Error(message);
    } finally {
      setUploadingCreative(false);
    }
  }

  async function persistDraft(body: ReturnType<typeof montarPayload>, id?: string | null) {
    const res = await fetch("/api/campaigns/drafts", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { ...body, id } : body),
    });
    const data = (await res.json()) as DraftResponse;
    if (!res.ok || !data.draft?.id) {
      throw new Error(data.error ?? "Nao foi possivel salvar o rascunho.");
    }
    setCampaignId(data.draft.id);
    return data.draft.id;
  }

  async function salvarRascunho() {
    const firstPayload = montarPayload();
    const draftId = await persistDraft(firstPayload, campaignId);

    if (creativeFile && creativeUpload?.fingerprint !== fileFingerprint(creativeFile)) {
      const uploaded = await uploadCreativeFile(draftId);
      const enrichedPayload = montarPayload({ media: uploaded });
      await persistDraft(enrichedPayload, draftId);
    }

    return draftId;
  }

  async function analisar() {
    if (!orcamento) return;
    setLoading(true);
    setErro(null);

    try {
      const draftId = await salvarRascunho();
      const body = {
        ...montarPayload(),
        campaignId: draftId,
      };

      const res = await fetch("/api/campaigns/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as PreflightResponse;
      if (!res.ok || !data.ok || !data.result) {
        throw new Error(data.error ?? "Nao foi possivel avaliar a campanha.");
      }
      setResult(data.result);
      setForecast(data.forecast ?? null);
      setStep("result");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar e avaliar campanha.");
    } finally {
      setLoading(false);
    }
  }

  async function publicar() {
    if (!campaignId) return;
    setPublicando(true);
    setErro(null);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activateOnMeta: false }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Nao foi possivel criar a campanha no Meta.");
      router.push("/campanhas");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao publicar campanha.");
    } finally {
      setPublicando(false);
    }
  }

  const budgetDaily = parseNumber(orcamento) ?? 0;
  const weeklyBudget = budgetDaily * 7;
  const uploadedOrSelectedFile = creativeUpload ?? (creativeFile ? {
    fileName: creativeFile.name,
    mimeType: creativeFile.type,
    sizeBytes: creativeFile.size,
  } : null);

  return (
    <div className="flex min-h-screen bg-[#060609] text-white">
      <Sidebar />
      <main className="flex-1 px-4 py-6 pb-24 md:ml-[60px] md:px-8 md:py-8">
        <div className="mx-auto max-w-[1440px]">
          <button
            type="button"
            onClick={() => step === "result" ? setStep("form") : router.push("/campanhas")}
            className="mb-6 flex items-center gap-2 text-[11px] text-white/30 transition-colors hover:text-white/60"
          >
            <ArrowLeft size={13} />
            {step === "result" ? "Voltar ao setup" : "Campanhas"}
          </button>

          <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-3">
                <Gauge size={17} className="text-purple-400" />
                <h1 className="text-[24px] font-bold">Nova campanha Meta</h1>
              </div>
              <p className="max-w-2xl text-[12px] leading-relaxed text-white/32">
                Monte campanha, publico, posicionamentos e criativo antes do preflight.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:w-[420px]">
              {[
                { label: "Setup", value: `${setupCompleteness}%` },
                { label: "Budget 7d", value: weeklyBudget ? `R$ ${weeklyBudget.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : "-" },
                { label: "Arquivo", value: uploadedOrSelectedFile ? "OK" : "-" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
                  <p className="text-[9px] uppercase tracking-wider text-white/22">{item.label}</p>
                  <p className="mt-0.5 truncate text-[12px] font-bold text-white/75">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {step === "form" && (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-5">
                <Section title="Cliente e sugestoes" icon={<Users size={14} className="text-purple-400" />}>
                  <div className="space-y-4">
                    {loadingClientes ? (
                      <div className="flex items-center gap-2 text-[12px] text-white/35">
                        <Loader2 size={13} className="animate-spin text-white/30" />
                        Carregando clientes...
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <PillButton active={!clienteAtual} onClick={() => selecionarCliente(null)}>
                          Sem cliente
                        </PillButton>
                        {clientes.map((cliente) => (
                          <PillButton
                            key={cliente.id}
                            active={clienteAtual?.id === cliente.id}
                            onClick={() => selecionarCliente(cliente)}
                          >
                            {cliente.nome_cliente ?? cliente.nome}
                          </PillButton>
                        ))}
                      </div>
                    )}

                    <div className="rounded-xl border border-amber-500/18 bg-amber-500/[0.045] p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} className="text-amber-300" />
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-100/70">Sugestoes da IA</p>
                        </div>
                        <button
                          type="button"
                          onClick={atualizarSugestoes}
                          disabled={loadingSuggestions}
                          title="Atualizar sugestoes"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-300/15 bg-black/15 text-amber-100/60 transition-all hover:bg-amber-500/10 hover:text-amber-100 disabled:opacity-40"
                        >
                          <RefreshCw size={13} className={loadingSuggestions ? "animate-spin" : ""} />
                        </button>
                      </div>

                      {loadingSuggestions ? (
                        <div className="flex items-center gap-2 text-[12px] text-amber-100/50">
                          <Loader2 size={13} className="animate-spin" />
                          Calculando proximas campanhas...
                        </div>
                      ) : suggestionError ? (
                        <p className="text-[12px] text-amber-100/55">{suggestionError}</p>
                      ) : suggestions.length === 0 ? (
                        <p className="text-[12px] text-amber-100/45">Sem sugestoes no momento.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
                          {suggestions.map((suggestion) => (
                            <button
                              type="button"
                              key={suggestion.id}
                              onClick={() => aplicarSugestao(suggestion)}
                              className="rounded-xl border border-white/[0.07] bg-black/20 p-3 text-left transition-all hover:border-amber-300/25 hover:bg-amber-300/[0.06]"
                            >
                              <div className="mb-2 flex items-start justify-between gap-2">
                                <p className="line-clamp-2 text-[12px] font-bold text-white/85">{suggestion.title}</p>
                                <span className="shrink-0 rounded-md border border-amber-300/15 bg-amber-300/10 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-200/80">
                                  {suggestion.source === "ai" ? "IA" : "Regras"}
                                </span>
                              </div>
                              <p className="line-clamp-2 text-[10px] leading-relaxed text-white/42">{suggestion.rationale}</p>
                              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                                <span className="rounded-lg bg-white/[0.04] px-2 py-1 text-white/55">R$ {suggestion.dailyBudget}/dia</span>
                                <span className="rounded-lg bg-white/[0.04] px-2 py-1 text-white/55">{fmtAudience(suggestion.audienceSize)}</span>
                                <span className="rounded-lg bg-white/[0.04] px-2 py-1 text-white/55">{confidenceLabel(suggestion.confidence)}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Section>

                <Section title="Campanha" icon={<Target size={14} className="text-purple-400" />}>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="lg:col-span-2">
                      <FieldLabel>Nome da campanha</FieldLabel>
                      <input
                        value={campaignName}
                        onChange={(event) => setCampaignName(event.target.value)}
                        placeholder="Ex: Leads Maio | Frio | Reels + Feed"
                        className={inputClass}
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <FieldLabel>Objetivo</FieldLabel>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                        {OBJETIVOS.map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => setObjetivo(item.id)}
                            className={`rounded-xl border px-3 py-3 text-left transition-all ${
                              objetivo === item.id
                                ? "border-purple-500/45 bg-purple-500/[0.12]"
                                : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05]"
                            }`}
                          >
                            <p className={`text-[12px] font-bold ${objetivo === item.id ? "text-purple-200" : "text-white/62"}`}>{item.label}</p>
                            <p className="mt-1 text-[10px] leading-tight text-white/28">{item.sub}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <FieldLabel>Orcamento diario (R$)</FieldLabel>
                      <input
                        type="number"
                        value={orcamento}
                        onChange={(event) => setOrcamento(event.target.value)}
                        placeholder="100"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <FieldLabel>CPL alvo (R$)</FieldLabel>
                      <input
                        type="number"
                        value={metaCpl}
                        onChange={(event) => setMetaCpl(event.target.value)}
                        placeholder="50"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </Section>

                <Section title="Publico" icon={<Users size={14} className="text-sky-300" />}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                      {[
                        { id: "ai", label: "IA" },
                        { id: "broad", label: "Aberto" },
                        { id: "interests", label: "Interesses" },
                        { id: "lookalike", label: "Lookalike" },
                        { id: "retargeting", label: "Retargeting" },
                      ].map((mode) => (
                        <PillButton
                          key={mode.id}
                          active={audienceMode === mode.id}
                          onClick={() => setMode(mode.id as AudienceMode)}
                        >
                          {mode.label}
                        </PillButton>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                      {audiencePresets.map((preset) => (
                        <button
                          type="button"
                          key={preset.id}
                          onClick={() => aplicarAudienciaPreset(preset)}
                          className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-left transition-all hover:border-sky-300/20 hover:bg-sky-300/[0.045]"
                        >
                          <p className="text-[12px] font-bold text-white/78">{preset.title}</p>
                          <p className="mt-1 text-[10px] leading-relaxed text-white/35">{preset.note}</p>
                          <p className="mt-2 text-[10px] font-semibold text-sky-200/70">{fmtAudience(preset.size)} pessoas</p>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                      <div>
                        <FieldLabel>Localizacao</FieldLabel>
                        <input value={locations} onChange={(event) => setLocations(event.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <FieldLabel>Idade min.</FieldLabel>
                        <input type="number" value={ageMin} onChange={(event) => setAgeMin(event.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <FieldLabel>Idade max.</FieldLabel>
                        <input type="number" value={ageMax} onChange={(event) => setAgeMax(event.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <FieldLabel>Genero</FieldLabel>
                        <select value={gender} onChange={(event) => setGender(event.target.value as Gender)} className={inputClass}>
                          <option value="all">Todos</option>
                          <option value="female">Mulheres</option>
                          <option value="male">Homens</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div>
                        <FieldLabel>Interesses / sinais</FieldLabel>
                        <textarea
                          value={interests}
                          onChange={(event) => setInterests(event.target.value)}
                          placeholder="Separe por virgula ou linha"
                          className={textareaClass}
                        />
                      </div>
                      <div>
                        <FieldLabel>Exclusoes</FieldLabel>
                        <textarea
                          value={exclusions}
                          onChange={(event) => setExclusions(event.target.value)}
                          placeholder="Clientes atuais, leads recentes, compradores..."
                          className={textareaClass}
                        />
                      </div>
                    </div>

                    {(audienceMode === "lookalike" || audienceMode === "retargeting") && (
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div>
                          <FieldLabel>Custom Audience</FieldLabel>
                          <input value={customAudienceName} onChange={(event) => setCustomAudienceName(event.target.value)} className={inputClass} placeholder="Leads 180d" />
                        </div>
                        <div>
                          <FieldLabel>Fonte lookalike</FieldLabel>
                          <input value={lookalikeSource} onChange={(event) => setLookalikeSource(event.target.value)} className={inputClass} placeholder="CRM / compradores" />
                        </div>
                        <div>
                          <FieldLabel>Janela retargeting</FieldLabel>
                          <input type="number" value={retargetingDays} onChange={(event) => setRetargetingDays(event.target.value)} className={inputClass} />
                        </div>
                      </div>
                    )}

                    <div>
                      <FieldLabel>Tamanho estimado (mil pessoas)</FieldLabel>
                      <input
                        type="number"
                        value={audiencia}
                        onChange={(event) => setAudiencia(event.target.value)}
                        placeholder="500"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </Section>

                <Section title="Posicionamentos" icon={<MapPin size={14} className="text-emerald-300" />}>
                  <div className="space-y-4">
                    <Toggle
                      checked={advantagePlacements}
                      onChange={() => setAdvantagePlacements((value) => !value)}
                      label="Advantage+ Placements"
                      sub="A Erizon salva a escolha e o pacote de publicacao."
                    />

                    {!advantagePlacements && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {PLACEMENTS.map((placement) => (
                          <PillButton
                            key={placement.id}
                            active={selectedPlacements.includes(placement.id)}
                            onClick={() => setSelectedPlacements((current) => toggleValue(current, placement.id))}
                          >
                            <span className="block text-left">
                              <span className="block">{placement.label}</span>
                              <span className="block text-[9px] font-medium text-white/28">{placement.group}</span>
                            </span>
                          </PillButton>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div>
                        <FieldLabel>Plataformas</FieldLabel>
                        <div className="flex flex-wrap gap-2">
                          {["facebook", "instagram", "messenger", "audience_network"].map((platform) => (
                            <PillButton
                              key={platform}
                              active={selectedPlatforms.includes(platform)}
                              onClick={() => setSelectedPlatforms((current) => toggleValue(current, platform))}
                            >
                              {platform.replace("_", " ")}
                            </PillButton>
                          ))}
                        </div>
                      </div>
                      <div>
                        <FieldLabel>Dispositivos</FieldLabel>
                        <div className="flex flex-wrap gap-2">
                          <PillButton active={selectedDevices.includes("mobile")} onClick={() => setSelectedDevices((current) => toggleValue(current, "mobile"))}>
                            <span className="inline-flex items-center gap-1"><Smartphone size={12} /> Mobile</span>
                          </PillButton>
                          <PillButton active={selectedDevices.includes("desktop")} onClick={() => setSelectedDevices((current) => toggleValue(current, "desktop"))}>
                            <span className="inline-flex items-center gap-1"><Monitor size={12} /> Desktop</span>
                          </PillButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </Section>

                <Section title="Criativo" icon={<ImageIcon size={14} className="text-fuchsia-300" />}>
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-4">
                      <div>
                        <FieldLabel>Formato</FieldLabel>
                        <div className="grid grid-cols-3 gap-2">
                          {FORMATOS.map((item) => {
                            const Icon = item.icon;
                            return (
                              <PillButton key={item.id} active={formato === item.id} onClick={() => setFormato(item.id)}>
                                <span className="inline-flex items-center gap-1"><Icon size={12} /> {item.label}</span>
                              </PillButton>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <FieldLabel>Arquivo do criativo</FieldLabel>
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.025] px-4 py-7 text-center transition-all hover:border-purple-400/30 hover:bg-purple-400/[0.035]">
                          <FileUp size={22} className="mb-2 text-white/35" />
                          <span className="text-[12px] font-semibold text-white/65">
                            {creativeFile ? creativeFile.name : "Selecionar imagem ou video"}
                          </span>
                          <span className="mt-1 text-[10px] text-white/28">JPG, PNG, WEBP, MP4 ou MOV</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime"
                            onChange={handleCreativeFile}
                            className="hidden"
                          />
                        </label>
                        {creativeFile && (
                          <p className="mt-2 text-[10px] text-white/30">
                            {creativeFile.type || "arquivo"} | {fmtFileSize(creativeFile.size)}
                          </p>
                        )}
                        {creativeUpload && (
                          <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-300/80">
                            <CheckCircle2 size={12} /> Criativo salvo na Erizon
                          </p>
                        )}
                        {creativeUploadError && (
                          <p className="mt-2 text-[10px] text-red-300/80">{creativeUploadError}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div>
                          <FieldLabel>Titulo</FieldLabel>
                          <input value={headline} onChange={(event) => setHeadline(event.target.value)} className={inputClass} placeholder="Headline do anuncio" />
                        </div>
                        <div>
                          <FieldLabel>CTA</FieldLabel>
                          <select value={cta} onChange={(event) => setCta(event.target.value)} className={inputClass}>
                            {CTAS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                          </select>
                        </div>
                      </div>

                      <div>
                        <FieldLabel>Texto principal</FieldLabel>
                        <textarea value={primaryText} onChange={(event) => setPrimaryText(event.target.value)} className={textareaClass} placeholder="Copy do anuncio" />
                      </div>

                      <div>
                        <FieldLabel>Descricao</FieldLabel>
                        <input value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} placeholder="Linha complementar" />
                      </div>

                      <div>
                        <FieldLabel>URL destino</FieldLabel>
                        <div className="relative">
                          <LinkIcon size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/24" />
                          <input value={destinationUrl} onChange={(event) => setDestinationUrl(event.target.value)} className={`${inputClass} pl-10`} placeholder="https://..." />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {formato === "video" && (
                          <div>
                            <FieldLabel>Duracao do video (s)</FieldLabel>
                            <input type="number" value={duracao} onChange={(event) => setDuracao(event.target.value)} className={inputClass} placeholder="30" />
                          </div>
                        )}
                        <Toggle checked={temCTA} onChange={() => setTemCTA((value) => !value)} label="CTA claro no criativo" />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Eye size={14} className="text-white/35" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/25">Preview</p>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#111116]">
                        <div className="aspect-[4/5] bg-white/[0.025]">
                          {creativePreviewUrl && creativeFile?.type.startsWith("image/") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={creativePreviewUrl} alt="" className="h-full w-full object-cover" />
                          ) : creativePreviewUrl && creativeFile?.type.startsWith("video/") ? (
                            <video src={creativePreviewUrl} className="h-full w-full object-cover" controls muted />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center text-white/22">
                              <ImageIcon size={28} />
                              <p className="mt-2 text-[11px]">Sem arquivo</p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 p-3">
                          <p className="line-clamp-2 text-[12px] font-bold text-white/85">{headline || "Titulo do anuncio"}</p>
                          <p className="line-clamp-3 text-[11px] leading-relaxed text-white/45">{primaryText || "Texto principal do anuncio aparece aqui."}</p>
                          <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                            <span className="truncate text-[10px] text-white/35">{destinationUrl || "URL destino"}</span>
                            <span className="rounded-md bg-white/10 px-2 py-1 text-[9px] font-bold text-white/70">
                              {CTAS.find((item) => item.id === cta)?.label ?? "CTA"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Section>

                <Section title="Tracking e qualidade" icon={<SlidersHorizontal size={14} className="text-blue-300" />}>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <FieldLabel>Velocidade da pagina (s)</FieldLabel>
                      <input
                        type="number"
                        step="0.1"
                        value={velocidade}
                        onChange={(event) => setVelocidade(event.target.value)}
                        placeholder="2.5"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <FieldLabel>Facebook Page ID</FieldLabel>
                      <input
                        value={metaPageId}
                        onChange={(event) => setMetaPageId(event.target.value)}
                        placeholder="123456789012345"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <FieldLabel>Meta Pixel ID</FieldLabel>
                      <input
                        value={metaPixelId}
                        onChange={(event) => {
                          setMetaPixelId(event.target.value);
                          if (event.target.value.trim()) setTemPixel(true);
                        }}
                        placeholder="123456789012345"
                        className={inputClass}
                      />
                    </div>
                    <Toggle checked={temPixel} onChange={() => setTemPixel((value) => !value)} label="Pixel Meta instalado" sub="Conversao e otimizacao" />
                    <Toggle checked={publicoCustom} onChange={() => setPublicoCustom((value) => !value)} label="Usa dados proprios" sub="Custom Audience, CRM ou lookalike" />
                  </div>
                </Section>

                {erro && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-[12px] text-red-200">
                    {erro}
                  </div>
                )}

                <button
                  type="button"
                  onClick={analisar}
                  disabled={loading || uploadingCreative || !orcamento}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 py-4 text-[14px] font-bold text-white shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all hover:bg-purple-500 disabled:opacity-40"
                >
                  {loading || uploadingCreative ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {uploadingCreative ? "Subindo criativo..." : loading ? "Salvando e avaliando..." : "Salvar pacote e rodar preflight"}
                </button>
              </div>

              <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
                <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <MousePointerClick size={14} className="text-purple-300" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/28">Pacote Meta</p>
                    </div>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-white/55">
                      {setupCompleteness}%
                    </span>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: "Cliente", value: clienteAtual ? (clienteAtual.nome_cliente ?? clienteAtual.nome ?? "Cliente") : "Sem cliente" },
                      { label: "Objetivo", value: objetivo },
                      { label: "Budget", value: budgetDaily ? `R$ ${budgetDaily}/dia` : "-" },
                      { label: "Publico", value: audiencia ? `${audiencia}k | ${audienceMode}` : audienceMode },
                      { label: "Posicionamento", value: selectedPlacementLabels.slice(0, 2).join(", ") + (selectedPlacementLabels.length > 2 ? ` +${selectedPlacementLabels.length - 2}` : "") },
                      { label: "Criativo", value: uploadedOrSelectedFile ? uploadedOrSelectedFile.fileName : "Pendente" },
                      { label: "Tracking", value: metaPixelId ? "Pixel informado" : metaPageId ? "Page informada" : "Auto" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-white/[0.05] bg-black/18 px-3 py-2">
                        <p className="text-[9px] uppercase tracking-wider text-white/22">{item.label}</p>
                        <p className="mt-0.5 truncate text-[12px] font-semibold text-white/68">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Globe size={14} className="text-sky-300" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/28">O que sera salvo</p>
                  </div>
                  <div className="space-y-2 text-[11px] leading-relaxed text-white/38">
                    <p>Campaign, audience, placements, copy, URL, arquivo criativo e tracking.</p>
                    <p>A publicacao cria Campaign, Ad Set, Creative e Ad no Meta em pausa por padrao.</p>
                  </div>
                </section>
              </aside>
            </div>
          )}

          {step === "result" && result && (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4">
                <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
                  <ScoreGauge score={result.score} classification={result.classification} />

                  {(result.estimatedCplMin || result.estimatedRoas) && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {result.estimatedCplMin && (
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
                          <p className="mb-1 text-[9px] font-semibold uppercase text-white/30">CPL estimado</p>
                          <p className="text-[15px] font-bold text-white">
                            R${result.estimatedCplMin}-{result.estimatedCplMax}
                          </p>
                        </div>
                      )}
                      {result.estimatedRoas && (
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
                          <p className="mb-1 text-[9px] font-semibold uppercase text-white/30">ROAS estimado</p>
                          <p className="text-[15px] font-bold text-white">{result.estimatedRoas}x</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`mt-4 flex items-center gap-2 rounded-xl border px-4 py-3 ${
                    result.readyToLaunch
                      ? "border-emerald-500/20 bg-emerald-500/[0.06]"
                      : "border-red-500/20 bg-red-500/[0.06]"
                  }`}>
                    {result.readyToLaunch
                      ? <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                      : <XCircle size={14} className="shrink-0 text-red-400" />}
                    <p className={`text-[12px] font-semibold ${result.readyToLaunch ? "text-emerald-400" : "text-red-400"}`}>
                      {result.readyToLaunch ? "Pronto para criar no Meta em pausa" : "Corrija os pontos criticos antes de criar no Meta"}
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border border-purple-500/15 bg-purple-500/[0.04] px-5 py-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-purple-400">Recomendacao principal</p>
                  <p className="text-[13px] leading-relaxed text-white/70">{result.topRecommendation}</p>
                </section>

                {forecast && (
                  <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] px-5 py-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-amber-200/80">Forecast salvo no cockpit</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                        <p className="text-[9px] uppercase tracking-wider text-white/25">Leads em 7 dias</p>
                        <p className="mt-1 text-[18px] font-black text-white">{forecast.estimatedLeads7d ?? "-"}</p>
                      </div>
                      <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                        <p className="text-[9px] uppercase tracking-wider text-white/25">Receita potencial</p>
                        <p className="mt-1 text-[18px] font-black text-white">
                          {forecast.estimatedRevenue7d
                            ? `R$ ${forecast.estimatedRevenue7d.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </section>
                )}

                {result.risks.length > 0 && (
                  <section className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/25">
                      {result.risks.length} pontos de atencao
                    </p>
                    {result.risks.map((risk) => (
                      <div
                        key={risk.id}
                        className={`overflow-hidden rounded-2xl border transition-all ${
                          risk.severity === "critical" ? "border-red-500/20 bg-red-500/[0.04]"
                          : risk.severity === "warning" ? "border-amber-500/15 bg-amber-500/[0.03]"
                          : "border-white/[0.07] bg-white/[0.02]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedRisk(expandedRisk === risk.id ? null : risk.id)}
                          className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
                        >
                          <SeverityIcon s={risk.severity} />
                          <div className="flex-1">
                            <p className="text-[12px] font-semibold text-white/80">{risk.label}</p>
                            <p className="mt-0.5 text-[10px] leading-relaxed text-white/40">{risk.detail}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                              risk.severity === "critical" ? "border-red-500/20 bg-red-500/10 text-red-400"
                              : risk.severity === "warning" ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                              : "border-blue-500/20 bg-blue-500/10 text-blue-400"
                            }`}>
                              -{risk.impactScore}pts
                            </span>
                            {expandedRisk === risk.id ? <ChevronUp size={12} className="text-white/25" /> : <ChevronDown size={12} className="text-white/25" />}
                          </div>
                        </button>
                        {expandedRisk === risk.id && (
                          <div className="border-t border-white/[0.05] px-4 pb-4 pt-3">
                            <p className="text-[11px] leading-relaxed text-white/50">
                              <span className="font-semibold text-white/60">Como corrigir: </span>
                              {risk.recommendation}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </section>
                )}

                {erro && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-[12px] text-red-200">
                    {erro}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setStep("form")}
                    className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] py-3 text-[13px] font-semibold text-white/50 transition-all hover:bg-white/[0.08] hover:text-white/70"
                  >
                    Editar setup
                  </button>
                  <button
                    type="button"
                    onClick={publicar}
                    disabled={publicando || !result.readyToLaunch}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-600 py-3 text-[13px] font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-40"
                  >
                    {publicando ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}
                    Criar no Meta em pausa
                  </button>
                </div>
              </div>

              <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
                <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Rocket size={14} className="text-emerald-300" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/28">Resumo aprovado</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Campanha", value: campaignName || "Campanha Erizon" },
                      { label: "Publico", value: audiencia ? `${audiencia}k | ${audienceMode}` : audienceMode },
                      { label: "Posicionamentos", value: selectedPlacementLabels.slice(0, 2).join(", ") },
                      { label: "Criativo", value: uploadedOrSelectedFile ? uploadedOrSelectedFile.fileName : "Sem arquivo" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-white/[0.05] bg-black/18 px-3 py-2">
                        <p className="text-[9px] uppercase tracking-wider text-white/22">{item.label}</p>
                        <p className="mt-0.5 truncate text-[12px] font-semibold text-white/68">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.045] p-5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-200/80" />
                    <p className="text-[11px] leading-relaxed text-amber-50/55">
                      A Erizon cria o pacote completo no Meta em pausa. Se faltar Page, Pixel ou permissao, a API mostra exatamente o bloqueio antes de gastar verba.
                    </p>
                  </div>
                </section>
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
