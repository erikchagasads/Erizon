// src/app/hooks/useHistorico.ts
// Hook para buscar e processar histórico de snapshots diários
// Usado pelas pages Pulse e Dados para exibir tendências históricas

import { useState, useEffect, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface SnapshotDiario {
  id: string;
  user_id: string;
  data_snapshot: string;       // coluna real na tabela (era data_ref)
  gasto_total: number;
  receita_total: number;
  lucro_total: number;
  roas_global: number;
  margem_global: number;
  cpl_medio: number;
  total_leads: number;
  total_campanhas: number;
  campanha_id?: string;
  campanha_nome?: string;
  impressoes?: number;
  cpl_ontem?: number;
  cpl_semana?: number;
  ctr_ontem?: number;
  ctr_semana?: number;
  leads_ontem?: number;
  gasto_ontem?: number;
  criado_at?: string;
}

export interface PontoTendencia {
  data: string;     // "DD/MM"
  dataISO: string;
  valor: number;
}

export interface TendenciaMetrica {
  metrica: string;
  label: string;
  unidade: string;
  pontos: PontoTendencia[];
  valorAtual: number;
  valorAnterior: number;
  delta: number;
  deltaPct: number;
  direcao: "subindo" | "estavel" | "caindo";
  inverso: boolean;
}

export interface HistoricoProcessado {
  conta: {
    roas: TendenciaMetrica;
    cpl: TendenciaMetrica;
    leads: TendenciaMetrica;
    gasto: TendenciaMetrica;
    margem: TendenciaMetrica;
    receita: TendenciaMetrica;
    score: TendenciaMetrica;
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHistorico(userId: string | null | undefined, clienteId?: string) {
  const [snapshots, setSnapshots] = useState<SnapshotDiario[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function fetchSnapshots() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from("metricas_snapshot_diario")
          .select("*")
          .eq("user_id", userId!)
          .order("data_snapshot", { ascending: true })
          .limit(500);

        if (err) throw err;
        if (!cancelled) setSnapshots((data ?? []) as SnapshotDiario[]);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao buscar histórico");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSnapshots();
    return () => { cancelled = true; };
  }, [userId]);

  const historico = useMemo<HistoricoProcessado | null>(() => {
    if (snapshots.length === 0) return null;

    function fmt(d: string) {
      // data_snapshot vem como "YYYY-MM-DD"
      const [, m, day] = d.slice(0, 10).split("-");
      return `${day}/${m}`;
    }

    function buildMetrica(
      campo: keyof Pick<SnapshotDiario,
        "roas_global" | "cpl_medio" | "total_leads" | "gasto_total" |
        "margem_global" | "receita_total" | "lucro_total"
      >,
      // score é calculado a partir dos dados, não existe como coluna direta
      label: string,
      unidade: string,
      inverso = false
    ): TendenciaMetrica {
      const pontos: PontoTendencia[] = snapshots.map(s => ({
        data:    fmt(s.data_snapshot),
        dataISO: s.data_snapshot.slice(0, 10),
        valor:   Number(s[campo]) || 0,
      }));

      const last   = pontos[pontos.length - 1]?.valor ?? 0;
      const prev7  = pontos.length >= 7
        ? pontos[pontos.length - 7]?.valor ?? 0
        : pontos[0]?.valor ?? 0;
      const delta    = last - prev7;
      const deltaPct = prev7 !== 0 ? (delta / Math.abs(prev7)) * 100 : 0;
      const threshold = 5;
      const positivo  = inverso ? delta < 0 : delta > 0;
      const direcao: TendenciaMetrica["direcao"] =
        Math.abs(deltaPct) < threshold ? "estavel"
        : positivo ? "subindo" : "caindo";

      return {
        metrica: campo, label, unidade, pontos,
        valorAtual: last, valorAnterior: prev7,
        delta, deltaPct, direcao, inverso,
      };
    }

    // "score" é derivado do roas_global para manter compatibilidade visual
    function buildScoreMetrica(): TendenciaMetrica {
      const pontos: PontoTendencia[] = snapshots.map(s => {
        // Score estimado: baseado em roas e margem
        const roas   = Number(s.roas_global)   || 0;
        const margem = Number(s.margem_global) || 0;
        const cpl    = Number(s.cpl_medio)     || 0;
        let sc = 50;
        if (roas >= 3)       sc += 20; else if (roas >= 2) sc += 10; else if (roas < 1) sc -= 20;
        if (margem >= 0.3)   sc += 15; else if (margem >= 0.15) sc += 5; else if (margem < 0) sc -= 15;
        if (cpl > 0 && cpl < 20) sc += 10; else if (cpl > 60) sc -= 10;
        return {
          data:    fmt(s.data_snapshot),
          dataISO: s.data_snapshot.slice(0, 10),
          valor:   Math.max(0, Math.min(100, Math.round(sc))),
        };
      });

      const last   = pontos[pontos.length - 1]?.valor ?? 0;
      const prev7  = pontos.length >= 7 ? pontos[pontos.length - 7]?.valor ?? 0 : pontos[0]?.valor ?? 0;
      const delta    = last - prev7;
      const deltaPct = prev7 !== 0 ? (delta / Math.abs(prev7)) * 100 : 0;
      const direcao: TendenciaMetrica["direcao"] =
        Math.abs(deltaPct) < 5 ? "estavel" : delta > 0 ? "subindo" : "caindo";

      return {
        metrica: "score", label: "Score", unidade: "", pontos,
        valorAtual: last, valorAnterior: prev7,
        delta, deltaPct, direcao, inverso: false,
      };
    }

    return {
      conta: {
        roas:    buildMetrica("roas_global",   "ROAS",    "×"),
        cpl:     buildMetrica("cpl_medio",     "CPL",     "R$", true),
        leads:   buildMetrica("total_leads",   "Leads",   ""),
        gasto:   buildMetrica("gasto_total",   "Gasto",   "R$"),
        margem:  buildMetrica("margem_global", "Margem",  "%"),
        receita: buildMetrica("receita_total", "Receita", "R$"),
        score:   buildScoreMetrica(),
      },
    };
  }, [snapshots]);

  const diasDisponiveis = useMemo(() => {
    const datas = new Set(snapshots.map(s => s.data_snapshot?.slice(0, 10)).filter(Boolean));
    return datas.size;
  }, [snapshots]);

  const ultimoSnapshot = useMemo(() => {
    if (snapshots.length === 0) return null;
    return snapshots[snapshots.length - 1]?.data_snapshot ?? null;
  }, [snapshots]);

  return { historico, diasDisponiveis, ultimoSnapshot, loading, error, snapshots };
}