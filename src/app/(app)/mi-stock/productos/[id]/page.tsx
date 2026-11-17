import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Aviso } from "@/components/ui/Aviso";
import { BotonEnlace } from "@/components/ui/Boton";
import { Pantalla } from "@/components/ui/Pantalla";
import { formatearCantidad, formatearFecha, formatearPesos, formatearPorcentaje, nombreUnidad } from "@/lib/formato";
import { recomendarPrecio } from "@/lib/inventario";
import { usarPrecioSugerido } from "../../acciones";
import { Boton } from "@/components/ui/Boton";
import { describirMovimiento, obtenerMovimientos, obtenerProducto } from "@/lib/productos";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Producto" };

export default async function PaginaProducto({ params, searchParams }: PageProps<"/mi-stock/productos/[id]">) {
  const sesion = await exigirSesionDeNegocio();
  const { id } = await params;
  const { listo, cantidad, error, aviso: avisoId } = await searchParams;
  const producto = await obtenerProducto(sesion, id);
  if (!producto) notFound();

  const [movimientos, aviso] = await Promise.all([
    obtenerMovimientos(id),
    typeof avisoId === "string" ? obtenerAvisoDeCosto(avisoId, id) : Promise.resolve(null),
  ]);
  const esDueno = sesion.usuario.rol === "dueno";
  const unidad = nombreUnidad(producto.unidad, false);
  const recomendacion =
    esDueno && producto.costo !== null && producto.categoria
      ? recomendarPrecio(producto.costo, producto.precioVenta, producto.categoria.margenObjetivo, formatearPesos, formatearPorcentaje)
      : null;

  return (
    <Pantalla titulo={producto.nombre} volverA="/mi-stock/productos">
      {listo === "nuevo" && <Mensaje tipo="exito">Listo, agregaste {producto.nombre} a tu stock.</Mensaje>}
      {listo === "cambiado" && <Mensaje tipo="exito">Listo, se guardaron los cambios.</Mensaje>}
      {listo === "precio" && <Mensaje tipo="exito">Listo, ahora lo vendes a {formatearPesos(producto.precioVenta)}.</Mensaje>}
      {listo === "salida" && (
        <Mensaje tipo="exito">
          Listo, se descontaron {formatearCantidad(Number(cantidad), producto.unidad)} de {producto.nombre}.
        </Mensaje>
      )}
      {error && (
        <Mensaje tipo="error">
          {error === "demo"
            ? "Este es un negocio de ejemplo: puedes mirar todo, pero no se guardan cambios."
            : "No pudimos guardar. Revisa tu internet e intenta de nuevo."}
        </Mensaje>
      )}

      {aviso && (
        <div className="mb-6 rounded-2xl border-2 border-acento bg-amber-50 p-4">
          <p className="text-lg font-semibold text-texto">📈 {aviso.mensaje}</p>
          {esDueno && aviso.precioSugerido > producto.precioVenta && (
            <form action={usarPrecioSugerido.bind(null, producto.id, aviso.precioSugerido)} className="mt-3">
              <Boton type="submit" variante="secundario" icono="💲">
                Usar {formatearPesos(aviso.precioSugerido)}
              </Boton>
            </form>
          )}
        </div>
      )}

      <p className="-mt-3 text-lg text-texto-suave">
        {producto.categoria ? `${producto.categoria.icono} ${producto.categoria.nombre}` : "📦 Sin categoría"}
      </p>

      <div className={`mt-5 rounded-3xl p-6 text-center shadow-sm ${producto.seAcaba ? "bg-red-50 ring-2 ring-falta" : "bg-fondo"}`}>
        <p className="text-lg text-texto-suave">Me queda</p>
        <p className="font-titulo text-5xl font-bold text-texto">{formatearCantidad(producto.stock, producto.unidad)}</p>
        {producto.seAcaba ? (
          <p className="mt-2 text-lg font-semibold text-falta">🔴 Se está acabando (mínimo: {formatearCantidad(producto.stockMinimo, producto.unidad)})</p>
        ) : (
          producto.stockMinimo > 0 && (
            <p className="mt-2 text-lg text-texto-suave">Te avisamos cuando queden {formatearCantidad(producto.stockMinimo, producto.unidad)}</p>
          )
        )}
        {producto.sinMovimiento && <p className="mt-2 text-lg font-semibold text-texto">😴 Sin venta hace más de un mes</p>}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Dato titulo={`Lo vendo a (${unidad})`} valor={formatearPesos(producto.precioVenta)} />
        {esDueno && producto.costo !== null && <Dato titulo={`Me cuesta (${unidad})`} valor={formatearPesos(producto.costo)} />}
      </dl>

      {esDueno && producto.margen !== null && producto.costo !== null && producto.costo > 0 && (
        <div className="mt-3">
          {producto.margenBajo ? (
            <div className="rounded-2xl border-2 border-acento bg-amber-50 p-4">
              <p className="text-lg font-semibold text-texto">
                📉 Ganas {formatearPorcentaje(producto.margen)} con este producto. Tu objetivo para {producto.categoria?.nombre.toLowerCase()} es{" "}
                {formatearPorcentaje(producto.categoria?.margenObjetivo ?? 0)}.
              </p>
              {recomendacion && (
                <>
                  <p className="mt-2 text-lg text-texto">{recomendacion.frase}</p>
                  <form action={usarPrecioSugerido.bind(null, producto.id, recomendacion.precioSugerido)} className="mt-3">
                    <Boton type="submit" variante="secundario" icono="💲">
                      Usar {formatearPesos(recomendacion.precioSugerido)}
                    </Boton>
                  </form>
                </>
              )}
            </div>
          ) : (
            <Aviso tipo="exito">Ganas {formatearPorcentaje(producto.margen)} con este producto. ¡Bien!</Aviso>
          )}
        </div>
      )}

      <div className="mt-8 space-y-3">
        <BotonEnlace href={`/mi-stock/productos/${producto.id}/salida`} icono="➖">
          Descontar pérdida o regalo
        </BotonEnlace>
        {esDueno && (
          <BotonEnlace href={`/mi-stock/productos/${producto.id}/editar`} variante="secundario" icono="✏️">
            Cambiar datos
          </BotonEnlace>
        )}
      </div>

      <h2 className="mt-10 text-2xl font-bold text-texto">Lo que pasó</h2>
      {movimientos.length === 0 ? (
        <p className="mt-3 text-lg text-texto-suave">Todavía no hay movimientos.</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100 rounded-2xl bg-fondo shadow-sm">
          {movimientos.map((m) => {
            const { texto, icono } = describirMovimiento(m);
            return (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <span aria-hidden="true" className="text-2xl">
                  {icono}
                </span>
                <span className="flex-1">
                  <span className="block text-lg text-texto">{texto}</span>
                  <span className="text-base text-texto-suave">{formatearFecha(m.fecha)}</span>
                </span>
                <span className={`text-lg font-semibold whitespace-nowrap ${m.cantidad < 0 ? "text-falta" : "text-marca"}`}>
                  {m.cantidad > 0 ? "+" : "−"}
                  {formatearCantidad(Math.abs(m.cantidad), producto.unidad)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Pantalla>
  );
}

/** El aviso de costo con el que se llegó a esta ficha (para mostrar su precio sugerido). */
async function obtenerAvisoDeCosto(avisoId: string, productoId: string) {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("alertas").select("mensaje, tipo, datos, producto_id").eq("id", avisoId).maybeSingle();
  if (!data || data.producto_id !== productoId || data.tipo === "stock_bajo") return null;
  const datos = (data.datos ?? {}) as { precio_sugerido?: number };
  return { mensaje: data.mensaje, precioSugerido: data.tipo === "costo_sube" ? (datos.precio_sugerido ?? 0) : 0 };
}

function Mensaje({ tipo, children }: { tipo: "exito" | "error"; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <Aviso tipo={tipo}>{children}</Aviso>
    </div>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-fondo p-4 shadow-sm">
      <dt className="text-base text-texto-suave">{titulo}</dt>
      <dd className="font-titulo text-2xl font-bold text-texto">{valor}</dd>
    </div>
  );
}
