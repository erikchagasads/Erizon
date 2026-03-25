type FetchSafeResult<T = unknown> = {
  data: T | null;
  error: string | null;
  status: number;
};

export async function fetchSafe<T = unknown>(input: RequestInfo | URL, init?: RequestInit): Promise<FetchSafeResult<T>> {
  try {
    const res = await fetch(input, init);
    const status = res.status;
    const contentType = res.headers.get("content-type") ?? "";

    if (!res.ok) {
      let message = `Erro ${status}`;
      if (contentType.includes("application/json")) {
        const body = await res.json() as { error?: string; message?: string };
        message = body.error ?? body.message ?? message;
      } else {
        const text = await res.text();
        if (text) message = text;
      }
      return { data: null, error: message, status };
    }

    if (!contentType.includes("application/json")) {
      return { data: null, error: null, status };
    }

    const data = await res.json() as T;
    return { data, error: null, status };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Erro inesperado",
      status: 0,
    };
  }
}
