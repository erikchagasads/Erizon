import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/observability/logger";

export interface BenchmarkMetric {
  avg: number;
  p50?: number;
  p75?: number;
  p90?: number;
  min?: number;
  max?: number;
}

export interface IndustryBenchmark {
  id?: string;
  industry: string;
  audience_type: string;
  sample_size: number;
  metrics: {
    ctr: BenchmarkMetric;
    cpc: BenchmarkMetric;
    cpl: BenchmarkMetric;
    roas: BenchmarkMetric;
    frequency: BenchmarkMetric;
  };
  recommendations: {
    target_ctr_min: number;
    target_cpl_max: number;
    optimal_frequency: number;
    target_roas_min: number;
  };
  created_at?: Date;
}

export interface OptimizedSettings {
  recommended_daily_budget: number;
  bid_ceiling_cpl: number;
  frequency_cap: number;
  expected_roas_range: [number, number];
  expected_cpl_range: [number, number];
}

export class BenchmarkMarketplaceService {
  /**
   * Calcular percentil
   */
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Calcular média
   */
  private avg(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Min
   */
  private min(arr: number[]): number {
    return Math.min(...arr);
  }

  /**
   * Max
   */
  private max(arr: number[]): number {
    return Math.max(...arr);
  }

  /**
   * Extrair padrões anônimos de todas campanhas similares
   */
  async generateIndustryBenchmarks(params: {
    industry: string;
    audience_type: string;
    exclude_workspace_id?: string;
  }): Promise<IndustryBenchmark> {
    try {
      // Buscar campanhas similares de outros clientes
      let query = supabase
        .from('campaigns')
        .select(
          `
          id,
          ctr,
          cpc,
          cpl,
          roas,
          frequency,
          conversions,
          spend
        `
        )
        .eq('industry', params.industry)
        .eq('audience_type', params.audience_type)
        .gt('conversions', 5); // Só campanhas com dados suficientes

      if (params.exclude_workspace_id) {
        query = query.neq('workspace_id', params.exclude_workspace_id);
      }

      const { data: campaigns, error } = await query;

      if (error || !campaigns?.length) {
        logger.warn('No campaigns found for benchmark', { params });
        return this.getDefaultBenchmark(params.industry);
      }

      // Extrair arrays de métricas
      const ctrs = campaigns
        .map((c) => c.ctr)
        .filter((v) => typeof v === 'number');
      const cpcs = campaigns
        .map((c) => c.cpc)
        .filter((v) => typeof v === 'number');
      const cpls = campaigns
        .map((c) => c.cpl)
        .filter((v) => typeof v === 'number');
      const roass = campaigns
        .map((c) => c.roas)
        .filter((v) => typeof v === 'number');
      const frequencies = campaigns
        .map((c) => c.frequency)
        .filter((v) => typeof v === 'number');

      // Calcular estatísticas
      const benchmark: IndustryBenchmark = {
        industry: params.industry,
        audience_type: params.audience_type,
        sample_size: campaigns.length,

        metrics: {
          ctr: {
            avg: this.avg(ctrs),
            p50: this.percentile(ctrs, 50),
            p75: this.percentile(ctrs, 75),
            p90: this.percentile(ctrs, 90),
          },
          cpc: {
            avg: this.avg(cpcs),
            min: this.min(cpcs),
            max: this.max(cpcs),
          },
          cpl: {
            avg: this.avg(cpls),
            min: this.min(cpls),
            max: this.max(cpls),
          },
          roas: {
            avg: this.avg(roass),
            p75: this.percentile(roass, 75),
          },
          frequency: {
            avg: this.avg(frequencies),
            max: this.max(frequencies),
          },
        },

        recommendations: {
          target_ctr_min: this.percentile(ctrs, 25),
          target_cpl_max: this.percentile(cpls, 75),
          optimal_frequency: this.percentile(frequencies, 50),
          target_roas_min: 1.2,
        },

        created_at: new Date(),
      };

      // Guardar para usar depois
      await this.saveBenchmark(benchmark);

      logger.info('Industry benchmark generated', {
        industry: params.industry,
        sample_size: campaigns.length,
      });

      return benchmark;
    } catch (error) {
      logger.error('generateIndustryBenchmarks error', { error, params });
      return this.getDefaultBenchmark(params.industry);
    }
  }

  /**
   * Sugerir configurações otimizadas para novo cliente
   */
  async suggestOptimalSettings(params: {
    industry: string;
    audience_type: string;
  }): Promise<OptimizedSettings> {
    try {
      const benchmark = await this.generateIndustryBenchmarks({
        industry: params.industry,
        audience_type: params.audience_type,
        exclude_workspace_id: undefined,
      });

      const cpl_min = benchmark.metrics.cpl.min || 20;
      const cpl_avg = benchmark.metrics.cpl.avg || 50;
      const roas_p75 = benchmark.metrics.roas.p75 || 2.5;
      const frequency_safe = benchmark.metrics.frequency.max || 3.5;

      return {
        recommended_daily_budget: 200, // Padrão, ajustar depois
        bid_ceiling_cpl: cpl_min * 1.2, // +20% safety margin
        frequency_cap: frequency_safe,
        expected_roas_range: [1.2, roas_p75],
        expected_cpl_range: [cpl_min, cpl_avg],
      };
    } catch (error) {
      logger.error('suggestOptimalSettings error', { error, params });

      // Return safe defaults
      return {
        recommended_daily_budget: 200,
        bid_ceiling_cpl: 60,
        frequency_cap: 3.5,
        expected_roas_range: [1.2, 2.5],
        expected_cpl_range: [20, 50],
      };
    }
  }

  /**
   * Obter benchmark guardado
   */
  async getBenchmark(params: {
    industry: string;
    audience_type: string;
  }): Promise<IndustryBenchmark | null> {
    try {
      const { data, error } = await supabase
        .from('benchmarks')
        .select('*')
        .eq('industry', params.industry)
        .eq('audience_type', params.audience_type)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        logger.debug('Benchmark not found in cache', { params });
        return null;
      }

      return data.data as IndustryBenchmark;
    } catch (error) {
      logger.debug('getBenchmark error', { error, params });
      return null;
    }
  }

  /**
   * Guardar benchmark
   */
  private async saveBenchmark(benchmark: IndustryBenchmark): Promise<void> {
    try {
      await supabase.from('benchmarks').upsert(
        {
          industry: benchmark.industry,
          audience_type: benchmark.audience_type,
          data: benchmark,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'industry,audience_type',
        }
      );

      logger.info('Benchmark saved', {
        industry: benchmark.industry,
        sample_size: benchmark.sample_size,
      });
    } catch (error) {
      logger.warn('Failed to save benchmark', { error, benchmark });
      // Não throws, é OK falhar
    }
  }

  /**
   * Benchmark padrão se não houver dados
   */
  private getDefaultBenchmark(industry: string): IndustryBenchmark {
    return {
      industry,
      audience_type: 'unknown',
      sample_size: 0,

      metrics: {
        ctr: { avg: 1.5, p50: 1.2, p75: 2.0, p90: 3.0 },
        cpc: { avg: 5, min: 1, max: 20 },
        cpl: { avg: 50, min: 20, max: 150 },
        roas: { avg: 2.0, p75: 3.0 },
        frequency: { avg: 2.5, max: 4.0 },
      },

      recommendations: {
        target_ctr_min: 1.0,
        target_cpl_max: 75,
        optimal_frequency: 2.5,
        target_roas_min: 1.2,
      },

      created_at: new Date(),
    };
  }

  /**
   * Listar todos benchmarks disponíveis
   */
  async listBenchmarks(): Promise<IndustryBenchmark[]> {
    try {
      const { data, error } = await supabase
        .from('benchmarks')
        .select('data')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        return [];
      }

      return (data || []).map((b) => b.data as IndustryBenchmark);
    } catch (error) {
      logger.error('listBenchmarks error', { error });
      return [];
    }
  }
}

export const benchmarkMarketplaceService = new BenchmarkMarketplaceService();
