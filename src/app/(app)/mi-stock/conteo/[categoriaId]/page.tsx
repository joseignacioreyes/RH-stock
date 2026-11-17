import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatearCantidad, nombreUnidad } from "@/lib/formato";
import { obtenerCategorias, obtenerProductos } from "@/lib/productos";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { ConteoPasoAPaso } from "./ConteoPasoAPaso";

export const metadata: Metadata = { title: "Contar" };

export default async function PaginaConteoCategoria({ params }: PageProps<"/mi-stock/conteo/[categoriaId]">) {
  const sesion = await exigirSesionDeNegocio();
  const { categoriaId } = await params;
  const [categorias, productos] = await Promise.all([obtenerCategorias(), obtenerProductos(sesion)]);
  const categoria = categorias.find((c) => c.id === categoriaId);
  const deLaCategoria = productos.filter((p) => p.categoria?.id === categoriaId);
  if (!categoria || deLaCategoria.length === 0) notFound();

  return (
    <ConteoPasoAPaso
      categoria={`${categoria.icono} ${categoria.nombre}`}
      productos={deLaCategoria.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        stock: p.stock,
        stockTexto: formatearCantidad(p.stock, p.unidad),
        unidad: nombreUnidad(p.unidad),
        permiteDecimales: p.unidad === "kg" || p.unidad === "litro",
      }))}
    />
  );
}
