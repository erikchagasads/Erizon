/**
 * validate.test.ts
 * Tests for the custom Zod-like validation library (src/lib/validate.ts).
 * Only pure schema operations — no external dependencies.
 */

import { describe, it, expect } from "vitest";
import { z, parseBody, validationError } from "@/lib/validate";

// ─── z.string ────────────────────────────────────────────────────────────────

describe("z.string()", () => {
  it("parses a valid string", () => {
    expect(z.string().parse("hello")).toBe("hello");
  });

  it("throws for non-string input", () => {
    expect(() => z.string().parse(42)).toThrow(/esperado string/);
  });

  it("min() rejects string shorter than minimum", () => {
    expect(() => z.string().min(5).parse("hi")).toThrow(/mínimo 5/);
  });

  it("min() accepts string at the minimum length", () => {
    expect(z.string().min(3).parse("abc")).toBe("abc");
  });

  it("max() rejects string longer than maximum", () => {
    expect(() => z.string().max(3).parse("toolong")).toThrow(/máximo 3/);
  });

  it("email() rejects invalid e-mail", () => {
    expect(() => z.string().email().parse("not-an-email")).toThrow(/e-mail/);
  });

  it("email() accepts a valid e-mail", () => {
    expect(z.string().email().parse("user@example.com")).toBe("user@example.com");
  });

  it("nonempty() rejects whitespace-only string", () => {
    expect(() => z.string().nonempty().parse("   ")).toThrow(/vazio/);
  });

  it("url() rejects an invalid URL", () => {
    expect(() => z.string().url().parse("not-a-url")).toThrow(/URL/);
  });

  it("url() accepts a valid URL", () => {
    expect(z.string().url().parse("https://example.com")).toBe("https://example.com");
  });

  it("optional() returns undefined for null/undefined input", () => {
    expect(z.string().optional().parse(undefined)).toBeUndefined();
    expect(z.string().optional().parse(null)).toBeUndefined();
  });

  it("nullable() returns null for null/undefined input", () => {
    expect(z.string().nullable().parse(null)).toBeNull();
  });

  it("safeParse returns success:true for valid input", () => {
    const result = z.string().safeParse("ok");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("ok");
  });

  it("safeParse returns success:false for invalid input", () => {
    const result = z.string().safeParse(123);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues.length).toBeGreaterThan(0);
  });
});

// ─── z.number ────────────────────────────────────────────────────────────────

describe("z.number()", () => {
  it("parses a valid number", () => {
    expect(z.number().parse(42)).toBe(42);
  });

  it("throws for non-number input", () => {
    expect(() => z.number().parse("42")).toThrow(/esperado number/);
  });

  it("throws for NaN", () => {
    expect(() => z.number().parse(NaN)).toThrow(/esperado number/);
  });

  it("min() rejects value below minimum", () => {
    expect(() => z.number().min(10).parse(5)).toThrow(/mínimo 10/);
  });

  it("max() rejects value above maximum", () => {
    expect(() => z.number().max(100).parse(200)).toThrow(/máximo 100/);
  });

  it("positive() rejects zero and negative", () => {
    expect(() => z.number().positive().parse(0)).toThrow(/positivo/);
    expect(() => z.number().positive().parse(-1)).toThrow(/positivo/);
  });

  it("positive() accepts a positive number", () => {
    expect(z.number().positive().parse(1)).toBe(1);
  });

  it("int() rejects a float", () => {
    expect(() => z.number().int().parse(1.5)).toThrow(/inteiro/);
  });

  it("int() accepts a whole number", () => {
    expect(z.number().int().parse(7)).toBe(7);
  });
});

// ─── z.boolean ───────────────────────────────────────────────────────────────

describe("z.boolean()", () => {
  it("parses true and false", () => {
    expect(z.boolean().parse(true)).toBe(true);
    expect(z.boolean().parse(false)).toBe(false);
  });

  it("throws for string 'true'", () => {
    expect(() => z.boolean().parse("true")).toThrow(/esperado boolean/);
  });
});

// ─── z.enum ──────────────────────────────────────────────────────────────────

describe("z.enum()", () => {
  const schema = z.enum(["LEADS", "SALES", "TRAFFIC"] as const);

  it("accepts a valid enum value", () => {
    expect(schema.parse("LEADS")).toBe("LEADS");
  });

  it("rejects a value not in the enum", () => {
    expect(() => schema.parse("UNKNOWN")).toThrow(/deve ser um de/);
  });
});

// ─── z.object ────────────────────────────────────────────────────────────────

describe("z.object()", () => {
  const schema = z.object({
    name: z.string().nonempty(),
    age: z.number().positive(),
  });

  it("parses a valid object", () => {
    const result = schema.parse({ name: "Alice", age: 30 });
    expect(result.name).toBe("Alice");
    expect(result.age).toBe(30);
  });

  it("throws when required field is wrong type", () => {
    expect(() => schema.parse({ name: "Alice", age: "thirty" })).toThrow();
  });

  it("throws for non-object input", () => {
    expect(() => schema.parse("not an object")).toThrow(/esperado objeto/);
  });

  it("partial() makes all fields optional", () => {
    const partial = schema.partial();
    expect(() => partial.parse({})).not.toThrow();
  });

  it("safeParse collects multiple field errors", () => {
    const result = schema.safeParse({ name: "", age: -5 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });
});

// ─── z.array ─────────────────────────────────────────────────────────────────

describe("z.array()", () => {
  const schema = z.array(z.string());

  it("parses a valid array of strings", () => {
    expect(schema.parse(["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("throws when input is not an array", () => {
    expect(() => schema.parse("not an array")).toThrow(/esperado array/);
  });

  it("throws when an item fails validation", () => {
    expect(() => schema.parse(["a", 2, "c"])).toThrow();
  });

  it("parses an empty array", () => {
    expect(schema.parse([])).toEqual([]);
  });
});

// ─── z.union ─────────────────────────────────────────────────────────────────

describe("z.union()", () => {
  const schema = z.union([z.string(), z.number()]);

  it("accepts a string", () => {
    expect(schema.parse("hello")).toBe("hello");
  });

  it("accepts a number", () => {
    expect(schema.parse(42)).toBe(42);
  });

  it("rejects a value that matches none of the union types", () => {
    expect(() => schema.parse(true)).toThrow(/union/);
  });
});

// ─── parseBody ────────────────────────────────────────────────────────────────

describe("parseBody()", () => {
  it("returns success:true for valid input", () => {
    const result = parseBody(z.string(), "valid");
    expect(result.success).toBe(true);
  });

  it("returns success:false with error message for invalid input", () => {
    const result = parseBody(z.string(), 99);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });
});

// ─── validationError ─────────────────────────────────────────────────────────

describe("validationError()", () => {
  it("returns structured error with details from issues", () => {
    const failResult = z.string().safeParse(123);
    const err = validationError(failResult);
    expect(err.error).toBe("Dados inválidos");
    expect(Array.isArray(err.details)).toBe(true);
  });

  it("accepts a plain error object with issues", () => {
    const err = validationError({ error: "bad", issues: ["field required"] });
    expect(err.details).toContain("field required");
  });
});
