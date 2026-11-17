import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obtenerCategorias } from "@/lib/productos";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { crearProducto } from "../../acciones";
import { FormularioProducto } from "../FormularioProducto";

export const metadata: Metadata = { title: "Agregar producto" };

export default async function PaginaNuevoProducto() {
  const { usuario } = await exigirSesionDeNegocio();
  if (usuario.rol !== "dueno") redirect("/mi-stock/productos");
  const categorias = await obtenerCategorias();

  return <FormularioProducto modo="nuevo" categorias={categorias} volverA="/mi-stock/productos" accion={crearProducto} />;
}
