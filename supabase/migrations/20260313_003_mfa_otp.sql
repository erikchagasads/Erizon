-- Migration: user_mfa_config — suporta email (Supabase nativo, gratuito)

create table if not exists user_mfa_config (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  canal      text not null default 'email' check (canal in ('email', 'sms', 'whatsapp')),
  email      text,
  telefone   text,
  ativo      boolean not null default true,
  ativado_em timestamptz not null default now()
);

alter table user_mfa_config enable row level security;

drop policy if exists "Usuário acessa própria config MFA" on user_mfa_config;
create policy "Usuário acessa própria config MFA"
  on user_mfa_config for all
  using (auth.uid() = user_id);
