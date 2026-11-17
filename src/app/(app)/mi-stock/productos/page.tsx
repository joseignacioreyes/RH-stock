import type { Metadata } from "next";
import { Aviso } from "@/components/ui/Aviso";
import { BotonEnlace } from "@/components/ui/Boton";
import { Pantalla } from "@/components/ui/Pantalla";
import { formatearCantidad } from "@/lib/formato";
import { esFiltro, FILTROS, filtrarProductos, obtenerProductos } from "@/lib/productos";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { ListaProductos, type FilaProducto } from "./ListaProductos";

export const metadata: Metadata = { title: "Mis productos" };

export default async function PaginaProductos({ searchParams }: PageProps<"/mi-stock/productos">) {
  const sesion = await exigirSesionDeNegocio();
  const { filtro: filtroCrudo, listo } = await searchParams;
  const filtro = esFiltro(filtroCrudo) ? filtroCrudo : null;
  const productos = filtrarProductos(await obtenerProductos(sesion), filtro);
  const esDueno = sesion.usuario.rol === "dueno";

  const filas: FilaProducto[] = productos
    .toSorted((a, b) => (a.categoria?.orden ?? 99) - (b.categoria?.orden ?? 99) || a.nombre.localeCompare(b.nombre, "es"))
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      codigoBarras: p.codigoBarras,
      categoria: p.categoria ? `${p.categoria.icono} ${p.categoria.nombre}` : "📦 Sin categoría",
      queda: formatearCantidad(p.stock, p.unidad),
      seAcaba: p.seAcaba,
      sinMovimiento: p.sinMovimiento,
      margenBajo: p.margenBajo,
    }));

  return (
    <Pantalla titulo={filtro ? FILTROS[filtro].titulo : "Mis productos"} volverA="/mi-stock">
      {listo === "quitado" && (
        <div className="mb-6">
          <Aviso tipo="exito">Listo, el producto ya no aparece en tu lista.</Aviso>
        </div>
      )}
      {filas.length === 0 ? (
        <p className="rounded-2xl bg-fondo p-6 text-center text-xl text-texto-suave shadow-sm">
          {filtro ? FILTROS[filtro].vacio : "Todavía no tienes productos."}
        </p>
      ) : (
        <ListaProductos filas={filas} conBuscador={!filtro} />
      )}

      {esDueno && !filtro && (
        <div className="mt-8">
          <BotonEnlace href="/mi-stock/productos/nuevo" icono="➕">
            Agregar producto
          </BotonEnlace>
        </div>
      )}
    </Pantalla>
  );
}
