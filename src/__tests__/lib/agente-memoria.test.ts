/**
 * agente-memoria.test.ts
 * Tests for buildContextoCliente (pure string-building function).
 * buscarMemoriaCliente and getContextoCliente require Supabase — skipped.
 */

import { describe, it, expect } from "vitest";
import { buildContextoCliente } from "@/lib/agente-memoria";

// ─── buildContextoCliente ─────────────────────────────────────────────────────

describe("buildContextoCliente — null / empty memory", () => {
  it("returns empty string when mem is null", () => {
    expect(buildContextoCliente(null, "copywriter")).toBe("");
  });

  it("returns empty string when total_feedbacks is 0", () => {
    expect(buildContextoCliente({ total_feedbacks: 0, nicho: "imóveis" }, "copywriter")).toBe("");
  });

  it("returns non-empty string when total_feedbacks is undefined (treated as non-zero)", () => {
    // When total_feedbacks is undefined, the check `=== 0` is false, so content is built
    const result = buildContextoCliente({ nicho: "imóveis", total_feedbacks: undefined }, "copywriter");
    expect(result).toContain("MEMÓRIA DO CLIENTE");
  });
});

describe("buildContextoCliente — basic profile fields", () => {
  const mem = {
    total_feedbacks: 5,
    nicho: "Imóveis",
    descricao: "Construtora regional",
    publico_alvo: "Famílias classe B",
    cpl_alvo: 30,
    cpl_historico: 45,
    roas_alvo: 3.5,
    ticket_medio: 350000,
  };

  it("includes nicho in output", () => {
    expect(buildContextoCliente(mem, "agente")).toContain("Imóveis");
  });

  it("includes descricao in output", () => {
    expect(buildContextoCliente(mem, "agente")).toContain("Construtora regional");
  });

  it("includes publico_alvo in output", () => {
    expect(buildContextoCliente(mem, "agente")).toContain("Famílias classe B");
  });

  it("includes CPL alvo in benchmarks line", () => {
    expect(buildContextoCliente(mem, "agente")).toContain("R$30");
  });

  it("includes ROAS alvo in benchmarks line", () => {
    expect(buildContextoCliente(mem, "agente")).toContain("3.5×");
  });

  it("ends with usage instruction", () => {
    expect(buildContextoCliente(mem, "agente")).toContain("Use este histórico");
  });

  it("includes MEMÓRIA DO CLIENTE header", () => {
    expect(buildContextoCliente(mem, "analista")).toContain("MEMÓRIA DO CLIENTE");
  });
});

describe("buildContextoCliente — copywriter agent", () => {
  const mem = {
    total_feedbacks: 3,
    copies_aprovadas: [
      { tipo: "headline", texto: "Realize o sonho da casa própria", motivo: "alta CTR" },
    ],
    copies_reprovadas: [
      { tipo: "cta", motivo: "muito genérico" },
    ],
    formatos_que_convertem: "carrossel e stories",
    angulos_que_funcionam: "urgência e exclusividade",
  };

  it("includes approved copy text for copywriter", () => {
    expect(buildContextoCliente(mem, "copywriter")).toContain("Realize o sonho da casa própria");
  });

  it("includes rejected copy motivo for copywriter", () => {
    expect(buildContextoCliente(mem, "copywriter")).toContain("muito genérico");
  });

  it("includes formatos_que_convertem for copywriter", () => {
    expect(buildContextoCliente(mem, "copywriter")).toContain("carrossel e stories");
  });

  it("includes angulos_que_funcionam for copywriter", () => {
    expect(buildContextoCliente(mem, "copywriter")).toContain("urgência e exclusividade");
  });
});

describe("buildContextoCliente — roteirista agent", () => {
  const mem = {
    total_feedbacks: 4,
    ganchos_aprovados: [
      { gancho: "Você sabia que...", motivo: "alta retenção" },
    ],
    formatos_que_convertem: "reels de 30s",
  };

  it("includes gancho text for roteirista", () => {
    expect(buildContextoCliente(mem, "roteirista")).toContain("Você sabia que...");
  });

  it("includes formatos_que_convertem for roteirista", () => {
    expect(buildContextoCliente(mem, "roteirista")).toContain("reels de 30s");
  });
});

describe("buildContextoCliente — analista agent", () => {
  const mem = {
    total_feedbacks: 6,
    acoes_aprovadas: [
      { acao: "Aumentar budget em 30%", motivo: "ROAS melhorou" },
    ],
    acoes_reprovadas: [
      { acao: "Pausa de campanha", motivo: "não reduziu CPL" },
    ],
    padroes_observados: "CPL sobe às sextas",
  };

  it("includes approved actions for analista", () => {
    expect(buildContextoCliente(mem, "analista")).toContain("Aumentar budget em 30%");
  });

  it("includes rejected actions for analista", () => {
    expect(buildContextoCliente(mem, "analista")).toContain("não reduziu CPL");
  });

  it("includes padroes_observados for analista", () => {
    expect(buildContextoCliente(mem, "analista")).toContain("CPL sobe às sextas");
  });
});
