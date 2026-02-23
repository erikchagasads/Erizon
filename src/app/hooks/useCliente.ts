"use client";

// /app/hooks/useCliente.ts — v2
// Melhorias:
// 1. Lê ?cliente=id da URL como fonte primária (fechando o loop da page clientes)
// 2. sessionStorage em vez de localStorage (evita conflito multi-tab)
// 3. Broadcast channel: quando uma aba muda o cliente, as outras atualizam
// 4. Exporta tipo Cliente com campo nome_cliente para compatibilidade com clientes_config

import { useState, useEffect, useCallback, useRef } from "react";

export interface Cliente {
  id: string;
  nome_cliente: string; // nome principal (vem de clientes_config)
  nome?: string;        // alias para compatibilidade
  cor?: string;
  logo_url?: string;
  fb_ad_account_id?: string;
  total_campanhas?: number;
  campanhas_ativas?: number;
  gasto_total?: number;
  total_leads?: number;
  cpl_medio?: number;
  ultima_atualizacao?: string;
}

const STORAGE_KEY = "erizon_cliente_id";
const CHANNEL_NAME = "erizon_cliente_sync";

function lerClienteIdUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("cliente") ?? null;
}

function lerClienteIdStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    // sessionStorage por tab: evita conflito entre abas diferentes
    return sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function salvarClienteId(id: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, id);
    localStorage.setItem(STORAGE_KEY, id); // mantém como fallback
  } catch {}
}

export function useCliente() {
  const [clientes, setClientes]         = useState<Cliente[]>([]);
  const [clienteAtual, setClienteAtual] = useState<Cliente | null>(null);
  const [loading, setLoading]           = useState(true);
  const channelRef                      = useRef<BroadcastChannel | null>(null);

  // ── Carrega lista de clientes via API ────────────────────────────────────────
  const carregarClientes = useCallback(async (clienteIdInicial?: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/clientes");
      if (!res.ok) { setLoading(false); return; }
      const json = await res.json();
      const lista: Cliente[] = (json.clientes ?? []).map((c: Record<string, unknown>) => ({
        ...c,
        // normaliza: clientes_config usa nome_cliente, API antiga usava nome
        nome_cliente: (c.nome_cliente ?? c.nome ?? "") as string,
        nome: (c.nome ?? c.nome_cliente ?? "") as string,
      }));
      setClientes(lista);

      // Prioridade: URL param > storage > primeiro da lista
      const idParaSelecionar = clienteIdInicial
        ?? lerClienteIdUrl()
        ?? lerClienteIdStorage();

      const encontrado = lista.find(c => c.id === idParaSelecionar);

      if (encontrado) {
        setClienteAtual(encontrado);
        salvarClienteId(encontrado.id);
      } else if (lista.length > 0) {
        setClienteAtual(lista[0]);
        salvarClienteId(lista[0].id);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    carregarClientes();

    // BroadcastChannel: sincroniza cliente entre abas
    if (typeof BroadcastChannel !== "undefined") {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.onmessage = (e: MessageEvent<{ clienteId: string }>) => {
        const { clienteId } = e.data;
        setClientes(prev => {
          const c = prev.find(x => x.id === clienteId);
          if (c) setClienteAtual(c);
          return prev;
        });
      };
      channelRef.current = ch;
      return () => ch.close();
    }
  }, [carregarClientes]);

  // Reage a mudanças de URL (popstate / pushState)
  useEffect(() => {
    function onPopState() {
      const idUrl = lerClienteIdUrl();
      if (!idUrl) return;
      setClientes(prev => {
        const c = prev.find(x => x.id === idUrl);
        if (c) {
          setClienteAtual(c);
          salvarClienteId(c.id);
        }
        return prev;
      });
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // ── Selecionar cliente manualmente ──────────────────────────────────────────
  function selecionarCliente(cliente: Cliente) {
    setClienteAtual(cliente);
    salvarClienteId(cliente.id);

    // Atualiza URL sem navegar (silencioso)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("cliente", cliente.id);
      window.history.replaceState({}, "", url.toString());
    }

    // Notifica outras abas
    channelRef.current?.postMessage({ clienteId: cliente.id });
  }

  // ── Criar novo cliente ───────────────────────────────────────────────────────
  async function criarCliente(dados: {
    nome: string;
    meta_account_id?: string;
    ticket_medio?: number;
    taxa_conversao?: number;
    limite_cpl?: number;
    cor?: string;
  }): Promise<Cliente | null> {
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      if (!res.ok) return null;
      const json = await res.json();
      const novo: Cliente = {
        ...json.cliente,
        nome_cliente: json.cliente.nome_cliente ?? json.cliente.nome ?? dados.nome,
        nome: json.cliente.nome ?? json.cliente.nome_cliente ?? dados.nome,
      };
      setClientes(prev => [...prev, novo]);
      selecionarCliente(novo);
      return novo;
    } catch {
      return null;
    }
  }

  return {
    clientes,
    clienteAtual,
    loading,
    selecionarCliente,
    criarCliente,
    recarregar: carregarClientes,
  };
}