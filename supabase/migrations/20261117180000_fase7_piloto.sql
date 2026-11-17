-- =============================================================================
-- Fase 7: piloto
-- Métricas de uso por negocio para el administrador de RH Stock: solo cuentas y
-- números (nunca el detalle del negocio): boletas, correcciones a lo que leyó la IA,
-- ventas (y cuántas sin internet), avisos vistos, precios sugeridos usados, días activos.
-- =============================================================================

-- Cuánto hubo que corregir de lo que leyó la IA en cada boleta (se calcula solo al confirmar).
alter table public.documentos_compra
  add column items_leidos integer,
  add column items_corregidos integer;

create or replace function public.contar_correcciones()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_leidos jsonb := new.datos_extraidos -> 'items';
begin
  if new.estado = 'confirmado' and old.estado <> 'confirmado' and v_leidos is not null and jsonb_typeof(v_leidos) = 'array' then
    new.items_leidos := jsonb_array_length(v_leidos);
    -- Corregido = un producto confirmado que no coincide con lo leído (descripción, cantidad y precio)
    --           + un producto leído que la persona sacó.
    new.items_corregidos :=
      (select count(*) from public.items_documento i
        where i.documento_id = new.id
          and not exists (
            select 1 from jsonb_array_elements(v_leidos) l
            where public.normalizar_descripcion(l ->> 'descripcion') = public.normalizar_descripcion(i.descripcion_original)
              and (l ->> 'cantidad')::numeric = i.cantidad
              and round((l ->> 'precioUnitario')::numeric, 2) = i.precio_unitario
          ))
      + (select count(*) from jsonb_array_elements(v_leidos) l
          where not exists (
            select 1 from public.items_documento i
            where i.documento_id = new.id
              and public.normalizar_descripcion(i.descripcion_original) = public.normalizar_descripcion(l ->> 'descripcion')
          ));
  end if;
  return new;
end;
$$;

create trigger documentos_contar_correcciones before update on public.documentos_compra
  for each row execute function public.contar_correcciones();

-- Cuándo la PERSONA vio un aviso (abriéndolo o con "Ya los vi todos").
-- Los avisos de stock que se resuelven solos al reponer no cuentan como vistos:
-- esos cambios vienen desde otro trigger (pg_trigger_depth() > 1).
alter table public.alertas add column vista_en timestamptz;

create or replace function public.marcar_alerta_vista()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.leida and not old.leida and pg_trigger_depth() = 1 and auth.uid() is not null then
    new.vista_en := now();
  end if;
  return new;
end;
$$;

create trigger alertas_marcar_vista before update on public.alertas
  for each row execute function public.marcar_alerta_vista();

-- Hechos de uso que no quedan en otras tablas (por ahora: usar el precio sugerido).
create table public.eventos_uso (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  evento text not null check (evento in ('precio_sugerido_usado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index eventos_uso_empresa_idx on public.eventos_uso (empresa_id, evento, created_at);
alter table public.eventos_uso enable row level security;
revoke all on public.eventos_uso from anon, authenticated;
grant all on public.eventos_uso to service_role;

create or replace function public.registrar_evento(p_evento text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa_id uuid := public.mi_empresa_id();
begin
  if v_empresa_id is null or not public.puedo_modificar(v_empresa_id) then
    return; -- el demo y el administrador no cuentan
  end if;
  insert into public.eventos_uso (empresa_id, evento) values (v_empresa_id, p_evento);
end;
$$;

-- Métricas de uso por negocio desde una fecha. Solo el administrador de RH Stock.
create or replace function public.metricas_uso(p_desde timestamptz)
returns table (
  empresa_id uuid,
  negocio text,
  comuna text,
  creada_en timestamptz,
  dias_activos bigint,
  ultima_actividad timestamptz,
  boletas_subidas bigint,
  boletas_confirmadas bigint,
  boletas_a_mano bigint,
  items_leidos bigint,
  items_corregidos bigint,
  productos_creados bigint,
  ventas bigint,
  ventas_sin_internet bigint,
  monto_vendido bigint,
  vendedores_activos bigint,
  conteos bigint,
  perdidas bigint,
  avisos_stock bigint,
  avisos_costo bigint,
  avisos_vistos bigint,
  precios_sugeridos_usados bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador de RH Stock' using errcode = '42501';
  end if;

  return query
  select
    e.id,
    e.nombre_fantasia,
    e.comuna,
    e.creada_en,
    (select count(distinct (m.fecha at time zone 'America/Santiago')::date) from public.movimientos_stock m
      where m.empresa_id = e.id and m.fecha >= p_desde),
    (select max(m.created_at) from public.movimientos_stock m where m.empresa_id = e.id),
    (select count(*) from public.documentos_compra d where d.empresa_id = e.id and d.created_at >= p_desde and d.imagen_url is not null),
    (select count(*) from public.documentos_compra d where d.empresa_id = e.id and d.created_at >= p_desde and d.estado = 'confirmado'),
    (select count(*) from public.documentos_compra d where d.empresa_id = e.id and d.created_at >= p_desde and d.estado = 'confirmado' and d.items_leidos is null),
    (select coalesce(sum(d.items_leidos), 0)::bigint from public.documentos_compra d where d.empresa_id = e.id and d.created_at >= p_desde),
    (select coalesce(sum(d.items_corregidos), 0)::bigint from public.documentos_compra d where d.empresa_id = e.id and d.created_at >= p_desde),
    (select count(*) from public.productos p where p.empresa_id = e.id and p.created_at >= p_desde),
    (select count(*) from public.ventas v where v.empresa_id = e.id and v.fecha >= p_desde),
    (select count(*) from public.ventas v where v.empresa_id = e.id and v.fecha >= p_desde and v.sincronizada_en - v.fecha > interval '2 minutes'),
    (select coalesce(sum(v.total), 0)::bigint from public.ventas v where v.empresa_id = e.id and v.fecha >= p_desde),
    (select count(distinct v.vendedor_id) from public.ventas v where v.empresa_id = e.id and v.fecha >= p_desde and v.vendedor_id is not null),
    (select count(*) from public.movimientos_stock m where m.empresa_id = e.id and m.fecha >= p_desde and m.motivo = 'conteo'),
    (select count(*) from public.movimientos_stock m where m.empresa_id = e.id and m.fecha >= p_desde and m.motivo in ('merma', 'vencido', 'consumo_propio', 'regalo')),
    (select count(*) from public.alertas a where a.empresa_id = e.id and a.created_at >= p_desde and a.tipo = 'stock_bajo'),
    (select count(*) from public.alertas a where a.empresa_id = e.id and a.created_at >= p_desde and a.tipo <> 'stock_bajo'),
    (select count(*) from public.alertas a where a.empresa_id = e.id and a.created_at >= p_desde and a.vista_en is not null),
    (select count(*) from public.eventos_uso u where u.empresa_id = e.id and u.created_at >= p_desde and u.evento = 'precio_sugerido_usado')
  from public.empresas e
  where not e.es_demo
  order by e.creada_en;
end;
$$;

revoke execute on function public.registrar_evento(text), public.metricas_uso(timestamptz), public.contar_correcciones() from public, anon;
grant execute on function public.registrar_evento(text), public.metricas_uso(timestamptz) to authenticated;
revoke execute on function public.contar_correcciones() from authenticated;
