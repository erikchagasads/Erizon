-- Permite salvar copies geradas por IA como assets criativos vinculados a campanhas.

alter table public.creative_assets
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists generated_copy text,
  add column if not exists prompt text,
  add column if not exists source text not null default 'campaign_context',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.creative_assets
  alter column client_id drop not null,
  alter column campaign_id drop not null,
  alter column name drop not null,
  alter column format drop not null,
  alter column hook_type drop not null,
  alter column duration_seconds drop not null,
  alter column caption_style drop not null,
  alter column visual_style drop not null,
  alter column ctr drop not null,
  alter column cpa drop not null,
  alter column roas drop not null,
  alter column frequency drop not null,
  alter column spend drop not null,
  alter column conversions drop not null;

create index if not exists idx_creative_assets_user_created
  on public.creative_assets(user_id, created_at desc);

create index if not exists idx_creative_assets_campaign
  on public.creative_assets(campaign_id);

alter table public.creative_assets enable row level security;

drop policy if exists creative_assets_owner_all on public.creative_assets;
create policy creative_assets_owner_all on public.creative_assets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
