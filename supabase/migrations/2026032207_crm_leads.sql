-- ── CRM Leads ─────────────────────────────────────────────────────────────────
-- Pipeline: novo → contato → proposta → fechado → perdido

CREATE TABLE IF NOT EXISTS crm_leads (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  cliente_id      uuid references clientes(id) on delete set null,

  -- Dados do lead
  nome            text not null,
  telefone        text,
  email           text,
  anotacao        text,

  -- Pipeline
  estagio         text not null default 'novo'
                    check (estagio in ('novo','contato','proposta','fechado','perdido')),
  valor_fechado   numeric(12,2),          -- preenchido ao fechar
  motivo_perda    text,                   -- preenchido ao perder

  -- Origem (rastreamento)
  campanha_nome   text,                   -- nome da campanha de origem
  campanha_id     text,                   -- meta_campaign_id ou id da outra plataforma
  plataforma      text default 'meta',    -- meta | google | tiktok | linkedin | manual
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  utm_content     text,
  utm_term        text,

  -- Timestamps
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  fechado_em      timestamptz,
  perdido_em      timestamptz
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_crm_leads_user     ON crm_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_cliente  ON crm_leads(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_estagio  ON crm_leads(user_id, estagio);

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_crm_leads_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.estagio = 'fechado' AND OLD.estagio != 'fechado' THEN
    NEW.fechado_em = now();
  END IF;
  IF NEW.estagio = 'perdido' AND OLD.estagio != 'perdido' THEN
    NEW.perdido_em = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_crm_leads_updated_at
  BEFORE UPDATE ON crm_leads
  FOR EACH ROW EXECUTE FUNCTION update_crm_leads_updated_at();

-- RLS
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_leads_user_policy ON crm_leads
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
