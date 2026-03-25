/**
 * validate.ts — Validação runtime nativa, padrão Zod-like
 * Usado em todas as rotas de API da Erizon.
 * Zero dependências externas, 100% TypeScript.
 */

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; issues: string[] };

type Schema<T> = {
  parse(input: unknown): T;
  safeParse(input: unknown): ValidationResult<T>;
};

// ─── Primitivos ───────────────────────────────────────────────────────────────

function makeSchema<T>(
  fn: (input: unknown, path: string) => T
): Schema<T> & { optional(): Schema<T | undefined>; nullable(): Schema<T | null> } {
  const schema = {
    parse(input: unknown): T {
      return fn(input, "value");
    },
    safeParse(input: unknown): ValidationResult<T> {
      try {
        return { success: true, data: fn(input, "value") };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { success: false, error: msg, issues: [msg] };
      }
    },
    optional(): Schema<T | undefined> {
      return makeSchema<T | undefined>((input, path) => {
        if (input === undefined || input === null) return undefined;
        return fn(input, path);
      });
    },
    nullable(): Schema<T | null> {
      return makeSchema<T | null>((input, path) => {
        if (input === null || input === undefined) return null;
        return fn(input, path);
      });
    },
  };
  return schema;
}

// ─── String ───────────────────────────────────────────────────────────────────

interface StringSchema extends Schema<string> {
  min(n: number, msg?: string): StringSchema;
  max(n: number, msg?: string): StringSchema;
  email(msg?: string): StringSchema;
  url(msg?: string): StringSchema;
  regex(re: RegExp, msg?: string): StringSchema;
  nonempty(msg?: string): StringSchema;
  optional(): Schema<string | undefined>;
  nullable(): Schema<string | null>;
}

function buildString(checks: Array<(v: string, path: string) => void> = []): StringSchema {
  const fn = (input: unknown, path: string): string => {
    if (typeof input !== "string") throw new Error(`${path}: esperado string, recebido ${typeof input}`);
    for (const check of checks) check(input, path);
    return input;
  };
  const base = makeSchema(fn) as StringSchema;
  base.min = (n, msg) => buildString([...checks, (v, p) => { if (v.length < n) throw new Error(msg ?? `${p}: mínimo ${n} caracteres`); }]);
  base.max = (n, msg) => buildString([...checks, (v, p) => { if (v.length > n) throw new Error(msg ?? `${p}: máximo ${n} caracteres`); }]);
  base.email = (msg) => buildString([...checks, (v, p) => { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error(msg ?? `${p}: e-mail inválido`); }]);
  base.url = (msg) => buildString([...checks, (v, p) => { try { new URL(v); } catch { throw new Error(msg ?? `${p}: URL inválida`); } }]);
  base.regex = (re, msg) => buildString([...checks, (v, p) => { if (!re.test(v)) throw new Error(msg ?? `${p}: formato inválido`); }]);
  base.nonempty = (msg) => buildString([...checks, (v, p) => { if (v.trim().length === 0) throw new Error(msg ?? `${p}: não pode ser vazio`); }]);
  return base;
}

// ─── Number ───────────────────────────────────────────────────────────────────

interface NumberSchema extends Schema<number> {
  min(n: number, msg?: string): NumberSchema;
  max(n: number, msg?: string): NumberSchema;
  positive(msg?: string): NumberSchema;
  int(msg?: string): NumberSchema;
  optional(): Schema<number | undefined>;
  nullable(): Schema<number | null>;
}

function buildNumber(checks: Array<(v: number, path: string) => void> = []): NumberSchema {
  const fn = (input: unknown, path: string): number => {
    if (typeof input !== "number" || isNaN(input)) throw new Error(`${path}: esperado number, recebido ${typeof input}`);
    for (const check of checks) check(input, path);
    return input;
  };
  const base = makeSchema(fn) as NumberSchema;
  base.min = (n, msg) => buildNumber([...checks, (v, p) => { if (v < n) throw new Error(msg ?? `${p}: mínimo ${n}`); }]);
  base.max = (n, msg) => buildNumber([...checks, (v, p) => { if (v > n) throw new Error(msg ?? `${p}: máximo ${n}`); }]);
  base.positive = (msg) => buildNumber([...checks, (v, p) => { if (v <= 0) throw new Error(msg ?? `${p}: deve ser positivo`); }]);
  base.int = (msg) => buildNumber([...checks, (v, p) => { if (!Number.isInteger(v)) throw new Error(msg ?? `${p}: deve ser inteiro`); }]);
  return base;
}

// ─── Object ───────────────────────────────────────────────────────────────────

type SchemaShape = Record<string, Schema<unknown>>;
type Infer<S extends SchemaShape> = {
  [K in keyof S]: S[K] extends Schema<infer T> ? T : never;
};

type FlexSchema<T> = Schema<T> & {
  optional(): FlexSchema<T | undefined>;
  nullable(): FlexSchema<T | null>;
};

interface ObjectSchema<T> extends Schema<T> {
  partial(): ObjectSchema<Partial<T>>;
  optional(): FlexSchema<T | undefined>;
  nullable(): FlexSchema<T | null>;
}

function buildObject<S extends SchemaShape>(shape: S): ObjectSchema<Infer<S>> {
  const fn = (input: unknown): Infer<S> => {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      throw new Error(`_path: esperado objeto`);
    }
    const obj = input as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    const issues: string[] = [];

    for (const [key, schema] of Object.entries(shape)) {
      try {
        result[key] = (schema as Schema<unknown>).parse(obj[key]);
      } catch (e) {
        issues.push(e instanceof Error ? e.message.replace("value", key) : `${key}: inválido`);
      }
    }

    if (issues.length > 0) {
      throw new Error(issues.join("; "));
    }
    return result as Infer<S>;
  };

  const schema = makeSchema(fn);

  const base: ObjectSchema<Infer<S>> = {
    parse: schema.parse.bind(schema),
    safeParse: schema.safeParse.bind(schema),
    partial() {
      const partialShape = Object.fromEntries(
        Object.entries(shape).map(([k, s]) => [k, (s as Schema<unknown> & { optional(): Schema<unknown> }).optional()])
      );
      return buildObject(partialShape) as unknown as ObjectSchema<Partial<Infer<S>>>;
    },
    optional(): FlexSchema<Infer<S> | undefined> {
      return makeSchema<Infer<S> | undefined>((input) => {
        if (input === undefined || input === null) return undefined;
        return schema.parse(input);
      }) as FlexSchema<Infer<S> | undefined>;
    },
    nullable(): FlexSchema<Infer<S> | null> {
      return makeSchema<Infer<S> | null>((input) => {
        if (input === null || input === undefined) return null;
        return schema.parse(input);
      }) as FlexSchema<Infer<S> | null>;
    },
  };

  return base;
}

// ─── Union ────────────────────────────────────────────────────────────────────

function buildUnion<T extends Schema<unknown>[]>(schemas: T): Schema<ReturnType<T[number]["parse"]>> {
  return makeSchema((input, path) => {
    for (const schema of schemas) {
      const result = schema.safeParse(input);
      if (result.success) return result.data as ReturnType<T[number]["parse"]>;
    }
    throw new Error(`${path}: nenhum tipo da union corresponde`);
  });
}

// ─── Export namespace z (Zod-compatible API) ──────────────────────────────────

export const z = {
  string: () => buildString(),
  number: () => buildNumber(),
  boolean: (): FlexSchema<boolean> => makeSchema((input, path) => {
    if (typeof input !== "boolean") throw new Error(`${path}: esperado boolean`);
    return input;
  }) as FlexSchema<boolean>,
  enum: <T extends string>(values: readonly T[]): FlexSchema<T> => makeSchema((input, path) => {
    if (!values.includes(input as T)) {
      throw new Error(`${path}: deve ser um de [${values.join(", ")}]`);
    }
    return input as T;
  }) as FlexSchema<T>,
  object: <S extends SchemaShape>(shape: S) => buildObject(shape),
  array: <T>(itemSchema: Schema<T>): FlexSchema<T[]> => makeSchema((input, path) => {
    if (!Array.isArray(input)) throw new Error(`${path}: esperado array`);
    return input.map((item) => itemSchema.parse(item) as T);
  }) as FlexSchema<T[]>,
  union: <T extends Schema<unknown>[]>(schemas: T) => buildUnion(schemas),
};

// ─── Helper para rotas de API ─────────────────────────────────────────────────

export function parseBody<T>(
  schema: Schema<T>,
  input: unknown
): ValidationResult<T> {
  return schema.safeParse(input);
}

/**
 * Resposta padrão de erro de validação
 */
export function validationError(result: ValidationResult<unknown> | { error: string; issues: string[] }) {
  const issues = "issues" in result ? result.issues : [];
  return {
    error: "Dados inválidos",
    details: issues,
  };
}
