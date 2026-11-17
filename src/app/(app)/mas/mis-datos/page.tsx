import type { Metadata } from "next";
import Link from "next/link";
import { Aviso } from "@/components/ui/Aviso";
import { Boton, clasesBoton } from "@/components/ui/Boton";
import { Pantalla } from "@/components/ui/Pantalla";
import { formatearFecha } from "@/lib/formato";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { cancelarEliminacion } from "./acciones";

export const metadata: Metadata = { title: "Mis datos" };

const MENSAJES: Record<string, { tipo: "exito" | "error"; texto: string }> = {
  solicitada: { tipo: "exito", texto: "Listo, recibimos tu solicitud. Puedes cancelarla en esta misma pantalla." },
  cancelada: { tipo: "exito", texto: "Listo, cancelaste la eliminación. Tu cuenta sigue funcionando normal." },
  permiso: { tipo: "error", texto: "Solo el dueño puede eliminar la cuenta del negocio (y no en el negocio de ejemplo)." },
  general: { tipo: "error", texto: "No pudimos hacer eso. Intenta de nuevo o escríbenos por WhatsApp." },
};

export default async function PaginaMisDatos({ searchParams }: PageProps<"/mas/mis-datos">) {
  const { usuario, empresa } = await exigirSesionDeNegocio();
  const { listo, error } = await searchParams;
  const esDueno = usuario.rol === "dueno";
  const mensaje = MENSAJES[(listo ?? error) as string];

  const supabase = await crearClienteServidor();
  const { data: pendiente } = esDueno
    ? await supabase.from("solicitudes_eliminacion").select("eliminar_desde").eq("estado", "pendiente").maybeSingle()
    : { data: null };

  return (
    <Pantalla titulo="Mis datos" volverA="/mas">
      {mensaje && (
        <div className="mb-6">
          <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>
        </div>
      )}

      {pendiente && (
        <div className="mb-8 rounded-2xl border-2 border-falta bg-red-50 p-5">
          <p className="text-xl font-semibold text-texto">
            🗑️ Tu cuenta y todos los datos de {empresa.nombre} se borrarán el {formatearFecha(pendiente.eliminar_desde)}.
          </p>
          <p className="mt-2 text-lg text-texto">Si te arrepientes, puedes cancelarlo hasta esa fecha.</p>
          <form action={cancelarEliminacion} className="mt-4">
            <Boton type="submit" variante="secundario" icono="↩️">
              No borrar mi cuenta
            </Boton>
          </form>
        </div>
      )}

      <section>
        <h2 className="text-2xl font-bold text-texto">Descargar todos mis datos</h2>
        <p className="mt-2 text-lg text-texto-suave">
          {esDueno
            ? "Un archivo con todo lo de tu negocio: productos, compras, ventas, avisos y enlaces a las fotos de tus boletas. Es tuyo y puedes llevarlo a otro servicio."
            : "Un archivo con tus datos personales guardados en RH Stock."}
        </p>
        <a href="/api/exportar/todo" download className={clasesBoton("principal", "mt-4")}>
          <span aria-hidden="true" className="text-2xl leading-none">
            ⬇️
          </span>
          Descargar mis datos
        </a>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-texto">¿Quieres corregir algo?</h2>
        <p className="mt-2 text-lg text-texto-suave">
          Puedes pedirnos corregir, bloquear o dejar de usar tus datos. Escríbenos por WhatsApp con el botón de abajo. Más detalles en la{" "}
          <Link href="/privacidad" className="font-semibold text-marca underline">
            política de privacidad
          </Link>
          .
        </p>
      </section>

      {esDueno && !pendiente && !empresa.esDemo && (
        <section className="mt-10">
          <h2 className="text-2xl font-bold text-texto">Eliminar mi cuenta</h2>
          <p className="mt-2 text-lg text-texto-suave">Se borra todo tu negocio 30 días después de pedirlo. Antes, descarga tus datos si los quieres guardar.</p>
          <Link href="/mas/mis-datos/eliminar" className="mt-4 inline-flex min-h-12 items-center gap-2 text-lg font-semibold text-falta underline">
            <span aria-hidden="true">🗑️</span> Quiero eliminar mi cuenta
          </Link>
        </section>
      )}
    </Pantalla>
  );
}
