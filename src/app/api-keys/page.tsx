// src/app/api-keys/page.tsx
// Gerenciamento de API Keys para a Benchmark API pública.

"use client";

import { useEffect, useState } from "react";
import { Key, Plus, Trash2, Copy, CheckCheck, ExternalLink, Activity } from "lucide-react";

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

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [stats, setStats] = useState<KeyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadKeys(); }, []);

  async function loadKeys() {
    setLoading(true);
    const [keysRes, statsRes] = await Promise.all([
      fetch("/api/settings/api-keys"),
      fetch("/api/training-data/export?format=stats"),
    ]);
    if (keysRes.ok) setKeys(await keysRes.json());
    if (statsRes.ok) {
      const s = await statsRes.json();
      setStats({ total_requests: s.total ?? 0, requests_today: 0, active_keys: keys.length });
    }
    setLoading(false);
  }

  async function createKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/settings/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName.trim(), plan: "free" }),
    });
    const data = await res.json();
    if (data.key) {
      setNewKeyValue(data.key);
      setNewKeyName("");
      setShowCreate(false);
      await loadKeys();
    }
    setCreating(false);
  }

  async function revokeKey(id: string) {
    if (!confirm("Revogar esta key? Ela deixará de funcionar imediatamente.")) return;
    await fetch(`/api/settings/api-keys/${id}`, { method: "DELETE" });
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
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-violet-400" />
            <h1 className="text-xl font-medium text-white">API Keys</h1>
          </div>
          <p className="text-sm text-zinc-400">
            Acesse a{" "}
            <a href="https://docs.erizonai.com.br/api/benchmarks" target="_blank" className="text-violet-400 hover:underline inline-flex items-center gap-1">
              Benchmark API <ExternalLink className="w-3 h-3" />
            </a>{" "}
            externamente com autenticação por key.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova key
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Keys ativas", value: keys.filter(k => k.active).length, icon: Key },
          { label: "Total de requests", value: stats?.total_requests ?? 0, icon: Activity },
          { label: "Exemplos treino exportáveis", value: "—", icon: Activity },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <Icon className="w-3.5 h-3.5" />
              <span className="text-xs uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-xl font-medium text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Modal criar key */}
      {showCreate && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-4">
          <p className="text-sm font-medium text-white">Nova API Key</p>
          <input
            type="text"
            placeholder="Nome da key (ex: integração n8n)"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createKey()}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
          />
          <div className="flex gap-2">
            <button onClick={createKey} disabled={creating || !newKeyName.trim()}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
              {creating ? "Criando..." : "Criar"}
            </button>
            <button onClick={() => setShowCreate(false)}
              className="px-4 py-2 border border-zinc-700 text-zinc-400 text-sm rounded-lg hover:bg-zinc-800 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Key recém-criada — mostrar uma única vez */}
      {newKeyValue && (
        <div className="bg-emerald-950 border border-emerald-800 rounded-xl p-5 space-y-3">
          <p className="text-sm font-medium text-emerald-400">✅ Key criada — salve agora, não será exibida novamente</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 break-all font-mono">
              {newKeyValue}
            </code>
            <button onClick={() => copyKey(newKeyValue)}
              className="shrink-0 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm rounded-lg transition-colors flex items-center gap-1">
              {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={() => setNewKeyValue(null)} className="text-xs text-zinc-500 hover:text-zinc-400">
            Confirmar que salvei
          </button>
        </div>
      )}

      {/* Lista de keys */}
      {loading ? (
        <div className="text-sm text-zinc-500 text-center py-8">Carregando...</div>
      ) : keys.length === 0 ? (
        <div className="text-sm text-zinc-500 text-center py-12 border border-dashed border-zinc-800 rounded-xl">
          Nenhuma API key criada ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map(key => (
            <div key={key.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">{key.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColor[key.plan] ?? "text-zinc-400 bg-zinc-800"}`}>
                    {key.plan}
                  </span>
                  {!key.active && <span className="text-xs px-2 py-0.5 rounded-full text-red-400 bg-red-900/30">revogada</span>}
                </div>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{key.key_prefix}••••••••</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-zinc-500">{key.last_used_at ? `Último uso: ${new Date(key.last_used_at).toLocaleDateString("pt-BR")}` : "Nunca usada"}</p>
              </div>
              {key.active && (
                <button onClick={() => revokeKey(key.id)}
                  className="shrink-0 p-1.5 text-zinc-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Docs */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
        <p className="text-sm font-medium text-white">Exemplo de uso</p>
        <pre className="bg-zinc-950 rounded-lg p-4 text-xs text-zinc-400 overflow-x-auto">{`curl https://app.erizonai.com.br/api/public/benchmarks \\
  -H "x-erizon-key: SUA_KEY_AQUI" \\
  -G -d "niche=ecommerce" \\
  -d "metric=cpl" \\
  -d "period=30d"`}</pre>
        <a href="https://docs.erizonai.com.br/api/benchmarks" target="_blank"
          className="text-xs text-violet-400 hover:underline inline-flex items-center gap-1">
          Ver documentação completa <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
