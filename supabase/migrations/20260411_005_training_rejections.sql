-- Migration: Training Rejections (dados para DPO - Direct Preference Optimization)
-- Rejeições de decisões são tão valiosas quanto aprovações para fine-tuning.

create table if not exists training_rejections (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  decision_id   uuid references pending_decisions(id) on delete set null,
  action_type   text,
  rationale     text,
  campaign_id   text,
  context       jsonb,
  rejected_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_training_rejections_ws on training_rejections (workspace_id, created_at desc);

alter table training_rejections enable row level security;
create policy "service manages rejections" on training_rejections for all using (true) with check (true);
create policy "workspace members read rejections" on training_rejections for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
