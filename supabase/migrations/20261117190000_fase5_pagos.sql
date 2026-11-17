-- =============================================================================
-- Fase 5: suscripciones y pagos por transferencia
--
-- Cómo funciona:
--   - Cada negocio tiene un plan: "piloto" (gratis, no paga) o "mensual" ($30.000 con IVA
--     incluido, o el precio que le ponga el administrador).
--   - Con plan mensual, el negocio tiene un próximo vencimiento. El estado sale solo de la fecha:
--       al_dia → por_vencer (3 días antes) → atrasado (pasó el vencimiento)
--       → suspendido (más de 10 días de atraso: la app queda SOLO PARA MIRAR).
--     Si el cliente ya informó su pago y el administrador aún no lo revisa, NO se suspende.
--   - El dueño sube la foto o PDF del comprobante (pago "informado"). El administrador lo
--     confirma con un clic: el vencimiento pasa al mes siguiente y el negocio vuelve a estar al día.
--   - Nunca se borran datos por atraso.
--   - Los pagos se guardan aunque el negocio elimine su cuenta (respaldo que exige la ley tributaria).
-- Tarea diaria (src/app/api/cron/suscripciones): recalcula estados y deja los recordatorios en Avisos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Configuración del cobro (una sola fila): días de aviso y de gracia.
-- -----------------------------------------------------------------------------
create table public.configuracion_cobro (
  id boolean primary key default true check (id),
  dias_aviso smallint not null default 3 check (dias_aviso between 0 and 15),
  dias_gracia smallint not null default 10 check (dias_gracia between 0 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.configuracion_cobro default values;
create trigger configuracion_cobro_updated_at before update on public.configuracion_cobro
  for each row execute function public.tocar_updated_at();

alter table public.configuracion_cobro enable row level security;
revoke all on public.configuracion_cobro from anon, authenticated;
grant all on public.configuracion_cobro to service_role;
grant select on public.configuracion_cobro to authenticated;
create policy "configuracion_cobro: todos la leen" on public.configuracion_cobro
  for select to authenticated using (true);

-- -----------------------------------------------------------------------------
-- Plan de cada negocio
-- -----------------------------------------------------------------------------
alter table public.empresas
  add column precio_mensual integer not null default 30000 check (precio_mensual between 0 and 10000000),
  add column proximo_vencimiento date;

-- Hasta ahora nadie pagaba: los negocios reales quedan en el piloto gratis.
alter table public.empresas alter column plan set default 'piloto';
update public.empresas set plan = 'piloto' where not es_demo;
update public.empresas
set proximo_vencimiento = case
  when extract(day from (now() at time zone 'America/Santiago'))::int <= dia_pago
    then make_date(extract(year from (now() at time zone 'America/Santiago'))::int, extract(month from (now() at time zone 'America/Santiago'))::int, dia_pago)
  else (make_date(extract(year from (now() at time zone 'America/Santiago'))::int, extract(month from (now() at time zone 'America/Santiago'))::int, dia_pago) + interval '1 month')::date
end
where plan = 'mensual';

alter table public.empresas
  add constraint empresas_plan_valido check (plan in ('piloto', 'mensual')),
  add constraint empresas_mensual_con_vencimiento check (plan <> 'mensual' or proximo_vencimiento is not null);

-- -----------------------------------------------------------------------------
-- Pagos
-- -----------------------------------------------------------------------------
create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  -- set null: si el negocio elimina su cuenta, el pago queda como respaldo tributario.
  empresa_id uuid references public.empresas (id) on delete set null,
  rut_empresa text not null,
  nombre_negocio text not null,
  -- Mes que se paga, AAAA-MM.
  periodo text not null check (periodo ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  -- Lo que corresponde pagar (precio del plan, IVA incluido).
  monto integer not null check (monto >= 0),
  -- pendiente: reservado para pagos anotados sin comprobante (aún no se usa).
  estado text not null default 'informado' check (estado in ('pendiente', 'informado', 'confirmado', 'rechazado')),
  comprobante_url text,
  -- Lo que leyó la IA del comprobante: monto, fecha, banco… (null si no se pudo leer).
  datos_extraidos jsonb,
  informado_por uuid references public.usuarios (id) on delete set null,
  informado_en timestamptz,
  confirmado_por uuid references public.usuarios (id) on delete set null,
  fecha_confirmacion timestamptz,
  motivo_rechazo text check (motivo_rechazo is null or length(motivo_rechazo) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Un solo pago vigente por mes (si se rechaza, se puede informar de nuevo).
create unique index pagos_periodo_vigente on public.pagos (empresa_id, periodo) where estado <> 'rechazado';
create index pagos_por_revisar on public.pagos (informado_en) where estado = 'informado';
create trigger pagos_updated_at before update on public.pagos for each row execute function public.tocar_updated_at();

alter table public.pagos enable row level security;
revoke all on public.pagos from anon, authenticated;
grant all on public.pagos to service_role;
grant select on public.pagos to authenticated;

-- Los pagos los ve el dueño (no los empleados) y el administrador de RH Stock.
-- Nadie los escribe directo: se usan las funciones de más abajo.
create policy "pagos: el dueño ve los suyos, el admin todos" on public.pagos
  for select to authenticated
  using ((empresa_id = (select public.mi_empresa_id()) and (select public.mi_rol()) = 'dueno') or (select public.es_admin()));

-- Avisos de pago (recordatorio, atraso, confirmado…): solo los ve el dueño (la regla de alertas ya lo hace).
alter table public.alertas drop constraint alertas_tipo_check;
alter table public.alertas add constraint alertas_tipo_check check (tipo in ('stock_bajo', 'costo_sube', 'costo_baja', 'pago'));
-- Cada aviso de pago tiene una clave (recordatorio-2026-12…) para no repetirlo.
create unique index alertas_pago_unica on public.alertas (empresa_id, (datos ->> 'clave')) where tipo = 'pago';

-- -----------------------------------------------------------------------------
-- Funciones de ayuda
-- -----------------------------------------------------------------------------

-- Hoy en Chile.
create or replace function public.hoy_chile()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Santiago')::date;
$$;

-- "2026-12" → "diciembre 2026"
create or replace function public.nombre_periodo(p_periodo text)
returns text
language sql
immutable
set search_path = ''
as $$
  select (array['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'])
    [split_part(p_periodo, '-', 2)::int] || ' ' || split_part(p_periodo, '-', 1);
$$;

create or replace function public.fecha_texto(p_fecha date)
returns text
language sql
immutable
set search_path = ''
as $$
  select to_char(p_fecha, 'DD-MM-YYYY');
$$;

-- Estado de la suscripción de un negocio, calculado en el momento (no depende de la tarea diaria).
create or replace function public.estado_suscripcion_de(p_empresa_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when e.plan <> 'mensual' or e.proximo_vencimiento is null then 'al_dia'
    when h.hoy > e.proximo_vencimiento + c.dias_gracia
      and not exists (
        select 1 from public.pagos p
        where p.empresa_id = e.id and p.estado = 'informado' and p.periodo = to_char(e.proximo_vencimiento, 'YYYY-MM')
      ) then 'suspendido'
    when h.hoy > e.proximo_vencimiento then 'atrasado'
    when h.hoy >= e.proximo_vencimiento - c.dias_aviso then 'por_vencer'
    else 'al_dia'
  end
  from public.empresas e
  cross join public.configuracion_cobro c
  cross join (select public.hoy_chile() as hoy) h
  where e.id = p_empresa_id;
$$;

-- Guarda el estado calculado en empresas.estado_suscripcion (para listados y la tarea diaria).
create or replace function public.refrescar_estado_suscripcion(p_empresa_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.empresas e
  set estado_suscripcion = public.estado_suscripcion_de(e.id)
  where e.id = p_empresa_id and e.estado_suscripcion is distinct from public.estado_suscripcion_de(e.id);
$$;

-- ¿Puede la persona conectada modificar datos de este negocio?
-- No, si no es su negocio, si es el negocio de ejemplo o si está suspendido por atraso en el pago.
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
      and public.estado_suscripcion_de(e.id) <> 'suspendido'
  );
$$;

-- Deja un aviso de pago para el dueño (una sola vez por clave).
create or replace function public.avisar_pago(p_empresa_id uuid, p_clave text, p_mensaje text, p_periodo text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.alertas (empresa_id, tipo, mensaje, datos)
  values (p_empresa_id, 'pago', p_mensaje, jsonb_build_object('clave', p_clave, 'periodo', p_periodo))
  on conflict (empresa_id, (datos ->> 'clave')) where tipo = 'pago' do nothing;
$$;

-- Al pagar, los avisos de recordatorio y atraso de ese mes ya no hacen falta.
create or replace function public.cerrar_avisos_de_pago(p_empresa_id uuid, p_periodo text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.alertas set leida = true
  where empresa_id = p_empresa_id and tipo = 'pago' and not leida and datos ->> 'periodo' = p_periodo
    and split_part(datos ->> 'clave', '-', 1) in ('recordatorio', 'atraso', 'suspension');
$$;

-- -----------------------------------------------------------------------------
-- Para el negocio
-- -----------------------------------------------------------------------------

-- Mi plan: lo que muestra la app (franjas, "Mi plan"). La ve todo el equipo; el detalle del pago lo muestra solo al dueño.
create or replace function public.mi_suscripcion()
returns table (
  plan text,
  precio_mensual integer,
  dia_pago smallint,
  proximo_vencimiento date,
  periodo text,
  estado text,
  solo_lectura_desde date,
  pago_en_revision boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.plan,
    e.precio_mensual,
    e.dia_pago,
    e.proximo_vencimiento,
    to_char(e.proximo_vencimiento, 'YYYY-MM'),
    public.estado_suscripcion_de(e.id),
    case when e.plan = 'mensual' then e.proximo_vencimiento + c.dias_gracia + 1 end,
    exists (
      select 1 from public.pagos p
      where p.empresa_id = e.id and p.estado = 'informado' and p.periodo = to_char(e.proximo_vencimiento, 'YYYY-MM')
    )
  from public.empresas e
  cross join public.configuracion_cobro c
  where e.id = public.mi_empresa_id();
$$;

-- El dueño informa que pagó (ya subió el comprobante a su carpeta). Se puede aunque esté suspendido.
create or replace function public.informar_pago(p_comprobante_url text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa public.empresas%rowtype;
  v_periodo text;
  v_id uuid;
begin
  select * into v_empresa from public.empresas where id = public.mi_empresa_id();
  if not found or public.mi_rol() is distinct from 'dueno' or v_empresa.es_demo then
    raise exception 'Solo el dueño puede informar pagos' using errcode = '42501';
  end if;
  if v_empresa.plan <> 'mensual' then
    raise exception 'Tu plan no tiene pagos pendientes' using errcode = 'RH001';
  end if;
  if p_comprobante_url is null or p_comprobante_url not like v_empresa.id::text || '/%' then
    raise exception 'El comprobante no es de este negocio' using errcode = '42501';
  end if;

  v_periodo := to_char(v_empresa.proximo_vencimiento, 'YYYY-MM');
  begin
    insert into public.pagos (empresa_id, rut_empresa, nombre_negocio, periodo, monto, estado, comprobante_url, informado_por, informado_en)
    values (v_empresa.id, v_empresa.rut, v_empresa.nombre_fantasia, v_periodo, v_empresa.precio_mensual, 'informado', p_comprobante_url, auth.uid(), now())
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Ya informaste el pago de este mes' using errcode = 'RH002';
  end;

  perform public.cerrar_avisos_de_pago(v_empresa.id, v_periodo);
  perform public.refrescar_estado_suscripcion(v_empresa.id);
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Para el administrador de RH Stock
-- -----------------------------------------------------------------------------

create or replace function public.exigir_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador de RH Stock' using errcode = '42501';
  end if;
end;
$$;

-- Lista de negocios con el estado de pago calculado en el momento.
create or replace function public.admin_negocios()
returns table (
  id uuid,
  nombre_fantasia text,
  rut text,
  comuna text,
  es_demo boolean,
  creada_en timestamptz,
  plan text,
  precio_mensual integer,
  dia_pago smallint,
  proximo_vencimiento date,
  estado text,
  pago_en_revision boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.exigir_admin();
  return query
  select e.id, e.nombre_fantasia, e.rut, e.comuna, e.es_demo, e.creada_en, e.plan, e.precio_mensual, e.dia_pago,
    e.proximo_vencimiento, public.estado_suscripcion_de(e.id),
    exists (select 1 from public.pagos p where p.empresa_id = e.id and p.estado = 'informado')
  from public.empresas e
  order by e.creada_en desc;
end;
$$;

-- Cambia el plan de un negocio: "piloto" (gratis) o "mensual" desde un primer vencimiento.
-- El día de pago es el día de ese primer vencimiento (del 1 al 28).
create or replace function public.admin_configurar_cobro(p_empresa_id uuid, p_plan text, p_precio integer, p_primer_vencimiento date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.exigir_admin();
  if p_plan not in ('piloto', 'mensual') then
    raise exception 'Plan desconocido';
  end if;
  if p_plan = 'mensual' and (p_primer_vencimiento is null or extract(day from p_primer_vencimiento) > 28) then
    raise exception 'El día de pago debe ser entre el 1 y el 28' using errcode = 'RH003';
  end if;

  update public.empresas
  set plan = p_plan,
      precio_mensual = coalesce(p_precio, precio_mensual),
      dia_pago = case when p_plan = 'mensual' then extract(day from p_primer_vencimiento)::smallint else dia_pago end,
      proximo_vencimiento = case when p_plan = 'mensual' then p_primer_vencimiento end
  where id = p_empresa_id;
  if not found then
    raise exception 'Negocio no encontrado';
  end if;
  perform public.refrescar_estado_suscripcion(p_empresa_id);
end;
$$;

-- Confirma un pago informado: el vencimiento pasa al mes siguiente y el negocio vuelve a estar al día.
create or replace function public.confirmar_pago(p_pago_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pago public.pagos%rowtype;
  v_empresa public.empresas%rowtype;
  v_siguiente date;
begin
  perform public.exigir_admin();
  select * into v_pago from public.pagos where id = p_pago_id for update;
  if not found or v_pago.estado <> 'informado' then
    raise exception 'Este pago ya fue revisado' using errcode = 'RH004';
  end if;

  update public.pagos set estado = 'confirmado', confirmado_por = auth.uid(), fecha_confirmacion = now(), motivo_rechazo = null
  where id = p_pago_id;

  select * into v_empresa from public.empresas where id = v_pago.empresa_id for update;
  if found then
    v_siguiente := (make_date(split_part(v_pago.periodo, '-', 1)::int, split_part(v_pago.periodo, '-', 2)::int, v_empresa.dia_pago) + interval '1 month')::date;
    if v_empresa.plan = 'mensual' and (v_empresa.proximo_vencimiento is null or v_empresa.proximo_vencimiento < v_siguiente) then
      update public.empresas set proximo_vencimiento = v_siguiente where id = v_empresa.id;
    else
      v_siguiente := v_empresa.proximo_vencimiento;
    end if;
    perform public.cerrar_avisos_de_pago(v_empresa.id, v_pago.periodo);
    perform public.avisar_pago(
      v_empresa.id,
      'confirmado-' || v_pago.id,
      'Recibimos tu pago de ' || public.nombre_periodo(v_pago.periodo) || '. ¡Gracias!'
        || coalesce(' Tu próximo pago vence el ' || public.fecha_texto(v_siguiente) || '.', ''),
      v_pago.periodo
    );
    perform public.refrescar_estado_suscripcion(v_empresa.id);
  end if;
end;
$$;

-- Rechaza un pago informado (no llegó la transferencia, el monto no coincide…). El dueño puede informarlo de nuevo.
create or replace function public.rechazar_pago(p_pago_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pago public.pagos%rowtype;
  v_motivo text := nullif(trim(p_motivo), '');
begin
  perform public.exigir_admin();
  if v_motivo is null then
    raise exception 'Escribe por qué se rechaza' using errcode = 'RH005';
  end if;
  select * into v_pago from public.pagos where id = p_pago_id for update;
  if not found or v_pago.estado <> 'informado' then
    raise exception 'Este pago ya fue revisado' using errcode = 'RH004';
  end if;

  update public.pagos set estado = 'rechazado', confirmado_por = auth.uid(), fecha_confirmacion = now(), motivo_rechazo = left(v_motivo, 200)
  where id = p_pago_id;

  if v_pago.empresa_id is not null then
    perform public.avisar_pago(
      v_pago.empresa_id,
      'rechazado-' || v_pago.id,
      'No pudimos confirmar tu pago de ' || public.nombre_periodo(v_pago.periodo) || ': ' || left(v_motivo, 200)
        || '. Revisa y sube el comprobante de nuevo, o escríbenos por WhatsApp.',
      v_pago.periodo
    );
    perform public.refrescar_estado_suscripcion(v_pago.empresa_id);
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tarea diaria (la llama el servidor): estados y recordatorios.
-- -----------------------------------------------------------------------------
create or replace function public.actualizar_suscripciones()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_config public.configuracion_cobro%rowtype;
  v_hoy date := public.hoy_chile();
  v_estados int := 0;
  v_avisos int := 0;
  r record;
begin
  select * into v_config from public.configuracion_cobro;

  update public.empresas e
  set estado_suscripcion = public.estado_suscripcion_de(e.id)
  where e.estado_suscripcion is distinct from public.estado_suscripcion_de(e.id);
  get diagnostics v_estados = row_count;

  for r in
    select e.id, e.precio_mensual, e.proximo_vencimiento as venc, to_char(e.proximo_vencimiento, 'YYYY-MM') as periodo,
      public.estado_suscripcion_de(e.id) as estado
    from public.empresas e
    where e.plan = 'mensual' and not e.es_demo
      and v_hoy >= e.proximo_vencimiento - v_config.dias_aviso
      and not exists (
        select 1 from public.pagos p
        where p.empresa_id = e.id and p.periodo = to_char(e.proximo_vencimiento, 'YYYY-MM') and p.estado in ('informado', 'confirmado')
      )
  loop
    if r.estado = 'por_vencer' then
      perform public.avisar_pago(r.id, 'recordatorio-' || r.periodo,
        'Tu pago de ' || public.pesos(r.precio_mensual) || ' de ' || public.nombre_periodo(r.periodo)
          || ' vence el ' || public.fecha_texto(r.venc) || '.', r.periodo);
    elsif r.estado = 'atrasado' then
      perform public.avisar_pago(r.id, 'atraso-' || r.periodo,
        'Tu pago de ' || public.nombre_periodo(r.periodo) || ' está atrasado. Si no lo recibimos, desde el '
          || public.fecha_texto(r.venc + v_config.dias_gracia + 1) || ' la app quedará solo para mirar.', r.periodo);
    elsif r.estado = 'suspendido' then
      perform public.avisar_pago(r.id, 'suspension-' || r.periodo,
        'Tu cuenta quedó solo para mirar porque no recibimos el pago de ' || public.nombre_periodo(r.periodo)
          || '. Paga y sube el comprobante para volver a usarla. Tus datos están seguros.', r.periodo);
    else
      continue;
    end if;
    -- El aviso nuevo reemplaza a los anteriores del mismo mes (recordatorio → atraso → solo para mirar).
    update public.alertas set leida = true
    where empresa_id = r.id and tipo = 'pago' and not leida and datos ->> 'periodo' = r.periodo
      and split_part(datos ->> 'clave', '-', 1) in ('recordatorio', 'atraso', 'suspension')
      and split_part(datos ->> 'clave', '-', 1) <> case r.estado when 'por_vencer' then 'recordatorio' when 'atrasado' then 'atraso' else 'suspension' end;
    v_avisos := v_avisos + 1;
  end loop;

  return jsonb_build_object('estados_cambiados', v_estados, 'negocios_con_pago_pendiente', v_avisos);
end;
$$;

-- -----------------------------------------------------------------------------
-- Métricas del piloto: los avisos de pago no cuentan como avisos de stock o costo.
-- -----------------------------------------------------------------------------
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
    (select count(*) from public.alertas a where a.empresa_id = e.id and a.created_at >= p_desde and a.tipo in ('costo_sube', 'costo_baja')),
    (select count(*) from public.alertas a where a.empresa_id = e.id and a.created_at >= p_desde and a.tipo <> 'pago' and a.vista_en is not null),
    (select count(*) from public.eventos_uso u where u.empresa_id = e.id and u.created_at >= p_desde and u.evento = 'precio_sugerido_usado')
  from public.empresas e
  where not e.es_demo
  order by e.creada_en;
end;
$$;

-- -----------------------------------------------------------------------------
-- Comprobantes: espacio privado "comprobantes", carpeta por negocio. Solo el dueño sube
-- (aunque esté suspendido, para poder pagar) y solo el dueño y el administrador los ven.
-- No se borran al eliminar la cuenta: son respaldo de pagos.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.soy_dueno_de_negocio_real()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.usuarios u join public.empresas e on e.id = u.empresa_id
    where u.id = (select auth.uid()) and u.rol = 'dueno' and not e.es_demo
  );
$$;

create policy "comprobantes: el dueño sube a su carpeta" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1] = (select public.mi_empresa_id())::text
    and (select public.soy_dueno_de_negocio_real())
  );

create policy "comprobantes: el dueño ve los suyos, el admin todos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'comprobantes'
    and (
      ((storage.foldername(name))[1] = (select public.mi_empresa_id())::text and (select public.mi_rol()) = 'dueno')
      or (select public.es_admin())
    )
  );

-- -----------------------------------------------------------------------------
-- Permisos de las funciones
-- -----------------------------------------------------------------------------
revoke execute on function
  public.hoy_chile(), public.nombre_periodo(text), public.fecha_texto(date),
  public.estado_suscripcion_de(uuid), public.refrescar_estado_suscripcion(uuid),
  public.avisar_pago(uuid, text, text, text), public.cerrar_avisos_de_pago(uuid, text),
  public.mi_suscripcion(), public.informar_pago(text), public.exigir_admin(), public.admin_negocios(),
  public.admin_configurar_cobro(uuid, text, integer, date), public.confirmar_pago(uuid), public.rechazar_pago(uuid, text),
  public.actualizar_suscripciones(), public.soy_dueno_de_negocio_real()
from public, anon;

grant execute on function
  public.mi_suscripcion(), public.informar_pago(text), public.admin_negocios(),
  public.admin_configurar_cobro(uuid, text, integer, date), public.confirmar_pago(uuid), public.rechazar_pago(uuid, text),
  public.soy_dueno_de_negocio_real(), public.hoy_chile()
to authenticated;

grant execute on function public.actualizar_suscripciones(), public.refrescar_estado_suscripcion(uuid) to service_role;
