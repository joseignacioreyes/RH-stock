// Crea (o vuelve a crear desde cero) el negocio de ejemplo "Almacén Don Pepe".
// Se puede correr las veces que quieras: siempre deja el demo igual.
//
//   npm run seed:demo
//
// Necesita en .env.local (o en el entorno): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y DEMO_CLAVE.
// Todo es inventado: ningún RUT, nombre ni teléfono es real (ver CLAUDE.md, sección 8b).
// Fase 1: negocio, dueño, vendedores y categorías.
// Fase 2: 40 productos y un mes de movimientos de stock (ventas diarias, una merma y un vencido).
// Fase 3: 3 proveedores, 6 boletas confirmadas (una con alza de costo de más de 5%) y 1 boleta por confirmar con su foto.
// Fase 2b: las ventas del mes son ventas de verdad (tickets de Carla y Matías) y hay 2 cierres de caja
//           (uno cuadrado y uno con $1.500 de diferencia).
// Las próximas fases suman pagos.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { dibujarComprobante } from "./demo/generar-comprobante.mjs";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

  // Fotos de boletas del demo anterior.
  for (const empresa of empresas) {
    const { data: fotos } = await admin.storage.from("boletas").list(empresa.id);
    if (fotos?.length) await admin.storage.from("boletas").remove(fotos.map((f) => `${empresa.id}/${f.name}`));
  }

  // Pagos y comprobantes del demo anterior (los de negocios reales nunca se borran: son respaldo tributario).
  for (const empresa of empresas) {
    const { data: comprobantes } = await admin.storage.from("comprobantes").list(empresa.id);
    if (comprobantes?.length) await admin.storage.from("comprobantes").remove(comprobantes.map((f) => `${empresa.id}/${f.name}`));
  }
  if (empresas.length) await ok(admin.from("pagos").delete().in("empresa_id", empresas.map((e) => e.id)), "borrar pagos anteriores");

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


// -----------------------------------------------------------------------------
// Fase 3: compras del último mes (proveedores ficticios)
// [días atrás, proveedor, tipo, número, [[producto, descripción en la boleta, cantidad, costo unitario], …]]
// -----------------------------------------------------------------------------
const PROVEEDORES = {
  "Mayorista del Sur": "77123456-9",
  "Distribuidora Andes": "76987654-3",
  "Panadería La Espiga": null,
};

const COMPRAS = [
  [28, "Mayorista del Sur", "factura", "101123", [
    ["Arroz grado 1 1 kg", "ARROZ G1 1KG", 10, 1150],
    ["Fideos espagueti 400 g", "FIDEO ESPAG 400G", 12, 760],
    ["Aceite vegetal 1 L", "ACEITE VEG 1LT", 6, 2350],
    ["Azúcar 1 kg", "AZUCAR 1KG", 10, 1020],
    ["Galletas de chocolate 120 g", "GALLETA CHOC 120GR", 24, 480],
  ]],
  [24, "Distribuidora Andes", "boleta", "55120", [
    ["Bebida cola 1,5 L", "BEB COLA 1.5L", 12, 1450],
    ["Agua mineral sin gas 1,6 L", "AGUA MIN S/GAS 1.6L", 12, 650],
    ["Jugo en polvo sabor naranja", "JUGO POLVO NARANJA", 20, 230],
    ["Néctar de durazno 1 L", "NECTAR DURAZNO 1L", 6, 900],
  ]],
  [20, "Panadería La Espiga", "boleta", "3301", [
    ["Pan marraqueta (kg)", "MARRAQUETA KG", 20, 1300],
    ["Pan hallulla (kg)", "HALLULLA KG", 15, 1300],
    ["Pan de molde integral", "MOLDE INTEGRAL", 4, 1700],
  ]],
  [13, "Mayorista del Sur", "factura", "101377", [
    ["Leche entera 1 L", "LECHE ENT 1LT", 24, 880],
    ["Yogur sabor frutilla 1 L", "YOGUR FRUTILLA 1LT", 6, 1450],
    ["Mantequilla 250 g", "MANTEQUILLA 250G", 6, 1850],
    ["Té en bolsitas caja 100", "TE BOLSITAS X100", 4, 1890],
  ]],
  [7, "Distribuidora Andes", "boleta", "55488", [
    ["Bebida cola 1,5 L", "BEB COLA 1.5L", 12, 1450],
    ["Bebida sabor naranja 1,5 L", "BEB NARANJA 1.5L", 12, 1380],
    ["Papas fritas 150 g", "PAPAS FRITAS 150G", 12, 990],
    ["Chocolate de leche 100 g", "CHOCOLATE LECHE 100G", 10, 800],
  ]],
  // Alza de costo: las galletas pasan de $480 a $520 (+8,3%).
  [3, "Mayorista del Sur", "factura", "101502", [
    ["Galletas de chocolate 120 g", "GALLETA CHOC 120GR", 24, 520],
    ["Arroz grado 1 1 kg", "ARROZ G1 1KG", 10, 1150],
    ["Detergente líquido 3 L", "DETERGENTE LIQ 3LT", 3, 5900],
  ]],
];

/** Boleta por confirmar (la misma lectura de src/lib/lector-boletas/ejemplo.ts, ya validada). */
const BOLETA_POR_CONFIRMAR = {
  tipo: "boleta",
  proveedorNombre: "Mayorista del Sur",
  proveedorRut: "77123456-9",
  numero: "004521",
  fecha: null,
  items: [
    { descripcion: "ARROZ G1 1KG", cantidad: 10, precioUnitario: 1150, total: 11500 },
    { descripcion: "ACEITE VEG 1LT", cantidad: 6, precioUnitario: 2350, total: 14100 },
    { descripcion: "AZUCAR 1KG", cantidad: 12, precioUnitario: 1020, total: 12240 },
    { descripcion: "GALLETA CHOC 120GR", cantidad: 24, precioUnitario: 520, total: 12480 },
    { descripcion: "TE BOLSITAS X100", cantidad: 4, precioUnitario: 1890, total: 7560 },
    { descripcion: "MANI SALADO 200GR", cantidad: 10, precioUnitario: 890, total: 8900 },
  ],
  neto: 56118,
  iva: 10662,
  total: 66780,
};

const normalizar = (texto) => texto.trim().replace(/\s+/g, " ").toLowerCase();
const fechaChile = (fechaIso) => new Date(fechaIso).toLocaleDateString("en-CA", { timeZone: "America/Santiago" });

/** Crea proveedores, boletas confirmadas (con ítems y lo aprendido) y devuelve las entradas de stock. */
async function crearCompras(empresaId, idProducto, azar) {
  const proveedores = await ok(
    admin.from("proveedores").insert(Object.entries(PROVEEDORES).map(([nombre, rut]) => ({ empresa_id: empresaId, nombre, rut }))).select("id, nombre"),
    "crear proveedores",
  );
  const idProveedor = Object.fromEntries(proveedores.map((p) => [p.nombre, p.id]));
  const entradas = [];
  const alias = new Map();

  for (const [dias, proveedor, tipo, numero, lineas] of COMPRAS) {
    const fecha = fechaHace(dias, azar);
    const total = lineas.reduce((t, [, , cantidad, costo]) => t + Math.round(cantidad * costo), 0);
    const neto = Math.round(total / 1.19);
    const [documento] = await ok(
      admin
        .from("documentos_compra")
        .insert({
          empresa_id: empresaId,
          proveedor_id: idProveedor[proveedor],
          tipo,
          numero,
          fecha: fechaChile(fecha),
          neto,
          iva: total - neto,
          total,
          estado: "confirmado",
          confirmado_en: fecha,
          created_at: fecha,
        })
        .select("id"),
      "crear boleta",
    );
    await ok(
      admin.from("items_documento").insert(
        lineas.map(([producto, descripcion, cantidad, costo]) => ({
          documento_id: documento.id,
          empresa_id: empresaId,
          descripcion_original: descripcion,
          cantidad,
          precio_unitario: costo,
          total: Math.round(cantidad * costo),
          producto_id: idProducto[producto],
        })),
      ),
      "guardar productos de la boleta",
    );
    for (const [producto, descripcion, cantidad, costo] of lineas) {
      entradas.push({ productoId: idProducto[producto], cantidad, costo, fecha, documentoId: documento.id });
      alias.set(`${idProveedor[proveedor]}|${normalizar(descripcion)}`, {
        empresa_id: empresaId,
        proveedor_id: idProveedor[proveedor],
        descripcion_original: normalizar(descripcion),
        producto_id: idProducto[producto],
      });
    }
  }
  await ok(admin.from("alias_productos").insert([...alias.values()]), "guardar lo aprendido");

  // Boleta por confirmar, con su foto de ejemplo.
  const ruta = `${empresaId}/boleta-ejemplo.png`;
  const imagen = await readFile(path.join(raiz, "scripts/demo/boleta-ejemplo.png"));
  await ok(admin.storage.from("boletas").upload(ruta, imagen, { contentType: "image/png", upsert: true }), "subir foto de ejemplo");
  await ok(
    admin.from("documentos_compra").insert({
      empresa_id: empresaId,
      imagen_url: ruta,
      estado: "por_confirmar",
      datos_extraidos: { ...BOLETA_POR_CONFIRMAR, fecha: fechaChile(new Date().toISOString()) },
    }),
    "crear boleta por confirmar",
  );

  return entradas;
}

async function crearProductos(empresaId, idVendedores) {
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
  const compras = await crearCompras(empresaId, idProducto, azar);

  const movimientos = [];
  const lineasVenta = [];
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
    const entradas = compras.filter((c) => c.productoId === productoId);
    const comprado = entradas.reduce((t, c) => t + c.cantidad, 0);
    movimientos.push({
      empresa_id: empresaId,
      producto_id: productoId,
      tipo: "ajuste",
      motivo: "stock_inicial",
      cantidad: Math.round((stockFinal + vendido - comprado) * 1000) / 1000,
      costo_unitario: costo,
      fecha: fechaHace(perfil === "dormido" ? 45 : 35, azar),
    });
    for (const v of ventas) lineasVenta.push({ productoId, cantidad: v.cantidad, precio: PRODUCTOS.find((p) => p[1] === nombre)[4], fecha: v.fecha });
    for (const c of entradas) {
      movimientos.push({
        empresa_id: empresaId,
        producto_id: productoId,
        tipo: "compra",
        cantidad: c.cantidad,
        costo_unitario: c.costo,
        referencia_id: c.documentoId,
        fecha: c.fecha,
      });
    }
    for (const s of salidas) movimientos.push({ empresa_id: empresaId, producto_id: productoId, tipo: "merma", motivo: s.motivo, cantidad: -s.cantidad, fecha: s.fecha });
  }

  // Ventas de verdad: cada día, las líneas se agrupan en tickets de 1 a 3 productos.
  const ventas = [];
  const itemsVenta = [];
  const porDia = new Map();
  for (const linea of lineasVenta) {
    const dia = fechaChile(linea.fecha);
    porDia.set(dia, [...(porDia.get(dia) ?? []), linea]);
  }
  const MEDIOS = ["efectivo", "efectivo", "efectivo", "efectivo", "efectivo", "efectivo", "debito", "debito", "credito", "transferencia"];
  for (const [, lineas] of porDia) {
    lineas.sort(() => azar() - 0.5);
    for (let i = 0; i < lineas.length; ) {
      const tamano = 1 + Math.floor(azar() * 3);
      const ticket = lineas.slice(i, i + tamano);
      i += tamano;
      const fecha = ticket.map((l) => l.fecha).sort()[0];
      const hora = new Date(fecha).getUTCHours();
      const venta = {
        id: crypto.randomUUID(),
        empresa_id: empresaId,
        id_local: crypto.randomUUID(),
        vendedor_id: hora < 17 ? idVendedores.Carla : idVendedores["Matías"], // Carla en la mañana, Matías en la tarde
        fecha,
        medio_pago: MEDIOS[Math.floor(azar() * MEDIOS.length)],
        total: ticket.reduce((t, l) => t + Math.round(l.cantidad * l.precio), 0),
        sincronizada_en: fecha,
        created_at: fecha,
      };
      ventas.push(venta);
      for (const l of ticket) {
        itemsVenta.push({
          venta_id: venta.id,
          empresa_id: empresaId,
          producto_id: l.productoId,
          cantidad: l.cantidad,
          precio_unitario: l.precio,
          total: Math.round(l.cantidad * l.precio),
          created_at: fecha,
        });
        movimientos.push({ empresa_id: empresaId, producto_id: l.productoId, tipo: "venta", cantidad: -l.cantidad, referencia_id: venta.id, fecha });
      }
    }
  }
  for (let i = 0; i < ventas.length; i += 500) await ok(admin.from("ventas").insert(ventas.slice(i, i + 500)), "registrar ventas");
  for (let i = 0; i < itemsVenta.length; i += 500) await ok(admin.from("items_venta").insert(itemsVenta.slice(i, i + 500)), "registrar productos vendidos");

  // Cierres de caja de los dos días anteriores: uno cuadrado y otro con $1.500 de diferencia.
  for (const [dias, diferencia] of [[2, 0], [1, -1500]]) {
    const dia = fechaChile(new Date(Date.now() - dias * DIA).toISOString());
    const delDia = ventas.filter((v) => fechaChile(v.fecha) === dia);
    const efectivo = delDia.filter((v) => v.medio_pago === "efectivo").reduce((t, v) => t + v.total, 0);
    await ok(
      admin.from("cierres_caja").insert({
        empresa_id: empresaId,
        fecha: dia,
        total_sistema: delDia.reduce((t, v) => t + v.total, 0),
        efectivo_sistema: efectivo,
        efectivo_contado: efectivo + diferencia,
        diferencia,
      }),
      "crear cierre de caja",
    );
  }

  // En orden de fecha, como pasaron.
  movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha));
  for (let i = 0; i < movimientos.length; i += 500) {
    await ok(admin.from("movimientos_stock").insert(movimientos.slice(i, i + 500)), "registrar movimientos");
  }
  if (movimientos.some((m) => m.motivo === "stock_inicial" && m.cantidad <= 0)) throw new Error("Hay un stock inicial negativo: revisa las compras del demo");
  return { productos: creados.length, movimientos: movimientos.length, compras: COMPRAS.length, ventas: ventas.length };
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
      .update({ es_demo: true, razon_social: DEMO.empresa.razonSocial })
      .eq("id", empresaId),
    "marcar como negocio de ejemplo",
  );

  const idVendedores = {};
  for (const vendedor of DEMO.vendedores) {
    idVendedores[vendedor.nombre] = await ok(
      admin.rpc("crear_vendedor", { p_empresa_id: empresaId, p_nombre: vendedor.nombre, p_pin: vendedor.pin }),
      `crear vendedor ${vendedor.nombre}`,
    );
  }

  const categorias = await ok(admin.from("categorias").select("id", { count: "exact", head: false }).eq("empresa_id", empresaId), "contar categorías");
  const inventario = await crearProductos(empresaId, idVendedores);
  const plan = await crearPagos(empresaId);

  console.log("✓ Negocio: Almacén Don Pepe (RUT 76.543.210-3), solo para mirar");
  console.log("✓ Dueño: Pepe Demo (RUT 12.345.678-5)");
  console.log(`✓ Vendedores: ${DEMO.vendedores.map((v) => `${v.nombre} (PIN ${v.pin})`).join(", ")}`);
  console.log(`✓ Categorías: ${categorias.length}`);
  console.log(`✓ Productos: ${inventario.productos}, con ${inventario.movimientos} movimientos del último mes`);
  console.log(`✓ Compras: ${inventario.compras} boletas confirmadas y 1 por confirmar (con foto)`);
  console.log(`✓ Ventas: ${inventario.ventas} ventas de Carla y Matías en el mes, y 2 cierres de caja`);
  console.log(`✓ Plan mensual $30.000: ${plan.anterior} pagado y ${plan.actual} "en revisión" (con comprobante de ejemplo)`);
}

// -----------------------------------------------------------------------------
// Fase 5: plan mensual al día, el pago del mes pasado confirmado y el de este mes informado
// (con comprobante inventado), para que el administrador lo confirme.
// -----------------------------------------------------------------------------
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const nombreMes = (periodo) => `${MESES[Number(periodo.slice(5, 7)) - 1]} ${periodo.slice(0, 4)}`;
const sumarDias = (fecha, dias) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};
const sumarMeses = (fecha, meses) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + meses);
  return d.toISOString().slice(0, 10);
};

async function crearPagos(empresaId) {
  const DIA_PAGO = 5;
  const PRECIO = 30000;
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
  // Próximo vencimiento: el próximo día 5 (si hoy es 5 o antes, el de este mes).
  const esteMes = `${hoy.slice(0, 8)}0${DIA_PAGO}`;
  const proximo = hoy <= esteMes ? esteMes : sumarMeses(esteMes, 1);
  const anterior = sumarMeses(proximo, -1);

  await ok(
    admin.from("empresas").update({ plan: "mensual", precio_mensual: PRECIO, dia_pago: DIA_PAGO, proximo_vencimiento: proximo }).eq("id", empresaId),
    "plan mensual",
  );

  const pagos = [
    { periodo: anterior.slice(0, 7), fecha: sumarDias(anterior, -2), estado: "confirmado", operacion: "000118734" },
    { periodo: proximo.slice(0, 7), fecha: hoy < proximo ? sumarDias(hoy, -1) : hoy, estado: "informado", operacion: "000123456" },
  ];
  for (const pago of pagos) {
    const ruta = `${empresaId}/comprobante-${pago.periodo}.png`;
    const imagen = await dibujarComprobante({ fecha: pago.fecha, monto: PRECIO, operacion: pago.operacion });
    await ok(admin.storage.from("comprobantes").upload(ruta, imagen, { contentType: "image/png", upsert: true }), "subir comprobante de ejemplo");
    const informado = `${pago.fecha}T13:42:00-03:00`;
    await ok(
      admin.from("pagos").insert({
        empresa_id: empresaId,
        rut_empresa: DEMO.empresa.rut.replace(/\./g, ""),
        nombre_negocio: DEMO.empresa.nombre,
        periodo: pago.periodo,
        monto: PRECIO,
        estado: pago.estado,
        comprobante_url: ruta,
        datos_extraidos: { monto: PRECIO, fecha: pago.fecha, banco: "Banco Ficticio", titular: "Pepe Demo", operacion: pago.operacion },
        informado_en: informado,
        fecha_confirmacion: pago.estado === "confirmado" ? `${pago.fecha}T18:10:00-03:00` : null,
      }),
      "crear pago de ejemplo",
    );
  }

  await ok(
    admin.from("alertas").insert({
      empresa_id: empresaId,
      tipo: "pago",
      mensaje: `Recibimos tu pago de ${nombreMes(pagos[0].periodo)}. ¡Gracias! Tu próximo pago vence el ${proximo.split("-").reverse().join("-")}.`,
      datos: { clave: `confirmado-demo-${pagos[0].periodo}`, periodo: pagos[0].periodo },
      leida: true,
      created_at: `${pagos[0].fecha}T18:10:00-03:00`,
    }),
    "aviso de pago confirmado",
  );
  await admin.rpc("refrescar_estado_suscripcion", { p_empresa_id: empresaId });
  return { anterior: nombreMes(pagos[0].periodo), actual: nombreMes(pagos[1].periodo) };
}

main().catch((error) => {
  console.error("No se pudo crear el negocio de ejemplo:", error.message);
  process.exit(1);
});
