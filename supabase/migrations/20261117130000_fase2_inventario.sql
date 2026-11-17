-- =============================================================================
-- Fase 2: productos e inventario
--
-- Regla de oro: NADIE edita el stock a mano. El stock solo se mueve con
-- movimientos (compra, venta, ajuste, merma) y movimientos_stock es la fuente
-- de verdad. productos.stock_actual es un valor guardado que se actualiza solo,
-- en la misma operación, cada vez que se registra un movimiento.
-- =============================================================================

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 1 and 80),
  categoria_id uuid references public.categorias (id) on delete set null,
  unidad text not null default 'unidad' check (unidad in ('unidad', 'kg', 'litro', 'caja')),
  codigo_barras text check (codigo_barras ~ '^[0-9]{6,14}$'),
  -- Calculados solos por los movimientos (no se pueden cambiar desde la app):
  stock_actual numeric(12, 3) not null default 0,
  costo_promedio numeric(12, 2) not null default 0 check (costo_promedio >= 0),
  ultimo_movimiento_en timestamptz,
  -- Los pone el dueño:
  stock_minimo numeric(12, 3) not null default 0 check (stock_minimo >= 0),
  precio_venta integer not null default 0 check (precio_venta >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index productos_empresa_id_idx on public.productos (empresa_id);
create unique index productos_codigo_barras_unico on public.productos (empresa_id, codigo_barras)
  where codigo_barras is not null and activo;

create table public.movimientos_stock (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  producto_id uuid not null references public.productos (id) on delete cascade,
  tipo text not null check (tipo in ('compra', 'venta', 'ajuste', 'merma')),
  -- Positivo suma al stock, negativo descuenta.
  cantidad numeric(12, 3) not null check (cantidad <> 0),
  -- Solo en compras (y en el stock inicial): cuánto costó cada unidad.
  costo_unitario numeric(12, 2) check (costo_unitario >= 0),
  -- Documento o venta que originó el movimiento (Fases 2b y 3).
  referencia_id uuid,
  motivo text check (motivo in ('stock_inicial', 'conteo', 'merma', 'vencido', 'consumo_propio', 'regalo')),
  usuario_id uuid references public.usuarios (id) on delete set null,
  fecha timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index movimientos_producto_fecha_idx on public.movimientos_stock (producto_id, fecha desc);
create index movimientos_empresa_fecha_idx on public.movimientos_stock (empresa_id, fecha desc);

create trigger productos_updated_at before update on public.productos
  for each row execute function public.tocar_updated_at();
create trigger movimientos_updated_at before update on public.movimientos_stock
  for each row execute function public.tocar_updated_at();

-- -----------------------------------------------------------------------------
-- Costo promedio ponderado (misma fórmula que src/lib/inventario.ts)
-- -----------------------------------------------------------------------------
create or replace function public.costo_promedio_ponderado(
  p_stock_anterior numeric,
  p_costo_anterior numeric,
  p_cantidad numeric,
  p_costo_nuevo numeric
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    -- Si no había stock (o era negativo), manda el costo de la compra nueva.
    when p_stock_anterior <= 0 then round(p_costo_nuevo, 2)
    else round((p_stock_anterior * p_costo_anterior + p_cantidad * p_costo_nuevo) / (p_stock_anterior + p_cantidad), 2)
  end;
$$;

-- Cada movimiento actualiza el stock (y el costo, si es una entrada con costo) del producto.
create or replace function public.aplicar_movimiento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_producto public.productos%rowtype;
begin
  select * into v_producto from public.productos where id = new.producto_id for update;

  if v_producto.empresa_id <> new.empresa_id then
    raise exception 'El producto no es de este negocio';
  end if;

  update public.productos
  set stock_actual = v_producto.stock_actual + new.cantidad,
      costo_promedio = case
        when new.cantidad > 0 and new.costo_unitario is not null
          then public.costo_promedio_ponderado(v_producto.stock_actual, v_producto.costo_promedio, new.cantidad, new.costo_unitario)
        else v_producto.costo_promedio
      end,
      ultimo_movimiento_en = greatest(coalesce(v_producto.ultimo_movimiento_en, new.fecha), new.fecha)
  where id = new.producto_id;

  return new;
end;
$$;

create trigger movimientos_aplicar after insert on public.movimientos_stock
  for each row execute function public.aplicar_movimiento();

-- Los movimientos no se cambian ni se borran: son el historial.
create or replace function public.movimientos_no_se_cambian()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Los movimientos de stock no se pueden cambiar ni borrar';
end;
$$;

create trigger movimientos_inmutables before update or delete on public.movimientos_stock
  for each row when (pg_trigger_depth() = 0)
  execute function public.movimientos_no_se_cambian();

-- -----------------------------------------------------------------------------
-- Permisos y reglas (RLS)
-- -----------------------------------------------------------------------------
alter table public.productos enable row level security;
alter table public.movimientos_stock enable row level security;

revoke all on public.productos, public.movimientos_stock from anon, authenticated;
grant all on public.productos, public.movimientos_stock to service_role;

-- Todos en el negocio ven los productos, MENOS el costo (los empleados no ven costos;
-- el dueño los obtiene con costos_de_mi_negocio()).
grant select (id, empresa_id, nombre, categoria_id, unidad, codigo_barras, stock_actual, ultimo_movimiento_en,
              stock_minimo, precio_venta, activo, created_at, updated_at)
  on public.productos to authenticated;
-- El dueño cambia los datos del producto, nunca el stock ni el costo.
grant update (nombre, categoria_id, unidad, codigo_barras, stock_minimo, precio_venta, activo)
  on public.productos to authenticated;

create policy "productos: ver los de mi negocio" on public.productos
  for select to authenticated
  using (empresa_id = (select public.mi_empresa_id()));

create policy "productos: el dueño cambia los datos" on public.productos
  for update to authenticated
  using ((select public.puedo_modificar(empresa_id)) and (select public.mi_rol()) = 'dueno')
  with check ((select public.puedo_modificar(empresa_id)) and (select public.mi_rol()) = 'dueno');

-- Movimientos: se ven (sin el costo), pero solo se crean con las funciones de abajo.
grant select (id, empresa_id, producto_id, tipo, cantidad, referencia_id, motivo, usuario_id, fecha, created_at, updated_at)
  on public.movimientos_stock to authenticated;

create policy "movimientos: ver los de mi negocio" on public.movimientos_stock
  for select to authenticated
  using (empresa_id = (select public.mi_empresa_id()));

-- -----------------------------------------------------------------------------
-- Funciones que usa la app
-- -----------------------------------------------------------------------------

-- Costos y valor del inventario: solo para el dueño.
create or replace function public.costos_de_mi_negocio()
returns table (producto_id uuid, costo_promedio numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.costo_promedio
  from public.productos p
  where p.empresa_id = public.mi_empresa_id()
    and public.mi_rol() = 'dueno';
$$;

-- Producto nuevo con su stock inicial (queda como primer movimiento).
create or replace function public.crear_producto(
  p_nombre text,
  p_categoria_id uuid,
  p_unidad text,
  p_codigo_barras text,
  p_precio_venta integer,
  p_costo numeric,
  p_stock_inicial numeric,
  p_stock_minimo numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa_id uuid := public.mi_empresa_id();
  v_id uuid;
begin
  if v_empresa_id is null or not public.puedo_modificar(v_empresa_id) or public.mi_rol() <> 'dueno' then
    raise exception 'No tienes permiso para agregar productos' using errcode = '42501';
  end if;
  if p_categoria_id is not null and not exists (
    select 1 from public.categorias where id = p_categoria_id and empresa_id = v_empresa_id
  ) then
    raise exception 'La categoría no es de este negocio' using errcode = '42501';
  end if;
  if coalesce(p_stock_inicial, 0) < 0 then
    raise exception 'El stock inicial no puede ser negativo';
  end if;

  insert into public.productos (empresa_id, nombre, categoria_id, unidad, codigo_barras, precio_venta, stock_minimo)
  values (v_empresa_id, trim(p_nombre), p_categoria_id, p_unidad, nullif(trim(p_codigo_barras), ''), p_precio_venta, coalesce(p_stock_minimo, 0))
  returning id into v_id;

  -- El costo queda guardado aunque el stock inicial sea 0.
  update public.productos set costo_promedio = round(coalesce(p_costo, 0), 2) where id = v_id;

  if coalesce(p_stock_inicial, 0) > 0 then
    insert into public.movimientos_stock (empresa_id, producto_id, tipo, cantidad, costo_unitario, motivo, usuario_id)
    values (v_empresa_id, v_id, 'ajuste', p_stock_inicial, coalesce(p_costo, 0), 'stock_inicial', auth.uid());
  end if;

  return v_id;
end;
$$;

-- Salida rápida con motivo: merma, vencido, consumo propio o regalo. Dueño o empleado.
create or replace function public.registrar_salida(p_producto_id uuid, p_cantidad numeric, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa_id uuid;
begin
  select empresa_id into v_empresa_id from public.productos where id = p_producto_id;
  if v_empresa_id is null or v_empresa_id <> public.mi_empresa_id() or not public.puedo_modificar(v_empresa_id) then
    raise exception 'No tienes permiso para cambiar este producto' using errcode = '42501';
  end if;
  if p_motivo not in ('merma', 'vencido', 'consumo_propio', 'regalo') then
    raise exception 'Motivo no válido';
  end if;
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor que cero';
  end if;

  insert into public.movimientos_stock (empresa_id, producto_id, tipo, cantidad, motivo, usuario_id)
  values (
    v_empresa_id, p_producto_id,
    case when p_motivo in ('merma', 'vencido') then 'merma' else 'ajuste' end,
    -p_cantidad, p_motivo, auth.uid()
  );
end;
$$;

-- Conteo: la persona dice cuánto hay de verdad y se registra solo la diferencia.
-- p_conteos = [{"producto_id": "...", "cantidad_real": 12}, ...]. Devuelve cuántos productos cambiaron.
create or replace function public.registrar_conteo(p_conteos jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa_id uuid := public.mi_empresa_id();
  v_item jsonb;
  v_producto public.productos%rowtype;
  v_real numeric;
  v_cambiados integer := 0;
begin
  if v_empresa_id is null or not public.puedo_modificar(v_empresa_id) then
    raise exception 'No tienes permiso para hacer conteos' using errcode = '42501';
  end if;

  for v_item in select * from jsonb_array_elements(p_conteos)
  loop
    v_real := (v_item ->> 'cantidad_real')::numeric;
    if v_real is null or v_real < 0 then
      raise exception 'Cantidad contada no válida';
    end if;

    select * into v_producto from public.productos
    where id = (v_item ->> 'producto_id')::uuid and empresa_id = v_empresa_id
    for update;
    if not found then
      raise exception 'Producto no encontrado en este negocio' using errcode = '42501';
    end if;

    if v_real <> v_producto.stock_actual then
      insert into public.movimientos_stock (empresa_id, producto_id, tipo, cantidad, motivo, usuario_id)
      values (v_empresa_id, v_producto.id, 'ajuste', v_real - v_producto.stock_actual, 'conteo', auth.uid());
      v_cambiados := v_cambiados + 1;
    end if;
  end loop;

  return v_cambiados;
end;
$$;

revoke execute on function public.costos_de_mi_negocio(), public.crear_producto(text, uuid, text, text, integer, numeric, numeric, numeric),
  public.registrar_salida(uuid, numeric, text), public.registrar_conteo(jsonb), public.aplicar_movimiento(),
  public.movimientos_no_se_cambian() from public, anon;
grant execute on function public.costos_de_mi_negocio(), public.crear_producto(text, uuid, text, text, integer, numeric, numeric, numeric),
  public.registrar_salida(uuid, numeric, text), public.registrar_conteo(jsonb) to authenticated;
revoke execute on function public.aplicar_movimiento(), public.movimientos_no_se_cambian() from authenticated;
