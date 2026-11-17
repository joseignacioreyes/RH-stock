"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { leerBoleta, type ImagenBoleta } from "@/lib/lector-boletas/leer";
import { MENSAJES_PROBLEMA } from "@/lib/lector-boletas/esquema";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoSubida = { error?: string };

const EN_DEMO = "En el negocio de ejemplo no se suben fotos. Abre la boleta de ejemplo que está lista para revisar, más abajo.";
const TIPOS: Record<string, ImagenBoleta["tipo"]> = { "image/jpeg": "image/jpeg", "image/png": "image/png", "image/webp": "image/webp" };
const MAXIMO_BYTES = 4 * 1024 * 1024;

/** Sube la foto, la lee con la IA y lleva a la pantalla de revisión. */
export async function subirBoleta(_estado: EstadoSubida, formData: FormData): Promise<EstadoSubida> {
  const { empresa } = await exigirSesionDeNegocio();
  if (empresa.esDemo) return { error: EN_DEMO };

  const foto = formData.get("foto");
  if (!(foto instanceof File) || foto.size === 0) return { error: "Primero saca o elige una foto de la boleta." };
  const tipo = TIPOS[foto.type];
  if (!tipo) return { error: "Ese archivo no es una foto. Saca una foto de la boleta con la cámara." };
  if (foto.size > MAXIMO_BYTES) return { error: "La foto es muy pesada. Intenta de nuevo con la cámara." };

  const supabase = await crearClienteServidor();
  const ruta = `${empresa.id}/${randomUUID()}.${tipo.split("/")[1]}`;
  const datos = Buffer.from(await foto.arrayBuffer());

  const { error: errorSubida } = await supabase.storage.from("boletas").upload(ruta, datos, { contentType: tipo });
  if (errorSubida) {
    console.error("subirBoleta: no se pudo guardar la foto", errorSubida);
    return { error: "No pudimos guardar la foto. Revisa tu internet e intenta de nuevo." };
  }

  const { data: documentoId, error: errorDocumento } = await supabase.rpc("crear_documento", { p_imagen_url: ruta });
  if (errorDocumento || !documentoId) {
    console.error("subirBoleta: no se pudo crear el documento", errorDocumento);
    await supabase.storage.from("boletas").remove([ruta]);
    return { error: "No pudimos guardar la boleta. Intenta de nuevo." };
  }

  const resultado = await leerBoleta({ datos, tipo });

  if (!resultado.ok && resultado.motivo !== "formato") {
    // Foto mala: se descarta para que la saquen de nuevo.
    await supabase.rpc("descartar_documento", { p_documento_id: documentoId });
    await supabase.storage.from("boletas").remove([ruta]);
    return { error: MENSAJES_PROBLEMA[resultado.motivo] };
  }

  // La lectura la guarda el servidor (la app no puede escribir esta columna directamente).
  await crearClienteAdmin()
    .from("documentos_compra")
    .update(
      resultado.ok
        ? { estado: "por_confirmar", datos_extraidos: resultado.lectura }
        : { estado: "revision_manual" }, // la IA no pudo: se ingresa a mano, con la foto a la vista
    )
    .eq("id", documentoId)
    .eq("empresa_id", empresa.id);

  revalidatePath("/subir-boleta");
  redirect(`/subir-boleta/${documentoId}`);
}

/** Ingresar una boleta a mano, sin foto (por ejemplo, si la IA no pudo leerla). */
export async function ingresarAMano(): Promise<void> {
  const { empresa } = await exigirSesionDeNegocio();
  if (empresa.esDemo) redirect("/subir-boleta?error=demo");
  const supabase = await crearClienteServidor();
  const { data: documentoId, error } = await supabase.rpc("crear_documento", { p_imagen_url: null as unknown as string });
  if (error || !documentoId) redirect("/subir-boleta?error=general");
  redirect(`/subir-boleta/${documentoId}`);
}

const esquemaConfirmacion = z.object({
  tipo: z.enum(["boleta", "factura"]),
  numero: z.string().max(40).nullable(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  proveedor_nombre: z.string().max(120).nullable(),
  proveedor_rut: z.string().regex(/^\d{1,8}-[\dK]$/).nullable(),
  neto: z.number().int().nonnegative().nullable(),
  iva: z.number().int().nonnegative().nullable(),
  total: z.number().int().nonnegative().nullable(),
  items: z
    .array(
      z.object({
        descripcion: z.string().max(200),
        cantidad: z.number().positive(),
        precio_unitario: z.number().nonnegative(),
        total: z.number().int().nonnegative(),
        producto_id: z.string().uuid().nullable(),
        nuevo: z
          .object({
            nombre: z.string().trim().min(1).max(80),
            categoria_id: z.string().uuid().nullable(),
            unidad: z.enum(["unidad", "kg", "litro", "caja"]),
            precio_venta: z.number().int().nonnegative(),
          })
          .nullable(),
      }),
    )
    .min(1),
});

export type DatosConfirmacion = z.infer<typeof esquemaConfirmacion>;

export async function confirmarBoleta(documentoId: string, datos: DatosConfirmacion): Promise<{ error?: string }> {
  const { empresa } = await exigirSesionDeNegocio();
  if (empresa.esDemo) {
    return { error: "Este es un negocio de ejemplo: puedes revisar la boleta, pero no se guardan cambios. Crea tu cuenta para usarlo de verdad." };
  }
  const validacion = esquemaConfirmacion.safeParse(datos);
  if (!validacion.success) return { error: "Falta revisar algún producto. Vuelve atrás y revísalos." };

  const supabase = await crearClienteServidor();
  const { data: cantidad, error } = await supabase.rpc("confirmar_documento", { p_documento_id: documentoId, p_datos: validacion.data });
  if (error) {
    console.error("confirmarBoleta:", error);
    return {
      error: error.message.includes("ya fue confirmada")
        ? "Esta boleta ya estaba confirmada. Su stock ya se sumó."
        : "No pudimos guardar. Revisa tu internet e intenta de nuevo.",
    };
  }

  revalidatePath("/", "layout");
  redirect(`/subir-boleta?listo=${cantidad ?? 0}`);
}

export async function descartarBoleta(documentoId: string): Promise<void> {
  const { empresa } = await exigirSesionDeNegocio();
  if (empresa.esDemo) redirect(`/subir-boleta/${documentoId}?error=demo`);
  const supabase = await crearClienteServidor();
  const { data: ruta, error } = await supabase.rpc("descartar_documento", { p_documento_id: documentoId });
  if (error) redirect(`/subir-boleta/${documentoId}?error=general`);
  if (ruta) await supabase.storage.from("boletas").remove([ruta]);
  revalidatePath("/subir-boleta");
  redirect("/subir-boleta?listo=descartada");
}
