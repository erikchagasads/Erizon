create table if not exists whatsapp_copilot_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  phone_number text not null,
  instance_name text not null,
  api_base_url text,
  api_key text not null,
  ativo boolean not null default false,
  briefing_hora int default 7,
  ultimo_contato timestamptz,
  updated_at timestamptz not null default now()
);

alter table whatsapp_copilot_sessions enable row level security;

create policy "Usuario gerencia propria sessao WhatsApp"
  on whatsapp_copilot_sessions for all
  using (auth.uid() = user_id);
