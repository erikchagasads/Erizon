-- ─── white_label_configs ──────────────────────────────────────────────────────
-- Configuração de marca do gestor premium.

create table if not exists public.white_label_configs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references auth.users(id) on delete cascade,

  nome_plataforma  text not null default 'Minha Plataforma',
  logo_url         text,                          -- URL do Supabase Storage
  favicon_url      text,
  cor_primaria     text not null default '#6366f1', -- hex
  cor_secundaria   text not null default '#8b5cf6',
  cor_fundo        text not null default '#060609',
  cor_superficie   text not null default '#0d0d11',
  dominio_custom   text,                          -- ex: painel.agencia.com.br
  ativo            boolean not null default true,

  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

create trigger wl_configs_updated_at
  before update on public.white_label_configs
  for each row execute function public.set_updated_at();

alter table public.white_label_configs enable row level security;

create policy "Dono lê própria config"
  on public.white_label_configs for select
  using (auth.uid() = user_id);

create policy "Dono insere própria config"
  on public.white_label_configs for insert
  with check (auth.uid() = user_id);

create policy "Dono atualiza própria config"
  on public.white_label_configs for update
  using (auth.uid() = user_id);

-- Leitura pública por domínio (middleware não autenticado precisa resolver o tema)
create policy "Leitura pública por domínio"
  on public.white_label_configs for select
  using (ativo = true);

-- ─── white_label_clientes ─────────────────────────────────────────────────────
-- Clientes convidados pelo gestor para acessar o painel white label.

create table if not exists public.white_label_clientes (
  id                   uuid primary key default gen_random_uuid(),
  white_label_owner_id uuid not null references auth.users(id) on delete cascade,
  email_convidado      text not null,
  nome                 text,
  cliente_user_id      uuid references auth.users(id) on delete set null,
  status               text not null default 'pendente'
                         check (status in ('pendente', 'ativo', 'revogado')),

  -- Permissões granulares
  ver_campanhas        boolean not null default true,
  ver_financeiro       boolean not null default false,
  ver_criativo         boolean not null default false,

  convidado_em         timestamptz not null default now(),
  ativado_em           timestamptz,

  unique (white_label_owner_id, email_convidado)
);

alter table public.white_label_clientes enable row level security;

-- Dono vê e gerencia todos os seus convidados
create policy "Dono gerencia clientes"
  on public.white_label_clientes for all
  using (auth.uid() = white_label_owner_id);

-- Cliente vê próprio convite
create policy "Cliente vê próprio convite"
  on public.white_label_clientes for select
  using (auth.uid() = cliente_user_id);

-- Índices
create index wl_clientes_owner on public.white_label_clientes (white_label_owner_id);
create index wl_clientes_email on public.white_label_clientes (email_convidado);
create index wl_configs_dominio on public.white_label_configs (dominio_custom) where dominio_custom is not null;

-- ─── Storage bucket para assets white label ────────────────────────────────────
-- Crie este bucket no painel do Supabase: Storage → New bucket
-- Nome: white-label-assets | Public: true
-- Ou via SQL (requer extensão storage habilitada):

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'white-label-assets',
  'white-label-assets',
  true,
  2097152, -- 2MB
  array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif', 'image/x-icon']
)
on conflict (id) do nothing;

-- Política: usuário autenticado faz upload apenas na própria pasta (user_id/)
create policy "Upload própria pasta"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'white-label-assets'
    and (storage.foldername(name))[1] = 'white-label'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Política: leitura pública de todos os assets (logo aparece para clientes)
create policy "Leitura pública assets"
  on storage.objects for select
  using (bucket_id = 'white-label-assets');

-- Política: dono pode deletar/atualizar
create policy "Update e delete própria pasta"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'white-label-assets'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
