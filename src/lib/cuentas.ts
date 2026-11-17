// Reglas de las cuentas de RH Stock (sin dependencias del servidor ni del navegador).
import { z } from "zod";
import { normalizarRut } from "./rut";

/**
 * Versión de los términos y la política de privacidad que se acepta al registrarse.
 * Cambiarla cuando cambie el texto de /terminos o /privacidad.
 */
export const VERSION_LEGAL = "2026-11-borrador";

/** RUT del dueño del negocio de ejemplo (Almacén Don Pepe). Es ficticio. */
export const RUT_DEMO = "12345678-5";

/**
 * Las personas entran con RUT y clave. Supabase Auth necesita un correo, así que
 * por dentro se usa uno armado con el RUT. El correo real se guarda aparte
 * (tabla usuarios) y solo se usa para recuperar la clave.
 */
export function correoInterno(rutNormalizado: string): string {
  return `${rutNormalizado.toLowerCase()}@cuentas.rhstock.cl`;
}

const textoCorto = (mensaje: string, maximo: number) =>
  z
    .string()
    .trim()
    .min(1, mensaje)
    .max(maximo, `Escribe máximo ${maximo} letras.`);

const rut = (mensaje: string) =>
  z
    .string()
    .trim()
    .min(1, mensaje)
    .transform((valor, ctx) => {
      const normalizado = normalizarRut(valor);
      if (!normalizado) {
        ctx.addIssue({ code: "custom", message: "Ese RUT no es válido. Revisa los números y el dígito final." });
        return z.NEVER;
      }
      return normalizado;
    });

export const MINIMO_CLAVE = 8;

const clave = z
  .string()
  .min(MINIMO_CLAVE, `La clave debe tener al menos ${MINIMO_CLAVE} letras o números.`)
  .max(72, "La clave es demasiado larga.");

/** Paso 1 del registro: la persona. */
export const esquemaPaso1 = z.object({
  nombre: textoCorto("Escribe tu nombre.", 80),
  rut: rut("Escribe tu RUT."),
  correo: z.string().trim().toLowerCase().email("Ese correo no parece válido. Revisa que tenga @ y un punto."),
});

/** Paso 2 del registro: el negocio. */
export const esquemaPaso2 = z.object({
  nombreNegocio: textoCorto("Escribe el nombre de tu negocio.", 80),
  rutNegocio: rut("Escribe el RUT del negocio."),
  comuna: textoCorto("Escribe la comuna.", 60),
});

/** Paso 3 del registro: clave y aceptación de términos y privacidad (casillas separadas). */
export const esquemaPaso3 = z.object({
  clave,
  aceptaTerminos: z.literal("si", { error: "Para crear tu cuenta debes aceptar los términos y condiciones." }),
  aceptaPrivacidad: z.literal("si", { error: "Para crear tu cuenta debes aceptar la política de privacidad." }),
});

export const esquemaRegistro = esquemaPaso1.extend(esquemaPaso2.shape).extend(esquemaPaso3.shape);
export type DatosRegistro = z.infer<typeof esquemaRegistro>;

export const esquemaEntrar = z.object({
  rut: rut("Escribe tu RUT."),
  clave: z.string().min(1, "Escribe tu clave."),
});

export const esquemaNuevaClave = z
  .object({ clave, repetir: z.string() })
  .refine((datos) => datos.clave === datos.repetir, {
    message: "Las dos claves no son iguales. Escríbelas de nuevo.",
    path: ["repetir"],
  });

/** Primer mensaje de error de una validación, para mostrarlo arriba del formulario. */
export function primerError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisa los datos e intenta de nuevo.";
}

/** Errores por campo: { rut: "Ese RUT no es válido…" } */
export function erroresPorCampo(error: z.ZodError): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? "general");
    errores[campo] ??= issue.message;
  }
  return errores;
}
