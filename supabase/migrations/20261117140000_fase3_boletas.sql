-- =============================================================================
-- Fase 3: foto de la boleta
-- Proveedores, documentos de compra (boletas y facturas) con sus ítems, lo que
-- la app aprende ("ARROZ G1 1KG" de este proveedor = "Arroz grado 1 1 kg") y el
-- espacio privado donde se guardan las fotos.
--
-- El stock solo se suma cuando la persona CONFIRMA la boleta (confirmar_documento).
-- =============================================================================

create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 1 and 120),
  rut text check (rut ~ '^[0-9]{1,8}-[0-9K]$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index proveedores_nombre_unico on public.proveedores (empresa_id, lower(nombre));
create index proveedores_empresa_id_idx on public.proveedores (empresa_id);

create table public.documentos_compra (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  proveedor_id uuid references public.proveedores (id) on delete set null,
  tipo text not null default 'boleta' check (tipo in ('boleta', 'factura')),
  numero text,
  fecha date,
  neto integer check (neto >= 0),
  iva integer check (iva >= 0),
  total integer check (total >= 0),
  -- Ruta de la foto en el espacio privado "boletas" (nunca un enlace público).
  imagen_url text,
  estado text not null default 'procesando'
    check (estado in ('procesando', 'por_confirmar', 'confirmado', 'revision_manual')),
  -- Lo que leyó la IA, tal cual (respaldo para revisar errores).
  datos_extraidos jsonb,
  usuario_id uuid references public.usuarios (id) on delete set null,
  confirmado_por uuid references public.usuarios (id) on delete set null,
  confirmado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index documentos_empresa_fecha_idx on public.documentos_compra (empresa_id, created_at desc);

create table public.items_documento (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.documentos_compra (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  descripcion_original text not null,
  cantidad numeric(12, 3) not null check (cantidad > 0),
  precio_unitario numeric(12, 2) not null check (precio_unitario >= 0),
  total integer not null check (total >= 0),
  producto_id uuid references public.productos (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index items_documento_documento_idx on public.items_documento (documento_id);

create table public.alias_productos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  proveedor_id uuid references public.proveedores (id) on delete cascade,
  -- Descripción normalizada (minúsculas, sin espacios repetidos): igual que normalizarDescripcion() en la app.
  descripcion_original text not null,
  producto_id uuid not null references public.productos (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alias_unico unique nulls not distinct (empresa_id, proveedor_id, descripcion_original)
);

create trigger proveedores_updated_at before update on public.proveedores for each row execute function public.tocar_updated_at();
create trigger documentos_updated_at before update on public.documentos_compra for each row execute function public.tocar_updated_at();
create trigger items_documento_updated_at before update on public.items_documento for each row execute function public.tocar_updated_at();
create trigger alias_updated_at before update on public.alias_productos for each row execute function public.tocar_updated_at();

-- Misma regla que normalizarDescripcion() en src/lib/asociar.ts
create or replace function public.normalizar_descripcion(p_texto text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(trim(regexp_replace(coalesce(p_texto, ''), '\s+', ' ', 'g')));
$$;

-- -----------------------------------------------------------------------------
-- Permisos (RLS): todo el negocio ve sus compras; se crean y confirman con funciones.
-- -----------------------------------------------------------------------------
alter table public.proveedores enable row level security;
alter table public.documentos_compra enable row level security;
alter table public.items_documento enable row level security;
alter table public.alias_productos enable row level security;

revoke all on public.proveedores, public.documentos_compra, public.items_documento, public.alias_productos from anon, authenticated;
grant all on public.proveedores, public.documentos_compra, public.items_documento, public.alias_productos to service_role;
grant select on public.proveedores, public.documentos_compra, public.items_documento, public.alias_productos to authenticated;

create policy "proveedores: ver los de mi negocio" on public.proveedores
  for select to authenticated using (empresa_id = (select public.mi_empresa_id()));
create policy "documentos: ver los de mi negocio" on public.documentos_compra
  for select to authenticated using (empresa_id = (select public.mi_empresa_id()));
create policy "items: ver los de mi negocio" on public.items_documento
  for select to authenticated using (empresa_id = (select public.mi_empresa_id()));
create policy "alias: ver los de mi negocio" on public.alias_productos
  for select to authenticated using (empresa_id = (select public.mi_empresa_id()));

-- -----------------------------------------------------------------------------
-- Fotos: espacio privado "boletas". Cada negocio usa solo su carpeta: <empresa_id>/archivo.jpg
-- Se ven con enlaces firmados que vencen.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('boletas', 'boletas', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "boletas: subir a la carpeta de mi negocio" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'boletas'
    and (storage.foldername(name))[1] = (select public.mi_empresa_id())::text
    and (select public.puedo_modificar(public.mi_empresa_id()))
  );

create policy "boletas: ver las de mi negocio" on storage.objects
  for select to authenticated
  using (bucket_id = 'boletas' and (storage.foldername(name))[1] = (select public.mi_empresa_id())::text);

create policy "boletas: borrar las de mi negocio" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'boletas'
    and (storage.foldername(name))[1] = (select public.mi_empresa_id())::text
    and (select public.puedo_modificar(public.mi_empresa_id()))
  );

-- -----------------------------------------------------------------------------
-- Funciones que usa la app
-- -----------------------------------------------------------------------------

-- Anota una foto recién subida. La lectura con IA la guarda después el servidor.
create or replace function public.crear_documento(p_imagen_url text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa_id uuid := public.mi_empresa_id();
  v_id uuid;
begin
  if v_empresa_id is null or not public.puedo_modificar(v_empresa_id) then
    raise exception 'No tienes permiso para subir boletas' using errcode = '42501';
  end if;
  if p_imagen_url is not null and split_part(p_imagen_url, '/', 1) <> v_empresa_id::text then
    raise exception 'La foto no es de este negocio' using errcode = '42501';
  end if;

  insert into public.documentos_compra (empresa_id, imagen_url, estado, usuario_id)
  values (v_empresa_id, p_imagen_url, case when p_imagen_url is null then 'revision_manual' else 'procesando' end, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- Borra una boleta que todavía no se confirmó (por ejemplo, si la foto salió mal).
create or replace function public.descartar_documento(p_documento_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.documentos_compra%rowtype;
begin
  select * into v_doc from public.documentos_compra where id = p_documento_id;
  if not found or v_doc.empresa_id <> public.mi_empresa_id() or not public.puedo_modificar(v_doc.empresa_id) then
    raise exception 'No tienes permiso para borrar esta boleta' using errcode = '42501';
  end if;
  if v_doc.estado = 'confirmado' then
    raise exception 'Una boleta confirmada no se puede borrar';
  end if;
  delete from public.documentos_compra where id = p_documento_id;
  return v_doc.imagen_url;
end;
$$;

-- Confirma una boleta revisada: TODO o NADA.
-- Crea el proveedor y los productos nuevos, guarda los ítems, suma el stock (con su costo)
-- y aprende la asociación descripción → producto para la próxima vez.
--
-- p_datos = {
--   "tipo": "boleta"|"factura", "numero": "...", "fecha": "AAAA-MM-DD",
--   "proveedor_nombre": "...", "proveedor_rut": "12345678-5" | null,
--   "neto": 0, "iva": 0, "total": 0,
--   "items": [{ "descripcion": "...", "cantidad": 10, "precio_unitario": 1150, "total": 11500,
--               "producto_id": "..." | null,
--               "nuevo": { "nombre": "...", "categoria_id": "...", "unidad": "unidad", "precio_venta": 1490 } | null }]
-- }
create or replace function public.confirmar_documento(p_documento_id uuid, p_datos jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.documentos_compra%rowtype;
  v_empresa_id uuid;
  v_proveedor_id uuid;
  v_nombre_proveedor text := nullif(trim(p_datos ->> 'proveedor_nombre'), '');
  v_rut_proveedor text := nullif(trim(p_datos ->> 'proveedor_rut'), '');
  v_item jsonb;
  v_producto_id uuid;
  v_cantidad numeric;
  v_precio numeric;
  v_items integer := 0;
begin
  select * into v_doc from public.documentos_compra where id = p_documento_id for update;
  v_empresa_id := v_doc.empresa_id;
  if not found or v_empresa_id <> public.mi_empresa_id() or not public.puedo_modificar(v_empresa_id) then
    raise exception 'No tienes permiso para confirmar esta boleta' using errcode = '42501';
  end if;
  -- 'procesando' también se acepta: si la lectura se cortó, la persona la revisa y confirma a mano.
  if v_doc.estado = 'confirmado' then
    raise exception 'Esta boleta ya fue confirmada';
  end if;
  if jsonb_array_length(coalesce(p_datos -> 'items', '[]'::jsonb)) = 0 then
    raise exception 'La boleta no tiene productos';
  end if;

  -- Proveedor: se busca por RUT o por nombre; si no existe, se crea.
  if v_nombre_proveedor is not null then
    select id into v_proveedor_id from public.proveedores
    where empresa_id = v_empresa_id
      and ((v_rut_proveedor is not null and rut = v_rut_proveedor) or lower(nombre) = lower(v_nombre_proveedor))
    order by (rut = v_rut_proveedor) desc nulls last
    limit 1;
    if v_proveedor_id is null then
      insert into public.proveedores (empresa_id, nombre, rut)
      values (v_empresa_id, v_nombre_proveedor, v_rut_proveedor)
      returning id into v_proveedor_id;
    elsif v_rut_proveedor is not null then
      update public.proveedores set rut = coalesce(rut, v_rut_proveedor) where id = v_proveedor_id;
    end if;
  end if;

  for v_item in select * from jsonb_array_elements(p_datos -> 'items')
  loop
    v_cantidad := (v_item ->> 'cantidad')::numeric;
    v_precio := (v_item ->> 'precio_unitario')::numeric;
    if v_cantidad is null or v_cantidad <= 0 or v_precio is null or v_precio < 0 then
      raise exception 'Hay un producto con cantidad o precio no válidos';
    end if;

    if v_item -> 'nuevo' is not null and jsonb_typeof(v_item -> 'nuevo') = 'object' then
      if (v_item #>> '{nuevo,categoria_id}') is not null and not exists (
        select 1 from public.categorias where id = (v_item #>> '{nuevo,categoria_id}')::uuid and empresa_id = v_empresa_id
      ) then
        raise exception 'La categoría no es de este negocio' using errcode = '42501';
      end if;
      insert into public.productos (empresa_id, nombre, categoria_id, unidad, precio_venta)
      values (
        v_empresa_id,
        trim(v_item #>> '{nuevo,nombre}'),
        (v_item #>> '{nuevo,categoria_id}')::uuid,
        coalesce(v_item #>> '{nuevo,unidad}', 'unidad'),
        coalesce((v_item #>> '{nuevo,precio_venta}')::integer, 0)
      )
      returning id into v_producto_id;
    else
      v_producto_id := (v_item ->> 'producto_id')::uuid;
      if v_producto_id is null or not exists (
        select 1 from public.productos where id = v_producto_id and empresa_id = v_empresa_id
      ) then
        raise exception 'Hay un producto que no es de este negocio' using errcode = '42501';
      end if;
    end if;

    insert into public.items_documento (documento_id, empresa_id, descripcion_original, cantidad, precio_unitario, total, producto_id)
    values (
      p_documento_id, v_empresa_id, coalesce(v_item ->> 'descripcion', ''), v_cantidad, v_precio,
      coalesce((v_item ->> 'total')::integer, round(v_cantidad * v_precio)::integer), v_producto_id
    );

    insert into public.movimientos_stock (empresa_id, producto_id, tipo, cantidad, costo_unitario, referencia_id, usuario_id)
    values (v_empresa_id, v_producto_id, 'compra', v_cantidad, v_precio, p_documento_id, auth.uid());

    -- La app aprende: esta descripción de este proveedor es este producto.
    if public.normalizar_descripcion(v_item ->> 'descripcion') <> '' then
      insert into public.alias_productos (empresa_id, proveedor_id, descripcion_original, producto_id)
      values (v_empresa_id, v_proveedor_id, public.normalizar_descripcion(v_item ->> 'descripcion'), v_producto_id)
      on conflict on constraint alias_unico do update set producto_id = excluded.producto_id;
    end if;

    v_items := v_items + 1;
  end loop;

  update public.documentos_compra
  set proveedor_id = v_proveedor_id,
      tipo = coalesce(nullif(p_datos ->> 'tipo', ''), tipo),
      numero = nullif(trim(p_datos ->> 'numero'), ''),
      fecha = coalesce((nullif(p_datos ->> 'fecha', ''))::date, current_date),
      neto = (nullif(p_datos ->> 'neto', ''))::integer,
      iva = (nullif(p_datos ->> 'iva', ''))::integer,
      total = (nullif(p_datos ->> 'total', ''))::integer,
      estado = 'confirmado',
      confirmado_por = auth.uid(),
      confirmado_en = now()
  where id = p_documento_id;

  return v_items;
end;
$$;

revoke execute on function public.crear_documento(text), public.descartar_documento(uuid), public.confirmar_documento(uuid, jsonb) from public, anon;
grant execute on function public.crear_documento(text), public.descartar_documento(uuid), public.confirmar_documento(uuid, jsonb) to authenticated;
