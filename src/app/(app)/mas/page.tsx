import type { Metadata } from "next";
import { cerrarSesion } from "@/app/acciones-sesion";
import { Boton, BotonEnlace } from "@/components/ui/Boton";
import { Pantalla } from "@/components/ui/Pantalla";
import { exigirSesionDeNegocio } from "@/lib/sesion";

export const metadata: Metadata = { title: "Más" };

const NOMBRE_ROL = { dueno: "Dueño", empleado: "Empleado", admin: "Administrador" } as const;

export default async function PaginaMas() {
  const { usuario, empresa } = await exigirSesionDeNegocio();

  return (
    <Pantalla titulo="Más" volverA="/inicio">
      <div className="rounded-2xl bg-fondo p-4 shadow-sm">
        <p className="text-xl font-semibold text-texto">{usuario.nombre}</p>
        <p className="text-lg text-texto-suave">
          {NOMBRE_ROL[usuario.rol]} de {empresa.nombre}
        </p>
      </div>

      {/* Ajustes, pagos, vendedores y exportar se suman aquí en las próximas fases. */}
      <nav aria-label="Otras opciones" className="mt-6 space-y-3">
        <BotonEnlace href="/privacidad" variante="suave" icono="🔒">
          Política de privacidad
        </BotonEnlace>
        <BotonEnlace href="/terminos" variante="suave" icono="📄">
          Términos y condiciones
        </BotonEnlace>
      </nav>

      <form action={cerrarSesion} className="mt-10">
        <Boton type="submit" variante="secundario" icono="🚪">
          Cerrar sesión
        </Boton>
      </form>
    </Pantalla>
  );
}
