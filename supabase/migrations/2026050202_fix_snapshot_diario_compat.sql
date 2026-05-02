-- Keep metricas_snapshot_diario compatible with the daily snapshot RPC.

alter table public.metricas_snapshot_diario
  add column if not exists dia date,
  add column if not exists leads_total int not null default 0,
  add column if not exists roas numeric(8,4),
  add column if not exists cpl numeric(10,2);

update public.metricas_snapshot_diario
set dia = coalesce(dia, data_snapshot)
where dia is null;

create or replace function public.inserir_snapshots_diarios()
returns void
language plpgsql
security definer
as $$
declare
  r record;
  v_hoje date := current_date;
  v_gasto numeric;
  v_leads numeric;
  v_receita numeric;
  v_impressoes bigint;
begin
  for r in
    select distinct user_id from public.metricas_ads
  loop
    select
      coalesce(sum(gasto_total), 0),
      coalesce(sum(contatos), 0),
      coalesce(sum(receita_estimada), 0),
      coalesce(sum(impressoes), 0)
    into v_gasto, v_leads, v_receita, v_impressoes
    from public.metricas_ads
    where user_id = r.user_id;

    insert into public.metricas_snapshot_diario (
      user_id, dia, data_snapshot,
      gasto_total, leads_total, receita_total,
      total_leads, impressoes,
      roas, cpl,
      roas_global, cpl_medio,
      lucro_total, margem_global
    )
    values (
      r.user_id, v_hoje, v_hoje,
      v_gasto, v_leads, v_receita,
      v_leads, v_impressoes,
      case when v_gasto > 0 then v_receita / v_gasto else 0 end,
      case when v_leads > 0 then v_gasto / v_leads else 0 end,
      case when v_gasto > 0 then v_receita / v_gasto else 0 end,
      case when v_leads > 0 then v_gasto / v_leads else 0 end,
      v_receita - v_gasto,
      case when v_receita > 0 then (v_receita - v_gasto) / v_receita else 0 end
    )
    on conflict (user_id, data_snapshot) do update set
      dia           = excluded.dia,
      gasto_total   = excluded.gasto_total,
      leads_total   = excluded.leads_total,
      receita_total = excluded.receita_total,
      total_leads   = excluded.total_leads,
      impressoes    = excluded.impressoes,
      roas          = excluded.roas,
      cpl           = excluded.cpl,
      roas_global   = excluded.roas_global,
      cpl_medio     = excluded.cpl_medio,
      lucro_total   = excluded.lucro_total,
      margem_global = excluded.margem_global;
  end loop;
end;
$$;
