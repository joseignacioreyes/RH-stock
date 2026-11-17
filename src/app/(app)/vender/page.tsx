import type { Metadata } from "next";
import type { ProductoCaja } from "@/lib/caja/carrito";
import { obtenerProductos } from "@/lib/productos";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { Caja } from "./Caja";

export const metadata: Metadata = { title: "Vender" };

export default async function PaginaVender() {
  const sesion = await exigirSesionDeNegocio();
  const supabase = await crearClienteServidor();
  const [productos, { data: masVendidos }, { data: vendedores }] = await Promise.all([
    obtenerProductos(sesion),
    supabase.rpc("mas_vendidos", { p_limite: 20 }),
    supabase.from("vendedores").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  const paraCaja: ProductoCaja[] = productos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    precio: p.precioVenta,
    unidad: p.unidad,
    codigoBarras: p.codigoBarras,
    icono: p.categoria?.icono ?? "📦",
  }));
  const porId = new Map(paraCaja.map((p) => [p.id, p]));
  const destacados = (masVendidos ?? []).map((m) => porId.get(m.producto_id)).filter((p): p is ProductoCaja => Boolean(p));

  return (
    <Caja
      empresaId={sesion.empresa.id}
      esDemo={sesion.empresa.esDemo}
      esDueno={sesion.usuario.rol === "dueno"}
      productos={paraCaja}
      masVendidos={
        // Si todavía hay pocas ventas, se completa la grilla con otros productos.
        destacados.length >= 12 ? destacados : [...destacados, ...paraCaja.filter((p) => !destacados.includes(p))].slice(0, 12)
      }
      vendedores={vendedores ?? []}
    />
  );
}
