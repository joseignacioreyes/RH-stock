// Crea (o vuelve a crear desde cero) el negocio de ejemplo "Almacén Don Pepe".
// Se puede correr las veces que quieras: siempre deja el demo igual.
//
//   npm run seed:demo
//
// Necesita en .env.local (o en el entorno): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y DEMO_CLAVE.
// Todo es inventado: ningún RUT, nombre ni teléfono es real (ver CLAUDE.md, sección 8b).
// Fase 1: negocio, dueño, vendedores y categorías.
// Fase 2: 40 productos y un mes de movimientos de stock (ventas diarias, una merma y un vencido).
// Las próximas fases suman compras con boletas, ventas de la caja y pagos.

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


// -----------------------------------------------------------------------------
// Fase 2: productos de ejemplo (nombres genéricos, sin marcas reales; precios inventados)
// perfil: "falta" = bajo el mínimo · "dormido" = sin movimiento hace más de 30 días ·
//         "margen" = gana menos que el objetivo de su categoría
// -----------------------------------------------------------------------------
const PRODUCTOS = [
  // categoría, nombre, unidad, ¿código?, precio, costo, stock final, mínimo, perfil
  ["Bebidas y jugos", "Bebida cola 1,5 L", "unidad", true, 1990, 1450, 18, 12],
  ["Bebidas y jugos", "Bebida sabor naranja 1,5 L", "unidad", true, 1890, 1380, 6, 10, "falta"],
  ["Bebidas y jugos", "Agua mineral sin gas 1,6 L", "unidad", true, 990, 650, 24, 12],
  ["Bebidas y jugos", "Jugo en polvo sabor naranja", "unidad", true, 350, 230, 40, 20],
  ["Bebidas y jugos", "Néctar de durazno 1 L", "unidad", true, 1290, 900, 9, 6],
  ["Abarrotes", "Arroz grado 1 1 kg", "unidad", true, 1490, 1150, 20, 10],
  ["Abarrotes", "Fideos espagueti 400 g", "unidad", true, 990, 760, 25, 12],
  ["Abarrotes", "Aceite vegetal 1 L", "unidad", true, 2690, 2350, 8, 6, "margen"],
  ["Abarrotes", "Azúcar 1 kg", "unidad", true, 1290, 1020, 4, 8, "falta"],
  ["Abarrotes", "Harina sin polvos de hornear 1 kg", "unidad", true, 1190, 920, 12, 6],
  ["Abarrotes", "Sal fina 1 kg", "unidad", false, 590, 380, 15, 5],
  ["Abarrotes", "Té en bolsitas caja 100", "unidad", true, 2490, 1890, 7, 4],
  ["Lácteos y huevos", "Leche entera 1 L", "unidad", true, 1150, 880, 24, 12],
  ["Lácteos y huevos", "Yogur sabor frutilla 1 L", "unidad", true, 1890, 1450, 6, 4],
  ["Lácteos y huevos", "Huevos bandeja 30", "unidad", false, 6990, 5800, 5, 4, "margen"],
  ["Lácteos y huevos", "Mantequilla 250 g", "unidad", true, 2390, 1850, 3, 5, "falta"],
  ["Panadería", "Pan marraqueta (kg)", "kg", false, 1990, 1300, 14, 8],
  ["Panadería", "Pan hallulla (kg)", "kg", false, 1990, 1300, 9, 6],
  ["Panadería", "Pan de molde integral", "unidad", true, 2490, 1700, 5, 3],
  ["Fiambrería y quesos", "Queso laminado (kg)", "kg", false, 12990, 9000, 2.4, 1],
  ["Fiambrería y quesos", "Jamón de pavo (kg)", "kg", false, 10990, 7500, 0.8, 1, "falta"],
  ["Fiambrería y quesos", "Mortadela (kg)", "kg", false, 6990, 4800, 1.5, 0.5],
  ["Snacks y dulces", "Papas fritas 150 g", "unidad", true, 1590, 990, 14, 6],
  ["Snacks y dulces", "Galletas de chocolate 120 g", "unidad", true, 790, 480, 30, 12],
  ["Snacks y dulces", "Chocolate de leche 100 g", "unidad", true, 1290, 800, 11, 6],
  ["Snacks y dulces", "Caramelos surtidos bolsa", "unidad", true, 990, 600, 6, 3, "dormido"],
  ["Frutas y verduras", "Palta hass (kg)", "kg", false, 4990, 3200, 4.5, 2],
  ["Frutas y verduras", "Tomate (kg)", "kg", false, 1790, 1100, 6, 3],
  ["Frutas y verduras", "Plátano (kg)", "kg", false, 1490, 900, 7, 3],
  ["Frutas y verduras", "Cebolla (kg)", "kg", false, 1190, 700, 1.5, 2, "falta"],
  ["Congelados y helados", "Helado de vainilla 1 L", "unidad", true, 3490, 2400, 6, 3],
  ["Congelados y helados", "Hamburguesas congeladas caja 4", "unidad", true, 2990, 2000, 8, 4],
  ["Limpieza del hogar", "Detergente líquido 3 L", "unidad", true, 7990, 5900, 5, 3],
  ["Limpieza del hogar", "Lavaloza 750 ml", "unidad", true, 1690, 1200, 10, 5],
  ["Limpieza del hogar", "Cloro 1 L", "unidad", true, 990, 650, 12, 6],
  ["Limpieza del hogar", "Papel higiénico 4 rollos", "unidad", true, 2290, 1650, 9, 6],
  ["Aseo personal", "Jabón de tocador pack 3", "unidad", true, 1990, 1400, 6, 3],
  ["Aseo personal", "Pasta dental 90 g", "unidad", true, 1490, 1050, 4, 2, "dormido"],
  ["Mascotas", "Alimento para perro adulto 3 kg", "unidad", true, 8990, 6500, 3, 2, "dormido"],
  ["Otros", "Velas pack 6", "unidad", true, 1290, 800, 10, 4],
];

/** Números al azar pero siempre los mismos (para que el demo quede igual cada vez). */
function azarFijo(semilla) {
  let estado = semilla;
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
}

/** Código de barras EAN-13 ficticio: prefijo 200 (uso interno de tiendas, no es de ningún producto real). */
function codigoFicticio(n) {
  const base = `200${String(n).padStart(9, "0")}`;
  const suma = [...base].reduce((total, d, i) => total + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return base + ((10 - (suma % 10)) % 10);
}

const DIA = 86_400_000;

/** Hora de atención al azar (entre 9:00 y 21:00 de Chile) de hace `dias` días. */
function fechaHace(dias, azar) {
  const fecha = new Date(Date.now() - dias * DIA);
  fecha.setUTCHours(12 + Math.floor(azar() * 12), Math.floor(azar() * 60), 0, 0); // 12–23 UTC ≈ 9–20 h en Chile
  if (fecha.getTime() > Date.now()) fecha.setTime(Date.now() - 3_600_000);
  return fecha.toISOString();
}

async function crearProductos(empresaId) {
  const categorias = await ok(admin.from("categorias").select("id, nombre").eq("empresa_id", empresaId), "leer categorías");
  const idCategoria = Object.fromEntries(categorias.map((c) => [c.nombre, c.id]));
  const azar = azarFijo(2026);

  const filas = PRODUCTOS.map(([categoria, nombre, unidad, conCodigo, precio, , , minimo], i) => ({
    empresa_id: empresaId,
    categoria_id: idCategoria[categoria],
    nombre,
    unidad,
    codigo_barras: conCodigo ? codigoFicticio(i + 1) : null,
    precio_venta: precio,
    stock_minimo: minimo,
  }));
  const creados = await ok(admin.from("productos").insert(filas).select("id, nombre"), "crear productos");
  const idProducto = Object.fromEntries(creados.map((p) => [p.nombre, p.id]));

  const movimientos = [];
  for (const [, nombre, unidad, , , costo, stockFinal, minimo, perfil] of PRODUCTOS) {
    const productoId = idProducto[nombre];
    const ventas = [];
    const salidas = [];

    if (perfil !== "dormido") {
      // Ventas diarias del último mes, con más venta los fines de semana.
      const porDia = unidad === "kg" ? Math.max(0.5, minimo / 2) : Math.max(1, Math.round(minimo / 3));
      for (let dias = 29; dias >= 0; dias--) {
        const diaSemana = new Date(Date.now() - dias * DIA).getUTCDay();
        const factor = diaSemana === 0 || diaSemana === 6 ? 1.6 : 1;
        let cantidad = porDia * factor * (0.4 + azar());
        cantidad = unidad === "kg" ? Math.round(cantidad * 4) / 4 : Math.round(cantidad);
        if (cantidad > 0) ventas.push({ cantidad, fecha: fechaHace(dias, azar) });
      }
    }
    // Una merma de pan y un vencido de lácteos.
    if (nombre === "Pan marraqueta (kg)") salidas.push({ cantidad: 1.5, motivo: "merma", fecha: fechaHace(3, azar) });
    if (nombre === "Yogur sabor frutilla 1 L") salidas.push({ cantidad: 2, motivo: "vencido", fecha: fechaHace(6, azar) });

    const vendido = ventas.reduce((t, v) => t + v.cantidad, 0) + salidas.reduce((t, s) => t + s.cantidad, 0);
    movimientos.push({
      empresa_id: empresaId,
      producto_id: productoId,
      tipo: "ajuste",
      motivo: "stock_inicial",
      cantidad: Math.round((stockFinal + vendido) * 1000) / 1000,
      costo_unitario: costo,
      fecha: fechaHace(perfil === "dormido" ? 45 : 35, azar),
    });
    for (const v of ventas) movimientos.push({ empresa_id: empresaId, producto_id: productoId, tipo: "venta", cantidad: -v.cantidad, fecha: v.fecha });
    for (const s of salidas) movimientos.push({ empresa_id: empresaId, producto_id: productoId, tipo: "merma", motivo: s.motivo, cantidad: -s.cantidad, fecha: s.fecha });
  }

  // En orden de fecha, como pasaron.
  movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha));
  for (let i = 0; i < movimientos.length; i += 500) {
    await ok(admin.from("movimientos_stock").insert(movimientos.slice(i, i + 500)), "registrar movimientos");
  }
  return { productos: creados.length, movimientos: movimientos.length };
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
  const inventario = await crearProductos(empresaId);

  console.log("✓ Negocio: Almacén Don Pepe (RUT 76.543.210-3), solo para mirar");
  console.log("✓ Dueño: Pepe Demo (RUT 12.345.678-5)");
  console.log(`✓ Vendedores: ${DEMO.vendedores.map((v) => `${v.nombre} (PIN ${v.pin})`).join(", ")}`);
  console.log(`✓ Categorías: ${categorias.length}`);
  console.log(`✓ Productos: ${inventario.productos}, con ${inventario.movimientos} movimientos del último mes`);
}

main().catch((error) => {
  console.error("No se pudo crear el negocio de ejemplo:", error.message);
  process.exit(1);
});
