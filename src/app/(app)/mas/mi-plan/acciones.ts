"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { leerComprobante, type ArchivoComprobante } from "@/lib/lector-comprobantes/leer";
import { MENSAJES_COMPROBANTE } from "@/lib/lector-comprobantes/esquema";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoComprobante = { error?: string };

const TIPOS: Record<string, { tipo: ArchivoComprobante["tipo"]; extension: string }> = {
  "image/jpeg": { tipo: "image/jpeg", extension: "jpg" },
  "image/png": { tipo: "image/png", extension: "png" },
  "image/webp": { tipo: "image/webp", extension: "webp" },
  "application/pdf": { tipo: "application/pdf", extension: "pdf" },
};
const MAXIMO_BYTES = 4 * 1024 * 1024;

/** El dueño sube el comprobante de su transferencia: se lee con la IA y queda "en revisión" para José. */
export async function informarPago(_estado: EstadoComprobante, formData: FormData): Promise<EstadoComprobante> {
  const { empresa, usuario } = await exigirSesionDeNegocio();
  if (usuario.rol !== "dueno") return { error: "Solo el dueño del negocio puede informar pagos." };
  if (empresa.esDemo) return { error: "En el negocio de ejemplo no se suben comprobantes. Crea tu cuenta para usarlo de verdad." };
  if (empresa.suscripcion.plan !== "mensual") return { error: "Estás en el piloto gratis: no tienes nada que pagar." };

  const archivo = formData.get("comprobante");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Primero saca una foto o elige el comprobante." };
  const tipo = TIPOS[archivo.type];
  if (!tipo) return { error: "Ese archivo no sirve. Sube una foto, una captura de pantalla o el PDF del banco." };
  if (archivo.size > MAXIMO_BYTES) return { error: "El archivo es muy pesado. Prueba con una captura de pantalla." };

  const datos = Buffer.from(await archivo.arrayBuffer());
  const resultado = await leerComprobante({ datos, tipo: tipo.tipo });
  // Foto mala: se pide otra. Si la IA no pudo leerlo por otro motivo, se recibe igual y José lo revisa mirándolo.
  if (!resultado.ok && resultado.motivo !== "formato") return { error: MENSAJES_COMPROBANTE[resultado.motivo] };

  const supabase = await crearClienteServidor();
  const ruta = `${empresa.id}/${randomUUID()}.${tipo.extension}`;
  const { error: errorSubida } = await supabase.storage.from("comprobantes").upload(ruta, datos, { contentType: tipo.tipo });
  if (errorSubida) {
    console.error("informarPago: no se pudo guardar el comprobante", errorSubida);
    return { error: "No pudimos guardar el comprobante. Revisa tu internet e intenta de nuevo." };
  }

  const { data: pagoId, error } = await supabase.rpc("informar_pago", { p_comprobante_url: ruta });
  if (error || !pagoId) {
    console.error("informarPago:", error);
    // El archivo queda sin usar: lo borra el servidor (el dueño no puede borrar comprobantes).
    await crearClienteAdmin().storage.from("comprobantes").remove([ruta]);
    if (error?.code === "RH002") return { error: "Ya nos enviaste el comprobante de este mes. Lo estamos revisando." };
    if (error?.code === "RH001") return { error: "Estás en el piloto gratis: no tienes nada que pagar." };
    return { error: "No pudimos guardar el pago. Intenta de nuevo o escríbenos por WhatsApp." };
  }

  // Lo leído lo guarda el servidor (la app no puede escribir en la tabla de pagos).
  if (resultado.ok) {
    await crearClienteAdmin().from("pagos").update({ datos_extraidos: resultado.lectura }).eq("id", pagoId).eq("empresa_id", empresa.id);
  }

  revalidatePath("/", "layout");
  redirect("/mas/mi-plan?listo=informado");
}
