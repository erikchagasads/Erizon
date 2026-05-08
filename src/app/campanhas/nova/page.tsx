"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  { id: "LEADS", label: "Leads", sub: "Landing com Pixel Meta e evento Lead" },
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
  { id: "SHOP_NOW", label: "Comprar agora" },
];

const MESSAGE_DESTINATIONS = [
  { id: "website", label: "Site / landing", sub: "Leva para uma URL externa" },
  { id: "post_engagement", label: "Post / perfil", sub: "Engajamento no proprio ativo" },
  { id: "whatsapp", label: "WhatsApp", sub: "Puxa o numero do cliente automaticamente" },
  { id: "messenger", label: "Messenger", sub: "Conversa pela Page conectada" },
  { id: "instagram_direct", label: "Instagram Direct", sub: "Mensagem pelo Instagram conectado" },
] as const;

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

type DraftRecord = {
  id: string;
  cliente_id?: string | null;
  nome_campanha?: string | null;
  objective?: string | null;
  orcamento?: number | null;
  draft_payload?: Record<string, unknown> | null;
  preflight_result?: PreflightResult | null;
  forecast_snapshot?: ForecastPayload | null;
};

type DraftResponse = {
  ok?: boolean;
  draft?: DraftRecord;
  drafts?: DraftRecord[];
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
type CampaignDestination = "website" | "post_engagement" | "whatsapp" | "messenger" | "instagram_direct";

type CreativeUpload = {
  bucket: string;
  path: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  fingerprint: string;
  uploadedAt: string;
};

type CreativeSource = "upload" | "instagram_existing_post";

type InstagramPostOption = {
  id: string;
  caption: string | null;
  mediaType: string;
  mediaProductType: string | null;
  permalink: string | null;
  previewUrl: string | null;
  timestamp: string | null;
};

type InstagramPostsResponse = {
  ok?: boolean;
  posts?: InstagramPostOption[];
  error?: string;
};

type PayloadOverride = {
  media?: CreativeUpload | null;
};

type CopySuggestionPackage = {
  angle: string;
  rationale: string;
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
  ctaSuggestions: string[];
};

type CopyAssistResponse = {
  ok?: boolean;
  package?: CopySuggestionPackage;
  error?: string;
};

const inputClass =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] text-white placeholder-white/20 outline-none transition-colors focus:border-purple-500/45";

const textareaClass =
  "w-full min-h-[92px] resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] leading-relaxed text-white placeholder-white/20 outline-none transition-colors focus:border-purple-500/45";

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
}

function asInputValue(value: unknown) {
  if (value == null) return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : String(value);
}

function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isMessagingDestination(value: string) {
  return ["whatsapp", "messenger", "instagram_direct"].includes(value);
}

function buildWhatsAppUrl(phone: string, text: string) {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return "";
  const base = `https://wa.me/${digits}`;
  return text.trim() ? `${base}?text=${encodeURIComponent(text.trim())}` : base;
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

function CopyChoiceButton({
  label,
  value,
  active,
  onApply,
}: {
  label: string;
  value: string;
  active: boolean;
  onApply: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onApply}
      className={`rounded-xl border px-3 py-2 text-left transition-all ${
        active
          ? "border-purple-500/45 bg-purple-500/[0.14]"
          : "border-white/[0.06] bg-white/[0.025] hover:border-purple-400/25 hover:bg-purple-400/[0.05]"
      }`}
    >
      <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/28">{label}</p>
      <p className="text-[12px] leading-relaxed text-white/72">{value}</p>
    </button>
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
  const searchParams = useSearchParams();
  const { clientes, clienteAtual, loading: loadingClientes, selecionarCliente } = useCliente();
  const draftQueryId = searchParams.get("draft");

  const [step, setStep] = useState<"form" | "result">("form");
  const [loading, setLoading] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [uploadingCreative, setUploadingCreative] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [savingDraftOnly, setSavingDraftOnly] = useState(false);
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [forecast, setForecast] = useState<ForecastPayload | null>(null);
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CampaignSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [copyPackage, setCopyPackage] = useState<CopySuggestionPackage | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copyGeneratingField, setCopyGeneratingField] = useState<"all" | "primaryText" | "headline" | "description" | null>(null);
  const [loadedDraftId, setLoadedDraftId] = useState<string | null>(null);

  const [campaignName, setCampaignName] = useState("");
  const [objetivo, setObjetivo] = useState("LEADS");
  const [campaignDestination, setCampaignDestination] = useState<CampaignDestination>("website");
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
  const [creativeSource, setCreativeSource] = useState<CreativeSource>("upload");
  const [instagramPosts, setInstagramPosts] = useState<InstagramPostOption[]>([]);
  const [instagramPostsLoading, setInstagramPostsLoading] = useState(false);
  const [instagramPostsError, setInstagramPostsError] = useState<string | null>(null);
  const [selectedInstagramPost, setSelectedInstagramPost] = useState<InstagramPostOption | null>(null);
  const [primaryText, setPrimaryText] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [messagePhoneNumber, setMessagePhoneNumber] = useState("");
  const [messageOpeningText, setMessageOpeningText] = useState("");
  const [cta, setCta] = useState("LEARN_MORE");
  const [temCTA, setTemCTA] = useState(true);
  const [duracao, setDuracao] = useState("");

  const [velocidade, setVelocidade] = useState("");
  const [temPixel, setTemPixel] = useState(true);
  const [publicoCustom, setPublicoCustom] = useState(false);
  const [metaPageId, setMetaPageId] = useState("");
  const [metaPixelId, setMetaPixelId] = useState("");
  const supportsDestinationSelection = objetivo === "LEADS" || objetivo === "ENGAGEMENT";
  const destinationOptions = MESSAGE_DESTINATIONS.filter((option) => (
    objetivo === "ENGAGEMENT" ? true : option.id !== "post_engagement"
  ));
  const messagingCampaign = supportsDestinationSelection && isMessagingDestination(campaignDestination);
  const resolvedDestinationUrl = campaignDestination === "whatsapp"
    ? buildWhatsAppUrl(messagePhoneNumber, messageOpeningText)
    : destinationUrl.trim();
  const requiresPixelForObjective = objetivo === "SALES" || (objetivo === "LEADS" && !messagingCampaign);

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
    if (!clienteAtual?.facebook_pixel_id) return;
    setMetaPixelId((current) => current || clienteAtual.facebook_pixel_id || "");
  }, [clienteAtual?.facebook_pixel_id, clienteAtual?.id]);

  useEffect(() => {
    if (!clienteAtual?.whatsapp) return;
    setMessagePhoneNumber((current) => current || clienteAtual.whatsapp || "");
  }, [clienteAtual?.whatsapp, clienteAtual?.id]);

  useEffect(() => {
    if (!clienteAtual?.whatsapp_mensagem) return;
    setMessageOpeningText((current) => current || clienteAtual.whatsapp_mensagem || "");
  }, [clienteAtual?.whatsapp_mensagem, clienteAtual?.id]);

  useEffect(() => {
    if (objetivo === "ENGAGEMENT" && campaignDestination === "website") {
      setCampaignDestination("post_engagement");
      return;
    }
    if (objetivo === "LEADS" && campaignDestination === "post_engagement") {
      setCampaignDestination("website");
      return;
    }
    if (!supportsDestinationSelection && campaignDestination !== "website") {
      setCampaignDestination("website");
    }
  }, [campaignDestination, objetivo, supportsDestinationSelection]);

  useEffect(() => {
    if (!sucesso) return;
    const timer = window.setTimeout(() => setSucesso(null), 3200);
    return () => window.clearTimeout(timer);
  }, [sucesso]);

  useEffect(() => {
    if (creativeSource !== "instagram_existing_post") return;
    if (!creativePreviewUrl) return;
    URL.revokeObjectURL(creativePreviewUrl);
    setCreativePreviewUrl(null);
  }, [creativeSource, creativePreviewUrl]);

  useEffect(() => {
    if (!messagingCampaign) return;
    if (cta === "CONTACT_US") return;
    setCta("CONTACT_US");
  }, [cta, messagingCampaign]);

  async function carregarPostsInstagram(clientId: string) {
    setInstagramPostsLoading(true);
    setInstagramPostsError(null);

    try {
      const res = await fetch(`/api/campaigns/instagram-posts?clientId=${encodeURIComponent(clientId)}`);
      const data = (await res.json()) as InstagramPostsResponse;
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Nao foi possivel carregar publicacoes do Instagram.");
      }

      setInstagramPosts(data.posts ?? []);
      setSelectedInstagramPost((current) => {
        if (!current) return null;
        return (data.posts ?? []).find((post) => post.id === current.id) ?? null;
      });
    } catch (error) {
      setInstagramPosts([]);
      setInstagramPostsError(error instanceof Error ? error.message : "Erro ao carregar publicacoes do Instagram.");
    } finally {
      setInstagramPostsLoading(false);
    }
  }

  useEffect(() => {
    if (creativeSource !== "instagram_existing_post") return;
    if (!clienteAtual?.id) return;
    void carregarPostsInstagram(clienteAtual.id);
  }, [creativeSource, clienteAtual?.id]);

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
      campaignDestination === "post_engagement"
        ? true
        : Boolean(resolvedDestinationUrl),
      creativeSource === "instagram_existing_post"
        ? Boolean(selectedInstagramPost?.id)
        : Boolean(creativeFile || creativeUpload),
      !requiresPixelForObjective || temPixel,
      !requiresPixelForObjective || Boolean(metaPixelId.trim()),
      !messagingCampaign || campaignDestination !== "whatsapp" || Boolean(normalizePhoneDigits(messagePhoneNumber)),
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [
    advantagePlacements,
    audiencia,
    audienceMode,
    campaignName,
    campaignDestination,
    creativeSource,
    creativeFile,
    creativeUpload,
    selectedInstagramPost?.id,
    resolvedDestinationUrl,
    headline,
    interests,
    locations,
    messagePhoneNumber,
    metaPixelId,
    orcamento,
    objetivo,
    primaryText,
    requiresPixelForObjective,
    selectedPlacements.length,
    temPixel,
    messagingCampaign,
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
    setCampaignDestination((draft.objetivo || suggestion.objective || "LEADS") === "ENGAGEMENT" ? "post_engagement" : "website");
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
    setMessagePhoneNumber(suggestionClient?.whatsapp ?? "");
    setMessageOpeningText(suggestionClient?.whatsapp_mensagem ?? "");
    setMetaPageId("");
    setMetaPixelId(suggestionClient?.facebook_pixel_id ?? "");
    setCreativeSource("upload");
    setSelectedInstagramPost(null);
    setInstagramPostsError(null);
    setCreativeFile(null);
    setCreativeUpload(null);
    setCreativeUploadError(null);
    if (creativePreviewUrl) {
      URL.revokeObjectURL(creativePreviewUrl);
      setCreativePreviewUrl(null);
    }
    setErro(null);
  }

  function hydrateDraft(draft: DraftRecord) {
    const payload = asRecord(draft.draft_payload);
    const audience = asRecord(payload.audience);
    const placements = asRecord(payload.placements);
    const creative = asRecord(payload.criativo);
    const media = asRecord(creative.media);
    const instagramPost = asRecord(creative.instagramPost);
    const tracking = asRecord(payload.tracking);
    const destinationConfig = asRecord(payload.destinationConfig);
    const restoredCreativeSource = asString(creative.source, instagramPost.mediaId ? "instagram_existing_post" : "upload") as CreativeSource;
    const clientId = asString(payload.clientId ?? draft.cliente_id);
    const matchedClient = clientId ? clientes.find((cliente) => cliente.id === clientId) ?? null : null;

    if (matchedClient) {
      selecionarCliente(matchedClient);
    }

    setCampaignId(draft.id);
    setStep("form");
    setResult(draft.preflight_result ?? null);
    setForecast(draft.forecast_snapshot ?? null);
    setCampaignName(asString(payload.campaignName ?? draft.nome_campanha));
    setObjetivo(asString(payload.objetivo ?? draft.objective, "LEADS"));
    setCampaignDestination(asString(destinationConfig.channel, asString(payload.objetivo ?? draft.objective, "LEADS") === "ENGAGEMENT" ? "post_engagement" : "website") as CampaignDestination);
    setOrcamento(asInputValue(payload.orcamentoDiario ?? draft.orcamento));
    setMetaCpl(asInputValue(payload.metaCpl));
    setAudienceMode(asString(audience.mode, "ai") as AudienceMode);
    setLocations(asStringArray(audience.locations).join(", ") || "Brasil");
    setAgeMin(asInputValue(audience.ageMin || 24));
    setAgeMax(asInputValue(audience.ageMax || 55));
    setGender(asString(audience.gender, "all") as Gender);
    setInterests(asStringArray(audience.interests).join("\n"));
    setExclusions(asStringArray(audience.exclusions).join("\n"));
    setCustomAudienceName(asString(audience.customAudienceName));
    setLookalikeSource(asString(audience.lookalikeSource));
    setRetargetingDays(asInputValue(audience.retargetingDays || 30));
    setAudiencia(
      payload.audienciaSize != null && Number.isFinite(Number(payload.audienciaSize))
        ? String(Math.round(Number(payload.audienciaSize) / 1000))
        : ""
    );
    setAdvantagePlacements(placements.advantagePlus !== false);
    setSelectedPlacements(
      placements.advantagePlus !== false
        ? DEFAULT_PLACEMENTS
        : asStringArray(placements.selected).filter((item) => item !== "advantage_plus")
    );
    setSelectedPlatforms(asStringArray(placements.platforms).length > 0 ? asStringArray(placements.platforms) : ["facebook", "instagram"]);
    setSelectedDevices(asStringArray(placements.devices).length > 0 ? asStringArray(placements.devices) : ["mobile", "desktop"]);
    setFormato(asString(creative.formato, "video"));
    setCreativeSource(restoredCreativeSource);
    setSelectedInstagramPost(
      asString(instagramPost.mediaId ?? instagramPost.id)
        ? {
            id: asString(instagramPost.mediaId ?? instagramPost.id),
            caption: asString(instagramPost.caption) || null,
            mediaType: asString(instagramPost.mediaType, "UNKNOWN"),
            mediaProductType: asString(instagramPost.mediaProductType) || null,
            permalink: asString(instagramPost.permalink) || null,
            previewUrl: asString(instagramPost.previewUrl) || null,
            timestamp: asString(instagramPost.timestamp) || null,
          }
        : null
    );
    setPrimaryText(asString(creative.primaryText));
    setHeadline(asString(creative.headline));
    setDescription(asString(creative.description));
    setDestinationUrl(asString(creative.destinationUrl ?? payload.urlDestino));
    setMessagePhoneNumber(asString(destinationConfig.whatsappNumber ?? matchedClient?.whatsapp));
    setMessageOpeningText(asString(destinationConfig.openingMessage ?? matchedClient?.whatsapp_mensagem));
    setCta(asString(creative.cta, "LEARN_MORE"));
    setTemCTA(asBoolean(creative.temCTA, true));
    setDuracao(asInputValue(creative.duracaoSegundos));
    setVelocidade(asInputValue(payload.velocidadeUrl));
    setTemPixel(asBoolean(payload.temPixel, true));
    setPublicoCustom(asBoolean(payload.publicoCustom, false));
    setMetaPageId(asString(payload.metaPageId ?? tracking.metaPageId));
    setMetaPixelId(asString(payload.metaPixelId ?? tracking.metaPixelId ?? matchedClient?.facebook_pixel_id));
    setCreativeFile(null);
    setCreativeUpload(
      restoredCreativeSource === "upload" && media.bucket && media.path
        ? {
            bucket: asString(media.bucket),
            path: asString(media.path),
            fileName: asString(media.fileName, "criativo"),
            mimeType: asString(media.mimeType, "application/octet-stream"),
            sizeBytes: Number(media.sizeBytes ?? 0),
            fingerprint: asString(media.fingerprint, `${asString(media.fileName)}:${asString(media.path)}`),
            uploadedAt: asString(media.uploadedAt, new Date().toISOString()),
          }
        : null
    );
    if (creativePreviewUrl) {
      URL.revokeObjectURL(creativePreviewUrl);
      setCreativePreviewUrl(null);
    }
    setCopyPackage(null);
    setCopyError(null);
    setInstagramPostsError(null);
    setErro(null);
    setSucesso("Rascunho carregado para edicao.");
  }

  useEffect(() => {
    if (loadingClientes || !draftQueryId || loadedDraftId === draftQueryId) return;

    let cancelled = false;
    async function loadDraft() {
      setLoadingDraft(true);
      try {
        const res = await fetch(`/api/campaigns/drafts?id=${encodeURIComponent(draftQueryId)}`);
        const data = (await res.json()) as DraftResponse;
        if (!res.ok || !data.draft) {
          throw new Error(data.error ?? "Nao foi possivel carregar o rascunho.");
        }
        if (!cancelled) {
          hydrateDraft(data.draft);
          setLoadedDraftId(draftQueryId);
        }
      } catch (error) {
        if (!cancelled) {
          setErro(error instanceof Error ? error.message : "Erro ao carregar rascunho.");
        }
      } finally {
        if (!cancelled) setLoadingDraft(false);
      }
    }

    void loadDraft();
    return () => {
      cancelled = true;
    };
  }, [draftQueryId, loadedDraftId, loadingClientes, clientes]);

  function handleCreativeFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setCreativeSource("upload");
    setCreativeFile(file);
    setCreativeUpload(null);
    setCreativeUploadError(null);
    setSelectedInstagramPost(null);

    if (creativePreviewUrl) URL.revokeObjectURL(creativePreviewUrl);
    if (file && (file.type.startsWith("image/") || file.type.startsWith("video/"))) {
      setCreativePreviewUrl(URL.createObjectURL(file));
    } else {
      setCreativePreviewUrl(null);
    }
  }

  function selecionarPostInstagram(post: InstagramPostOption) {
    setCreativeSource("instagram_existing_post");
    setSelectedInstagramPost(post);
    setCreativeFile(null);
    setCreativeUpload(null);
    setCreativeUploadError(null);
    if (creativePreviewUrl) {
      URL.revokeObjectURL(creativePreviewUrl);
      setCreativePreviewUrl(null);
    }

    if (!primaryText.trim() && post.caption) {
      setPrimaryText(post.caption.slice(0, 220));
    }
  }

  function montarPayload(override?: PayloadOverride) {
    const media = override?.media === undefined ? creativeUpload : override.media;
    const audienceSize = audiencia ? Number(audiencia) * 1000 : undefined;
    const customAudience = audienceMode === "lookalike" || audienceMode === "retargeting" || publicoCustom;
    const normalizedWhatsapp = normalizePhoneDigits(messagePhoneNumber);

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
        source: creativeSource,
        formato,
        temTexto: Boolean(primaryText.trim() || headline.trim()),
        temCTA,
        cta,
        primaryText: primaryText.trim() || null,
        headline: headline.trim() || null,
        description: description.trim() || null,
        destinationUrl: resolvedDestinationUrl || null,
        duracaoSegundos: formato === "video" && duracao ? parseNumber(duracao) : undefined,
        instagramPost: creativeSource === "instagram_existing_post" && selectedInstagramPost
          ? {
              mediaId: selectedInstagramPost.id,
              caption: selectedInstagramPost.caption,
              mediaType: selectedInstagramPost.mediaType,
              mediaProductType: selectedInstagramPost.mediaProductType,
              permalink: selectedInstagramPost.permalink,
              previewUrl: selectedInstagramPost.previewUrl,
              timestamp: selectedInstagramPost.timestamp,
            }
          : null,
        media: media ?? (
          creativeSource === "upload" && creativeFile
            ? {
                fileName: creativeFile.name,
                mimeType: creativeFile.type,
                sizeBytes: creativeFile.size,
                pendingUpload: true,
              }
            : null
        ),
      },
      destinationConfig: {
        channel: campaignDestination,
        isMessaging: messagingCampaign,
        whatsappNumber: normalizedWhatsapp || null,
        openingMessage: messageOpeningText.trim() || null,
      },
      urlDestino: resolvedDestinationUrl || undefined,
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
    if (creativeSource !== "upload") return null;
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
    let finalPayload = montarPayload();
    const draftId = await persistDraft(finalPayload, campaignId);

    if (creativeSource === "upload" && creativeFile && creativeUpload?.fingerprint !== fileFingerprint(creativeFile)) {
      const uploaded = await uploadCreativeFile(draftId);
      finalPayload = montarPayload({ media: uploaded });
      await persistDraft(finalPayload, draftId);
    }

    return { draftId, payload: finalPayload };
  }

  function buildCopyContext() {
    return [
      clienteAtual ? `Cliente: ${clienteAtual.nome_cliente ?? clienteAtual.nome}` : "Cliente: nao selecionado",
      campaignName ? `Campanha: ${campaignName}` : null,
      `Objetivo: ${objetivo}`,
      `Destino da campanha: ${campaignDestination}`,
      `Formato: ${formato}`,
      `Origem do criativo: ${creativeSource === "instagram_existing_post" ? "publicacao existente do Instagram" : "arquivo enviado para anuncio"}`,
      resolvedDestinationUrl ? `URL destino: ${resolvedDestinationUrl}` : null,
      messagingCampaign && campaignDestination === "whatsapp" && messagePhoneNumber ? `WhatsApp destino: ${messagePhoneNumber}` : null,
      `CTA atual: ${cta}`,
      audiencia ? `Tamanho estimado de publico: ${audiencia} mil pessoas` : null,
      locations ? `Localizacao: ${locations}` : null,
      interests ? `Interesses e sinais: ${interests}` : null,
      selectedInstagramPost?.caption ? `Legenda da publicacao selecionada: ${selectedInstagramPost.caption}` : null,
      primaryText ? `Texto principal atual: ${primaryText}` : null,
      headline ? `Headline atual: ${headline}` : null,
      description ? `Descricao atual: ${description}` : null,
      "Crie mensagens com cara de Meta Ads Brasil: claras, diretas, específicas e com persuasao sem promessas absolutas.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function applyCopyPackage(pkg: CopySuggestionPackage, field: "all" | "primaryText" | "headline" | "description") {
    setCopyPackage(pkg);
    if (field === "all" || field === "primaryText") {
      if (pkg.primaryTexts[0]) setPrimaryText(pkg.primaryTexts[0]);
    }
    if (field === "all" || field === "headline") {
      if (pkg.headlines[0]) setHeadline(pkg.headlines[0]);
    }
    if (field === "all" || field === "description") {
      if (pkg.descriptions[0]) setDescription(pkg.descriptions[0]);
    }
    if (field === "all" && pkg.ctaSuggestions[0] && CTAS.some((item) => item.id === pkg.ctaSuggestions[0])) {
      setCta(pkg.ctaSuggestions[0]);
    }
  }

  async function gerarPacoteDeCopy(field: "all" | "primaryText" | "headline" | "description" = "all") {
    setCopyLoading(true);
    setCopyError(null);
    setCopyGeneratingField(field);

    try {
      const res = await fetch("/api/campaigns/copy-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clienteAtual?.id ?? null,
          clientName: clienteAtual?.nome_cliente ?? clienteAtual?.nome ?? null,
          campaignName,
          objective: objetivo,
          format: formato,
          destinationUrl: resolvedDestinationUrl,
          cta,
          currentPrimaryText: primaryText,
          currentHeadline: headline,
          currentDescription: description,
          audienceSummary: [
            audienceMode,
            audiencia ? `${audiencia}k` : null,
            locations || null,
            interests || null,
            campaignDestination,
          ].filter(Boolean).join(" | "),
          contextNotes: buildCopyContext(),
        }),
      });
      const data = (await res.json()) as CopyAssistResponse;
      if (!res.ok || !data.ok || !data.package) {
        throw new Error(data.error ?? "Nao foi possivel gerar a copy.");
      }

      applyCopyPackage(data.package, field);
      setSucesso(field === "all" ? "Pacote de copy gerado e aplicado." : "Sugestoes de copy geradas.");
    } catch (error) {
      setCopyError(error instanceof Error ? error.message : "Erro ao gerar copy.");
    } finally {
      setCopyLoading(false);
      setCopyGeneratingField(null);
    }
  }

  async function salvarSomenteRascunho() {
    setSavingDraftOnly(true);
    setErro(null);

    try {
      const { draftId } = await salvarRascunho();
      setCampaignId(draftId);
      setSucesso("Rascunho salvo com sucesso.");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar rascunho.");
    } finally {
      setSavingDraftOnly(false);
    }
  }

  async function analisar() {
    if (!orcamento) return;
    setLoading(true);
    setErro(null);

    try {
      const { draftId, payload } = await salvarRascunho();
      const body = {
        ...payload,
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
  const uploadedOrSelectedFile = creativeSource === "instagram_existing_post"
    ? (selectedInstagramPost ? {
        fileName: `Instagram post ${selectedInstagramPost.mediaType.toLowerCase()}`,
        mimeType: selectedInstagramPost.mediaType,
        sizeBytes: 0,
      } : null)
    : creativeUpload ?? (creativeFile ? {
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
                <h1 className="text-[24px] font-bold">{campaignId ? "Editar rascunho Meta" : "Nova campanha Meta"}</h1>
              </div>
              <p className="max-w-2xl text-[12px] leading-relaxed text-white/32">
                Monte campanha, publico, posicionamentos e anuncio com a mesma logica do gerenciador, com copy assistida pela IA antes do preflight.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:w-[420px]">
              {[
                { label: "Setup", value: `${setupCompleteness}%` },
                { label: "Budget 7d", value: weeklyBudget ? `R$ ${weeklyBudget.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : "-" },
                { label: "Criativo", value: uploadedOrSelectedFile ? "OK" : "-" },
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
                  {loadingDraft && (
                    <div className="flex items-center gap-2 rounded-2xl border border-blue-400/18 bg-blue-400/[0.06] px-4 py-3 text-[12px] text-blue-100/85">
                      <Loader2 size={14} className="animate-spin" />
                      Carregando rascunho para edicao...
                    </div>
                  )}

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
                      <p className="mt-1.5 text-[10px] leading-relaxed text-white/28">
                        Usado no preflight e nas previsoes da Erizon. A publicacao na Meta segue custo mais baixo sem limite por compatibilidade.
                      </p>
                    </div>

                    {supportsDestinationSelection && (
                      <div className="lg:col-span-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                        <div className="mb-3">
                          <FieldLabel>Destino da campanha</FieldLabel>
                          <p className="mt-1 text-[10px] leading-relaxed text-white/28">
                            Para campanhas de leads ou engajamento, voce pode escolher se a acao vai para site, post/perfil ou app de mensagem.
                          </p>
                        </div>

                        <div className={`grid gap-2 ${objetivo === "ENGAGEMENT" ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
                          {destinationOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setCampaignDestination(option.id as CampaignDestination)}
                              className={`rounded-xl border px-3 py-3 text-left transition-all ${
                                campaignDestination === option.id
                                  ? "border-purple-500/45 bg-purple-500/[0.12]"
                                  : "border-white/[0.07] bg-black/20 hover:bg-white/[0.05]"
                              }`}
                            >
                              <p className={`text-[12px] font-bold ${campaignDestination === option.id ? "text-purple-200" : "text-white/65"}`}>
                                {option.label}
                              </p>
                              <p className="mt-1 text-[10px] leading-tight text-white/30">{option.sub}</p>
                            </button>
                          ))}
                        </div>

                        {messagingCampaign && (
                          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {campaignDestination === "whatsapp" ? (
                              <>
                                <div>
                                  <FieldLabel>WhatsApp de destino</FieldLabel>
                                  <input
                                    value={messagePhoneNumber}
                                    onChange={(event) => setMessagePhoneNumber(event.target.value)}
                                    placeholder="5511999999999"
                                    className={inputClass}
                                  />
                                  <p className="mt-1.5 text-[10px] leading-relaxed text-white/28">
                                    Puxado do cliente automaticamente quando houver WhatsApp cadastrado.
                                  </p>
                                </div>
                                <div>
                                  <FieldLabel>Mensagem inicial</FieldLabel>
                                  <textarea
                                    value={messageOpeningText}
                                    onChange={(event) => setMessageOpeningText(event.target.value)}
                                    className={textareaClass}
                                    placeholder="Oi, vim pelo anuncio e quero saber mais."
                                  />
                                </div>
                              </>
                            ) : (
                              <div className="lg:col-span-2 rounded-xl border border-blue-400/15 bg-blue-400/[0.05] px-4 py-3 text-[11px] leading-relaxed text-blue-100/78">
                                {campaignDestination === "messenger"
                                  ? "A Erizon vai salvar essa campanha como destino de mensagens no Messenger usando a Page conectada."
                                  : "A Erizon vai salvar essa campanha como destino de mensagens no Instagram Direct usando o Instagram conectado do cliente."}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
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

                <Section
                  title="Anuncio"
                  icon={<ImageIcon size={14} className="text-fuchsia-300" />}
                  right={(
                    <button
                      type="button"
                      onClick={() => void gerarPacoteDeCopy("all")}
                      disabled={copyLoading}
                      className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/[0.08] px-3 py-2 text-[11px] font-semibold text-fuchsia-100 transition-all hover:bg-fuchsia-400/[0.14] disabled:opacity-45"
                    >
                      {copyLoading && copyGeneratingField === "all" ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      Ativar time de copy
                    </button>
                  )}
                >
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[160px_minmax(0,1fr)]">
                        <div>
                          <FieldLabel>Formato</FieldLabel>
                          <div className="grid grid-cols-3 gap-2 xl:grid-cols-1">
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

                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <PillButton active={creativeSource === "upload"} onClick={() => setCreativeSource("upload")}>
                              <span className="inline-flex items-center gap-1"><FileUp size={12} /> Arquivo novo</span>
                            </PillButton>
                            <PillButton active={creativeSource === "instagram_existing_post"} onClick={() => setCreativeSource("instagram_existing_post")}>
                              <span className="inline-flex items-center gap-1"><LinkIcon size={12} /> Post do Instagram</span>
                            </PillButton>
                          </div>

                          {creativeSource === "upload" && (
                            <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.025] p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold text-white/72">Criativo do anuncio</p>
                              <p className="mt-1 text-[10px] text-white/28">Suba a imagem ou video que vai para o pacote Meta.</p>
                            </div>
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px] font-semibold text-white/72 transition-all hover:bg-white/[0.08]">
                              <FileUp size={13} />
                              Selecionar arquivo
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime"
                                onChange={handleCreativeFile}
                                className="hidden"
                              />
                            </label>
                          </div>

                          <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
                            <p className="truncate text-[12px] font-semibold text-white/74">
                              {creativeFile?.name || creativeUpload?.fileName || "Nenhum arquivo selecionado"}
                            </p>
                            <p className="mt-1 text-[10px] text-white/28">
                              {creativeFile
                                ? `${creativeFile.type || "arquivo"} · ${fmtFileSize(creativeFile.size)}`
                                : creativeUpload
                                  ? `${creativeUpload.mimeType} · ${fmtFileSize(creativeUpload.sizeBytes)}`
                                  : "JPG, PNG, WEBP, MP4 ou MOV"}
                            </p>
                          </div>

                          {creativeUpload && (
                            <p className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-emerald-300/80">
                              <CheckCircle2 size={12} /> Criativo salvo na Erizon
                            </p>
                          )}
                          {creativeUploadError && (
                            <p className="mt-3 text-[10px] text-red-300/80">{creativeUploadError}</p>
                          )}
                        </div>
                          )}

                          {creativeSource === "instagram_existing_post" && (
                            <div className="space-y-3 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.025] p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-[11px] font-semibold text-white/72">Publicacoes existentes</p>
                                  <p className="mt-1 text-[10px] text-white/28">Escolha um post organico ja publicado no Instagram do cliente.</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => clienteAtual?.id ? void carregarPostsInstagram(clienteAtual.id) : undefined}
                                  disabled={instagramPostsLoading || !clienteAtual?.id}
                                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px] font-semibold text-white/72 transition-all hover:bg-white/[0.08] disabled:opacity-40"
                                >
                                  <RefreshCw size={13} className={instagramPostsLoading ? "animate-spin" : ""} />
                                  Atualizar posts
                                </button>
                              </div>

                              {!clienteAtual?.ig_user_id && (
                                <p className="rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-4 py-3 text-[10px] leading-relaxed text-amber-100/78">
                                  Esse cliente ainda nao tem IG User ID configurado. Preencha isso no cadastro do cliente para liberar a selecao de publicacoes.
                                </p>
                              )}

                              {instagramPostsError && (
                                <p className="rounded-xl border border-red-400/15 bg-red-400/[0.05] px-4 py-3 text-[10px] leading-relaxed text-red-100/78">
                                  {instagramPostsError}
                                </p>
                              )}

                              {instagramPostsLoading ? (
                                <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-4 text-[11px] text-white/45">
                                  <Loader2 size={13} className="animate-spin" />
                                  Carregando publicacoes do Instagram...
                                </div>
                              ) : instagramPosts.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  {instagramPosts.map((post) => (
                                    <button
                                      key={post.id}
                                      type="button"
                                      onClick={() => selecionarPostInstagram(post)}
                                      className={`overflow-hidden rounded-2xl border text-left transition-all ${
                                        selectedInstagramPost?.id === post.id
                                          ? "border-fuchsia-400/45 bg-fuchsia-400/[0.08]"
                                          : "border-white/[0.06] bg-black/20 hover:border-fuchsia-300/20 hover:bg-fuchsia-300/[0.04]"
                                      }`}
                                    >
                                      <div className="aspect-square bg-white/[0.03]">
                                        {post.previewUrl ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={post.previewUrl} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                          <div className="flex h-full items-center justify-center text-white/18">
                                            <ImageIcon size={28} />
                                          </div>
                                        )}
                                      </div>
                                      <div className="space-y-1 px-3 py-3">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/28">
                                          {post.mediaType.replaceAll("_", " ")}
                                        </p>
                                        <p className="line-clamp-3 text-[11px] leading-relaxed text-white/68">
                                          {post.caption || "Publicacao sem legenda"}
                                        </p>
                                        <p className="text-[10px] text-white/28">
                                          {post.permalink ? "Pronta para promover na Meta" : "Sem permalink detectado"}
                                        </p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              ) : clienteAtual?.ig_user_id ? (
                                <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-4 text-[11px] text-white/38">
                                  Nenhuma publicacao foi encontrada para esse Instagram conectado.
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-fuchsia-400/16 bg-fuchsia-400/[0.05] p-4">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold text-fuchsia-100/88">Copiloto de copy</p>
                            <p className="mt-1 text-[10px] leading-relaxed text-fuchsia-100/48">
                              Head de copy, estrategista de performance e contexto do cliente trabalhando juntos para gerar variações mais persuasivas.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void gerarPacoteDeCopy("all")}
                            disabled={copyLoading}
                            className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-300/18 bg-black/20 px-3 py-2 text-[11px] font-semibold text-fuchsia-100/80 transition-all hover:bg-fuchsia-400/[0.08] disabled:opacity-40"
                          >
                            {copyLoading && copyGeneratingField === "all" ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                            Gerar pacote completo
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3">
                            <p className="text-[9px] uppercase tracking-[0.14em] text-white/25">Cliente</p>
                            <p className="mt-1 text-[12px] font-semibold text-white/72">{clienteAtual?.nome_cliente ?? clienteAtual?.nome ?? "Sem cliente selecionado"}</p>
                          </div>
                          <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3">
                            <p className="text-[9px] uppercase tracking-[0.14em] text-white/25">Objetivo</p>
                            <p className="mt-1 text-[12px] font-semibold text-white/72">{objetivo}</p>
                          </div>
                          <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3">
                            <p className="text-[9px] uppercase tracking-[0.14em] text-white/25">Publico</p>
                            <p className="mt-1 text-[12px] font-semibold text-white/72">{audiencia ? `${audiencia}k` : audienceMode}</p>
                          </div>
                        </div>

                        {copyError && (
                          <p className="mt-3 text-[11px] text-red-200/80">{copyError}</p>
                        )}
                        {copyPackage && (
                          <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
                            <p className="text-[9px] uppercase tracking-[0.14em] text-white/25">Angulo sugerido</p>
                            <p className="mt-1 text-[12px] font-semibold text-white/78">{copyPackage.angle}</p>
                            <p className="mt-2 text-[11px] leading-relaxed text-white/45">{copyPackage.rationale}</p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                          <FieldLabel>
                            <div className="flex items-center justify-between gap-3">
                              <span>Titulo</span>
                              <button
                                type="button"
                                onClick={() => void gerarPacoteDeCopy("headline")}
                                disabled={copyLoading}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-fuchsia-200/78 transition-colors hover:text-fuchsia-100 disabled:opacity-35"
                              >
                                {copyLoading && copyGeneratingField === "headline" ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                                Gerar
                              </button>
                            </div>
                          </FieldLabel>
                          <input value={headline} onChange={(event) => setHeadline(event.target.value)} className={inputClass} placeholder="Headline do anuncio" />
                          {copyPackage?.headlines?.length ? (
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {copyPackage.headlines.slice(0, 4).map((option, index) => (
                                <CopyChoiceButton
                                  key={`${option}-${index}`}
                                  label={`Headline ${index + 1}`}
                                  value={option}
                                  active={headline === option}
                                  onApply={() => setHeadline(option)}
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                          <FieldLabel>CTA</FieldLabel>
                          <select value={cta} onChange={(event) => setCta(event.target.value)} className={inputClass}>
                            {CTAS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                          </select>
                          {copyPackage?.ctaSuggestions?.length ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {copyPackage.ctaSuggestions
                                .filter((option, index, list) => list.indexOf(option) === index && CTAS.some((item) => item.id === option))
                                .slice(0, 4)
                                .map((option) => (
                                  <PillButton key={option} active={cta === option} onClick={() => setCta(option)}>
                                    {CTAS.find((item) => item.id === option)?.label ?? option}
                                  </PillButton>
                                ))}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                        <FieldLabel>
                          <div className="flex items-center justify-between gap-3">
                            <span>Texto principal</span>
                            <button
                              type="button"
                              onClick={() => void gerarPacoteDeCopy("primaryText")}
                              disabled={copyLoading}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-fuchsia-200/78 transition-colors hover:text-fuchsia-100 disabled:opacity-35"
                            >
                              {copyLoading && copyGeneratingField === "primaryText" ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                              Gerar
                            </button>
                          </div>
                        </FieldLabel>
                        <textarea value={primaryText} onChange={(event) => setPrimaryText(event.target.value)} className={textareaClass} placeholder="Copy do anuncio" />
                        {copyPackage?.primaryTexts?.length ? (
                          <div className="mt-3 grid grid-cols-1 gap-2">
                            {copyPackage.primaryTexts.slice(0, 3).map((option, index) => (
                              <CopyChoiceButton
                                key={`${option}-${index}`}
                                label={`Texto ${index + 1}`}
                                value={option}
                                active={primaryText === option}
                                onApply={() => setPrimaryText(option)}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                        <FieldLabel>
                          <div className="flex items-center justify-between gap-3">
                            <span>Descricao</span>
                            <button
                              type="button"
                              onClick={() => void gerarPacoteDeCopy("description")}
                              disabled={copyLoading}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-fuchsia-200/78 transition-colors hover:text-fuchsia-100 disabled:opacity-35"
                            >
                              {copyLoading && copyGeneratingField === "description" ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                              Gerar
                            </button>
                          </div>
                        </FieldLabel>
                        <input value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} placeholder="Linha complementar" />
                        {copyPackage?.descriptions?.length ? (
                          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {copyPackage.descriptions.slice(0, 4).map((option, index) => (
                              <CopyChoiceButton
                                key={`${option}-${index}`}
                                label={`Descricao ${index + 1}`}
                                value={option}
                                active={description === option}
                                onApply={() => setDescription(option)}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <FieldLabel>{messagingCampaign ? "Destino resolvido" : "URL destino"}</FieldLabel>
                        {campaignDestination === "website" || !supportsDestinationSelection ? (
                          <div className="relative">
                            <LinkIcon size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/24" />
                            <input value={destinationUrl} onChange={(event) => setDestinationUrl(event.target.value)} className={`${inputClass} pl-10`} placeholder="https://..." />
                          </div>
                        ) : campaignDestination === "whatsapp" ? (
                          <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] px-4 py-3">
                            <p className="text-[12px] font-semibold text-emerald-100/86">{resolvedDestinationUrl || "Informe o WhatsApp para montar o destino."}</p>
                            <p className="mt-1 text-[10px] leading-relaxed text-emerald-100/48">
                              A URL de destino e montada automaticamente a partir do numero e da mensagem inicial.
                            </p>
                          </div>
                        ) : campaignDestination === "post_engagement" ? (
                          <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3 text-[11px] leading-relaxed text-white/42">
                            A Meta vai trabalhar o proprio post/perfil como destino principal, sem URL externa obrigatoria.
                          </div>
                        ) : (
                          <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3 text-[11px] leading-relaxed text-white/42">
                            O destino desta campanha sera tratado como conversa em {campaignDestination === "messenger" ? "Messenger" : "Instagram Direct"}.
                          </div>
                        )}
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
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/25">Preview do anuncio</p>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#111116]">
                        <div className="aspect-[4/5] bg-white/[0.025]">
                          {creativeSource === "instagram_existing_post" && selectedInstagramPost?.previewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={selectedInstagramPost.previewUrl} alt="" className="h-full w-full object-cover" />
                          ) : creativePreviewUrl && creativeFile?.type.startsWith("image/") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={creativePreviewUrl} alt="" className="h-full w-full object-cover" />
                          ) : creativePreviewUrl && creativeFile?.type.startsWith("video/") ? (
                            <video src={creativePreviewUrl} className="h-full w-full object-cover" controls muted />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center text-white/22">
                              <ImageIcon size={28} />
                              <p className="mt-2 text-[11px]">{creativeSource === "instagram_existing_post" ? "Sem post selecionado" : "Sem arquivo"}</p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 p-3">
                          {creativeSource === "instagram_existing_post" && selectedInstagramPost?.permalink ? (
                            <p className="text-[10px] font-semibold text-fuchsia-200/68">Usando publicacao existente do Instagram</p>
                          ) : null}
                          <p className="line-clamp-2 text-[12px] font-bold text-white/85">{headline || "Titulo do anuncio"}</p>
                          {description ? <p className="line-clamp-2 text-[10px] text-white/34">{description}</p> : null}
                          <p className="line-clamp-4 text-[11px] leading-relaxed text-white/45">{primaryText || "Texto principal do anuncio aparece aqui."}</p>
                          <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                            <span className="truncate text-[10px] text-white/35">{resolvedDestinationUrl || (campaignDestination === "post_engagement" ? "Post / perfil" : "Destino da campanha")}</span>
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

                {sucesso && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-[12px] text-emerald-100/85">
                    {sucesso}
                  </div>
                )}

                {erro && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-[12px] text-red-200">
                    {erro}
                  </div>
                )}

                <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <button
                    type="button"
                    onClick={salvarSomenteRascunho}
                    disabled={savingDraftOnly || loading || uploadingCreative}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] py-4 text-[13px] font-semibold text-white/72 transition-all hover:bg-white/[0.08] disabled:opacity-40"
                  >
                    {savingDraftOnly ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {savingDraftOnly ? "Salvando..." : "Salvar rascunho"}
                  </button>

                  <button
                    type="button"
                    onClick={analisar}
                    disabled={loading || uploadingCreative || !orcamento || loadingDraft}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 py-4 text-[14px] font-bold text-white shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all hover:bg-purple-500 disabled:opacity-40"
                  >
                    {loading || uploadingCreative ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {uploadingCreative ? "Subindo criativo..." : loading ? "Salvando e avaliando..." : "Salvar pacote e rodar preflight"}
                  </button>
                </div>
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
                      { label: "Destino", value: destinationOptions.find((item) => item.id === campaignDestination)?.label ?? campaignDestination },
                      { label: "Posicionamento", value: selectedPlacementLabels.slice(0, 2).join(", ") + (selectedPlacementLabels.length > 2 ? ` +${selectedPlacementLabels.length - 2}` : "") },
                      { label: "Origem", value: creativeSource === "instagram_existing_post" ? "Post do Instagram" : "Arquivo novo" },
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
                    <p>Campaign, audience, placements, copy, destino, criativo ou publicacao existente e tracking.</p>
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
