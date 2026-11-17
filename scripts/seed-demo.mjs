// Crea (o vuelve a crear desde cero) el negocio de ejemplo "Almacén Don Pepe".
// Se puede correr las veces que quieras: siempre deja el demo igual.
//
//   npm run seed:demo
//
// Necesita en .env.local (o en el entorno): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y DEMO_CLAVE.
// Todo es inventado: ningún RUT, nombre ni teléfono es real (ver CLAUDE.md, sección 8b).
// Fase 1: negocio, dueño, vendedores y categorías. Las próximas fases suman productos, compras y ventas.

import { createClient } from "@supabase/supabase-js";

// Mismos valores que src/lib/cuentas.ts
const VERSION_LEGAL = "2026-11-borrador";
const correoInterno = (rut) => `${rut.toLowerCase()}@cuentas.rhstock.cl`;

const DEMO = {
  empresa: { rut: "76543210-3", nombre: "Almacén Don Pepe", razonSocial: "Almacén Don Pepe (negocio de ejemplo)", comuna: "Puente Alto" },
  dueno: { rut: "12345678-5", nombre: "Pepe Demo", correo: "pepe.demo@ejemplo.cl" },
  vendedores: [
    { nombre: "Carla", pin: "1111" },
    { nombre: "Matías", pin: "2222" },
  ],
};

function falta(variable) {
  console.error(`Falta la variable ${variable}. Revisa tu archivo .env.local (ver .env.example).`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || falta("NEXT_PUBLIC_SUPABASE_URL");
const claveSecreta = process.env.SUPABASE_SERVICE_ROLE_KEY || falta("SUPABASE_SERVICE_ROLE_KEY");
const claveDemo = process.env.DEMO_CLAVE || falta("DEMO_CLAVE");

const admin = createClient(url, claveSecreta, { auth: { persistSession: false, autoRefreshToken: false } });

async function ok(promesa, que) {
  const { data, error } = await promesa;
  if (error) throw new Error(`${que}: ${error.message}`);
  return data;
}

async function borrarDemoAnterior() {
  const usuarios = await ok(admin.from("usuarios").select("id").eq("rut", DEMO.dueno.rut), "buscar dueño anterior");
  const empresas = await ok(admin.from("empresas").select("id").eq("rut", DEMO.empresa.rut), "buscar negocio anterior");

  // También las cuentas de empleados del demo, si las hubiera.
  const ids = new Set(usuarios.map((u) => u.id));
  if (empresas.length) {
    const equipo = await ok(admin.from("usuarios").select("id").in("empresa_id", empresas.map((e) => e.id)), "buscar equipo");
    equipo.forEach((u) => ids.add(u.id));
  }
  for (const id of ids) await ok(admin.auth.admin.deleteUser(id), "borrar cuenta anterior");

  // Por si quedó una cuenta de Auth sin fila en "usuarios".
  const { data: lista } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const huerfana = lista?.users.find((u) => u.email === correoInterno(DEMO.dueno.rut));
  if (huerfana) await ok(admin.auth.admin.deleteUser(huerfana.id), "borrar cuenta huérfana");

  if (empresas.length) await ok(admin.from("empresas").delete().in("id", empresas.map((e) => e.id)), "borrar negocio anterior");
}

async function main() {
  console.log("Creando el negocio de ejemplo Almacén Don Pepe…");
  await borrarDemoAnterior();

  const { user } = await ok(
    admin.auth.admin.createUser({ email: correoInterno(DEMO.dueno.rut), password: claveDemo, email_confirm: true }),
    "crear cuenta de Pepe Demo",
  );

  const empresaId = await ok(
    admin.rpc("registrar_negocio", {
      p_usuario_id: user.id,
      p_rut_usuario: DEMO.dueno.rut,
      p_nombre: DEMO.dueno.nombre,
      p_correo: DEMO.dueno.correo,
      p_rut_empresa: DEMO.empresa.rut,
      p_nombre_negocio: DEMO.empresa.nombre,
      p_comuna: DEMO.empresa.comuna,
      p_version_legal: VERSION_LEGAL,
      p_ip: "",
    }),
    "registrar el negocio",
  );

  await ok(
    admin
      .from("empresas")
      .update({ es_demo: true, razon_social: DEMO.empresa.razonSocial, plan: "mensual", estado_suscripcion: "al_dia", dia_pago: 5 })
      .eq("id", empresaId),
    "marcar como negocio de ejemplo",
  );

  for (const vendedor of DEMO.vendedores) {
    await ok(admin.rpc("crear_vendedor", { p_empresa_id: empresaId, p_nombre: vendedor.nombre, p_pin: vendedor.pin }), `crear vendedor ${vendedor.nombre}`);
  }

  const categorias = await ok(admin.from("categorias").select("id", { count: "exact", head: false }).eq("empresa_id", empresaId), "contar categorías");

  console.log("✓ Negocio: Almacén Don Pepe (RUT 76.543.210-3), solo para mirar");
  console.log("✓ Dueño: Pepe Demo (RUT 12.345.678-5)");
  console.log(`✓ Vendedores: ${DEMO.vendedores.map((v) => `${v.nombre} (PIN ${v.pin})`).join(", ")}`);
  console.log(`✓ Categorías: ${categorias.length}`);
}

main().catch((error) => {
  console.error("No se pudo crear el negocio de ejemplo:", error.message);
  process.exit(1);
});
