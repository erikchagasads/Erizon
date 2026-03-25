/**
 * Budget Allocation Engine
 * Resolve a alocação ótima de budget entre N clientes para maximizar lucro total.
 * Usa retorno marginal decrescente: cada R$100 a mais em uma campanha saturada retorna menos.
 */

export type ClientBudgetInput = {
  clientId: string;
  clientName: string;
  budgetAtual: number;    // R$/dia atual
  roasHistorico: number;  // ROAS médio dos últimos 30 dias
  cplHistorico?: number;
  headroomPct?: number;   // capacidade de escala estimada (0-1, 0.3 = 30% de headroom)
  isActive: boolean;      // campanha rodando
  spend7d?: number;       // gasto real últimos 7 dias (referência)
};

export type ClientAllocation = {
  clientId: string;
  clientName: string;
  budgetAtual: number;
  budgetOtimo: number;
  delta: number;            // diferença R$/dia (+ = aumento, - = redução)
  deltaPct: number;
  impactoEstimadoBrl: number;  // impacto semanal estimado
  acao: "scale" | "maintain" | "reduce";
  justificativa: string;
};

export type AllocationResult = {
  budgetTotal: number;
  alocacaoInput: ClientBudgetInput[];
  alocacaoOutput: ClientAllocation[];
  impactoTotalBrl: number;  // ganho estimado vs alocação atual
  eficienciaGlobal: number; // ROAS ponderado da alocação ótima
  resumo: string;
};

// Marginal return function: rendimento decresce conforme aumenta o budget
// curva: retorno = roas * budget * (1 - decay * log(budget / base))
function marginalReturn(budget: number, roas: number, headroom: number): number {
  if (budget <= 0 || roas <= 0) return 0;
  // Headroom controla velocidade de decaimento
  const decay = 1 - headroom;  // 0 = sem decaimento (muito headroom), 1 = decai rápido
  const base = 50;
  const factor = Math.max(0.1, 1 - decay * Math.log(Math.max(1, budget / base)) * 0.15);
  return roas * budget * factor;
}

export function optimizeBudgetAllocation(
  clients: ClientBudgetInput[],
  budgetTotal: number
): AllocationResult {
  const active = clients.filter(c => c.isActive && c.roasHistorico > 0);

  if (active.length === 0) {
    return {
      budgetTotal,
      alocacaoInput: clients,
      alocacaoOutput: clients.map(c => ({
        clientId: c.clientId, clientName: c.clientName,
        budgetAtual: c.budgetAtual, budgetOtimo: c.budgetAtual,
        delta: 0, deltaPct: 0, impactoEstimadoBrl: 0,
        acao: "maintain", justificativa: "Nenhuma campanha ativa encontrada.",
      })),
      impactoTotalBrl: 0,
      eficienciaGlobal: 0,
      resumo: "Nenhuma campanha ativa para otimizar.",
    };
  }

  // Headroom padrão baseado em ROAS — quanto maior o ROAS, mais headroom
  const withHeadroom = active.map(c => ({
    ...c,
    headroom: c.headroomPct ?? Math.min(0.8, Math.max(0.1, (c.roasHistorico - 1) / 4)),
  }));

  // Greedy algorithm: distribui budget em incrementos de R$10
  const increment = 10;
  const steps = Math.floor(budgetTotal / increment);
  const allocated: Record<string, number> = {};
  for (const c of withHeadroom) allocated[c.clientId] = 0;

  for (let s = 0; s < steps; s++) {
    // Acha o cliente com maior retorno marginal para o próximo incremento
    let bestClient = withHeadroom[0];
    let bestReturn = -Infinity;

    for (const c of withHeadroom) {
      const currentBudget = allocated[c.clientId];
      const ret = marginalReturn(currentBudget + increment, c.roasHistorico, c.headroom)
                - marginalReturn(currentBudget, c.roasHistorico, c.headroom);
      if (ret > bestReturn) {
        bestReturn = ret;
        bestClient = c;
      }
    }

    allocated[bestClient.clientId] += increment;
  }

  // Calcula resultados
  const output: ClientAllocation[] = clients.map(c => {
    const budgetOtimo = allocated[c.clientId] ?? c.budgetAtual;
    const delta = budgetOtimo - c.budgetAtual;
    const deltaPct = c.budgetAtual > 0 ? (delta / c.budgetAtual) * 100 : 0;

    // Impacto semanal estimado (7 dias)
    const currentWeekly = c.budgetAtual * 7 * Math.max(1, c.roasHistorico - 1) * 0.3;
    const newWeekly = budgetOtimo * 7 * Math.max(1, c.roasHistorico - 1) * 0.3;
    const impacto = newWeekly - currentWeekly;

    const acao: ClientAllocation["acao"] =
      delta > increment ? "scale" :
      delta < -increment ? "reduce" :
      "maintain";

    let justificativa = "";
    if (acao === "scale") {
      justificativa = `ROAS ${c.roasHistorico.toFixed(1)}x indica headroom — investir mais aqui gera retorno incremental positivo. +R$${Math.round(delta)}/dia.`;
    } else if (acao === "reduce") {
      justificativa = `Budget atual acima da zona de retorno ótimo para este ROAS. Redirecionar R$${Math.abs(Math.round(delta))}/dia para campanhas mais eficientes.`;
    } else {
      justificativa = `Budget próximo ao ótimo para o ROAS atual. Manter e monitorar.`;
    }

    return {
      clientId: c.clientId,
      clientName: c.clientName,
      budgetAtual: c.budgetAtual,
      budgetOtimo: Math.round(budgetOtimo),
      delta: Math.round(delta),
      deltaPct: Math.round(deltaPct),
      impactoEstimadoBrl: Math.round(impacto),
      acao,
      justificativa,
    };
  });

  const impactoTotal = output.reduce((s, c) => s + c.impactoEstimadoBrl, 0);

  const roasAtual = active.reduce((s, c) => s + c.roasHistorico * c.budgetAtual, 0) /
                    active.reduce((s, c) => s + c.budgetAtual, 0);

  const totalAlloc = Object.values(allocated).reduce((s, v) => s + v, 0);
  const roasOtimo = active.reduce((s, c) => s + c.roasHistorico * (allocated[c.clientId] ?? 0), 0) /
                    Math.max(1, totalAlloc);

  const resumo = impactoTotal > 0
    ? `Redistribuindo R$${Math.round(budgetTotal)}/dia com a alocação ótima, o ganho estimado é de R$${Math.round(impactoTotal)}/semana (${((roasOtimo - roasAtual) / roasAtual * 100).toFixed(0)}% de melhora no ROAS do portfólio).`
    : `A alocação atual já está próxima do ótimo para o ROAS histórico dos clientes.`;

  return {
    budgetTotal,
    alocacaoInput: clients,
    alocacaoOutput: output.sort((a, b) => b.impactoEstimadoBrl - a.impactoEstimadoBrl),
    impactoTotalBrl: impactoTotal,
    eficienciaGlobal: parseFloat(roasOtimo.toFixed(2)),
    resumo,
  };
}
