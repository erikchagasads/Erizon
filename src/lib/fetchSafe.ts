// lib/fetchSafe.ts
// Wrapper seguro para fetch que evita o erro "Unexpected token < ... is not valid JSON"
// causado quando uma rota retorna HTML (404/500) em vez de JSON.
// Use em todos os lugares que chamam APIs internas.

export async function fetchSafe<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null; status: number }> {
  try {
    const res = await fetch(url, options);
    const text = await res.text();

    let data: T | null = null;
    try {
      data = JSON.parse(text);
    } catch {
      const preview = text.substring(0, 120).replace(/\n/g, " ");
      return {
        data: null,
        error: `API retornou resposta inválida (${res.status}): ${preview}`,
        status: res.status,
      };
    }

    if (!res.ok) {
      const errMsg = (data as any)?.error || `Erro ${res.status}`;
      return { data: null, error: errMsg, status: res.status };
    }

    return { data, error: null, status: res.status };
  } catch (e: any) {
    return { data: null, error: e.message || "Erro de conexão.", status: 0 };
  }
}