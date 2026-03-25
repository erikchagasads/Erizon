"use client";

// /app/hooks/useCliente.ts — v3
// FIX v3:
// - Removido salvamento automático no localStorage/sessionStorage ao criar cliente
// - Cliente só é persistido quando o usuário seleciona manualmente
// - Ao entrar em /dados sem ?cliente= na URL, NÃO carrega cliente do storage
// - selecionarCliente(null) limpa a seleção

import { useState, useEffect, useCallback, useRef } from "react";

export interface Cliente {
  id: string;
  nome_cliente: string;
  nome?: string;
  cor?: string;
  logo_url?: string;
  fb_ad_account_id?: string;
  meta_account_id?: string;
  total_campanhas?: number;
  campanhas_ativas?: number;
  gasto_total?: number;
  total_leads?: number;
  cpl_medio?: number;
  ultima_atualizacao?: string;
}

const STORAGE_KEY  = "erizon_cliente_id";
const CHANNEL_NAME = "erizon_cliente_sync";

function lerClienteIdUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("cliente") ?? null;
}

function salvarClienteId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) {
      sessionStorage.setItem(STORAGE_KEY, id);
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

export function useCliente() {
  const [clientes, setClientes]         = useState<Cliente[]>([]);
  const [clienteAtual, setClienteAtual] = useState<Cliente | null>(null);
  const [loading, setLoading]           = useState(true);
  const channelRef                      = useRef<BroadcastChannel | null>(null);

  const carregarClientes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clientes");
      if (!res.ok) { setLoading(false); return; }
      const json = await res.json();
      const lista: Cliente[] = (json.clientes ?? []).map((c: Record<string, unknown>) => ({
        ...c,
        nome_cliente: (c.nome_cliente ?? c.nome ?? "") as string,
        nome:         (c.nome ?? c.nome_cliente ?? "") as string,
      }));
      setClientes(lista);

      // Só usa cliente salvo se vier da URL explicitamente
      const idUrl = lerClienteIdUrl();
      if (idUrl) {
        const encontrado = lista.find(c => c.id === idUrl);
        if (encontrado) {
          setClienteAtual(encontrado);
          salvarClienteId(encontrado.id);
        }
      }
      // NÃO carrega do storage automaticamente — evita cliente fixado
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarClientes();

    if (typeof BroadcastChannel !== "undefined") {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.onmessage = (e: MessageEvent<{ clienteId: string | null }>) => {
        const { clienteId } = e.data;
        if (!clienteId) {
          setClienteAtual(null);
          return;
        }
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

  useEffect(() => {
    function onPopState() {
      const idUrl = lerClienteIdUrl();
      if (!idUrl) {
        setClienteAtual(null);
        return;
      }
      setClientes(prev => {
        const c = prev.find(x => x.id === idUrl);
        if (c) { setClienteAtual(c); salvarClienteId(c.id); }
        return prev;
      });
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function selecionarCliente(cliente: Cliente | null) {
    setClienteAtual(cliente);
    salvarClienteId(cliente?.id ?? null);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (cliente) {
        url.searchParams.set("cliente", cliente.id);
      } else {
        url.searchParams.delete("cliente");
      }
      window.history.replaceState({}, "", url.toString());
    }

    channelRef.current?.postMessage({ clienteId: cliente?.id ?? null });
  }

  async function criarCliente(dados: {
    nome: string;
    meta_account_id?: string;
    ticket_medio?: number;
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
        nome:         json.cliente.nome ?? json.cliente.nome_cliente ?? dados.nome,
      };
      setClientes(prev => [novo, ...prev]);
      // NÃO seleciona automaticamente — usuário escolhe
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