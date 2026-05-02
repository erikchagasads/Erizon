-- Adiciona margem de lucro no CRM Leads
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS margem_lucro numeric(5,2);
