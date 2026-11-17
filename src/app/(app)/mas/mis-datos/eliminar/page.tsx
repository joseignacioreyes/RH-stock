import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Boton, BotonEnlace } from "@/components/ui/Boton";
import { Pantalla } from "@/components/ui/Pantalla";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { solicitarEliminacion } from "../acciones";

export const metadata: Metadata = { title: "Eliminar mi cuenta" };

// Nada se borra sin preguntar (CLAUDE.md, regla 11).
export default async function PaginaEliminar() {
  const { usuario, empresa } = await exigirSesionDeNegocio();
  if (usuario.rol !== "dueno" || empresa.esDemo) redirect("/mas/mis-datos?error=permiso");

  return (
    <Pantalla titulo="¿Seguro que quieres eliminar tu cuenta?" volverA="/mas/mis-datos">
      <ul className="space-y-3 text-lg text-texto">
        <li>🗑️ Se borrarán todos los datos de {empresa.nombre}: productos, compras, ventas, fotos de boletas y las cuentas de tu equipo.</li>
        <li>📅 Se borra en <strong>30 días</strong>. Hasta entonces puedes cancelarlo.</li>
        <li>⚠️ Después de esa fecha <strong>no se puede deshacer</strong>.</li>
        <li>💾 Antes, descarga tus datos si los quieres guardar.</li>
      </ul>
      <form action={solicitarEliminacion} className="mt-8 space-y-3">
        <Boton type="submit" icono="🗑️" className="bg-falta! hover:bg-red-700! active:bg-red-700!">
          Sí, eliminar mi cuenta
        </Boton>
        <BotonEnlace href="/mas/mis-datos" variante="secundario" icono="↩️">
          No, volver
        </BotonEnlace>
      </form>
    </Pantalla>
  );
}
