// Herramientas para cuentas, para uso de José (administrador).
//
// Crear la cuenta de administrador de RH Stock:
//   npm run cuenta:admin -- --rut 11.111.111-1 --nombre "Nombre Apellido" --correo nombre@correo.cl
//
// Generar un enlace para que alguien elija una clave nueva (si la olvidó):
//   npm run cuenta:enlace-clave -- --rut 11.111.111-1
//
// El enlace sirve una sola vez y dura 1 hora. Envíalo SIEMPRE al correo registrado de la persona
// (el script lo muestra), nunca a otro lado.
//
// Los datos personales se escriben al correr el comando: no quedan guardados en el código.

import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

const correoInterno = (rut) => `${rut.toLowerCase()}@cuentas.rhstock.cl`;

function normalizarRut(rut) {
  const limpio = String(rut).replace(/[^0-9kK]/g, "").toUpperCase().replace(/^0+/, "");
  if (!/^[0-9]{6,8}[0-9K]$/.test(limpio)) return null;
  const numero = limpio.slice(0, -1);
  let suma = 0;
  let multiplicador = 2;
  for (let i = numero.length - 1; i >= 0; i--) {
    suma += Number(numero[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  const dv = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return dv === limpio.slice(-1) ? `${numero}-${dv}` : null;
}

function salir(mensaje) {
  console.error(mensaje);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || salir("Falta NEXT_PUBLIC_SUPABASE_URL en .env.local");
const claveSecreta = process.env.SUPABASE_SERVICE_ROLE_KEY || salir("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");
const sitio = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const admin = createClient(url, claveSecreta, { auth: { persistSession: false, autoRefreshToken: false } });

async function enlaceParaElegirClave(rut) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: correoInterno(rut) });
  if (error) salir(`No se pudo generar el enlace: ${error.message}`);
  return `${sitio}/auth/confirmar?token_hash=${data.properties.hashed_token}&type=recovery`;
}

async function crearAdmin({ rut, nombre, correo }) {
  if (!rut || !nombre || !correo) salir('Faltan datos. Uso: npm run cuenta:admin -- --rut 11.111.111-1 --nombre "Nombre" --correo correo@ejemplo.cl');
  const rutNormalizado = normalizarRut(rut) || salir("Ese RUT no es válido.");

  const { data: existente } = await admin.from("usuarios").select("id, rol").eq("rut", rutNormalizado).maybeSingle();
  if (existente) salir(`Ya existe una cuenta con ese RUT (rol: ${existente.rol}).`);

  // Clave al azar que nadie conoce: la persona elige la suya con el enlace.
  const { data, error } = await admin.auth.admin.createUser({
    email: correoInterno(rutNormalizado),
    password: randomBytes(24).toString("base64url"),
    email_confirm: true,
  });
  if (error) salir(`No se pudo crear la cuenta: ${error.message}`);

  const { error: errorFicha } = await admin
    .from("usuarios")
    .insert({ id: data.user.id, empresa_id: null, rut: rutNormalizado, nombre: nombre.trim(), correo: correo.trim().toLowerCase(), rol: "admin" });
  if (errorFicha) {
    await admin.auth.admin.deleteUser(data.user.id);
    salir(`No se pudo crear la cuenta: ${errorFicha.message}`);
  }

  console.log(`✓ Cuenta de administrador creada para ${nombre.trim()}.`);
  console.log("\nAbre este enlace para elegir tu clave (sirve una vez y dura 1 hora):\n");
  console.log(await enlaceParaElegirClave(rutNormalizado));
}

async function enlaceClave({ rut }) {
  const rutNormalizado = normalizarRut(rut ?? "") || salir("Escribe un RUT válido: npm run cuenta:enlace-clave -- --rut 11.111.111-1");
  const { data: usuario } = await admin.from("usuarios").select("nombre, correo").eq("rut", rutNormalizado).maybeSingle();
  if (!usuario) salir("No hay ninguna cuenta con ese RUT.");

  console.log(`Enlace para ${usuario.nombre}. Envíalo SOLO a su correo registrado: ${usuario.correo}\n`);
  console.log(await enlaceParaElegirClave(rutNormalizado));
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { rut: { type: "string" }, nombre: { type: "string" }, correo: { type: "string" } },
});

const comandos = { admin: crearAdmin, "enlace-clave": enlaceClave };
const comando = comandos[positionals[0]] ?? salir("Comando desconocido. Usa: admin o enlace-clave");
await comando(values);
