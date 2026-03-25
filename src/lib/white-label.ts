// src/lib/white-label.ts
// Tipos e helpers compartilhados do sistema white label.

export interface WhiteLabelConfig {
  id: string;
  user_id: string;
  nome_plataforma: string;
  logo_url: string | null;
  favicon_url: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  cor_fundo: string;
  cor_superficie: string;
  dominio_custom: string | null;
  ativo: boolean;
}

export interface WhiteLabelCliente {
  id: string;
  white_label_owner_id: string;
  email_convidado: string;
  nome: string | null;
  cliente_user_id: string | null;
  status: "pendente" | "ativo" | "revogado";
  ver_campanhas: boolean;
  ver_financeiro: boolean;
  ver_criativo: boolean;
  convidado_em: string;
  ativado_em: string | null;
}

export const WL_DEFAULTS: Omit<WhiteLabelConfig, "id" | "user_id"> = {
  nome_plataforma: "Minha Plataforma",
  logo_url: null,
  favicon_url: null,
  cor_primaria: "#6366f1",
  cor_secundaria: "#8b5cf6",
  cor_fundo: "#060609",
  cor_superficie: "#0d0d11",
  dominio_custom: null,
  ativo: true,
};

// Gera variáveis CSS a partir da config white label
export function gerarCSSVars(cfg: Partial<WhiteLabelConfig>): string {
  const p = cfg.cor_primaria   ?? WL_DEFAULTS.cor_primaria;
  const s = cfg.cor_secundaria ?? WL_DEFAULTS.cor_secundaria;
  const f = cfg.cor_fundo      ?? WL_DEFAULTS.cor_fundo;
  const u = cfg.cor_superficie ?? WL_DEFAULTS.cor_superficie;

  return `
    --wl-primary:    ${p};
    --wl-secondary:  ${s};
    --wl-bg:         ${f};
    --wl-surface:    ${u};
    --wl-primary-10: ${p}1a;
    --wl-primary-20: ${p}33;
    --wl-primary-30: ${p}4d;
  `.trim();
}

// Cookie name que o middleware escreve
export const WL_COOKIE = "wl_theme";
