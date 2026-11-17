-- =============================================================================
-- Fase 1: cuentas y seguridad
-- Negocios (empresas), personas (usuarios), consentimientos, categorías y vendedores.
--
-- Regla de oro: cada negocio ve SOLO sus datos. Todas las tablas tienen
-- Row Level Security (RLS) y las pruebas están en pruebas/db/rls.test.ts.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Función común: mantener updated_at al día
-- -----------------------------------------------------------------------------
create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  rut text not null unique check (rut ~ '^[0-9]{1,8}-[0-9K]$'),
  razon_social text,
  nombre_fantasia text not null check (length(trim(nombre_fantasia)) between 1 and 80),
  comuna text not null default 'Puente Alto',
  plan text not null default 'mensual',
  estado_suscripcion text not null default 'al_dia'
    check (estado_suscripcion in ('al_dia', 'por_vencer', 'atrasado', 'suspendido')),
  dia_pago smallint not null default 5 check (dia_pago between 1 and 28),
  -- Negocio de ejemplo (Almacén Don Pepe): se puede mirar pero no modificar.
  es_demo boolean not null default false,
  creada_en timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  empresa_id uuid references public.empresas (id) on delete cascade,
  rut text not null unique check (rut ~ '^[0-9]{1,8}-[0-9K]$'),
  nombre text not null check (length(trim(nombre)) between 1 and 80),
  -- Correo real de la persona, para recuperar la clave. (En Supabase Auth se usa un correo interno armado con el RUT.)
  correo text not null check (correo ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  rol text not null check (rol in ('dueno', 'empleado', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Dueños y empleados pertenecen a un negocio; el administrador de RH Stock no.
  constraint usuarios_empresa_segun_rol check ((rol = 'admin') = (empresa_id is null))
);
create index usuarios_empresa_id_idx on public.usuarios (empresa_id);

create table public.consentimientos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  tipo text not null check (tipo in ('terminos', 'privacidad', 'datos_anonimos')),
  version text not null,
  aceptado boolean not null,
  fecha timestamptz not null default now(),
  ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index consentimientos_usuario_id_idx on public.consentimientos (usuario_id);

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 1 and 60),
  icono text not null default '📦',
  -- Margen objetivo en porcentaje: 25 = 25%.
  margen_objetivo numeric(5, 2) not null default 25 check (margen_objetivo >= 0 and margen_objetivo < 100),
  orden smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, nombre)
);

create table public.vendedores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 1 and 40),
  -- Hash del PIN de 4 dígitos (bcrypt). Nunca se entrega al navegador.
  pin_hash text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vendedores_empresa_id_idx on public.vendedores (empresa_id);

create trigger empresas_updated_at before update on public.empresas
  for each row execute function public.tocar_updated_at();
create trigger usuarios_updated_at before update on public.usuarios
  for each row execute function public.tocar_updated_at();
create trigger consentimientos_updated_at before update on public.consentimientos
  for each row execute function public.tocar_updated_at();
create trigger categorias_updated_at before update on public.categorias
  for each row execute function public.tocar_updated_at();
create trigger vendedores_updated_at before update on public.vendedores
  for each row execute function public.tocar_updated_at();

-- -----------------------------------------------------------------------------
-- Funciones de ayuda para las reglas de seguridad
-- (security definer para poder leer "usuarios" sin caer en un círculo de RLS)
-- -----------------------------------------------------------------------------

create or replace function public.mi_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select empresa_id from public.usuarios where id = (select auth.uid());
$$;

create or replace function public.mi_rol()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select rol from public.usuarios where id = (select auth.uid());
$$;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select rol = 'admin' from public.usuarios where id = (select auth.uid())), false);
$$;

-- ¿Puede la persona conectada modificar datos de este negocio?
-- No, si no es su negocio o si es el negocio de ejemplo.
-- (En la Fase 5 se suma: no, si está suspendido por atraso en el pago.)
create or replace function public.puedo_modificar(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.usuarios u
    join public.empresas e on e.id = u.empresa_id
    where u.id = (select auth.uid())
      and u.empresa_id = p_empresa_id
      and not e.es_demo
  );
$$;

revoke execute on function public.mi_empresa_id(), public.mi_rol(), public.es_admin(), public.puedo_modificar(uuid) from public, anon;
grant execute on function public.mi_empresa_id(), public.mi_rol(), public.es_admin(), public.puedo_modificar(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Permisos y reglas por tabla (RLS)
-- Las visitas sin sesión (anon) no ven nada.
-- -----------------------------------------------------------------------------

alter table public.empresas enable row level security;
alter table public.usuarios enable row level security;
alter table public.consentimientos enable row level security;
alter table public.categorias enable row level security;
alter table public.vendedores enable row level security;

revoke all on public.empresas, public.usuarios, public.consentimientos, public.categorias, public.vendedores from anon, authenticated;

-- Empresas: cada uno ve la suya; el administrador ve todas (solo la ficha, no el detalle del negocio).
grant select on public.empresas to authenticated;
grant update (nombre_fantasia, razon_social, comuna) on public.empresas to authenticated;

create policy "empresas: ver la mía o todas si soy admin" on public.empresas
  for select to authenticated
  using (id = (select public.mi_empresa_id()) or (select public.es_admin()));

create policy "empresas: el dueño edita la suya" on public.empresas
  for update to authenticated
  using ((select public.puedo_modificar(id)) and (select public.mi_rol()) = 'dueno')
  with check ((select public.puedo_modificar(id)) and (select public.mi_rol()) = 'dueno');

-- Usuarios: cada uno se ve a sí mismo; el dueño ve a su equipo; el admin ve a todos.
-- Solo se puede cambiar el propio nombre (rol, negocio y RUT no se tocan desde la app).
grant select on public.usuarios to authenticated;
grant update (nombre) on public.usuarios to authenticated;

create policy "usuarios: verme, ver mi equipo si soy dueño, o todos si soy admin" on public.usuarios
  for select to authenticated
  using (
    id = (select auth.uid())
    or (empresa_id = (select public.mi_empresa_id()) and (select public.mi_rol()) = 'dueno')
    or (select public.es_admin())
  );

create policy "usuarios: cambiar mi nombre" on public.usuarios
  for update to authenticated
  using (id = (select auth.uid()) and (empresa_id is null or (select public.puedo_modificar(empresa_id))))
  with check (id = (select auth.uid()));

-- Consentimientos: historial que solo crece. Cada uno ve y agrega los suyos.
grant select, insert on public.consentimientos to authenticated;

create policy "consentimientos: ver los míos" on public.consentimientos
  for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy "consentimientos: agregar los míos" on public.consentimientos
  for insert to authenticated
  with check (usuario_id = (select auth.uid()));

-- Categorías: todo el negocio las ve; solo el dueño las cambia.
grant select, insert, update, delete on public.categorias to authenticated;

create policy "categorias: ver las de mi negocio" on public.categorias
  for select to authenticated
  using (empresa_id = (select public.mi_empresa_id()));

create policy "categorias: el dueño agrega" on public.categorias
  for insert to authenticated
  with check ((select public.puedo_modificar(empresa_id)) and (select public.mi_rol()) = 'dueno');

create policy "categorias: el dueño cambia" on public.categorias
  for update to authenticated
  using ((select public.puedo_modificar(empresa_id)) and (select public.mi_rol()) = 'dueno')
  with check ((select public.puedo_modificar(empresa_id)) and (select public.mi_rol()) = 'dueno');

create policy "categorias: el dueño borra" on public.categorias
  for delete to authenticated
  using ((select public.puedo_modificar(empresa_id)) and (select public.mi_rol()) = 'dueno');

-- Vendedores: el negocio ve nombres (nunca el hash del PIN). Se crean y cambian
-- con funciones del servidor, para que el PIN siempre se guarde cifrado.
grant select (id, empresa_id, nombre, activo, created_at, updated_at) on public.vendedores to authenticated;

create policy "vendedores: ver los de mi negocio" on public.vendedores
  for select to authenticated
  using (empresa_id = (select public.mi_empresa_id()));

-- -----------------------------------------------------------------------------
-- Funciones del servidor (solo las puede usar el servidor con la clave secreta)
-- -----------------------------------------------------------------------------

-- Categorías con las que parte todo negocio nuevo.
create or replace function public.crear_categorias_base(p_empresa_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.categorias (empresa_id, nombre, icono, margen_objetivo, orden)
  values
    (p_empresa_id, 'Bebidas y jugos', '🥤', 25, 1),
    (p_empresa_id, 'Abarrotes', '🍚', 18, 2),
    (p_empresa_id, 'Lácteos y huevos', '🥛', 20, 3),
    (p_empresa_id, 'Panadería', '🍞', 30, 4),
    (p_empresa_id, 'Fiambrería y quesos', '🧀', 30, 5),
    (p_empresa_id, 'Snacks y dulces', '🍫', 35, 6),
    (p_empresa_id, 'Frutas y verduras', '🥬', 35, 7),
    (p_empresa_id, 'Congelados y helados', '🧊', 30, 8),
    (p_empresa_id, 'Limpieza del hogar', '🧽', 25, 9),
    (p_empresa_id, 'Aseo personal', '🧴', 25, 10),
    (p_empresa_id, 'Mascotas', '🐶', 25, 11),
    (p_empresa_id, 'Otros', '📦', 25, 12)
  on conflict (empresa_id, nombre) do nothing;
$$;

-- Registro de un negocio nuevo, todo de una vez (o nada si algo falla):
-- negocio, dueño, consentimientos y categorías base.
-- El usuario de Supabase Auth (p_usuario_id) lo crea antes el servidor.
create or replace function public.registrar_negocio(
  p_usuario_id uuid,
  p_rut_usuario text,
  p_nombre text,
  p_correo text,
  p_rut_empresa text,
  p_nombre_negocio text,
  p_comuna text,
  p_version_legal text,
  p_ip text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa_id uuid;
begin
  insert into public.empresas (rut, nombre_fantasia, comuna)
  values (p_rut_empresa, p_nombre_negocio, coalesce(nullif(trim(p_comuna), ''), 'Puente Alto'))
  returning id into v_empresa_id;

  insert into public.usuarios (id, empresa_id, rut, nombre, correo, rol)
  values (p_usuario_id, v_empresa_id, p_rut_usuario, p_nombre, lower(trim(p_correo)), 'dueno');

  insert into public.consentimientos (usuario_id, tipo, version, aceptado, ip)
  values
    (p_usuario_id, 'terminos', p_version_legal, true, p_ip),
    (p_usuario_id, 'privacidad', p_version_legal, true, p_ip);

  perform public.crear_categorias_base(v_empresa_id);

  return v_empresa_id;
end;
$$;

-- Crea un vendedor con su PIN de 4 dígitos guardado cifrado.
create or replace function public.crear_vendedor(p_empresa_id uuid, p_nombre text, p_pin text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'El PIN debe tener 4 números';
  end if;

  insert into public.vendedores (empresa_id, nombre, pin_hash)
  values (p_empresa_id, p_nombre, extensions.crypt(p_pin, extensions.gen_salt('bf', 8)))
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.crear_categorias_base(uuid) from public, anon, authenticated;
revoke execute on function public.registrar_negocio(uuid, text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.crear_vendedor(uuid, text, text) from public, anon, authenticated;
grant execute on function public.crear_categorias_base(uuid) to service_role;
grant execute on function public.registrar_negocio(uuid, text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.crear_vendedor(uuid, text, text) to service_role;

-- El servidor (service_role) necesita acceso completo para registrar negocios y cargar el demo.
grant all on public.empresas, public.usuarios, public.consentimientos, public.categorias, public.vendedores to service_role;
