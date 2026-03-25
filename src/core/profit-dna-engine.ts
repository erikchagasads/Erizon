/**
 * Profit DNA Engine
 * Analisa histórico de snapshots de um cliente e extrai padrões estratégicos.
 * Retorna um DNAProfile que representa o "genoma de performance" do cliente.
 */

export type DayPattern = {
  day: number;       // 0=Dom, 1=Seg, ..., 6=Sab
  dayLabel: string;
  avgRoas: number;
  avgCpl: number;
  avgCtr: number;
  nSnapshots: number;
};

export type FormatPattern = {
  format: string;
  avgRoas: number;
  avgCpl: number;
  nCampaigns: number;
};

export type AudiencePattern = {
  label: string;
  avgCpl: number;
  avgRoas: number;
  nCampaigns: number;
};

export type SeasonalityEntry = {
  month: number;
  monthLabel: string;
  cplDeltaPct: number;
  roasDeltaPct: number;
  note: string;
};

export type KeyLearning = {
  learning: string;
  confidence: number;  // 0-1
  discoveredAt: string;
};

export type DNAProfile = {
  clientId: string;
  workspaceId: string;

  // Padrões temporais
  bestDaysOfWeek: DayPattern[];
  worstDaysOfWeek: DayPattern[];

  // Criativos e públicos
  bestFormats: FormatPattern[];
  bestAudiences: AudiencePattern[];
  goldenAudience: string | null;

  // Benchmarks internos
  cplP25: number | null;
  cplMedian: number | null;
  roasP25: number | null;
  roasMedian: number | null;
  frequencySweetSpot: number | null;
  avgBudgetWinner: number | null;

  // Sazonalidade
  seasonalityPatterns: SeasonalityEntry[];

  // Aprendizados
  keyLearnings: KeyLearning[];

  // Meta
  nCampaignsAnalyzed: number;
  nSnapshotsAnalyzed: number;
  confidenceScore: number;
  periodStart: string | null;
  periodEnd: string | null;
};

type SnapshotRow = {
  campaign_id: string;
  campaign_name?: string;
  snapshot_date: string;
  spend: number;
  roas: number;
  cpl: number;
  ctr: number;
  frequency: number;
  leads: number;
  revenue: number;
  objective?: string;
};

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor((p / 100) * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function computeProfitDNA(
  clientId: string,
  workspaceId: string,
  snapshots: SnapshotRow[],
  memoriaCliente?: {
    copiesAprovadas?: string[];
    ganchosAprovados?: string[];
    formatosQueConvertem?: string[];
    publicoAlvo?: string;
  }
): DNAProfile {
  if (snapshots.length === 0) {
    return emptyProfile(clientId, workspaceId);
  }

  // ── Padrões por dia da semana ─────────────────────────────────────────────
  const byDay: Record<number, { roas: number[]; cpl: number[]; ctr: number[] }> = {};
  for (let d = 0; d < 7; d++) byDay[d] = { roas: [], cpl: [], ctr: [] };

  for (const s of snapshots) {
    if (!s.snapshot_date || s.spend <= 0) continue;
    const d = new Date(s.snapshot_date).getDay();
    if (s.roas > 0) byDay[d].roas.push(s.roas);
    if (s.cpl > 0 && s.cpl < 9999) byDay[d].cpl.push(s.cpl);
    if (s.ctr > 0) byDay[d].ctr.push(s.ctr);
  }

  const dayPatterns: DayPattern[] = Object.entries(byDay)
    .map(([day, data]) => ({
      day: Number(day),
      dayLabel: DAY_LABELS[Number(day)],
      avgRoas: avg(data.roas),
      avgCpl: avg(data.cpl),
      avgCtr: avg(data.ctr),
      nSnapshots: data.roas.length,
    }))
    .filter(d => d.nSnapshots >= 2);

  const sortedByRoas = [...dayPatterns].sort((a, b) => b.avgRoas - a.avgRoas);
  const bestDays = sortedByRoas.slice(0, 3);
  const worstDays = sortedByRoas.slice(-2).reverse();

  // ── CPL e ROAS percentis ──────────────────────────────────────────────────
  const allCpl = snapshots
    .filter(s => s.cpl > 0 && s.cpl < 9999 && s.leads > 0)
    .map(s => s.cpl)
    .sort((a, b) => a - b);

  const allRoas = snapshots
    .filter(s => s.roas > 0 && s.spend > 20)
    .map(s => s.roas)
    .sort((a, b) => b - a); // descendente (maior roas = melhor)

  const cplP25 = allCpl.length >= 4 ? percentile(allCpl, 25) : null;
  const cplMedian = allCpl.length >= 4 ? percentile(allCpl, 50) : null;
  const roasP25 = allRoas.length >= 4 ? percentile(allRoas, 25) : null;  // 25% pior
  const roasMedian = allRoas.length >= 4 ? percentile(allRoas, 50) : null;

  // ── Frequência sweet spot ─────────────────────────────────────────────────
  // Mapeia frequência vs ROAS — encontra ponto antes de fadiga
  const freqPoints = snapshots
    .filter(s => s.frequency > 0 && s.roas > 0 && s.spend > 20)
    .map(s => ({ freq: s.frequency, roas: s.roas }))
    .sort((a, b) => a.freq - b.freq);

  let frequencySweetSpot: number | null = null;
  if (freqPoints.length >= 6) {
    // Acha frequência onde ROAS começa a cair
    const buckets: Record<string, number[]> = {};
    for (const fp of freqPoints) {
      const bucket = Math.floor(fp.freq * 2) / 2; // intervalos de 0.5
      if (!buckets[bucket]) buckets[bucket] = [];
      buckets[bucket].push(fp.roas);
    }
    const bucketAvgs = Object.entries(buckets)
      .map(([f, rs]) => ({ freq: parseFloat(f), avgRoas: avg(rs) }))
      .sort((a, b) => a.freq - b.freq);

    let bestRoas = 0;
    for (const b of bucketAvgs) {
      if (b.avgRoas > bestRoas) {
        bestRoas = b.avgRoas;
        frequencySweetSpot = b.freq;
      }
    }
  }

  // ── Formatos (inferidos do nome das campanhas) ────────────────────────────
  const formatPatterns: FormatPattern[] = [];
  const formatKeywords: Record<string, string[]> = {
    "Vídeo": ["video", "vídeo", "reels", "reel", "stories", "story"],
    "Imagem": ["imagem", "image", "foto", "banner", "carrossel", "carousel"],
    "Depoimento": ["depoimento", "testimonial", "prova", "cliente"],
    "Demonstração": ["demo", "demonstr", "produto", "unbox"],
    "Oferta": ["oferta", "desconto", "promo", "sale", "%off"],
  };

  for (const [format, keywords] of Object.entries(formatKeywords)) {
    const matching = snapshots.filter(s => {
      const name = (s.campaign_name ?? "").toLowerCase();
      return keywords.some(k => name.includes(k));
    });
    if (matching.length >= 2) {
      const roas = matching.filter(s => s.roas > 0).map(s => s.roas);
      const cpls = matching.filter(s => s.cpl > 0 && s.cpl < 9999).map(s => s.cpl);
      formatPatterns.push({
        format,
        avgRoas: avg(roas),
        avgCpl: avg(cpls),
        nCampaigns: new Set(matching.map(s => s.campaign_id)).size,
      });
    }
  }
  formatPatterns.sort((a, b) => b.avgRoas - a.avgRoas);

  // ── Formatos da memória do cliente ────────────────────────────────────────
  if (memoriaCliente?.formatosQueConvertem?.length) {
    for (const fmt of memoriaCliente.formatosQueConvertem) {
      if (!formatPatterns.find(f => f.format === fmt)) {
        formatPatterns.push({ format: fmt, avgRoas: 0, avgCpl: 0, nCampaigns: 1 });
      }
    }
  }

  // ── Sazonalidade por mês ──────────────────────────────────────────────────
  const byMonth: Record<number, { cpls: number[]; roass: number[] }> = {};
  for (let m = 0; m < 12; m++) byMonth[m] = { cpls: [], roass: [] };

  for (const s of snapshots) {
    if (!s.snapshot_date || s.spend <= 0) continue;
    const m = new Date(s.snapshot_date).getMonth();
    if (s.cpl > 0 && s.cpl < 9999) byMonth[m].cpls.push(s.cpl);
    if (s.roas > 0) byMonth[m].roass.push(s.roas);
  }

  const globalAvgCpl = cplMedian ?? avg(allCpl);
  const globalAvgRoas = roasMedian ?? avg(allRoas);

  const seasonality: SeasonalityEntry[] = Object.entries(byMonth)
    .filter(([, data]) => data.cpls.length >= 3)
    .map(([month, data]) => {
      const mCpl = avg(data.cpls);
      const mRoas = avg(data.roass);
      const cplDelta = globalAvgCpl > 0 ? ((mCpl - globalAvgCpl) / globalAvgCpl) * 100 : 0;
      const roasDelta = globalAvgRoas > 0 ? ((mRoas - globalAvgRoas) / globalAvgRoas) * 100 : 0;
      let note = "";
      if (cplDelta < -15) note = "Mês excelente — CPL muito abaixo da média";
      else if (cplDelta > 15) note = "Mês difícil — CPL acima da média, cuidado com budget";
      else note = "Performance estável";
      return {
        month: Number(month),
        monthLabel: MONTH_LABELS[Number(month)],
        cplDeltaPct: Math.round(cplDelta),
        roasDeltaPct: Math.round(roasDelta),
        note,
      };
    })
    .sort((a, b) => a.month - b.month);

  // ── Orçamento médio vencedor ──────────────────────────────────────────────
  const winnerSpends = snapshots
    .filter(s => s.roas >= (roasMedian ?? 2.0) && s.spend > 0)
    .map(s => s.spend);
  const avgBudgetWinner = winnerSpends.length >= 3 ? avg(winnerSpends) : null;

  // ── Aprendizados-chave ────────────────────────────────────────────────────
  const keyLearnings: KeyLearning[] = [];
  const now = new Date().toISOString();

  if (bestDays.length > 0 && bestDays[0].nSnapshots >= 4) {
    keyLearnings.push({
      learning: `${bestDays.slice(0,2).map(d => d.dayLabel).join(" e ")} têm o melhor ROAS médio (${bestDays[0].avgRoas.toFixed(1)}x)`,
      confidence: Math.min(0.9, 0.5 + bestDays[0].nSnapshots * 0.05),
      discoveredAt: now,
    });
  }

  if (formatPatterns.length > 0 && formatPatterns[0].nCampaigns >= 2) {
    keyLearnings.push({
      learning: `Formato "${formatPatterns[0].format}" gera ROAS ${formatPatterns[0].avgRoas.toFixed(1)}x — melhor resultado entre os testados`,
      confidence: Math.min(0.85, 0.4 + formatPatterns[0].nCampaigns * 0.1),
      discoveredAt: now,
    });
  }

  if (frequencySweetSpot && frequencySweetSpot > 0) {
    keyLearnings.push({
      learning: `Frequência ideal antes de fadiga: ${frequencySweetSpot.toFixed(1)}x — acima disso ROAS cai`,
      confidence: 0.7,
      discoveredAt: now,
    });
  }

  if (seasonality.find(s => s.cplDeltaPct < -15)) {
    const best = seasonality.filter(s => s.cplDeltaPct < -10).map(s => s.monthLabel).join(", ");
    keyLearnings.push({
      learning: `Meses de melhor performance histórica: ${best} — planejar budget maior nesses períodos`,
      confidence: 0.75,
      discoveredAt: now,
    });
  }

  if (memoriaCliente?.ganchosAprovados?.length) {
    keyLearnings.push({
      learning: `Ganchos aprovados pelo gestor: "${memoriaCliente.ganchosAprovados.slice(0,2).join('", "')}"`,
      confidence: 0.9,
      discoveredAt: now,
    });
  }

  // ── Confidence score global ───────────────────────────────────────────────
  const uniqueCampaigns = new Set(snapshots.map(s => s.campaign_id)).size;
  const nSnaps = snapshots.length;
  const confidence = Math.min(1, (uniqueCampaigns / 20) * 0.4 + (nSnaps / 200) * 0.6);

  // ── Datas do período ──────────────────────────────────────────────────────
  const dates = snapshots.map(s => s.snapshot_date).sort();
  const periodStart = dates[0] ?? null;
  const periodEnd = dates[dates.length - 1] ?? null;

  return {
    clientId,
    workspaceId,
    bestDaysOfWeek: bestDays,
    worstDaysOfWeek: worstDays,
    bestFormats: formatPatterns.slice(0, 5),
    bestAudiences: [],  // populado via agente_memoria_cliente
    goldenAudience: memoriaCliente?.publicoAlvo ?? null,
    cplP25,
    cplMedian,
    roasP25,
    roasMedian,
    frequencySweetSpot,
    avgBudgetWinner,
    seasonalityPatterns: seasonality,
    keyLearnings,
    nCampaignsAnalyzed: uniqueCampaigns,
    nSnapshotsAnalyzed: nSnaps,
    confidenceScore: confidence,
    periodStart,
    periodEnd,
  };
}

function emptyProfile(clientId: string, workspaceId: string): DNAProfile {
  return {
    clientId, workspaceId,
    bestDaysOfWeek: [], worstDaysOfWeek: [],
    bestFormats: [], bestAudiences: [],
    goldenAudience: null,
    cplP25: null, cplMedian: null, roasP25: null, roasMedian: null,
    frequencySweetSpot: null, avgBudgetWinner: null,
    seasonalityPatterns: [], keyLearnings: [],
    nCampaignsAnalyzed: 0, nSnapshotsAnalyzed: 0,
    confidenceScore: 0, periodStart: null, periodEnd: null,
  };
}
