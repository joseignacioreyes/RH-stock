-- =============================================================================
-- Envío de avisos: notificaciones al celular (Web Push) y resumen diario por correo.
--
--   - suscripciones_push: cada celular o computador que aceptó recibir avisos.
--   - claves_push: el par de claves VAPID con que la app firma las notificaciones.
--     Se crea solo la primera vez (lo hace el servidor) y solo el servidor la lee.
--   - usuarios.avisos_por_correo: el dueño puede dejar de recibir el resumen por correo.
--   - recuperaciones_clave: registro de pedidos de "olvidé mi clave", para limitar intentos.
-- Qué se envía y a quién: src/lib/envio-avisos.ts. Los empleados reciben solo "se está acabando".
-- =============================================================================

create table public.suscripciones_push (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%'),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index suscripciones_push_empresa_idx on public.suscripciones_push (empresa_id);
create trigger suscripciones_push_updated_at before update on public.suscripciones_push
  for each row execute function public.tocar_updated_at();

alter table public.suscripciones_push enable row level security;
revoke all on public.suscripciones_push from anon, authenticated;
grant all on public.suscripciones_push to service_role;
grant select on public.suscripciones_push to authenticated;
create policy "suscripciones_push: veo las mías" on public.suscripciones_push
  for select to authenticated using (usuario_id = (select auth.uid()));

create table public.claves_push (
  id boolean primary key default true check (id),
  publica text not null,
  privada text not null,
  created_at timestamptz not null default now()
);
alter table public.claves_push enable row level security;
revoke all on public.claves_push from anon, authenticated;
grant all on public.claves_push to service_role;

alter table public.usuarios add column avisos_por_correo boolean not null default true;

create table public.recuperaciones_clave (
  id uuid primary key default gen_random_uuid(),
  rut text not null,
  created_at timestamptz not null default now()
);
create index recuperaciones_clave_rut_idx on public.recuperaciones_clave (rut, created_at desc);
alter table public.recuperaciones_clave enable row level security;
revoke all on public.recuperaciones_clave from anon, authenticated;
grant all on public.recuperaciones_clave to service_role;

-- Este celular quiere recibir avisos (si ya estaba, se actualiza a la persona conectada).
create or replace function public.guardar_suscripcion_push(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa_id uuid := public.mi_empresa_id();
begin
  if v_empresa_id is null then
    raise exception 'Solo para personas de un negocio' using errcode = '42501';
  end if;
  if p_endpoint is null or p_endpoint not like 'https://%' or length(p_endpoint) > 1000
     or coalesce(length(p_p256dh), 0) not between 1 and 200 or coalesce(length(p_auth), 0) not between 1 and 100 then
    raise exception 'Suscripción no válida';
  end if;
  insert into public.suscripciones_push (usuario_id, empresa_id, endpoint, p256dh, auth)
  values (auth.uid(), v_empresa_id, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set usuario_id = excluded.usuario_id, empresa_id = excluded.empresa_id, p256dh = excluded.p256dh, auth = excluded.auth;
end;
$$;

create or replace function public.quitar_suscripcion_push(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.suscripciones_push where endpoint = p_endpoint and usuario_id = (select auth.uid());
$$;

-- El dueño activa o desactiva el resumen diario por correo (se puede aunque la cuenta esté solo para mirar).
create or replace function public.cambiar_avisos_por_correo(p_activo boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.mi_rol() is distinct from 'dueno' then
    raise exception 'Solo el dueño recibe el resumen por correo' using errcode = '42501';
  end if;
  update public.usuarios set avisos_por_correo = coalesce(p_activo, true) where id = auth.uid();
end;
$$;

revoke execute on function public.guardar_suscripcion_push(text, text, text), public.quitar_suscripcion_push(text),
  public.cambiar_avisos_por_correo(boolean) from public, anon;
grant execute on function public.guardar_suscripcion_push(text, text, text), public.quitar_suscripcion_push(text),
  public.cambiar_avisos_por_correo(boolean) to authenticated;
