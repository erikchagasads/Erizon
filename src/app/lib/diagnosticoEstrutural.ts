// src/app/lib/diagnosticoEstrutural.ts
// Diagnóstico Estrutural de Conta
// "Seu problema não é campanha. É oferta."
// Engine de crescimento além da mídia.

import type { CampanhaBase } from "@/app/analytics/engine";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type CamadaProblema =
  | "oferta"          // produto/oferta é o gargalo
  | "funil"           // conversão pós-clique
  | "criativo"        // criatividade e ângulo
  | "segmentacao"     // público errado
  | "orcamento"       // investimento insuficiente ou mal distribuído
  | "sazonalidade"    // momento de mercado
  | "estrutura_conta" // organização das campanhas
  | "saudavel";       // sem problema estrutural detectado

export interface DiagnosticoEstrutural {
  camada: CamadaProblema;
  titulo: string;
  descricao: string;
  evidencias: string[];
  acoes: AcaoDiagnostico[];
  impactoEstimado: string;
  urgencia: "critica" | "alta" | "media" | "baixa";
  score: number; // 0-100 — quão grave é o problema
}

export interface AcaoDiagnostico {
  acao: string;
  tipo: "tecnica" | "estrategica" | "operacional";
  prazo: "imediato" | "7_dias" | "30_dias";
  dificuldade: "facil" | "medio" | "dificil";
}

export interface AnaliseFunil {
  taxaClique: number;        // CTR
  taxaLead: number;          // leads / cliques estimados
  taxaConversao: number;     // vendas / leads (se disponível)
  gargalo: "topo" | "meio" | "fundo" | "balanceado";
  cplVsBenchmark: number;    // % acima/abaixo do ideal
  fraseGargalo: string;
}

export interface RelatorioEstrutura {
  diagnosticoPrincipal: DiagnosticoEstrutural;
  diagnosticosSecundarios: DiagnosticoEstrutural[];
  analiseFunil: AnaliseFunil;
  scoreEstrutura: number;    // 0–100
  tipoOperacao: "media_only" | "growth_engine"; // se já é engine de crescimento
  proximoSalto: string;
  fraseExecutiva: string;
}

// ─── Thresholds de diagnóstico ────────────────────────────────────────────────

const THRESHOLDS = {
  CTR_MINIMO:           0.8,
  CTR_BOM:              2.0,
  ROAS_MINIMO:          2.5,
  CPL_IDEAL:            30,
  TAXA_CONV_MINIMA:     0.01,  // 1% leads → venda
  CONCENTRACAO_MAX:     0.70,  // max % de budget em 1 campanha
  MIN_CAMPANHAS_SAUDAVEL: 2,
  INVESTIMENTO_MINIMO_DIA: 30,
} as const;

// ─── Diagnóstico principal ────────────────────────────────────────────────────

export function diagnosticarConta(
  campanhas: CampanhaBase[],
  cplMedio: number,
  roasMedio: number,
  ctrMedio: number,
  taxaConversaoEstimada?: number,   // leads → vendas
  ticketMedio?: number
): RelatorioEstrutura {
  const diagnosticos: DiagnosticoEstrutural[] = [];

  const totalGasto  = campanhas.reduce((s, c) => s + c.gasto_total, 0);
  const totalLeads  = campanhas.reduce((s, c) => s + c.contatos, 0);
  const totalCliques = campanhas.reduce((s, c) => s + (c.cliques ?? 0), 0);
  const totalImpressoes = campanhas.reduce((s, c) => s + (c.impressoes ?? 1), 0);

  const ctrReal = totalCliques > 0 && totalImpressoes > 0
    ? (totalCliques / totalImpressoes) * 100
    : ctrMedio;

  const gastoMaxCampanha = Math.max(...campanhas.map(c => c.gasto_total));
  const concentracao = totalGasto > 0 ? gastoMaxCampanha / totalGasto : 0;

  // ── Diagnóstico 1: Problema de oferta ─────────────────────────────────────
  // CTR ok mas ROAS baixo = tráfego qualificado não converte = oferta fraca
  if (ctrReal >= THRESHOLDS.CTR_BOM && roasMedio < THRESHOLDS.ROAS_MINIMO && totalLeads > 10) {
    diagnosticos.push({
      camada: "oferta",
      titulo: "Seu problema não é o tráfego. É a oferta.",
      descricao: `CTR de ${ctrReal.toFixed(1)}% prova que o anúncio funciona. Mas o ROAS de ${roasMedio.toFixed(2)}× mostra que as pessoas chegam e não compram. O criativo vende o clique, mas a oferta não vende o produto.`,
      evidencias: [
        `CTR ${ctrReal.toFixed(1)}% (acima do mínimo de ${THRESHOLDS.CTR_BOM}%) — audiência engajada`,
        `ROAS ${roasMedio.toFixed(2)}× abaixo do mínimo saudável (${THRESHOLDS.ROAS_MINIMO}×)`,
        totalLeads > 0 ? `${totalLeads} leads gerados — funil de topo funciona` : "Leads zerados mesmo com CTR alto",
      ],
      acoes: [
        { acao: "Revisar preço vs percepção de valor do produto", tipo: "estrategica", prazo: "30_dias", dificuldade: "dificil" },
        { acao: "Testar nova oferta com bônus ou garantia estendida", tipo: "estrategica", prazo: "7_dias", dificuldade: "medio" },
        { acao: "Analisar objeções na página de destino (heatmap)", tipo: "tecnica", prazo: "imediato", dificuldade: "facil" },
        { acao: "A/B testar 2 ângulos diferentes de posicionamento", tipo: "operacional", prazo: "7_dias", dificuldade: "medio" },
      ],
      impactoEstimado: `Melhorar ROAS de ${roasMedio.toFixed(2)}× para ${THRESHOLDS.ROAS_MINIMO}× pode aumentar lucro em ${Math.round((THRESHOLDS.ROAS_MINIMO / Math.max(roasMedio, 0.1) - 1) * 100)}%`,
      urgencia: roasMedio < 1.5 ? "critica" : "alta",
      score: Math.round(100 - (roasMedio / THRESHOLDS.ROAS_MINIMO) * 60),
    });
  }

  // ── Diagnóstico 2: Problema de funil ──────────────────────────────────────
  // CPL alto mas CTR ok = clique não vira lead = landing page / funil fraco
  if (cplMedio > THRESHOLDS.CPL_IDEAL * 2.5 && ctrReal >= THRESHOLDS.CTR_MINIMO) {
    const taxaLeadEstimada = totalCliques > 0 && totalLeads > 0
      ? totalLeads / totalCliques
      : null;
    const fraseConversao = taxaLeadEstimada != null
      ? `Apenas ${(taxaLeadEstimada * 100).toFixed(1)}% dos cliques viram leads`
      : "Taxa de conversão pós-clique provavelmente muito baixa";

    diagnosticos.push({
      camada: "funil",
      titulo: `Seu funil está vazando. ${fraseConversao}.`,
      descricao: `Com CPL de R$${Math.round(cplMedio)} e CTR razoável, o problema está entre o clique e o cadastro. A landing page ou o processo de conversão está perdendo leads qualificados.`,
      evidencias: [
        `CPL R$${Math.round(cplMedio)} vs ideal R$${THRESHOLDS.CPL_IDEAL} — ${Math.round(cplMedio / THRESHOLDS.CPL_IDEAL)}× acima`,
        fraseConversao,
        `R$${Math.round(totalGasto)} investido — resultado abaixo do esperado`,
      ],
      acoes: [
        { acao: "Otimizar velocidade de carregamento da landing page (< 3s)", tipo: "tecnica", prazo: "imediato", dificuldade: "facil" },
        { acao: "Reduzir campos do formulário para o mínimo necessário", tipo: "tecnica", prazo: "imediato", dificuldade: "facil" },
        { acao: "Alinhar promessa do anúncio com headline da landing page", tipo: "estrategica", prazo: "7_dias", dificuldade: "medio" },
        { acao: "Instalar hotjar / clarity para ver onde usuários abandonam", tipo: "operacional", prazo: "imediato", dificuldade: "facil" },
      ],
      impactoEstimado: `Dobrar a taxa de conversão da landing page reduziria CPL de R$${Math.round(cplMedio)} para R$${Math.round(cplMedio / 2)}`,
      urgencia: "alta",
      score: Math.min(90, Math.round((cplMedio / THRESHOLDS.CPL_IDEAL - 1) * 20)),
    });
  }

  // ── Diagnóstico 3: Problema de criativo ───────────────────────────────────
  // CTR baixo com investimento relevante = criativo não funciona
  if (ctrReal < THRESHOLDS.CTR_MINIMO && totalGasto > 500) {
    diagnosticos.push({
      camada: "criativo",
      titulo: "O anúncio não para o scroll. CTR abaixo do mínimo.",
      descricao: `CTR de ${ctrReal.toFixed(2)}% indica que o criativo não está gerando interesse suficiente. Cada R$100 investido produz menos cliques do que deveria. Isso infla o CPL e limita tudo.`,
      evidencias: [
        `CTR ${ctrReal.toFixed(2)}% abaixo do mínimo (${THRESHOLDS.CTR_MINIMO}%)`,
        `R$${Math.round(totalGasto)} investido com baixo engajamento`,
        totalLeads === 0 ? "Zero leads gerados — criativo não converte" : `Apenas ${totalLeads} leads com esse volume de gasto`,
      ],
      acoes: [
        { acao: "Criar 3 variações de hook (primeiros 3 segundos do vídeo ou linha do texto)", tipo: "operacional", prazo: "imediato", dificuldade: "medio" },
        { acao: "Testar formato diferente: vídeo vs imagem vs carrossel", tipo: "operacional", prazo: "7_dias", dificuldade: "facil" },
        { acao: "Usar prova social real (depoimento, número, resultado)", tipo: "estrategica", prazo: "7_dias", dificuldade: "medio" },
        { acao: "Revisar segmentação — público pode estar dessincronizado com criativo", tipo: "tecnica", prazo: "7_dias", dificuldade: "medio" },
      ],
      impactoEstimado: `Elevar CTR para ${THRESHOLDS.CTR_BOM}% pode reduzir CPM efetivo em até 40%`,
      urgencia: ctrReal < 0.4 ? "critica" : "alta",
      score: Math.round((1 - ctrReal / THRESHOLDS.CTR_BOM) * 80),
    });
  }

  // ── Diagnóstico 4: Concentração de risco estrutural ───────────────────────
  if (concentracao > THRESHOLDS.CONCENTRACAO_MAX && campanhas.length > 1) {
    const campPrincipal = campanhas.sort((a, b) => b.gasto_total - a.gasto_total)[0];
    diagnosticos.push({
      camada: "estrutura_conta",
      titulo: `${Math.round(concentracao * 100)}% do budget em uma campanha. Risco estrutural.`,
      descricao: `Conta mono-dependente. Se "${campPrincipal.nome_campanha}" sofrer variação de algoritmo ou saturação de público, toda a operação trava.`,
      evidencias: [
        `"${campPrincipal.nome_campanha}" concentra ${Math.round(concentracao * 100)}% do budget`,
        `R$${Math.round(campPrincipal.gasto_total)} de R$${Math.round(totalGasto)} total`,
        campanhas.length === 1 ? "Conta com campanha única" : `${campanhas.length} campanhas ativas, apenas 1 relevante`,
      ],
      acoes: [
        { acao: "Criar 1 campanha de prospecting com novo público similar", tipo: "estrategica", prazo: "7_dias", dificuldade: "medio" },
        { acao: "Duplicar campanha vencedora com leve variação de segmentação", tipo: "operacional", prazo: "imediato", dificuldade: "facil" },
        { acao: "Distribuir budget: no máximo 50% em uma campanha", tipo: "operacional", prazo: "7_dias", dificuldade: "facil" },
      ],
      impactoEstimado: "Diversificação reduz risco de queda súbita de ROAS em 60%",
      urgencia: "media",
      score: Math.round((concentracao - THRESHOLDS.CONCENTRACAO_MAX) * 200),
    });
  }

  // ── Diagnóstico 5: Conta saudável ─────────────────────────────────────────
  if (diagnosticos.length === 0) {
    diagnosticos.push({
      camada: "saudavel",
      titulo: "Conta sem problemas estruturais detectados.",
      descricao: `ROAS ${roasMedio.toFixed(2)}×, CTR ${ctrReal.toFixed(1)}% e CPL R$${Math.round(cplMedio)} dentro dos parâmetros. Foco agora é crescimento e escala.`,
      evidencias: [
        `ROAS ${roasMedio.toFixed(2)}× acima do mínimo de ${THRESHOLDS.ROAS_MINIMO}×`,
        `CTR ${ctrReal.toFixed(1)}% acima do mínimo`,
        `CPL R$${Math.round(cplMedio)} dentro do tolerável`,
      ],
      acoes: [
        { acao: "Aumentar budget das campanhas vencedoras em 20%", tipo: "operacional", prazo: "imediato", dificuldade: "facil" },
        { acao: "Testar lookalike audiences para expansão de público", tipo: "estrategica", prazo: "7_dias", dificuldade: "medio" },
      ],
      impactoEstimado: "Escala de 20% pode gerar +15% de lucro líquido",
      urgencia: "baixa",
      score: 10,
    });
  }

  // Ordenar por urgência e score
  diagnosticos.sort((a, b) => {
    const pesos = { critica: 4, alta: 3, media: 2, baixa: 1 };
    return pesos[b.urgencia] - pesos[a.urgencia] || b.score - a.score;
  });

  const analiseFunil = analisarFunil(ctrReal, cplMedio, totalLeads, totalCliques);
  const scoreEstrutura = calcularScoreEstrutura(diagnosticos);
  const tipoOperacao: RelatorioEstrutura["tipoOperacao"] =
    scoreEstrutura >= 70 && roasMedio >= THRESHOLDS.ROAS_MINIMO
      ? "growth_engine" : "media_only";

  const proximoSalto = gerarProximoSalto(diagnosticos[0], tipoOperacao, roasMedio);
  const fraseExecutiva = gerarFraseExecutivaDiagnostico(diagnosticos[0], roasMedio, cplMedio);

  return {
    diagnosticoPrincipal: diagnosticos[0],
    diagnosticosSecundarios: diagnosticos.slice(1),
    analiseFunil,
    scoreEstrutura,
    tipoOperacao,
    proximoSalto,
    fraseExecutiva,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function analisarFunil(
  ctr: number,
  cpl: number,
  totalLeads: number,
  totalCliques: number
): AnaliseFunil {
  const taxaClique = ctr;
  const taxaLead   = totalCliques > 0 ? totalLeads / totalCliques : 0;

  let gargalo: AnaliseFunil["gargalo"] = "balanceado";
  if (ctr < THRESHOLDS.CTR_MINIMO) gargalo = "topo";
  else if (cpl > THRESHOLDS.CPL_IDEAL * 2) gargalo = "meio";
  else gargalo = "balanceado";

  const cplVsBenchmark = THRESHOLDS.CPL_IDEAL > 0
    ? ((cpl - THRESHOLDS.CPL_IDEAL) / THRESHOLDS.CPL_IDEAL) * 100
    : 0;

  const frases: Record<AnaliseFunil["gargalo"], string> = {
    topo:        "Gargalo no TOPO — criativo não gera interesse suficiente.",
    meio:        "Gargalo no MEIO — cliques chegam mas não viram leads.",
    fundo:       "Gargalo no FUNDO — leads chegam mas não compram.",
    balanceado:  "Funil balanceado. Oportunidade está na escala.",
  };

  return {
    taxaClique,
    taxaLead,
    taxaConversao: 0,
    gargalo,
    cplVsBenchmark,
    fraseGargalo: frases[gargalo],
  };
}

function calcularScoreEstrutura(diagnosticos: DiagnosticoEstrutural[]): number {
  if (diagnosticos[0]?.camada === "saudavel") return 85;
  const pesoUrgencia = { critica: 40, alta: 25, media: 15, baixa: 5 };
  const penalidade = diagnosticos
    .slice(0, 3)
    .reduce((s, d) => s + pesoUrgencia[d.urgencia], 0);
  return Math.max(5, 100 - penalidade);
}

function gerarProximoSalto(
  principal: DiagnosticoEstrutural,
  tipo: RelatorioEstrutura["tipoOperacao"],
  roasMedio: number
): string {
  if (principal.camada === "saudavel")
    return "Implementar CRM de leads para medir o funil completo e otimizar pós-clique.";
  if (principal.camada === "oferta")
    return "Testar nova oferta ou reposicionamento de preço nos próximos 14 dias.";
  if (principal.camada === "funil")
    return "Otimizar landing page e reduzir fricção no formulário — impacto em 7 dias.";
  if (principal.camada === "criativo")
    return "Produzir 3 novos criativos com hooks diferentes e pausar os atuais.";
  if (tipo === "media_only")
    return "Integrar dados de CRM para fechar o loop entre tráfego e vendas reais.";
  return "Expandir para novos públicos com base nos dados da campanha vencedora.";
}

function gerarFraseExecutivaDiagnostico(
  principal: DiagnosticoEstrutural,
  roasMedio: number,
  cplMedio: number
): string {
  if (principal.camada === "saudavel")
    return `Conta saudável. ROAS ${roasMedio.toFixed(2)}× e estrutura equilibrada. Próxima fase: escala.`;
  if (principal.camada === "oferta")
    return `Problema central: oferta. O tráfego chega mas não converte. Revisão de produto é prioritária.`;
  if (principal.camada === "funil")
    return `R$${Math.round(cplMedio)} por lead indica funil vazando. Otimizar landing page antes de aumentar verba.`;
  if (principal.camada === "criativo")
    return `Criativo fraco limita toda a operação. CTR baixo infla todos os custos.`;
  return principal.titulo;
}
