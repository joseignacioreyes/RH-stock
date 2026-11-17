"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { precioSugerido } from "@/lib/asociar";
import { formatearPesos, leerNumero } from "@/lib/formato";
import { confirmarBoleta, descartarBoleta, type DatosConfirmacion } from "../acciones";

export type ItemInicial = {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  productoId: string | null;
  motivo: "aprendido" | "parecido" | null;
  nombreNuevo: string;
};

type Producto = { id: string; nombre: string; unidad: string; categoria: string };
type Categoria = { id: string; nombre: string; icono: string; margen: number };

type Props = {
  documentoId: string;
  esDemo: boolean;
  imagenUrl: string | null;
  leidaPorIA: boolean;
  datos: {
    tipo: "boleta" | "factura";
    proveedorNombre: string;
    proveedorRut: string | null;
    numero: string;
    fecha: string;
    total: number | null;
    neto: number | null;
    iva: number | null;
  };
  items: ItemInicial[];
  productos: Producto[];
  categorias: Categoria[];
};

type ItemEstado = {
  descripcion: string;
  cantidad: string;
  precio: string;
  productoId: string; // "" = sin elegir, "nuevo" = producto nuevo
  motivo: ItemInicial["motivo"];
  nuevo: { nombre: string; categoriaId: string; precioVenta: string; precioTocado: boolean };
  omitido: boolean;
};

type Paso = { tipo: "datos" } | { tipo: "item"; i: number } | { tipo: "nuevo"; i: number } | { tipo: "resumen" };

const numeroATexto = (n: number) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(n);
const NUEVO = "nuevo";

function itemVacio(): ItemEstado {
  return { descripcion: "", cantidad: "", precio: "", productoId: "", motivo: null, nuevo: { nombre: "", categoriaId: "", precioVenta: "", precioTocado: false }, omitido: false };
}

export function ConfirmarBoleta({ documentoId, esDemo, imagenUrl, leidaPorIA, datos: datosIniciales, items: itemsIniciales, productos, categorias }: Props) {
  const [datos, setDatos] = useState({
    proveedor: datosIniciales.proveedorNombre,
    fecha: datosIniciales.fecha,
    total: datosIniciales.total != null ? numeroATexto(datosIniciales.total) : "",
  });
  const [items, setItems] = useState<ItemEstado[]>(() =>
    itemsIniciales.map((item) => ({
      descripcion: item.descripcion,
      cantidad: numeroATexto(item.cantidad),
      precio: numeroATexto(item.precioUnitario),
      productoId: item.productoId ?? NUEVO,
      motivo: item.motivo,
      nuevo: { nombre: item.nombreNuevo, categoriaId: "", precioVenta: "", precioTocado: false },
      omitido: false,
    })),
  );
  const [paso, setPaso] = useState<Paso>({ tipo: "datos" });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);
  const [guardando, iniciar] = useTransition();

  const ir = (nuevo: Paso) => {
    setErrores({});
    setPaso(nuevo);
    window.scrollTo({ top: 0 });
  };
  const cambiarItem = (i: number, cambio: Partial<ItemEstado>) => setItems((lista) => lista.map((item, j) => (j === i ? { ...item, ...cambio } : item)));
  const siguienteDespuesDe = (i: number) => (i + 1 < items.length ? ir({ tipo: "item", i: i + 1 }) : ir({ tipo: "resumen" }));

  // ---------------------------------------------------------------- pasos

  const seguirDatos = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevos: Record<string, string> = {};
    if (!datos.proveedor.trim()) nuevos.proveedor = "Escribe a quién le compraste.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) nuevos.fecha = "Elige la fecha de la boleta.";
    if (datos.total && leerNumero(datos.total) === null) nuevos.total = "Escribe el total con números, por ejemplo 66.780.";
    if (Object.keys(nuevos).length) return setErrores(nuevos);
    if (items.length === 0) {
      setItems([itemVacio()]);
      return ir({ tipo: "item", i: 0 });
    }
    ir({ tipo: "item", i: 0 });
  };

  const seguirItem = (i: number) => (e: React.FormEvent) => {
    e.preventDefault();
    const item = items[i];
    const nuevos: Record<string, string> = {};
    if (!item.productoId) nuevos.producto = "Elige qué producto es, o “Es un producto nuevo”.";
    const cantidad = leerNumero(item.cantidad);
    if (cantidad === null || cantidad <= 0) nuevos.cantidad = "Escribe cuántas llegaron, por ejemplo 10 o 2,5.";
    const precio = leerNumero(item.precio);
    if (precio === null || precio < 0) nuevos.precio = "Escribe el precio con números, por ejemplo 1.150.";
    if (Object.keys(nuevos).length) return setErrores(nuevos);
    cambiarItem(i, { omitido: false });
    if (item.productoId === NUEVO) return ir({ tipo: "nuevo", i });
    siguienteDespuesDe(i);
  };

  const seguirNuevo = (i: number) => (e: React.FormEvent) => {
    e.preventDefault();
    const { nuevo } = items[i];
    const nuevos: Record<string, string> = {};
    if (!nuevo.nombre.trim()) nuevos.nombre = "Escribe el nombre del producto.";
    if (!nuevo.categoriaId) nuevos.categoria = "Elige una categoría.";
    const precioVenta = leerNumero(nuevo.precioVenta);
    if (precioVenta === null || precioVenta < 0 || !Number.isInteger(precioVenta)) nuevos.precioVenta = "Escribe a cuánto lo vas a vender, por ejemplo 1.490.";
    if (Object.keys(nuevos).length) return setErrores(nuevos);
    siguienteDespuesDe(i);
  };

  const elegirCategoria = (i: number, categoriaId: string) => {
    const item = items[i];
    const margen = categorias.find((c) => c.id === categoriaId)?.margen ?? 25;
    const sugerido = precioSugerido(leerNumero(item.precio) ?? 0, margen);
    cambiarItem(i, {
      nuevo: { ...item.nuevo, categoriaId, precioVenta: item.nuevo.precioTocado || !sugerido ? item.nuevo.precioVenta : numeroATexto(sugerido) },
    });
  };

  const incluidos = items.map((item, i) => ({ item, i })).filter(({ item }) => !item.omitido);
  const sumaItems = incluidos.reduce((suma, { item }) => suma + Math.round((leerNumero(item.cantidad) ?? 0) * (leerNumero(item.precio) ?? 0)), 0);
  const totalLeido = leerNumero(datos.total);

  const guardar = () =>
    iniciar(async () => {
      setError(null);
      const unidadDe = (cantidad: number) => (Number.isInteger(cantidad) ? "unidad" : "kg");
      const payload: DatosConfirmacion = {
        tipo: datosIniciales.tipo,
        numero: datosIniciales.numero || null,
        fecha: datos.fecha,
        proveedor_nombre: datos.proveedor.trim() || null,
        proveedor_rut: datosIniciales.proveedorRut,
        neto: datosIniciales.neto,
        iva: datosIniciales.iva,
        total: totalLeido !== null ? Math.round(totalLeido) : sumaItems,
        items: incluidos.map(({ item }) => {
          const cantidad = leerNumero(item.cantidad) ?? 0;
          const precio = leerNumero(item.precio) ?? 0;
          const esNuevo = item.productoId === NUEVO;
          return {
            descripcion: item.descripcion || (esNuevo ? item.nuevo.nombre : (productos.find((p) => p.id === item.productoId)?.nombre ?? "")),
            cantidad,
            precio_unitario: precio,
            total: Math.round(cantidad * precio),
            producto_id: esNuevo ? null : item.productoId,
            nuevo: esNuevo
              ? {
                  nombre: item.nuevo.nombre.trim(),
                  categoria_id: item.nuevo.categoriaId || null,
                  unidad: unidadDe(cantidad),
                  precio_venta: Math.round(leerNumero(item.nuevo.precioVenta) ?? 0),
                }
              : null,
          };
        }),
      };
      const resultado = await confirmarBoleta(documentoId, payload);
      if (resultado?.error) setError(resultado.error);
    });

  // ---------------------------------------------------------------- vista

  const encabezado = (texto: string, volver: () => void, conVolverEnlace = false) => (
    <>
      {conVolverEnlace ? (
        <Link href="/subir-boleta" className="-ml-2 inline-flex min-h-12 items-center gap-2 rounded-xl px-2 text-lg font-semibold text-marca hover:bg-marca-claro">
          <span aria-hidden="true" className="text-2xl leading-none">
            ←
          </span>
          Volver
        </Link>
      ) : (
        <button type="button" onClick={volver} className="-ml-2 inline-flex min-h-12 items-center gap-2 rounded-xl px-2 text-lg font-semibold text-marca hover:bg-marca-claro">
          <span aria-hidden="true" className="text-2xl leading-none">
            ←
          </span>
          Volver
        </button>
      )}
      <p className="mt-4 text-lg font-semibold text-marca">{texto}</p>
    </>
  );

  const verFoto = imagenUrl && (
    <a href={imagenUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-2 text-lg font-semibold text-marca underline">
      <span aria-hidden="true">🧾</span> Ver la foto
    </a>
  );

  let contenido: React.ReactNode;

  if (paso.tipo === "datos") {
    contenido = (
      <>
        {encabezado("Revisar boleta · Paso 1", () => {}, true)}
        <h1 className="mt-1 text-3xl leading-tight font-bold text-texto">{leidaPorIA ? "¿Está bien lo que leímos?" : "Datos de la compra"}</h1>
        {!leidaPorIA && imagenUrl && (
          <div className="mt-4">
            <Aviso tipo="info">No pudimos leer la boleta sola. Mírala y escribe los datos tú: es rápido.</Aviso>
          </div>
        )}
        {imagenUrl && (
          <a href={imagenUrl} target="_blank" rel="noopener noreferrer" className="mt-5 block overflow-hidden rounded-2xl bg-fondo shadow-sm ring-1 ring-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado que vence; no pasa por el optimizador de imágenes */}
            <img src={imagenUrl} alt="Foto de la boleta" className="mx-auto max-h-56 object-contain" />
            <span className="block py-2 text-center text-base font-semibold text-marca">🔍 Tocar para ver grande</span>
          </a>
        )}
        <form onSubmit={seguirDatos} noValidate className="mt-6 space-y-6">
          <Campo etiqueta="¿A quién le compraste?" ayuda="El nombre del mayorista o proveedor." value={datos.proveedor} onChange={(e) => setDatos({ ...datos, proveedor: e.target.value })} error={errores.proveedor} />
          <Campo etiqueta="Fecha de la boleta" type="date" value={datos.fecha} onChange={(e) => setDatos({ ...datos, fecha: e.target.value })} error={errores.fecha} />
          <Campo etiqueta="Total de la boleta ($)" inputMode="numeric" value={datos.total} onChange={(e) => setDatos({ ...datos, total: e.target.value })} error={errores.total} />
          <Boton type="submit" icono="➡️">
            {items.length ? `Revisar los ${items.length} productos` : "Agregar los productos"}
          </Boton>
        </form>
      </>
    );
  } else if (paso.tipo === "item") {
    const { i } = paso;
    const item = items[i];
    const total = Math.round((leerNumero(item.cantidad) ?? 0) * (leerNumero(item.precio) ?? 0));
    contenido = (
      <>
        {encabezado(`Producto ${i + 1} de ${items.length}`, () => (i === 0 ? ir({ tipo: "datos" }) : ir({ tipo: "item", i: i - 1 })))}
        <div className="mt-2 h-2 rounded-full bg-gray-300" aria-hidden="true">
          <div className="h-2 rounded-full bg-marca" style={{ width: `${(i / items.length) * 100}%` }} />
        </div>
        {item.descripcion ? (
          <div className="mt-5 rounded-2xl bg-fondo p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-base text-texto-suave">En la boleta dice:</p>
            <p className="font-mono text-xl font-semibold text-texto">{item.descripcion}</p>
            {verFoto}
          </div>
        ) : (
          <h1 className="mt-3 text-3xl leading-tight font-bold text-texto">¿Qué compraste?</h1>
        )}

        <form onSubmit={seguirItem(i)} noValidate className="mt-6 space-y-6">
          <div>
            <label htmlFor="producto" className="block text-lg font-semibold text-texto">
              ¿Qué producto es?
            </label>
            {item.motivo === "aprendido" && item.productoId !== NUEVO && (
              <p className="text-base font-semibold text-ok">✨ La app lo reconoció de compras anteriores</p>
            )}
            {item.motivo === "parecido" && item.productoId !== NUEVO && <p className="text-base text-texto-suave">💡 Parece ser este. Revísalo.</p>}
            <select
              id="producto"
              value={item.productoId}
              onChange={(e) => cambiarItem(i, { productoId: e.target.value, motivo: null })}
              aria-invalid={Boolean(errores.producto)}
              className={`mt-2 block min-h-14 w-full rounded-xl border-2 bg-fondo px-4 text-xl text-texto focus:border-marca focus:outline-none ${errores.producto ? "border-falta" : "border-gray-300"}`}
            >
              <option value="">Elige…</option>
              <option value={NUEVO}>➕ Es un producto nuevo</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.categoria} {p.nombre}
                </option>
              ))}
            </select>
            {errores.producto && <p className="mt-2 text-base font-medium text-falta">⚠️ {errores.producto}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="¿Cuántas llegaron?" inputMode="decimal" value={item.cantidad} onChange={(e) => cambiarItem(i, { cantidad: e.target.value })} error={errores.cantidad} />
            <Campo etiqueta="Precio de cada una" inputMode="numeric" value={item.precio} onChange={(e) => cambiarItem(i, { precio: e.target.value })} error={errores.precio} />
          </div>
          {total > 0 && <p className="-mt-2 text-right text-lg text-texto-suave">Total de la línea: {formatearPesos(total)}</p>}
          <Boton type="submit" icono="✅">
            Está bien
          </Boton>
        </form>
        {item.descripcion && (
          <button
            type="button"
            onClick={() => {
              cambiarItem(i, { omitido: true });
              siguienteDespuesDe(i);
            }}
            className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-gray-300 bg-fondo px-4 text-lg font-semibold text-texto-suave hover:bg-fondo-suave"
          >
            <span aria-hidden="true">⏭️</span> No es mercadería (bolsa, flete…): saltar
          </button>
        )}
      </>
    );
  } else if (paso.tipo === "nuevo") {
    const { i } = paso;
    const item = items[i];
    const costo = leerNumero(item.precio) ?? 0;
    const categoria = categorias.find((c) => c.id === item.nuevo.categoriaId);
    contenido = (
      <>
        {encabezado(`Producto ${i + 1} de ${items.length} · Producto nuevo`, () => ir({ tipo: "item", i }))}
        <h1 className="mt-1 text-3xl leading-tight font-bold text-texto">Agregar a mis productos</h1>
        <form onSubmit={seguirNuevo(i)} noValidate className="mt-6 space-y-6">
          <Campo etiqueta="Nombre" ayuda="Como quieres verlo en tu lista." value={item.nuevo.nombre} onChange={(e) => cambiarItem(i, { nuevo: { ...item.nuevo, nombre: e.target.value } })} error={errores.nombre} />
          <div>
            <label htmlFor="categoria" className="block text-lg font-semibold text-texto">
              Categoría
            </label>
            <select
              id="categoria"
              value={item.nuevo.categoriaId}
              onChange={(e) => elegirCategoria(i, e.target.value)}
              aria-invalid={Boolean(errores.categoria)}
              className={`mt-2 block min-h-14 w-full rounded-xl border-2 bg-fondo px-4 text-xl text-texto focus:border-marca focus:outline-none ${errores.categoria ? "border-falta" : "border-gray-300"}`}
            >
              <option value="">Elige una…</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icono} {c.nombre}
                </option>
              ))}
            </select>
            {errores.categoria && <p className="mt-2 text-base font-medium text-falta">⚠️ {errores.categoria}</p>}
          </div>
          <Campo
            etiqueta="¿A cuánto lo vas a vender?"
            ayuda={
              categoria && costo > 0
                ? `Te costó ${formatearPesos(costo)}. Con tu margen de ${categoria.margen}% sugerimos ${formatearPesos(precioSugerido(costo, categoria.margen))}.`
                : `Te costó ${formatearPesos(costo)}.`
            }
            inputMode="numeric"
            value={item.nuevo.precioVenta}
            onChange={(e) => cambiarItem(i, { nuevo: { ...item.nuevo, precioVenta: e.target.value, precioTocado: true } })}
            error={errores.precioVenta}
          />
          <Boton type="submit" icono="✅">
            Seguir
          </Boton>
        </form>
      </>
    );
  } else {
    const nuevos = incluidos.filter(({ item }) => item.productoId === NUEVO).length;
    const diferencia = totalLeido !== null ? Math.round(totalLeido) - sumaItems : 0;
    contenido = (
      <>
        {encabezado("Último paso", () => ir({ tipo: "item", i: items.length - 1 }))}
        <h1 className="mt-1 text-3xl leading-tight font-bold text-texto">Esto se va a sumar a tu stock</h1>
        <p className="mt-2 text-lg text-texto-suave">
          {datos.proveedor} · {incluidos.length} {incluidos.length === 1 ? "producto" : "productos"}
          {nuevos > 0 ? ` (${nuevos} ${nuevos === 1 ? "nuevo" : "nuevos"})` : ""}
        </p>

        {error && (
          <div className="mt-5">
            <Aviso tipo="error">{error}</Aviso>
          </div>
        )}
        {Math.abs(diferencia) > 10 && (
          <div className="mt-5">
            <Aviso tipo="info">
              La suma de los productos ({formatearPesos(sumaItems)}) no es igual al total de la boleta ({formatearPesos(totalLeido ?? 0)}). Revisa si falta
              algún producto o si hay un descuento.
            </Aviso>
          </div>
        )}

        <ul className="mt-5 divide-y divide-gray-100 rounded-2xl bg-fondo shadow-sm">
          {incluidos.map(({ item, i }) => {
            const nombre = item.productoId === NUEVO ? item.nuevo.nombre : (productos.find((p) => p.id === item.productoId)?.nombre ?? item.descripcion);
            return (
              <li key={i}>
                <button type="button" onClick={() => ir({ tipo: "item", i })} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-fondo-suave">
                  <span className="flex-1">
                    <span className="block text-lg leading-snug font-semibold text-texto">
                      {nombre}
                      {item.productoId === NUEVO && <span className="ml-2 rounded-full bg-acento px-2 py-0.5 text-base">Nuevo</span>}
                    </span>
                    <span className="text-base text-texto-suave">
                      +{item.cantidad} × {formatearPesos(leerNumero(item.precio) ?? 0)}
                    </span>
                  </span>
                  <span className="text-lg font-semibold whitespace-nowrap">
                    {formatearPesos(Math.round((leerNumero(item.cantidad) ?? 0) * (leerNumero(item.precio) ?? 0)))}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-right font-titulo text-2xl font-bold text-texto">Total {formatearPesos(sumaItems)}</p>

        <button
          type="button"
          onClick={() => {
            setItems((lista) => [...lista, itemVacio()]);
            ir({ tipo: "item", i: items.length });
          }}
          className="mt-4 inline-flex min-h-12 items-center gap-2 text-lg font-semibold text-marca underline"
        >
          <span aria-hidden="true">➕</span> Agregar otro producto de esta boleta
        </button>

        <div className="mt-6 space-y-3">
          <Boton type="button" onClick={guardar} cargando={guardando} icono="✅" disabled={incluidos.length === 0}>
            Sumar a mi stock
          </Boton>
          {!confirmarDescarte ? (
            <Boton type="button" variante="secundario" icono="🗑️" onClick={() => setConfirmarDescarte(true)}>
              Descartar esta boleta
            </Boton>
          ) : (
            <div className="rounded-2xl border-2 border-falta bg-red-50 p-4">
              <p className="text-lg font-semibold text-texto">¿Seguro que quieres descartar esta boleta? No se sumará nada a tu stock y se borrará la foto.</p>
              <form action={descartarBoleta.bind(null, documentoId)} className="mt-3 grid grid-cols-2 gap-3">
                <button type="submit" className="min-h-14 rounded-2xl bg-falta px-3 text-lg font-semibold text-white">
                  Sí, descartar
                </button>
                <button type="button" onClick={() => setConfirmarDescarte(false)} className="min-h-14 rounded-2xl border-2 border-gray-300 bg-fondo px-3 text-lg font-semibold">
                  No, volver
                </button>
              </form>
            </div>
          )}
        </div>
        {esDemo && <p className="mt-4 text-base text-texto-suave">💡 Es un negocio de ejemplo: puedes revisar todo, pero no se guardan cambios.</p>}
      </>
    );
  }

  return <main className="mx-auto w-full max-w-xl px-4 pt-4 pb-28">{contenido}</main>;
}
