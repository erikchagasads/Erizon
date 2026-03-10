import { useEffect, useState, useCallback, useMemo } from "react";
import { getSupabase } from "@/lib/supabase";

export interface MetricaCampanha {
  id: string;
  user_id: string;
  cliente_id: string | null;
  nome_campanha: string;
  meta_campaign_id: string;
  status: string;
  gasto_total: number;
  contatos: number;
  receita_estimada: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  ctr: number;
  cpm: number;
  cpc: number;
  dias_ativo: number;
  orcamento: number;
  data_inicio: string | null;
  data_atualizacao: string;
}

export interface DecisaoHistoricoRow {
  id: string;
  user_id: string;
  campanha: string | null;
  campanha_nome: string | null;
  acao: string;
  impacto: string | null;
  data: string | null;
  created_at: string;
}

interface UseMetricasOptions {
  /** Se true, inclui campanhas pausadas/desativadas além das ativas */
  incluirInativas?: boolean;
  clienteId?: string;
}

interface UseMetricasReturn {
  campanhas: MetricaCampanha[];
  decisoes: DecisaoHistoricoRow[];
  userId: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMetricas(options: UseMetricasOptions = {}): UseMetricasReturn {
  const { incluirInativas = false, clienteId } = options;
  const supabase = useMemo(() => getSupabase(), []);

  const [campanhas, setCampanhas] = useState<MetricaCampanha[]>([]);
  const [decisoes, setDecisoes]   = useState<DecisaoHistoricoRow[]>([]);
  const [userId, setUserId]       = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [tick, setTick]           = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) { setError("Não autenticado"); return; }
        if (!cancelled) setUserId(user.id);

        let adsQuery = supabase
          .from("metricas_ads")
          .select("*")
          .eq("user_id", user.id)
          .order("gasto_total", { ascending: false });

        if (!incluirInativas) {
          adsQuery = adsQuery.in("status", ["ATIVO", "ACTIVE", "ATIVA"]);
        }

        if (clienteId) {
          adsQuery = adsQuery.eq("cliente_id", clienteId);
        }

        const [{ data: ads, error: adsErr }, { data: dec, error: decErr }] = await Promise.all([
          adsQuery,
          supabase
            .from("decisoes_historico")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

        if (adsErr) throw new Error(adsErr.message);
        if (decErr) throw new Error(decErr.message);

        if (!cancelled) {
          setCampanhas((ads ?? []) as MetricaCampanha[]);
          setDecisoes((dec ?? []) as DecisaoHistoricoRow[]);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar dados");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [supabase, incluirInativas, clienteId, tick]);

  return { campanhas, decisoes, userId, loading, error, refetch };
}