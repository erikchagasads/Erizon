"use client";

// components/BannerStatus.tsx
// Exibe banner de aviso quando dados estão desatualizados ou credenciais ausentes.
// Usa fetchSafe para evitar crash em respostas não-JSON da API.

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, X, Clock, Zap, AlertCircle } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { fetchSafe } from "@/lib/fetchSafe";

interface BannerStatusProps {
  clienteId?: string | null;
  onSyncSuccess?: () => void;
}

export default function BannerStatus({ clienteId, onSyncSuccess }: BannerStatusProps) {
  const supabase = getSupabase();
  const [ultimoSync, setUltimoSync]     = useState<Date | null>(null);
  const [semCredenciais, setSemCredenciais] = useState(false);
  const [syncing, setSyncing]           = useState(false);
  const [descartado, setDescartado]     = useState(false);
  const [loading, setLoading]           = useState(true);
  const [erroSync, setErroSync]         = useState("");

  const checar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [{ data: config }, { data: settings }] = await Promise.all([
      supabase.from("user_configs").select("ultimo_sync").eq("user_id", user.id).single(),
      supabase.from("user_settings").select("meta_access_token, meta_ad_account_id").eq("user_id", user.id).single(),
    ]);

    if (config?.ultimo_sync) setUltimoSync(new Date(config.ultimo_sync));
    if (!settings?.meta_access_token || !settings?.meta_ad_account_id) setSemCredenciais(true);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { checar(); }, [checar]);

  async function sincronizar() {
    setSyncing(true); setErroSync("");
    const url = clienteId ? `/api/ads-sync?cliente_id=${clienteId}` : "/api/ads-sync";
    const { error } = await fetchSafe(url);
    if (error) {
      setErroSync(error);
    } else {
      setUltimoSync(new Date());
      setDescartado(false);
      setSemCredenciais(false);
      onSyncSuccess?.();
    }
    setSyncing(false);
  }

  if (loading || descartado) return null;

  // Credenciais ausentes
  if (semCredenciais) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-red-500/[0.08] border border-red-500/20 rounded-xl mb-4">
        <AlertCircle size={14} className="text-red-400 shrink-0" />
        <p className="text-[12px] font-semibold text-red-400 flex-1">
          Credenciais do Meta não configuradas.{" "}
          <a href="/settings" className="underline hover:text-red-300 transition-colors">Configurar agora</a>
        </p>
      </div>
    );
  }

  const horasDesde = ultimoSync ? (Date.now() - ultimoSync.getTime()) / 3_600_000 : 999;
  const desatualizado = horasDesde > 24;

  if (!desatualizado) return null;

  const horas = Math.round(horasDesde);
  const label = horas >= 48 ? `${Math.round(horas / 24)} dias` : `${horas}h`;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/[0.06] border border-amber-500/15 rounded-xl mb-4">
      <Clock size={14} className="text-amber-400 shrink-0" />
      <div className="flex-1">
        <p className="text-[12px] text-amber-400/80">
          Último sync há <span className="font-semibold">{label}</span> — dados podem estar desatualizados
        </p>
        {erroSync && <p className="text-[11px] text-red-400 mt-0.5">{erroSync}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={sincronizar} disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] font-semibold text-amber-400 hover:bg-amber-500/15 transition-all disabled:opacity-50">
          {syncing
            ? <><RefreshCw size={11} className="animate-spin" /> Sincronizando...</>
            : <><Zap size={11} /> Sincronizar agora</>}
        </button>
        <button onClick={() => setDescartado(true)}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-amber-400/40 hover:text-amber-400 transition-colors"
          aria-label="Fechar banner">
          <X size={12} />
        </button>
      </div>
    </div>
  );
}