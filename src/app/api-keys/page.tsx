"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, CheckCheck, Code2, Copy, ExternalLink, Key, Plus, Trash2 } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  plan: string;
  active: boolean;
  last_used_at: string | null;
  requests_total: number;
  created_at: string;
}

interface KeyStats {
  total_requests: number;
  requests_today: number;
  active_keys: number;
}

const API_KEYS_ENDPOINT = "/api/settings/api-key-management";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [stats, setStats] = useState<KeyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [keysRes, statsRes] = await Promise.all([
      fetch(API_KEYS_ENDPOINT),
      fetch("/api/training-data/export?format=stats"),
    ]);

    let nextKeys: ApiKey[] = [];

    if (keysRes.ok) {
      nextKeys = await keysRes.json();
      setKeys(nextKeys);
    } else {
      const payload = await keysRes.json().catch(() => ({}));
      setError(payload.error ?? "Nao foi possivel carregar as API keys.");
      setKeys([]);
    }

    if (statsRes.ok) {
      const payload = await statsRes.json();
      setStats({
        total_requests: payload.total ?? 0,
        requests_today: payload.today ?? 0,
        active_keys: nextKeys.filter((key) => key.active).length,
      });
    } else {
      setStats({
        total_requests: 0,
        requests_today: 0,
        active_keys: nextKeys.filter((key) => key.active).length,
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  async function createKey() {
    if (!newKeyName.trim()) return;

    setCreating(true);
    setError(null);

    const res = await fetch(API_KEYS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName.trim(), plan: "free" }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Nao foi possivel criar a API key.");
      setCreating(false);
      return;
    }

    if (data.key) {
      setNewKeyValue(data.key);
      setNewKeyName("");
      setShowCreate(false);
      await loadKeys();
    } else {
      setError("A resposta da API nao trouxe a key criada.");
    }

    setCreating(false);
  }

  async function revokeKey(id: string) {
    if (!confirm("Revogar esta key? Ela deixara de funcionar imediatamente.")) return;

    setError(null);

    const res = await fetch(`${API_KEYS_ENDPOINT}/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Nao foi possivel revogar a key.");
      return;
    }

    await loadKeys();
  }

  async function copyKey(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const planColor: Record<string, string> = {
    free: "text-zinc-400 bg-zinc-800",
    pro: "text-violet-300 bg-violet-900/50",
    enterprise: "text-amber-300 bg-amber-900/50",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-violet-400" />
            <h1 className="text-xl font-medium text-white">API Keys</h1>
          </div>
          <p className="text-sm text-zinc-400">
            Acesse a{" "}
            <a
              href="/docs/api/benchmarks"
              target="_blank"
              className="inline-flex items-center gap-1 text-violet-400 hover:underline"
            >
              Benchmark API <ExternalLink className="h-3 w-3" />
            </a>{" "}
            externamente com autenticacao por key.
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm text-white transition-colors hover:bg-violet-500"
        >
          <Plus className="h-4 w-4" />
          Nova key
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/60 bg-red-950/50 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Keys ativas", value: keys.filter((key) => key.active).length, icon: Key },
          { label: "Total de requests", value: stats?.total_requests ?? 0, icon: Activity },
          { label: "Exemplos treino exportaveis", value: "-", icon: Activity },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="mb-1 flex items-center gap-2 text-zinc-500">
              <Icon className="h-3.5 w-3.5" />
              <span className="text-xs uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-xl font-medium text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-violet-800/60 bg-violet-950/30 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-200">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Benchmark API pronta para virar produto</p>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-400">
                Use estas keys para alimentar automacoes, dashboards de clientes e relatorios externos com benchmarks reais da rede Erizon.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm text-white transition-colors hover:bg-violet-500"
            >
              <Plus className="h-4 w-4" />
              Criar key
            </button>
            <a
              href="/docs/api/benchmarks"
              target="_blank"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              Ver docs
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="space-y-4 rounded-xl border border-zinc-700 bg-zinc-900 p-5">
          <p className="text-sm font-medium text-white">Nova API Key</p>
          <input
            type="text"
            placeholder="Nome da key (ex: integracao n8n)"
            value={newKeyName}
            onChange={(event) => setNewKeyName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void createKey();
            }}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => void createKey()}
              disabled={creating || !newKeyName.trim()}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
            >
              {creating ? "Criando..." : "Criar"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {newKeyValue && (
        <div className="space-y-3 rounded-xl border border-emerald-800 bg-emerald-950 p-5">
          <p className="text-sm font-medium text-emerald-400">
            Key criada. Salve agora, ela nao sera exibida novamente.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-300">
              {newKeyValue}
            </code>
            <button
              onClick={() => void copyKey(newKeyValue)}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white transition-colors hover:bg-emerald-600"
            >
              {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <button
            onClick={() => setNewKeyValue(null)}
            className="text-xs text-zinc-500 transition-colors hover:text-zinc-400"
          >
            Confirmar que salvei
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-zinc-500">Carregando...</div>
      ) : keys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 py-12 text-center text-sm text-zinc-500">
          Nenhuma API key criada ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-white">{key.name}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${planColor[key.plan] ?? "bg-zinc-800 text-zinc-400"}`}
                  >
                    {key.plan}
                  </span>
                  {!key.active && (
                    <span className="rounded-full bg-red-900/30 px-2 py-0.5 text-xs text-red-400">
                      revogada
                    </span>
                  )}
                </div>
                <p className="mt-0.5 font-mono text-xs text-zinc-500">{key.key_prefix}........</p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-xs text-zinc-500">
                  {key.last_used_at
                    ? `Ultimo uso: ${new Date(key.last_used_at).toLocaleDateString("pt-BR")}`
                    : "Nunca usada"}
                </p>
              </div>

              {key.active && (
                <button
                  onClick={() => void revokeKey(key.id)}
                  className="shrink-0 p-1.5 text-zinc-600 transition-colors hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-sm font-medium text-white">Exemplo de uso</p>
        <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-xs text-zinc-400">{`curl https://app.erizonai.com.br/api/public/benchmarks \\
  -H "x-erizon-key: SUA_KEY_AQUI" \\
  -G -d "niche=ecommerce" \\
  -d "metric=cpl" \\
  -d "period=30d"`}</pre>
        <a
          href="/docs/api/benchmarks"
          target="_blank"
          className="inline-flex items-center gap-1 text-xs text-violet-400 hover:underline"
        >
          Ver documentacao completa <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
