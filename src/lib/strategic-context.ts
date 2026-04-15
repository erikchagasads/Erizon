import type {
  ClientStrategicSnapshot,
  WorkspaceStrategicSnapshot,
} from "@/services/strategic-intelligence-service";

export function buildStrategicContext(params: {
  workspace: WorkspaceStrategicSnapshot;
  client?: ClientStrategicSnapshot | null;
  agent: "agente" | "analista" | "copywriter" | "roteirista";
}) {
  const { workspace, client, agent } = params;
  const lines: string[] = ["", "## CAMADA ESTRATEGICA ERIZON"];

  lines.push(`Score de dependencia atual: ${workspace.moat.dependencyScore}/100.`);
  lines.push(workspace.moat.lockInLine);

  if (workspace.learning.memoryLine) {
    lines.push(`Memoria atual: ${workspace.learning.memoryLine}`);
  }

  if (workspace.collective.insight) {
    lines.push(`Rede (${workspace.collective.niche ?? "nicho em formacao"}): ${workspace.collective.insight}`);
  }

  if (workspace.forecast?.estimatedLeads7d) {
    const revenueChunk = workspace.forecast.estimatedRevenue7d
      ? ` e potencial de R$ ${workspace.forecast.estimatedRevenue7d.toLocaleString("pt-BR")}`
      : "";
    lines.push(
      `Ultimo preflight: cerca de ${workspace.forecast.estimatedLeads7d} leads em 7 dias${revenueChunk}, com ${workspace.forecast.confidenceLabel}.`
    );
  }

  if (workspace.business.closedRevenue30d > 0) {
    lines.push(
      `Negocio real: R$ ${workspace.business.closedRevenue30d.toLocaleString("pt-BR")} fechados em 30 dias e pipeline ponderado de R$ ${workspace.business.weightedPipelineValue.toLocaleString("pt-BR")}.`
    );
  }

  if (workspace.dna?.goldenAudience) {
    lines.push(`Publico campeao atual: ${workspace.dna.goldenAudience}.`);
  }

  if (workspace.dna?.keyLearnings?.length) {
    lines.push(`Aprendizados fortes: ${workspace.dna.keyLearnings.slice(0, 3).join(" | ")}.`);
  }

  if (client) {
    lines.push(`Cliente ao vivo: ${client.liveRoi.summary}`);
    if (client.business.roiMultiple) {
      lines.push(`ROI fechado do cliente: ${client.business.roiMultiple.toFixed(2)}x.`);
    }
  }

  if (agent === "copywriter" || agent === "roteirista") {
    if (workspace.dna?.goldenAudience) {
      lines.push("Use isso para deixar a mensagem mais especifica e mais dificil de copiar.");
    }
  }

  if (agent === "analista" || agent === "agente") {
    lines.push("Ao recomendar acoes, priorize impacto em receita, pipeline, benchmark e aprendizado futuro.");
  }

  return `${lines.join("\n")}\n`;
}
