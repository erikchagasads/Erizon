/**
 * validate.test.ts
 * Testa o validador nativo (z.*) que protege todas as rotas de API.
 */

import { describe, it, expect } from "vitest";
import { z } from "@/lib/validate";

describe("z.string()", () => {
  it("aceita string válida", () => {
    expect(z.string().parse("hello")).toBe("hello");
  });
  it("rejeita número", () => {
    expect(() => z.string().parse(42)).toThrow();
  });
  it(".nonempty() rejeita string vazia", () => {
    expect(() => z.string().nonempty().parse("  ")).toThrow();
  });
  it(".min(5) rejeita string curta", () => {
    expect(() => z.string().min(5).parse("abc")).toThrow();
  });
  it(".max(3) rejeita string longa", () => {
    expect(() => z.string().max(3).parse("abcd")).toThrow();
  });
  it(".email() valida e-mail", () => {
    expect(z.string().email().parse("a@b.com")).toBe("a@b.com");
    expect(() => z.string().email().parse("nao-email")).toThrow();
  });
});

describe("z.number()", () => {
  it("aceita número válido", () => {
    expect(z.number().parse(42)).toBe(42);
  });
  it("rejeita NaN", () => {
    expect(() => z.number().parse(NaN)).toThrow();
  });
  it(".min() e .max()", () => {
    expect(() => z.number().min(10).parse(5)).toThrow();
    expect(() => z.number().max(10).parse(15)).toThrow();
  });
  it(".positive() rejeita zero e negativo", () => {
    expect(() => z.number().positive().parse(0)).toThrow();
    expect(() => z.number().positive().parse(-1)).toThrow();
  });
});

describe("z.enum()", () => {
  const StatusSchema = z.enum(["ativo", "pausado", "deletado"] as const);
  it("aceita valor válido", () => {
    expect(StatusSchema.parse("ativo")).toBe("ativo");
  });
  it("rejeita valor fora da lista", () => {
    expect(() => StatusSchema.parse("invalido")).toThrow();
  });
});

describe("z.object()", () => {
  const Schema = z.object({
    nome: z.string().nonempty(),
    idade: z.number().min(0),
  });

  it("parseia objeto válido", () => {
    const result = Schema.parse({ nome: "Erik", idade: 30 });
    expect(result.nome).toBe("Erik");
    expect(result.idade).toBe(30);
  });

  it("rejeita objeto com campo faltando", () => {
    expect(() => Schema.parse({ nome: "Erik" })).toThrow();
  });

  it("rejeita não-objeto", () => {
    expect(() => Schema.parse("string")).toThrow();
    expect(() => Schema.parse(null)).toThrow();
    expect(() => Schema.parse([])).toThrow();
  });

  it("safeParse retorna success: false com issues", () => {
    const result = Schema.safeParse({ nome: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });

  it("safeParse retorna success: true com data", () => {
    const result = Schema.safeParse({ nome: "Erik", idade: 30 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nome).toBe("Erik");
    }
  });
});

describe("z.object() com optional", () => {
  const Schema = z.object({
    nome: z.string(),
    apelido: z.string().optional(),
  });

  it("aceita objeto sem campo opcional", () => {
    const result = Schema.parse({ nome: "Erik" });
    expect(result.apelido).toBeUndefined();
  });

  it("aceita objeto com campo opcional preenchido", () => {
    const result = Schema.parse({ nome: "Erik", apelido: "EK" });
    expect(result.apelido).toBe("EK");
  });
});

describe("z.array()", () => {
  const Schema = z.array(z.string());

  it("parseia array de strings", () => {
    expect(Schema.parse(["a", "b"])).toEqual(["a", "b"]);
  });

  it("rejeita não-array", () => {
    expect(() => Schema.parse("nao array")).toThrow();
  });

  it("parseia array vazio", () => {
    expect(Schema.parse([])).toEqual([]);
  });
});

describe("IntegrationConnectSchema (schema real da rota)", () => {
  // Importa e testa o schema real para garantir cobertura de contrato de API
  it("valida payload completo de integração", async () => {
    const { IntegrationConnectSchema } = await import("@/lib/schemas");
    const result = IntegrationConnectSchema.safeParse({
      workspaceId: "ws-test",
      provider: "meta_ads",
      externalAccountId: "act_123456789",
      accessToken: "EAAxxxxxxxxxxxxxxx",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita provider inválido", async () => {
    const { IntegrationConnectSchema } = await import("@/lib/schemas");
    const result = IntegrationConnectSchema.safeParse({
      workspaceId: "ws-test",
      provider: "tiktok",   // não suportado
      externalAccountId: "act_123",
      accessToken: "EAAxxxxxxxxxxxxxxx",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita token muito curto", async () => {
    const { IntegrationConnectSchema } = await import("@/lib/schemas");
    const result = IntegrationConnectSchema.safeParse({
      workspaceId: "ws-test",
      provider: "meta_ads",
      externalAccountId: "act_123",
      accessToken: "curto",
    });
    expect(result.success).toBe(false);
  });
});
