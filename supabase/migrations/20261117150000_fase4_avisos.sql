-- =============================================================================
-- Fase 4: avisos y precios
-- Los avisos se crean SOLOS cada vez que se mueve el stock:
--   - stock_bajo: el producto llegó a su mínimo (y se resuelve solo cuando se repone);
--   - costo_sube / costo_baja: una compra cambió el costo más del % que eligió el dueño (5% por defecto).
-- Los avisos de costo incluyen el precio sugerido según el margen objetivo de la categoría.
-- (El envío por correo y push al celular se suma cuando estén las cuentas de correo y Vercel.)
-- =============================================================================

alter table public.empresas
  add column umbral_aviso_costo numeric(5, 2) not null default 5 check (umbral_aviso_costo between 1 and 50);

grant update (umbral_aviso_costo) on public.empresas to authenticated;

create table public.alertas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  tipo text not null check (tipo in ('stock_bajo', 'costo_sube', 'costo_baja')),
  producto_id uuid references public.productos (id) on delete cascade,
  mensaje text not null,
  -- Números del aviso (costo anterior y nuevo, precio sugerido…), para mostrarlos en la app.
  datos jsonb not null default '{}'::jsonb,
  leida boolean not null default false,
  enviada_push boolean not null default false,
  enviada_correo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index alertas_empresa_idx on public.alertas (empresa_id, leida, created_at desc);
create index alertas_producto_idx on public.alertas (producto_id, tipo) where not leida;

create trigger alertas_updated_at before update on public.alertas for each row execute function public.tocar_updated_at();

alter table public.alertas enable row level security;
revoke all on public.alertas from anon, authenticated;
grant all on public.alertas to service_role;
grant select on public.alertas to authenticated;
grant update (leida) on public.alertas to authenticated;

-- Todo el negocio ve los avisos de stock; los de costo, solo el dueño (los empleados no ven costos).
create policy "alertas: ver las de mi negocio" on public.alertas
  for select to authenticated
  using (empresa_id = (select public.mi_empresa_id()) and (tipo = 'stock_bajo' or (select public.mi_rol()) = 'dueno'));

create policy "alertas: marcar como leídas" on public.alertas
  for update to authenticated
  using (empresa_id = (select public.mi_empresa_id()) and (tipo = 'stock_bajo' or (select public.mi_rol()) = 'dueno'))
  with check (empresa_id = (select public.mi_empresa_id()));

-- -----------------------------------------------------------------------------
-- Formatos para los mensajes (iguales a src/lib/formato.ts)
-- -----------------------------------------------------------------------------
create or replace function public.pesos(p_valor numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select '$' || replace(to_char(round(p_valor), 'FM999,999,999,990'), ',', '.');
$$;

create or replace function public.porcentaje(p_valor numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(trim(trailing '.' from trim(trailing '0' from to_char(round(p_valor, 1), 'FM9999990.0'))), '.', ',') || '%';
$$;

-- Precio de venta para lograr el margen objetivo, redondeado a $10 (igual que precioSugerido() en la app).
create or replace function public.precio_sugerido(p_costo numeric, p_margen numeric)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when p_costo <= 0 or p_margen >= 100 then 0
              else (ceil(p_costo / (1 - p_margen / 100) / 10) * 10)::integer end;
$$;

-- -----------------------------------------------------------------------------
-- Creación automática de avisos (después de aplicar el movimiento al stock)
-- -----------------------------------------------------------------------------
create or replace function public.avisar_por_movimiento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_producto record;
  v_stock_antes numeric;
  v_costo_anterior numeric;
  v_variacion numeric;
  v_umbral numeric;
  v_margen numeric;
  v_sugerido integer;
  v_mensaje text;
begin
  select p.id, p.nombre, p.stock_actual, p.stock_minimo, p.precio_venta, p.unidad, coalesce(c.margen_objetivo, 25) as margen
  into v_producto
  from public.productos p
  left join public.categorias c on c.id = p.categoria_id
  where p.id = new.producto_id;

  v_stock_antes := v_producto.stock_actual - new.cantidad;

  -- Se está acabando: cruzó el mínimo hacia abajo (o el producto ya partió bajo el mínimo).
  if v_producto.stock_minimo > 0 and v_producto.stock_actual <= v_producto.stock_minimo
     and (v_stock_antes > v_producto.stock_minimo or new.motivo = 'stock_inicial')
     and not exists (select 1 from public.alertas where producto_id = new.producto_id and tipo = 'stock_bajo' and not leida) then
    insert into public.alertas (empresa_id, tipo, producto_id, mensaje, datos)
    values (
      new.empresa_id, 'stock_bajo', new.producto_id,
      -- Sin número: lo que queda se muestra al momento en la app (sigue cambiando con las ventas).
      'Se está acabando ' || v_producto.nombre || '.',
      jsonb_build_object('stock', v_producto.stock_actual, 'minimo', v_producto.stock_minimo)
    );
  end if;

  -- Se repuso: el aviso de "se está acabando" ya no corre.
  if v_producto.stock_actual > v_producto.stock_minimo then
    update public.alertas set leida = true
    where producto_id = new.producto_id and tipo = 'stock_bajo' and not leida;
  end if;

  -- Cambio de costo en una compra respecto de la compra anterior.
  if new.tipo = 'compra' and new.costo_unitario is not null and new.costo_unitario > 0 then
    select m.costo_unitario into v_costo_anterior
    from public.movimientos_stock m
    where m.producto_id = new.producto_id and m.id <> new.id and m.costo_unitario is not null and m.cantidad > 0
      and (m.fecha, m.created_at) < (new.fecha, new.created_at)
    order by m.fecha desc, m.created_at desc
    limit 1;

    select umbral_aviso_costo into v_umbral from public.empresas where id = new.empresa_id;

    if v_costo_anterior is not null and v_costo_anterior > 0 then
      v_variacion := (new.costo_unitario - v_costo_anterior) / v_costo_anterior * 100;
      if abs(v_variacion) > v_umbral then
        v_margen := v_producto.margen;
        v_sugerido := public.precio_sugerido(new.costo_unitario, v_margen);
        v_mensaje := 'Tu costo de ' || v_producto.nombre || ' ' ||
          case when v_variacion > 0 then 'subió' else 'bajó' end ||
          ' de ' || public.pesos(v_costo_anterior) || ' a ' || public.pesos(new.costo_unitario) ||
          ' (' || case when v_variacion > 0 then '+' else '−' end || public.porcentaje(abs(v_variacion)) || ').';
        if v_variacion > 0 and v_producto.precio_venta < v_sugerido then
          v_mensaje := v_mensaje || ' Con tu margen objetivo de ' || public.porcentaje(v_margen) ||
            ', el precio sugerido es ' || public.pesos(v_sugerido) || '.';
        end if;

        insert into public.alertas (empresa_id, tipo, producto_id, mensaje, datos)
        values (
          new.empresa_id,
          case when v_variacion > 0 then 'costo_sube' else 'costo_baja' end,
          new.producto_id,
          v_mensaje,
          jsonb_build_object(
            'costo_anterior', v_costo_anterior,
            'costo_nuevo', new.costo_unitario,
            'variacion', round(v_variacion, 1),
            'precio_actual', v_producto.precio_venta,
            'precio_sugerido', v_sugerido,
            'margen_objetivo', v_margen
          )
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- "movimientos_avisar" corre después de "movimientos_aplicar" (orden alfabético), con el stock ya actualizado.
create trigger movimientos_avisar after insert on public.movimientos_stock
  for each row execute function public.avisar_por_movimiento();

revoke execute on function public.avisar_por_movimiento() from public, anon, authenticated;
