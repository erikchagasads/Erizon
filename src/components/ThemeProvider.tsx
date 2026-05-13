"use client";
// src/components/ThemeProvider.tsx
// Lê o cookie wl_theme (injetado pelo middleware) e aplica as variáveis CSS.
// Se não houver cookie, usa o tema padrão do Erizon — sem efeito visual.

import { useEffect, createContext, useContext, useState } from "react";
import type { WhiteLabelConfig } from "@/lib/white-label";
import { gerarCSSVars, WL_COOKIE, WL_DEFAULTS } from "@/lib/white-label";

interface ThemeCtx {
  config: Partial<WhiteLabelConfig> | null;
  isWhiteLabel: boolean;
  nomePlataforma: string;
  logoUrl: string | null;
  corPrimaria: string;
}

const Ctx = createContext<ThemeCtx>({
  config: null,
  isWhiteLabel: false,
  nomePlataforma: "Erizon",
  logoUrl: null,
  corPrimaria: WL_DEFAULTS.cor_primaria,
});

export function useTheme() { return useContext(Ctx); }

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<Partial<WhiteLabelConfig> | null>(null);

  useEffect(() => {
    // Lê o cookie wl_theme (setado pelo middleware no host custom)
    const raw = document.cookie
      .split("; ")
      .find(c => c.startsWith(WL_COOKIE + "="))
      ?.split("=").slice(1).join("=");

    if (!raw) return;

    try {
      const parsed: Partial<WhiteLabelConfig> = JSON.parse(decodeURIComponent(raw));
      // Hidrata o tema uma vez a partir do estado persistido no cliente.
      setConfig(parsed);

      // Aplica variáveis CSS no :root
      const style = document.documentElement.style;
      const vars = gerarCSSVars(parsed);
      vars.split(";").forEach(v => {
        const [key, val] = v.trim().split(":").map(s => s.trim());
        if (key && val) style.setProperty(key, val);
      });

      // Troca título da aba
      if (parsed.nome_plataforma) {
        document.title = parsed.nome_plataforma;
      }

      // Troca favicon dinamicamente
      if (parsed.favicon_url || parsed.logo_url) {
        const link = (document.querySelector("link[rel~='icon']") as HTMLLinkElement)
          ?? Object.assign(document.createElement("link"), { rel: "icon" });
        link.href = (parsed.favicon_url ?? parsed.logo_url)!;
        document.head.appendChild(link);
      }
    } catch {
      // cookie malformado — ignora
    }
  }, []);

  const isWhiteLabel = config !== null;

  return (
    <Ctx.Provider value={{
      config,
      isWhiteLabel,
      nomePlataforma: config?.nome_plataforma ?? "Erizon",
      logoUrl: config?.logo_url ?? null,
      corPrimaria: config?.cor_primaria ?? WL_DEFAULTS.cor_primaria,
    }}>
      {children}
    </Ctx.Provider>
  );
}
