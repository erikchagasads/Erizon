-- Pipeline de fine-tuning: maturidade, shadow mode e rollout controlado.

alter table public.workspaces
  add column if not exists decision_model text not null default 'current';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'workspaces_decision_model_check'
  ) then
    alter table public.workspaces add constraint workspaces_decision_model_check
      check (decision_model in ('current','shadow','candidate_10pct','candidate_50pct','candidate_100pct'));
  end if;
end $$;

create index if not exists idx_workspaces_decision_model
  on public.workspaces(decision_model);

create table if not exists public.fine_tuning_runs (
  id uuid primary key default gen_random_uuid(),
  candidate_name text not null,
  base_model text not null,
  specialist_role text not null default 'decision_specialist',
  status text not null default 'draft'
    check (status in ('draft','offline_eval','training','shadow','rollout_10pct','rollout_50pct','promoted','rejected','archived')),
  training_examples_total int not null default 0,
  training_examples_gold int not null default 0,
  training_examples_silver int not null default 0,
  holdout_size int not null default 0,
  action_distribution jsonb not null default '{}',
  holdout_metrics jsonb not null default '{}',
  shadow_metrics jsonb not null default '{}',
  rollout_percentage numeric(5,2) not null default 0,
  promoted_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fine_tuning_runs_status
  on public.fine_tuning_runs(status, created_at desc);

create table if not exists public.fine_tuning_shadow_decisions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.fine_tuning_runs(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  decision_id uuid references public.pending_decisions(id) on delete set null,
  current_model text not null,
  candidate_model text not null,
  current_action text not null,
  candidate_action text not null,
  current_confidence numeric(5,4),
  candidate_confidence numeric(5,4),
  confidence_delta numeric(6,4),
  agreed boolean not null default false,
  exposed_to_user boolean not null default false,
  context jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_fine_tuning_shadow_workspace
  on public.fine_tuning_shadow_decisions(workspace_id, created_at desc);

create index if not exists idx_fine_tuning_shadow_run
  on public.fine_tuning_shadow_decisions(run_id, created_at desc);

alter table public.fine_tuning_runs enable row level security;
alter table public.fine_tuning_shadow_decisions enable row level security;

drop policy if exists fine_tuning_runs_service on public.fine_tuning_runs;
create policy fine_tuning_runs_service on public.fine_tuning_runs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists fine_tuning_shadow_members_read on public.fine_tuning_shadow_decisions;
create policy fine_tuning_shadow_members_read on public.fine_tuning_shadow_decisions
  for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members where user_id = auth.uid()
    )
  );

drop policy if exists fine_tuning_shadow_service on public.fine_tuning_shadow_decisions;
create policy fine_tuning_shadow_service on public.fine_tuning_shadow_decisions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
