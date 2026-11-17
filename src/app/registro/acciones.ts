"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { correoInterno, erroresPorCampo, esquemaRegistro, primerError, VERSION_LEGAL } from "@/lib/cuentas";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoRegistro = {
  error?: string;
  errores?: Record<string, string>;
  /** Paso al que hay que volver para corregir (1, 2 o 3). */
  paso?: 1 | 2 | 3;
};

const PASO_DE_CAMPO: Record<string, 1 | 2 | 3> = {
  nombre: 1,
  rut: 1,
  correo: 1,
  nombreNegocio: 2,
  rutNegocio: 2,
  comuna: 2,
};

const ERROR_GENERAL = "No pudimos crear tu cuenta. Intenta de nuevo en un rato o escríbenos por WhatsApp.";

/**
 * Crea la cuenta: primero el usuario en Supabase Auth (con el correo interno del RUT)
 * y después, todo junto, el negocio, la persona, sus consentimientos y las categorías.
 * Si algo falla a mitad de camino, se borra el usuario para no dejar cuentas a medias.
 */
export async function registrar(_estado: EstadoRegistro, formData: FormData): Promise<EstadoRegistro> {
  const validacion = esquemaRegistro.safeParse(Object.fromEntries(formData));
  if (!validacion.success) {
    const errores = erroresPorCampo(validacion.error);
    const primerCampo = Object.keys(errores)[0] ?? "";
    return { error: primerError(validacion.error), errores, paso: PASO_DE_CAMPO[primerCampo] ?? 3 };
  }
  const datos = validacion.data;
  const admin = crearClienteAdmin();

  // ¿Ya existe una cuenta con ese RUT, o un negocio con ese RUT?
  const [{ data: personaExistente }, { data: negocioExistente }] = await Promise.all([
    admin.from("usuarios").select("id").eq("rut", datos.rut).maybeSingle(),
    admin.from("empresas").select("id").eq("rut", datos.rutNegocio).maybeSingle(),
  ]);
  if (personaExistente) {
    return {
      error: "Ya existe una cuenta con tu RUT. Entra con tu clave o, si la olvidaste, escríbenos por WhatsApp.",
      errores: { rut: "Ya hay una cuenta con este RUT." },
      paso: 1,
    };
  }
  if (negocioExistente) {
    return {
      error: "Ese negocio ya está registrado. Si es tuyo, escríbenos por WhatsApp y te ayudamos.",
      errores: { rutNegocio: "Ya hay un negocio con este RUT." },
      paso: 2,
    };
  }

  const { data: creado, error: errorAuth } = await admin.auth.admin.createUser({
    email: correoInterno(datos.rut),
    password: datos.clave,
    email_confirm: true,
  });
  if (errorAuth || !creado.user) {
    if (errorAuth?.code === "email_exists") {
      return { error: "Ya existe una cuenta con tu RUT. Entra con tu clave.", errores: { rut: "Ya hay una cuenta con este RUT." }, paso: 1 };
    }
    if (errorAuth?.code === "weak_password") {
      return { error: "Esa clave es muy fácil de adivinar. Usa otra más larga.", errores: { clave: "Elige una clave más segura." }, paso: 3 };
    }
    console.error("Registro: no se pudo crear el usuario", errorAuth);
    return { error: ERROR_GENERAL };
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const { error: errorRegistro } = await admin.rpc("registrar_negocio", {
    p_usuario_id: creado.user.id,
    p_rut_usuario: datos.rut,
    p_nombre: datos.nombre,
    p_correo: datos.correo,
    p_rut_empresa: datos.rutNegocio,
    p_nombre_negocio: datos.nombreNegocio,
    p_comuna: datos.comuna,
    p_version_legal: VERSION_LEGAL,
    p_ip: ip ?? "",
  });
  if (errorRegistro) {
    console.error("Registro: no se pudo crear el negocio", errorRegistro);
    await admin.auth.admin.deleteUser(creado.user.id);
    return { error: ERROR_GENERAL };
  }

  // Deja la sesión iniciada para que entre directo.
  const supabase = await crearClienteServidor();
  const { error: errorEntrar } = await supabase.auth.signInWithPassword({ email: correoInterno(datos.rut), password: datos.clave });
  if (errorEntrar) redirect("/entrar?cuenta=creada");

  redirect("/inicio?bienvenida=1");
}
