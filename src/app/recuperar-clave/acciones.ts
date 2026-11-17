"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { SITIO_URL } from "@/lib/config";
import { enviarCorreo } from "@/lib/correo";
import { correoInterno, RUT_DEMO } from "@/lib/cuentas";
import { correoRecuperarClave } from "@/lib/plantillas-correo";
import { normalizarRut } from "@/lib/rut";
import { crearClienteAdmin } from "@/lib/supabase/admin";

export type EstadoRecuperar = { enviado?: boolean; error?: string };

const MAXIMO_POR_HORA = 3;

/**
 * "Olvidé mi clave": envía al correo registrado un enlace (1 hora) para elegir una clave nueva.
 * Siempre responde lo mismo, exista o no el RUT, para no revelar quién tiene cuenta.
 * Máximo 3 pedidos por hora por RUT.
 */
export async function pedirEnlaceClave(_estado: EstadoRecuperar, formData: FormData): Promise<EstadoRecuperar> {
  const rut = normalizarRut(z.string().catch("").parse(formData.get("rut")));
  if (!rut) return { error: "Ese RUT no es válido. Revisa los números y el dígito final." };
  if (rut === RUT_DEMO) return { enviado: true };

  const admin = crearClienteAdmin();
  const unaHora = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await admin.from("recuperaciones_clave").select("id", { count: "exact", head: true }).eq("rut", rut).gte("created_at", unaHora);
  if ((count ?? 0) >= MAXIMO_POR_HORA) return { enviado: true };
  await admin.from("recuperaciones_clave").insert({ rut });

  const { data: persona } = await admin.from("usuarios").select("nombre, correo").eq("rut", rut).maybeSingle();
  if (!persona) return { enviado: true };

  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: correoInterno(rut) });
  if (error || !data.properties?.hashed_token) {
    console.error("pedirEnlaceClave: no se pudo generar el enlace", error);
    return { error: "No pudimos enviar el correo ahora. Intenta en unos minutos o escríbenos por WhatsApp." };
  }
  // El enlace usa la dirección pública de la app (o la de esta visita, en pruebas).
  const host = (await headers()).get("host");
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || (host ? `http://${host}` : SITIO_URL);
  const enlace = `${sitio}/auth/confirmar?token_hash=${data.properties.hashed_token}&type=recovery`;

  const resultado = await enviarCorreo({ para: persona.correo, ...correoRecuperarClave({ nombre: persona.nombre.split(" ")[0] ?? persona.nombre, enlace, sitio }) });
  if (!resultado.ok && resultado.motivo !== "sin_configurar") {
    return { error: "No pudimos enviar el correo ahora. Intenta en unos minutos o escríbenos por WhatsApp." };
  }
  return { enviado: true };
}
