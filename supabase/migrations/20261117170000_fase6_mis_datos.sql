-- =============================================================================
-- Fase 6: "Mis datos" (Ley 21.719)
-- Solicitudes para eliminar la cuenta: se borra todo 30 días después de pedirlo
-- (se puede cancelar antes). El borrado lo hace una tarea programada del servidor
-- (src/app/api/cron/eliminaciones), que también borra las fotos y las cuentas de acceso.
-- Los respaldos de pagos que exige la ley tributaria se manejarán en la Fase 5.
-- =============================================================================

create table public.solicitudes_eliminacion (
  id uuid primary key default gen_random_uuid(),
  -- set null: la solicitud queda como registro de que se cumplió, aunque el negocio ya no exista.
  empresa_id uuid references public.empresas (id) on delete set null,
  rut_empresa text not null,
  nombre_negocio text not null,
  solicitada_por uuid references public.usuarios (id) on delete set null,
  eliminar_desde timestamptz not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'cancelada', 'realizada')),
  realizada_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index solicitudes_pendiente_unica on public.solicitudes_eliminacion (empresa_id) where estado = 'pendiente';
create trigger solicitudes_updated_at before update on public.solicitudes_eliminacion for each row execute function public.tocar_updated_at();

alter table public.solicitudes_eliminacion enable row level security;
revoke all on public.solicitudes_eliminacion from anon, authenticated;
grant all on public.solicitudes_eliminacion to service_role;
grant select on public.solicitudes_eliminacion to authenticated;

-- El dueño ve las de su negocio; el administrador de RH Stock ve todas (para hacer seguimiento).
create policy "solicitudes: el dueño ve las suyas, el admin todas" on public.solicitudes_eliminacion
  for select to authenticated
  using ((empresa_id = (select public.mi_empresa_id()) and (select public.mi_rol()) = 'dueno') or (select public.es_admin()));

-- Pide eliminar la cuenta del negocio: se borra en 30 días.
create or replace function public.solicitar_eliminacion()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa public.empresas%rowtype;
  v_fecha timestamptz;
begin
  select * into v_empresa from public.empresas where id = public.mi_empresa_id();
  if not found or public.mi_rol() <> 'dueno' or v_empresa.es_demo then
    raise exception 'Solo el dueño puede eliminar la cuenta del negocio' using errcode = '42501';
  end if;

  select eliminar_desde into v_fecha from public.solicitudes_eliminacion where empresa_id = v_empresa.id and estado = 'pendiente';
  if found then
    return v_fecha;
  end if;

  insert into public.solicitudes_eliminacion (empresa_id, rut_empresa, nombre_negocio, solicitada_por, eliminar_desde)
  values (v_empresa.id, v_empresa.rut, v_empresa.nombre_fantasia, auth.uid(), now() + interval '30 days')
  returning eliminar_desde into v_fecha;
  return v_fecha;
end;
$$;

-- Se arrepintió: cancela la eliminación pendiente.
create or replace function public.cancelar_eliminacion()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.mi_rol() is distinct from 'dueno' then
    raise exception 'Solo el dueño puede cancelar la eliminación' using errcode = '42501';
  end if;
  update public.solicitudes_eliminacion set estado = 'cancelada'
  where empresa_id = public.mi_empresa_id() and estado = 'pendiente';
end;
$$;

revoke execute on function public.solicitar_eliminacion(), public.cancelar_eliminacion() from public, anon;
grant execute on function public.solicitar_eliminacion(), public.cancelar_eliminacion() to authenticated;
