-- =============================================================================
-- Fase 2b: modo caja
-- Ventas (con un id generado en el celular para no duplicarlas al sincronizar sin
-- internet), sus ítems, cierres de caja y PIN por vendedor con límite de intentos.
-- Cobrar registra la venta y descuenta el stock en UNA sola operación.
-- =============================================================================

alter table public.vendedores
  add column intentos_fallidos smallint not null default 0,
  add column bloqueado_hasta timestamptz;

create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  -- Generado en el celular: si la misma venta llega dos veces, se guarda una sola.
  id_local uuid not null,
  vendedor_id uuid references public.vendedores (id) on delete set null,
  fecha timestamptz not null,
  total integer not null check (total >= 0),
  medio_pago text not null check (medio_pago in ('efectivo', 'debito', 'credito', 'transferencia')),
  usuario_id uuid references public.usuarios (id) on delete set null,
  sincronizada_en timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ventas_id_local_unico unique (empresa_id, id_local)
);
create index ventas_empresa_fecha_idx on public.ventas (empresa_id, fecha desc);

create table public.items_venta (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  producto_id uuid references public.productos (id) on delete set null,
  cantidad numeric(12, 3) not null check (cantidad > 0),
  precio_unitario integer not null check (precio_unitario >= 0),
  total integer not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index items_venta_venta_idx on public.items_venta (venta_id);
create index items_venta_producto_idx on public.items_venta (empresa_id, producto_id, created_at desc);

create table public.cierres_caja (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  fecha date not null,
  vendedor_id uuid references public.vendedores (id) on delete set null,
  total_sistema integer not null,
  efectivo_sistema integer not null,
  efectivo_contado integer not null check (efectivo_contado >= 0),
  -- Contado − lo que debía haber en efectivo: negativo = falta plata.
  diferencia integer not null,
  usuario_id uuid references public.usuarios (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cierre_unico unique nulls not distinct (empresa_id, fecha, vendedor_id)
);

create trigger ventas_updated_at before update on public.ventas for each row execute function public.tocar_updated_at();
create trigger items_venta_updated_at before update on public.items_venta for each row execute function public.tocar_updated_at();
create trigger cierres_updated_at before update on public.cierres_caja for each row execute function public.tocar_updated_at();

alter table public.ventas enable row level security;
alter table public.items_venta enable row level security;
alter table public.cierres_caja enable row level security;
revoke all on public.ventas, public.items_venta, public.cierres_caja from anon, authenticated;
grant all on public.ventas, public.items_venta, public.cierres_caja to service_role;
grant select on public.ventas, public.items_venta, public.cierres_caja to authenticated;

create policy "ventas: ver las de mi negocio" on public.ventas for select to authenticated using (empresa_id = (select public.mi_empresa_id()));
create policy "items_venta: ver los de mi negocio" on public.items_venta for select to authenticated using (empresa_id = (select public.mi_empresa_id()));
create policy "cierres: ver los de mi negocio" on public.cierres_caja for select to authenticated using (empresa_id = (select public.mi_empresa_id()));

-- El dueño cambia el nombre de un vendedor o lo desactiva (el PIN, solo con la función).
grant update (nombre, activo) on public.vendedores to authenticated;
create policy "vendedores: el dueño cambia nombre o lo desactiva" on public.vendedores
  for update to authenticated
  using ((select public.puedo_modificar(empresa_id)) and (select public.mi_rol()) = 'dueno')
  with check ((select public.puedo_modificar(empresa_id)) and (select public.mi_rol()) = 'dueno');

-- -----------------------------------------------------------------------------
-- PIN de vendedores
-- -----------------------------------------------------------------------------

-- El dueño agrega un vendedor con su PIN (se guarda cifrado).
create or replace function public.agregar_vendedor(p_nombre text, p_pin text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa_id uuid := public.mi_empresa_id();
begin
  if v_empresa_id is null or not public.puedo_modificar(v_empresa_id) or public.mi_rol() <> 'dueno' then
    raise exception 'No tienes permiso para agregar vendedores' using errcode = '42501';
  end if;
  return public.crear_vendedor(v_empresa_id, trim(p_nombre), p_pin);
end;
$$;

-- Revisa el PIN de un vendedor. Tras 5 intentos fallidos, se bloquea 5 minutos.
-- Devuelve: 'ok', 'incorrecto' o 'bloqueado'.
create or replace function public.verificar_pin(p_vendedor_id uuid, p_pin text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vendedor public.vendedores%rowtype;
begin
  select * into v_vendedor from public.vendedores
  where id = p_vendedor_id and empresa_id = public.mi_empresa_id() and activo
  for update;
  if not found then
    return 'incorrecto';
  end if;
  if v_vendedor.bloqueado_hasta is not null and v_vendedor.bloqueado_hasta > now() then
    return 'bloqueado';
  end if;

  if v_vendedor.pin_hash = extensions.crypt(coalesce(p_pin, ''), v_vendedor.pin_hash) then
    update public.vendedores set intentos_fallidos = 0, bloqueado_hasta = null where id = p_vendedor_id;
    return 'ok';
  end if;

  update public.vendedores
  set intentos_fallidos = case when intentos_fallidos + 1 >= 5 then 0 else intentos_fallidos + 1 end,
      bloqueado_hasta = case when intentos_fallidos + 1 >= 5 then now() + interval '5 minutes' else null end
  where id = p_vendedor_id;
  return case when v_vendedor.intentos_fallidos + 1 >= 5 then 'bloqueado' else 'incorrecto' end;
end;
$$;

-- -----------------------------------------------------------------------------
-- Ventas
-- -----------------------------------------------------------------------------

-- Registra una venta y descuenta el stock, todo junto.
-- Si la misma venta (mismo id_local) llega de nuevo, no se duplica: devuelve la que ya estaba.
-- p_venta = { "id_local": uuid, "vendedor_id": uuid|null, "fecha": timestamptz, "medio_pago": "...",
--             "items": [{ "producto_id": uuid, "cantidad": 1.5, "precio_unitario": 1990 }] }
create or replace function public.registrar_venta(p_venta jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa_id uuid := public.mi_empresa_id();
  v_id_local uuid := (p_venta ->> 'id_local')::uuid;
  v_vendedor_id uuid := nullif(p_venta ->> 'vendedor_id', '')::uuid;
  v_fecha timestamptz := least(coalesce((p_venta ->> 'fecha')::timestamptz, now()), now());
  v_venta_id uuid;
  v_item jsonb;
  v_cantidad numeric;
  v_precio integer;
  v_total integer := 0;
begin
  if v_empresa_id is null or not public.puedo_modificar(v_empresa_id) then
    raise exception 'No tienes permiso para vender' using errcode = '42501';
  end if;
  if v_id_local is null then
    raise exception 'Falta el identificador de la venta';
  end if;

  -- Sin duplicados al sincronizar.
  select id into v_venta_id from public.ventas where empresa_id = v_empresa_id and id_local = v_id_local;
  if found then
    return v_venta_id;
  end if;

  if v_vendedor_id is not null and not exists (
    select 1 from public.vendedores where id = v_vendedor_id and empresa_id = v_empresa_id
  ) then
    raise exception 'El vendedor no es de este negocio' using errcode = '42501';
  end if;
  if jsonb_array_length(coalesce(p_venta -> 'items', '[]'::jsonb)) = 0 then
    raise exception 'La venta no tiene productos';
  end if;

  insert into public.ventas (empresa_id, id_local, vendedor_id, fecha, total, medio_pago, usuario_id)
  values (v_empresa_id, v_id_local, v_vendedor_id, v_fecha, 0, p_venta ->> 'medio_pago', auth.uid())
  on conflict on constraint ventas_id_local_unico do nothing
  returning id into v_venta_id;
  if v_venta_id is null then
    -- Llegó la misma venta al mismo tiempo por otro lado: ya quedó guardada.
    select id into v_venta_id from public.ventas where empresa_id = v_empresa_id and id_local = v_id_local;
    return v_venta_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_venta -> 'items')
  loop
    v_cantidad := (v_item ->> 'cantidad')::numeric;
    v_precio := round((v_item ->> 'precio_unitario')::numeric)::integer;
    if v_cantidad is null or v_cantidad <= 0 or v_precio is null or v_precio < 0 then
      raise exception 'Hay un producto con cantidad o precio no válidos';
    end if;
    if not exists (select 1 from public.productos where id = (v_item ->> 'producto_id')::uuid and empresa_id = v_empresa_id) then
      raise exception 'Hay un producto que no es de este negocio' using errcode = '42501';
    end if;

    insert into public.items_venta (venta_id, empresa_id, producto_id, cantidad, precio_unitario, total)
    values (v_venta_id, v_empresa_id, (v_item ->> 'producto_id')::uuid, v_cantidad, v_precio, round(v_cantidad * v_precio)::integer);

    insert into public.movimientos_stock (empresa_id, producto_id, tipo, cantidad, referencia_id, usuario_id, fecha)
    values (v_empresa_id, (v_item ->> 'producto_id')::uuid, 'venta', -v_cantidad, v_venta_id, auth.uid(), v_fecha);

    v_total := v_total + round(v_cantidad * v_precio)::integer;
  end loop;

  update public.ventas set total = v_total where id = v_venta_id;
  return v_venta_id;
end;
$$;

-- Los ~20 productos que más se venden (últimos 30 días), para los botones grandes de la caja.
create or replace function public.mas_vendidos(p_limite integer default 20)
returns table (producto_id uuid, veces bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select i.producto_id, count(*) as veces
  from public.items_venta i
  join public.productos p on p.id = i.producto_id and p.activo
  where i.empresa_id = public.mi_empresa_id() and i.created_at > now() - interval '30 days'
  group by i.producto_id
  order by veces desc, sum(i.total) desc
  limit least(coalesce(p_limite, 20), 40);
$$;

-- Cierre de caja del día: el sistema calcula lo vendido; la persona pone el efectivo contado.
create or replace function public.cerrar_caja(p_fecha date, p_efectivo_contado integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa_id uuid := public.mi_empresa_id();
  v_total integer;
  v_efectivo integer;
  v_id uuid;
begin
  if v_empresa_id is null or not public.puedo_modificar(v_empresa_id) then
    raise exception 'No tienes permiso para cerrar la caja' using errcode = '42501';
  end if;
  if p_efectivo_contado is null or p_efectivo_contado < 0 then
    raise exception 'Efectivo contado no válido';
  end if;

  select coalesce(sum(total), 0), coalesce(sum(total) filter (where medio_pago = 'efectivo'), 0)
  into v_total, v_efectivo
  from public.ventas
  where empresa_id = v_empresa_id and (fecha at time zone 'America/Santiago')::date = p_fecha;

  insert into public.cierres_caja (empresa_id, fecha, vendedor_id, total_sistema, efectivo_sistema, efectivo_contado, diferencia, usuario_id)
  values (v_empresa_id, p_fecha, null, v_total, v_efectivo, p_efectivo_contado, p_efectivo_contado - v_efectivo, auth.uid())
  on conflict on constraint cierre_unico do update
    set total_sistema = excluded.total_sistema, efectivo_sistema = excluded.efectivo_sistema,
        efectivo_contado = excluded.efectivo_contado, diferencia = excluded.diferencia, usuario_id = excluded.usuario_id
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.agregar_vendedor(text, text), public.verificar_pin(uuid, text), public.registrar_venta(jsonb),
  public.mas_vendidos(integer), public.cerrar_caja(date, integer) from public, anon;
grant execute on function public.agregar_vendedor(text, text), public.verificar_pin(uuid, text), public.registrar_venta(jsonb),
  public.mas_vendidos(integer), public.cerrar_caja(date, integer) to authenticated;
