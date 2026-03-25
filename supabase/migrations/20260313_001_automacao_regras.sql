-- ─── automacao_regras ─────────────────────────────────────────────────────────
-- Tabela de regras de automação configuradas pelo gestor.
-- Nenhuma execução automática: o gestor ativa/desativa e decide quando executar.

create table if not exists public.automacao_regras (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,

  nome           text not null,
  condicao_tipo  text not null check (condicao_tipo in (
                   'gasto_sem_leads',
                   'cpl_acima',
                   'roas_abaixo',
                   'ctr_abaixo',
                   'dias_sem_resultado'
                 )),
  condicao_valor numeric not null check (condicao_valor > 0),
  acao_tipo      text not null check (acao_tipo in (
                   'pausar',
                   'alertar',
                   'registrar'
                 )),
  ativa          boolean not null default true,

  criada_em      timestamptz not null default now(),
  atualizada_em  timestamptz not null default now()
);

-- Atualiza atualizada_em automaticamente
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.atualizada_em = now();
  return new;
end;
$$;

create trigger automacao_regras_updated_at
  before update on public.automacao_regras
  for each row execute function public.set_updated_at();

-- RLS
alter table public.automacao_regras enable row level security;

create policy "Usuário lê próprias regras"
  on public.automacao_regras for select
  using (auth.uid() = user_id);

create policy "Usuário insere próprias regras"
  on public.automacao_regras for insert
  with check (auth.uid() = user_id);

create policy "Usuário atualiza próprias regras"
  on public.automacao_regras for update
  using (auth.uid() = user_id);

create policy "Usuário deleta próprias regras"
  on public.automacao_regras for delete
  using (auth.uid() = user_id);

-- Índice para listagem por usuário ordenada por data
create index automacao_regras_user_criada
  on public.automacao_regras (user_id, criada_em desc);
