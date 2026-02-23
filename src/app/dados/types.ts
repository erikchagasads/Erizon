// src/app/dados/types.ts
// Tipos compartilhados entre os componentes da página Dados.

export interface Campanha {
  id: string;
  nome_campanha: string;
  status: string;
  gasto_total: number;
  orcamento: number;
  contatos: number;
  impressoes: number;
  alcance: number;
  cliques?: number;
  ctr?: number;
  frequencia?: number;
  meta_campaign_id?: string;
  data_inicio: string;
  data_atualizacao: string;
  data_insercao?: string;
}

export interface DecisaoHistorico {
  id?: string;
  campanha: string;
  campanha_nome?: string;
  acao: string;
  impacto: string;
  data: string;
  score_snapshot?: number;
  lucro_snapshot?: number;
  margem_snapshot?: number;
  score_depois?: number;
  lucro_depois?: number;
}

export interface ScoreBadge {
  label: string;
  color: string;
  textRing: string;
  glow: boolean;
}

export interface Alerta {
  tipo: "warning" | "danger" | "success";
  texto: string;
}

export interface CTA {
  label: string;
  color: string;
  acao: "escalar" | "criativo" | "pausar" | "segmentacao";
}

export interface Metricas {
  investimento: number;
  resultado: number;
  lucro: number;
  margem: number;
  cpl: number;
  ctr: number;
  ctrReal: boolean;
  freq: number;
  cpm: number;
  pctGasto: number;
  score: number;
  scoreBadge: ScoreBadge;
  alertas: Alerta[];
  cta: CTA | null;
}

export interface CampanhaEnriquecida extends Campanha {
  m: Metricas;
}

export interface DecisaoIA {
  campanhaId: string;
  campanhaNome: string;
  tipo: "pausar" | "escalar" | "criativo" | "budget";
  frase: string;
  impactoMensal: number;
  riscoIgnorar: string;
  confianca: number;
  lucroExtra: number;
  gastoDiario: number;
}

export type Periodo      = "hoje" | "7d" | "30d" | "mes";
export type OrdemMetrica = "score" | "gasto" | "cpl" | "ctr" | "leads";
export type AbaAtiva     = "campanhas" | "decisoes";