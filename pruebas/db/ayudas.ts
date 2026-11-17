// Ayudas compartidas por las pruebas de base de datos: crean negocios y personas de prueba
// en el Supabase local y los borran al final.

import { randomBytes, randomInt } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { correoInterno, VERSION_LEGAL } from "@/lib/cuentas";
import { calcularDv } from "@/lib/rut";
import type { Database } from "@/lib/supabase/tipos-db";

export type Cliente = SupabaseClient<Database>;

export const url = () => process.env.SUPABASE_PRUEBAS_URL!;
export const admin = () =>
  createClient<Database>(url(), process.env.SUPABASE_PRUEBAS_SECRETA!, { auth: { persistSession: false, autoRefreshToken: false } });

/** RUT válido al azar (para no chocar con otras pruebas ni con el demo). */
export function rutAlAzar() {
  const numero = String(randomInt(30_000_000, 99_999_999));
  return `${numero}-${calcularDv(numero)}`;
}

const creados = { usuarios: [] as string[], empresas: [] as string[] };

export type Persona = { id: string; rut: string; clave: string; cliente: Cliente };

async function crearCuenta(): Promise<{ id: string; rut: string; clave: string }> {
  const rut = rutAlAzar();
  const clave = randomBytes(12).toString("base64url");
  const { data, error } = await admin().auth.admin.createUser({ email: correoInterno(rut), password: clave, email_confirm: true });
  if (error) throw error;
  creados.usuarios.push(data.user.id);
  return { id: data.user.id, rut, clave };
}

async function conectar(cuenta: { id: string; rut: string; clave: string }): Promise<Persona> {
  const cliente = createClient<Database>(url(), process.env.SUPABASE_PRUEBAS_ANON!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await cliente.auth.signInWithPassword({ email: correoInterno(cuenta.rut), password: cuenta.clave });
  if (error) throw error;
  return { ...cuenta, cliente };
}

/** Crea un negocio completo (dueño, consentimientos y categorías) como lo hace el registro. */
export async function crearNegocio(nombre: string, { demo = false } = {}) {
  const cuenta = await crearCuenta();
  const { data: empresaId, error } = await admin().rpc("registrar_negocio", {
    p_usuario_id: cuenta.id,
    p_rut_usuario: cuenta.rut,
    p_nombre: `Dueño de ${nombre}`,
    p_correo: `${cuenta.rut}@prueba.cl`,
    p_rut_empresa: rutAlAzar(),
    p_nombre_negocio: nombre,
    p_comuna: "Puente Alto",
    p_version_legal: VERSION_LEGAL,
    p_ip: "127.0.0.1",
  });
  if (error) throw error;
  creados.empresas.push(empresaId);
  if (demo) await admin().from("empresas").update({ es_demo: true }).eq("id", empresaId);
  await admin().rpc("crear_vendedor", { p_empresa_id: empresaId, p_nombre: `Vendedor de ${nombre}`, p_pin: "1234" });
  return { empresaId, dueno: await conectar(cuenta) };
}

export async function crearPersona(rol: "empleado" | "admin", empresaId: string | null) {
  const cuenta = await crearCuenta();
  const { error } = await admin()
    .from("usuarios")
    .insert({ id: cuenta.id, empresa_id: empresaId, rut: cuenta.rut, nombre: `${rol} de prueba`, correo: `${cuenta.rut}@prueba.cl`, rol });
  if (error) throw error;
  return conectar(cuenta);
}

export function clienteAnonimo(): Cliente {
  return createClient<Database>(url(), process.env.SUPABASE_PRUEBAS_ANON!, { auth: { persistSession: false } });
}

/** Borra todo lo que crearon las pruebas. */
export async function limpiar() {
  for (const id of creados.usuarios) await admin().auth.admin.deleteUser(id);
  if (creados.empresas.length) await admin().from("empresas").delete().in("id", creados.empresas);
  creados.usuarios.length = 0;
  creados.empresas.length = 0;
}
