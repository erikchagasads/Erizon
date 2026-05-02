-- ── CRM Cliente Auth ──────────────────────────────────────────────────────────
-- Login simples para clientes acessarem o CRM sem usar Supabase Auth.
-- Cada cliente (identificado pelo crm_token) pode criar email + senha.

CREATE TABLE IF NOT EXISTS crm_cliente_auth (
  id           uuid primary key default gen_random_uuid(),
  crm_token    text not null unique references clientes(crm_token) on delete cascade,
  email        text not null,
  senha_hash   text not null,           -- bcrypt hash da senha
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_crm_cliente_auth_email ON crm_cliente_auth(email);
CREATE INDEX IF NOT EXISTS idx_crm_cliente_auth_token ON crm_cliente_auth(crm_token);

-- Sessões (cookie httpOnly com token de sessão)
CREATE TABLE IF NOT EXISTS crm_cliente_sessions (
  id            uuid primary key default gen_random_uuid(),
  crm_token     text not null references clientes(crm_token) on delete cascade,
  session_token text not null unique default gen_random_uuid()::text,
  expires_at    timestamptz not null default (now() + interval '30 days'),
  created_at    timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_crm_sessions_token ON crm_cliente_sessions(session_token);

-- Limpa sessões expiradas automaticamente (função chamada pelo trigger)
CREATE OR REPLACE FUNCTION cleanup_expired_crm_sessions()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM crm_cliente_sessions WHERE expires_at < now();
END;
$$;
