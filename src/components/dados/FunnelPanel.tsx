"use client";
import { Campanha } from "@/app/analytics/types";

interface Props {
  campanha: Campanha;
  gasto?: number;
}

interface FunnelStep {
  label: string;
  value: number;
  color: string;
}

export default function FunnelPanel({ campanha, gasto }: Props) {
  const spendTotal = gasto ?? campanha.gasto_total ?? 0;

  const compras = campanha.compras ?? 0;
  const addToCart = campanha.add_to_cart ?? 0;
  const checkoutIniciado = campanha.checkout_iniciado ?? 0;
  const visualizacoesConteudo = campanha.visualizacoes_conteudo ?? 0;
  const cadastros = campanha.cadastros ?? 0;
  const agendamentos = campanha.agendamentos ?? 0;
  const assinaturas = campanha.assinaturas ?? 0;
  const buscas = campanha.buscas ?? 0;
  const frequencia = campanha.frequencia ?? 0;
  const p25 = campanha.video_views_p25 ?? 0;
  const p50 = campanha.video_views_p50 ?? 0;
  const p75 = campanha.video_views_p75 ?? 0;
  const p100 = campanha.video_views_p100 ?? 0;

  const hasEcommerceFunnel =
    visualizacoesConteudo > 0 || addToCart > 0 || checkoutIniciado > 0 || compras > 0;
  const hasVideoData = p25 > 0;
  const hasOtherEvents = cadastros > 0 || agendamentos > 0 || assinaturas > 0 || buscas > 0;
  const hasFrequencia = frequencia > 0;

  const hasAnyData = hasEcommerceFunnel || hasVideoData || hasOtherEvents || hasFrequencia;

  if (!hasAnyData) {
    return (
      <div className="rounded-xl bg-[#0d0d10] border border-white/5 p-5 text-center">
        <p className="text-sm text-white/40">
          Configure os eventos do Pixel Meta para ver o funil completo
        </p>
      </div>
    );
  }

  // E-commerce funnel steps — only include steps with data or steps between two populated steps
  const funnelSteps: FunnelStep[] = [
    { label: "Visualizações de Conteúdo", value: visualizacoesConteudo, color: "bg-blue-500" },
    { label: "Adicionados ao Carrinho", value: addToCart, color: "bg-indigo-500" },
    { label: "Checkout Iniciado", value: checkoutIniciado, color: "bg-violet-500" },
    { label: "Compras", value: compras, color: "bg-emerald-500" },
  ].filter((s) => s.value > 0);

  const funnelMax = funnelSteps.length > 0 ? funnelSteps[0].value : 0;

  const taxaConversao =
    compras > 0 && visualizacoesConteudo > 0
      ? ((compras / visualizacoesConteudo) * 100).toFixed(2)
      : null;

  const custoPorCompra =
    compras > 0 && spendTotal > 0
      ? (spendTotal / compras).toFixed(2)
      : null;

  const videoMax = p25;

  return (
    <div className="space-y-4">
      {/* E-commerce funnel */}
      {hasEcommerceFunnel && funnelSteps.length > 0 && (
        <div className="rounded-xl bg-[#0d0d10] border border-white/5 p-5">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">
            Funil de Conversão
          </h3>
          <div className="space-y-3">
            {funnelSteps.map((step) => {
              const pct = funnelMax > 0 ? Math.round((step.value / funnelMax) * 100) : 0;
              return (
                <div key={step.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/60">{step.label}</span>
                    <span className="text-xs font-semibold text-white">
                      {step.value.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${step.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {(taxaConversao !== null || custoPorCompra !== null) && (
            <div className="mt-4 flex gap-4 pt-4 border-t border-white/5">
              {taxaConversao !== null && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">
                    Taxa de Conversão
                  </p>
                  <p className="text-sm font-bold text-emerald-400">{taxaConversao}%</p>
                </div>
              )}
              {custoPorCompra !== null && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">
                    Custo por Compra
                  </p>
                  <p className="text-sm font-bold text-white">
                    R$ {Number(custoPorCompra).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Video retention */}
      {hasVideoData && (
        <div className="rounded-xl bg-[#0d0d10] border border-white/5 p-5">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">
            Retenção de Vídeo
          </h3>
          <div className="space-y-3">
            {(
              [
                { label: "25%", value: p25 },
                { label: "50%", value: p50 },
                { label: "75%", value: p75 },
                { label: "100%", value: p100 },
              ] as { label: string; value: number }[]
            )
              .filter((r) => r.value > 0)
              .map((r) => {
                const pct = videoMax > 0 ? Math.round((r.value / videoMax) * 100) : 0;
                return (
                  <div key={r.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white/60">Assistido até {r.label}</span>
                      <span className="text-xs font-semibold text-white">
                        {r.value.toLocaleString("pt-BR")} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Other events */}
      {hasOtherEvents && (
        <div className="rounded-xl bg-[#0d0d10] border border-white/5 p-5">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">
            Outros Eventos
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {cadastros > 0 && (
              <div className="rounded-lg bg-white/5 p-3">
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Cadastros</p>
                <p className="text-sm font-bold text-white mt-1">
                  {cadastros.toLocaleString("pt-BR")}
                </p>
              </div>
            )}
            {agendamentos > 0 && (
              <div className="rounded-lg bg-white/5 p-3">
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Agendamentos</p>
                <p className="text-sm font-bold text-white mt-1">
                  {agendamentos.toLocaleString("pt-BR")}
                </p>
              </div>
            )}
            {assinaturas > 0 && (
              <div className="rounded-lg bg-white/5 p-3">
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Assinaturas</p>
                <p className="text-sm font-bold text-white mt-1">
                  {assinaturas.toLocaleString("pt-BR")}
                </p>
              </div>
            )}
            {buscas > 0 && (
              <div className="rounded-lg bg-white/5 p-3">
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Buscas</p>
                <p className="text-sm font-bold text-white mt-1">
                  {buscas.toLocaleString("pt-BR")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Frequency */}
      {hasFrequencia && (
        <div className="rounded-xl bg-[#0d0d10] border border-white/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Frequência</p>
              <p className="text-xl font-bold text-white mt-1">
                {frequencia.toFixed(2)}
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                exibições por pessoa
              </p>
            </div>
            {frequencia > 3.5 && (
              <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 text-right">
                <p className="text-xs font-semibold text-yellow-400">Risco de Saturação</p>
                <p className="text-[10px] text-yellow-400/70 mt-0.5">
                  Frequência acima de 3.5
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
