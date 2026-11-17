// Toma las capturas de pantalla de una fase, graba el video del recorrido y arma su página de revisión.
//
//   1. Supabase local encendido (npx supabase start) y el demo cargado (npm run seed:demo)
//   2. En una ventana:  npm run dev
//   3. En otra ventana: npm run capturas -- 1        (el número es la fase)
//
// Deja las imágenes, el video y la página en previews/fase-N/. Abre previews/fase-N/index.html en el navegador.
// Si la app corre en otra dirección: URL_APP=http://localhost:3001 npm run capturas -- 1

import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomInt } from "node:crypto";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const URL_APP = (process.env.URL_APP || "http://localhost:3000").replace(/\/$/, "");

const CELULAR = { width: 390, height: 844 };
const ESCRITORIO = { width: 1366, height: 768 };

/**
 * Pantallas de cada fase, en el orden en que se usan.
 * - archivo: nombre de la captura (sin .png).
 * - ruta: dirección dentro de la app.
 * - descripcion: qué hace la pantalla y qué debería probar José.
 * - escritorio: true para tomar también la versión de computador (pantallas de administrador).
 * - pasos: (opcional) lo que hay que hacer antes de la captura (entrar, llenar un formulario…).
 *
 * Cada fase puede tener además:
 * - preparar: se corre una vez antes de las capturas (por ejemplo, crear una cuenta de prueba).
 * - recorrido: los pasos del video (previews/fase-N/recorrido.webm).
 */
const PANTALLAS = {
  0: {
    titulo: "Fase 0: Preparación",
    resumen:
      "La portada de RH Stock con el logo, los colores y la letra de la marca. Todavía no se puede iniciar sesión: eso llega en la Fase 1.",
    pantallas: [
      {
        archivo: "01-portada",
        ruta: "/",
        titulo: "Portada",
        descripcion:
          "Lo primero que ve un almacenero. Debe entender en 5 segundos que es una app de inventario para su almacén. Prueba el botón verde: abre WhatsApp con el mensaje “Hola, quiero probar RH Stock”.",
        escritorio: true,
      },
      {
        archivo: "02-pagina-no-existe",
        ruta: "/esta-pagina-no-existe",
        titulo: "Página que no existe",
        descripcion:
          "Si alguien abre un enlace equivocado, ve un mensaje amable y un botón para volver al inicio, en vez de un error técnico.",
      },
    ],
  },
  1: {
    titulo: "Fase 1: Cuentas y seguridad",
    resumen:
      "Ya se puede crear una cuenta con RUT y clave, entrar, mirar el negocio de ejemplo Almacén Don Pepe y leer los borradores legales. Cada negocio ve solo sus datos (28 pruebas automáticas lo confirman).",
    preparar: prepararFase1,
    recorrido: async (pagina) => {
      await pagina.goto(URL_APP + "/");
      await pausa(pagina);
      await pagina.getByRole("button", { name: "Probar sin registrarse" }).click();
      await pagina.waitForURL("**/inicio");
      await pausa(pagina);
      await pagina.getByRole("link", { name: /Más/ }).click();
      await pagina.waitForURL("**/mas");
      await pausa(pagina);
      await pagina.getByRole("button", { name: "Crear mi cuenta" }).click();
      await pagina.waitForURL("**/registro");
      await llenarRegistro(pagina, { pausar: true });
      await pagina.waitForURL("**/inicio?bienvenida=1");
      await pausa(pagina, 2500);
    },
    pantallas: [
      {
        archivo: "01-portada",
        ruta: "/",
        titulo: "Portada",
        descripcion:
          "Ahora tiene “Probar sin registrarse” (entra al negocio de ejemplo), “Crear mi cuenta” y el botón “Entrar” arriba. Más abajo sigue el botón de WhatsApp.",
        escritorio: true,
      },
      {
        archivo: "02-entrar",
        ruta: "/entrar",
        titulo: "Entrar",
        descripcion: "Se entra con RUT y clave. Los puntos y el guion del RUT se ponen solos. El botón “Mostrar” deja ver la clave.",
      },
      {
        archivo: "03-entrar-error",
        ruta: "/entrar",
        titulo: "Entrar: clave equivocada",
        descripcion: "Si el RUT o la clave están mal, el mensaje dice qué hacer, sin palabras técnicas.",
        pasos: async (pagina) => {
          await pagina.getByLabel("Tu RUT").fill("123456785");
          await pagina.getByLabel("Tu clave", { exact: true }).fill("ClaveMala1");
          await pagina.getByRole("button", { name: "Entrar" }).click();
          await pagina.getByRole("alert").waitFor();
        },
      },
      {
        archivo: "04-registro-paso-1",
        ruta: "/registro",
        titulo: "Crear mi cuenta: paso 1 de 3",
        descripcion: "Máximo 3 datos por pantalla. Paso 1: nombre, RUT y correo (el correo es solo para recuperar la clave).",
      },
      {
        archivo: "05-registro-rut-malo",
        ruta: "/registro",
        titulo: "Paso 1 con un RUT equivocado",
        descripcion: "La app revisa el dígito verificador del RUT y avisa al tiro, en rojo y con palabras simples.",
        pasos: async (pagina) => {
          await pagina.getByLabel("Tu nombre").fill("Rosa Pérez");
          await pagina.getByLabel("Tu RUT").fill("123456789");
          await pagina.getByLabel("Tu correo").fill("rosa@ejemplo.cl");
          await pagina.getByRole("button", { name: "Seguir" }).click();
        },
      },
      {
        archivo: "06-registro-paso-2",
        ruta: "/registro",
        titulo: "Crear mi cuenta: paso 2 de 3",
        descripcion: "Los datos del negocio. La comuna ya viene escrita (Puente Alto).",
        pasos: async (pagina) => {
          await llenarPaso1(pagina);
        },
      },
      {
        archivo: "07-registro-paso-3",
        ruta: "/registro",
        titulo: "Crear mi cuenta: paso 3 de 3",
        descripcion: "La clave y la aceptación de términos y privacidad, en casillas separadas y sin marcar.",
        pasos: async (pagina) => {
          await llenarPaso1(pagina);
          await llenarPaso2(pagina);
        },
      },
      {
        archivo: "08-inicio-bienvenida",
        ruta: "/registro",
        titulo: "Inicio, recién creada la cuenta",
        descripcion:
          "Después de registrarse, entra directo. La pantalla de inicio tiene solo 4 botones grandes y “Más”. Abajo, siempre, “Ayuda por WhatsApp”.",
        pasos: async (pagina) => {
          await llenarRegistro(pagina);
          await pagina.waitForURL("**/inicio?bienvenida=1");
        },
      },
      {
        archivo: "09-inicio-demo",
        ruta: "/",
        titulo: "Negocio de ejemplo (demo)",
        descripcion:
          "Con “Probar sin registrarse” se entra al Almacén Don Pepe. La franja amarilla avisa que es un ejemplo. Es solo para mirar: no se puede modificar.",
        pasos: entrarAlDemo,
      },
      {
        archivo: "10-muy-pronto",
        ruta: "/",
        titulo: "Secciones que vienen",
        descripcion: "“Subir boleta”, “Vender”, “Mi stock” y “Avisos” se construyen en las próximas fases. Por ahora muestran este aviso.",
        pasos: async (pagina) => {
          await entrarAlDemo(pagina);
          await pagina.getByRole("link", { name: /Subir boleta/ }).click();
          await pagina.waitForURL("**/subir-boleta");
        },
      },
      {
        archivo: "11-mas",
        ruta: "/",
        titulo: "Más",
        descripcion: "Aquí irán ajustes, pagos, vendedores y exportar. Por ahora: los textos legales y “Cerrar sesión”.",
        pasos: async (pagina) => {
          await entrarAlDemo(pagina);
          await pagina.getByRole("link", { name: /Más/ }).click();
          await pagina.waitForURL("**/mas");
        },
      },
      {
        archivo: "12-olvide-mi-clave",
        ruta: "/recuperar-clave",
        titulo: "¿Olvidaste tu clave?",
        descripcion:
          "Por ahora se recupera por WhatsApp: tú generas un enlace y se lo mandas a su correo registrado. En la Fase 4 será automático.",
      },
      {
        archivo: "13-privacidad",
        ruta: "/privacidad",
        titulo: "Política de privacidad (borrador)",
        descripcion: "Borrador en lenguaje simple, según la Ley 21.719. Faltan los datos de la SpA (entre corchetes). Debe revisarlo un abogado.",
      },
      {
        archivo: "14-terminos",
        ruta: "/terminos",
        titulo: "Términos y condiciones (borrador)",
        descripcion: "Incluye pago por transferencia, recordatorio 3 días antes y modo “solo mirar” a los 10 días de atraso, sin borrar datos.",
      },
      {
        archivo: "15-admin",
        ruta: "/entrar",
        titulo: "Panel de administrador",
        descripcion:
          "Tu cuenta de administrador ve la lista de negocios y su estado de pago, pero no el detalle de cada negocio. En la Fase 5 se suman pagos y confirmaciones.",
        escritorio: true,
        pasos: async (pagina) => {
          await entrarComo(pagina, ADMIN_PRUEBA.rut, ADMIN_PRUEBA.clave);
          await pagina.waitForURL("**/admin");
        },
      },
    ],
  },
  2: {
    titulo: "Fase 2: Productos e inventario",
    resumen:
      "“Mi stock” ya funciona: tarjetas con lo que falta y lo que sobra, la lista de productos con buscador, la ficha de cada producto, descontar pérdidas con motivo y el conteo rápido. El stock nunca se edita a mano: todo queda como movimiento.",
    preparar: prepararFase2,
    recorrido: async (pagina) => {
      await entrarComo(pagina, ROSA.rut, ROSA.clave);
      await pagina.waitForURL("**/inicio");
      await pausa(pagina);
      await pagina.getByRole("link", { name: /Mi stock/ }).click();
      await pagina.waitForURL("**/mi-stock");
      await pausa(pagina, 1800);
      await pagina.getByRole("link", { name: "Ver todos mis productos" }).click();
      await pausa(pagina);
      await pagina.getByRole("link", { name: /Pan marraqueta/ }).click();
      await pausa(pagina, 1800);
      await pagina.getByRole("link", { name: "Descontar pérdida o regalo" }).click();
      await pausa(pagina);
      await pagina.locator("label", { hasText: "Se echó a perder" }).click();
      await pagina.getByLabel(/¿Cuánto\?/).pressSequentially("1,5", { delay: 120 });
      await pausa(pagina);
      await pagina.getByRole("button", { name: "Guardar" }).click();
      await pagina.waitForURL("**listo=salida**");
      await pausa(pagina, 2500);
    },
    pantallas: [
      {
        archivo: "01-mi-stock",
        ruta: "/",
        titulo: "Mi stock",
        descripcion:
          "Tarjetas simples en vez de tablas: lo que te falta (en rojo), lo que no se vende hace un mes, con qué productos ganas poco y cuánto vale tu mercadería. Cada tarjeta tiene “Ver cuáles”.",
        pasos: async (pagina) => {
          await entrarAlDemo(pagina);
          await pagina.goto(URL_APP + "/mi-stock");
        },
      },
      {
        archivo: "02-se-estan-acabando",
        ruta: "/",
        titulo: "Se están acabando",
        descripcion: "Al tocar “Ver cuáles” aparecen solo los productos bajo el mínimo, con lo que queda en rojo.",
        pasos: async (pagina) => {
          await entrarAlDemo(pagina);
          await pagina.goto(URL_APP + "/mi-stock/productos?filtro=faltan");
        },
      },
      {
        archivo: "03-mis-productos",
        ruta: "/",
        titulo: "Mis productos",
        descripcion: "Todos los productos ordenados por categoría, con lo que queda de cada uno. Arriba hay un buscador.",
        pasos: async (pagina) => {
          await entrarAlDemo(pagina);
          await pagina.goto(URL_APP + "/mi-stock/productos");
        },
      },
      {
        archivo: "04-buscar",
        ruta: "/",
        titulo: "Buscar un producto",
        descripcion: "Escribe una parte del nombre (no importan las tildes) o el código de barras.",
        pasos: async (pagina) => {
          await entrarAlDemo(pagina);
          await pagina.goto(URL_APP + "/mi-stock/productos");
          await pagina.getByLabel("Buscar producto").fill("pan");
        },
      },
      {
        archivo: "05-producto",
        ruta: "/",
        titulo: "Ficha de un producto",
        descripcion: "Cuánto queda (grande), el precio, el costo, cuánto ganas y lo último que pasó: ventas, mermas y el stock con que partió.",
        pasos: async (pagina) => {
          await entrarAlDemo(pagina);
          await irAProducto(pagina, "Pan marraqueta");
        },
      },
      {
        archivo: "06-producto-gana-poco",
        ruta: "/",
        titulo: "Producto con el que ganas poco",
        descripcion: "Si el precio deja menos ganancia que el objetivo de su categoría, la ficha lo dice con palabras simples. (En la Fase 4 sumamos el precio sugerido.)",
        pasos: async (pagina) => {
          await entrarAlDemo(pagina);
          await irAProducto(pagina, "Aceite");
        },
      },
      {
        archivo: "07-descontar",
        ruta: "/",
        titulo: "Descontar pérdida o regalo",
        descripcion: "Cuatro botones grandes con el motivo (se echó a perder, se venció, lo usé yo, lo regalé) y cuánto. Para el pan se puede usar coma: 1,5.",
        pasos: async (pagina) => {
          await entrarComo(pagina, ROSA.rut, ROSA.clave);
          await pagina.waitForURL("**/inicio");
          await irAProducto(pagina, "Pan marraqueta");
          await pagina.getByRole("link", { name: "Descontar pérdida o regalo" }).click();
          await pagina.locator("label", { hasText: "Se echó a perder" }).click();
          await pagina.getByLabel(/¿Cuánto\?/).fill("1,5");
        },
      },
      {
        archivo: "08-descontado",
        ruta: "/",
        titulo: "Listo: se descontó",
        descripcion: "Confirmación visible y el stock ya actualizado. La pérdida queda anotada en “Lo que pasó”.",
        pasos: async (pagina) => {
          await entrarComo(pagina, ROSA.rut, ROSA.clave);
          await pagina.waitForURL("**/inicio");
          await irAProducto(pagina, "Pan marraqueta");
          await pagina.getByRole("link", { name: "Descontar pérdida o regalo" }).click();
          await pagina.locator("label", { hasText: "Se echó a perder" }).click();
          await pagina.getByLabel(/¿Cuánto\?/).fill("1,5");
          await pagina.getByRole("button", { name: "Guardar" }).click();
          await pagina.waitForURL("**listo=salida**");
        },
      },
      {
        archivo: "09-demo-no-guarda",
        ruta: "/",
        titulo: "En el demo no se guarda nada",
        descripcion: "Si alguien prueba en el Almacén Don Pepe, puede recorrer todo, pero al guardar ve este aviso. Así el demo nunca se desordena.",
        pasos: async (pagina) => {
          await entrarAlDemo(pagina);
          await irAProducto(pagina, "Pan marraqueta");
          await pagina.getByRole("link", { name: "Descontar pérdida o regalo" }).click();
          await pagina.locator("label", { hasText: "Se echó a perder" }).click();
          await pagina.getByLabel(/¿Cuánto\?/).fill("1");
          await pagina.getByRole("button", { name: "Guardar" }).click();
          await pagina.getByRole("alert").waitFor();
        },
      },
      {
        archivo: "10-agregar-paso-1",
        ruta: "/",
        titulo: "Agregar producto: paso 1 de 3",
        descripcion: "Nombre, categoría y cómo se vende (por unidad, kilo, litro o caja). Normalmente los productos se sumarán solos con la foto de la boleta (Fase 3).",
        pasos: async (pagina) => {
          await entrarComo(pagina, ROSA.rut, ROSA.clave);
          await pagina.waitForURL("**/inicio");
          await pagina.goto(URL_APP + "/mi-stock/productos/nuevo");
          await pagina.getByLabel("Nombre").fill("Galletas de vainilla 120 g");
          await pagina.getByLabel("Categoría").selectOption({ label: "🍫 Snacks y dulces" });
        },
      },
      {
        archivo: "11-agregar-paso-2",
        ruta: "/",
        titulo: "Agregar producto: paso 2 de 3",
        descripcion: "A cuánto lo vendes, cuánto te costó y el código de barras (si tiene).",
        pasos: async (pagina) => {
          await entrarComo(pagina, ROSA.rut, ROSA.clave);
          await pagina.waitForURL("**/inicio");
          await pagina.goto(URL_APP + "/mi-stock/productos/nuevo");
          await llenarProductoPaso1(pagina);
          await pagina.getByLabel(/¿A cuánto lo vendes\?/).fill("790");
          await pagina.getByLabel(/¿Cuánto te costó\?/).fill("480");
        },
      },
      {
        archivo: "12-agregar-paso-3",
        ruta: "/",
        titulo: "Agregar producto: paso 3 de 3",
        descripcion: "Cuántos tienes ahora (queda como primer movimiento) y cuándo quieres que te avisemos que se está acabando.",
        pasos: async (pagina) => {
          await entrarComo(pagina, ROSA.rut, ROSA.clave);
          await pagina.waitForURL("**/inicio");
          await pagina.goto(URL_APP + "/mi-stock/productos/nuevo");
          await llenarProductoPaso1(pagina);
          await llenarProductoPaso2(pagina);
          await pagina.getByLabel(/¿Cuánto tienes ahora\?/).fill("24");
          await pagina.getByLabel("Avísame cuando queden").fill("6");
        },
      },
      {
        archivo: "13-producto-agregado",
        ruta: "/",
        titulo: "Listo: producto agregado",
        descripcion: "El producto queda con su stock inicial, su precio y cuánto ganas.",
        pasos: async (pagina) => {
          await entrarComo(pagina, ROSA.rut, ROSA.clave);
          await pagina.waitForURL("**/inicio");
          await pagina.goto(URL_APP + "/mi-stock/productos/nuevo");
          await llenarProductoPaso1(pagina);
          await llenarProductoPaso2(pagina);
          await pagina.getByLabel(/¿Cuánto tienes ahora\?/).fill("24");
          await pagina.getByLabel("Avísame cuando queden").fill("6");
          await pagina.getByRole("button", { name: "Guardar" }).click();
          await pagina.waitForURL("**listo=nuevo**");
        },
      },
      {
        archivo: "14-contar-categorias",
        ruta: "/",
        titulo: "Contar lo que tengo",
        descripcion: "Para lo que no pasa por la caja (pan, verduras, mermas): eliges una categoría y cuentas.",
        pasos: async (pagina) => {
          await entrarAlDemo(pagina);
          await pagina.goto(URL_APP + "/mi-stock/conteo");
        },
      },
      {
        archivo: "15-contar-producto",
        ruta: "/",
        titulo: "Contar: un producto por pantalla",
        descripcion: "Escribes cuántos hay de verdad. Si hay lo mismo que dice la app, basta con tocar “Hay lo mismo”.",
        pasos: async (pagina) => {
          await entrarComo(pagina, ROSA.rut, ROSA.clave);
          await pagina.waitForURL("**/inicio");
          await pagina.goto(URL_APP + "/mi-stock/conteo");
          await pagina.getByRole("link", { name: /Panadería/ }).click();
          await pagina.getByLabel(/¿Cuántos hay\?/).fill("10");
        },
      },
      {
        archivo: "16-contar-resumen",
        ruta: "/",
        titulo: "Contar: resumen antes de guardar",
        descripcion: "La app muestra solo lo que no cuadra, para que lo revises antes de guardar. Nunca se cambia el stock sin dejarlo anotado.",
        pasos: async (pagina) => {
          await entrarComo(pagina, ROSA.rut, ROSA.clave);
          await pagina.waitForURL("**/inicio");
          await contarPanaderia(pagina);
        },
      },
      {
        archivo: "17-contado",
        ruta: "/",
        titulo: "Listo: conteo guardado",
        descripcion: "Vuelve a “Mi stock” con la confirmación de cuántos productos se corrigieron.",
        pasos: async (pagina) => {
          await entrarComo(pagina, ROSA.rut, ROSA.clave);
          await pagina.waitForURL("**/inicio");
          await contarPanaderia(pagina);
          await pagina.getByRole("button", { name: "Guardar conteo" }).click();
          await pagina.waitForURL("**listo=conteo**");
        },
      },
      {
        archivo: "18-quitar-producto",
        ruta: "/",
        titulo: "Quitar un producto (pregunta antes)",
        descripcion: "Nada se borra sin preguntar. El historial del producto queda guardado.",
        pasos: async (pagina) => {
          await entrarComo(pagina, ROSA.rut, ROSA.clave);
          await pagina.waitForURL("**/inicio");
          await irAProducto(pagina, "Bebida cola");
          await pagina.getByRole("link", { name: "Cambiar datos" }).click();
          await pagina.getByRole("link", { name: /Quitar este producto/ }).click();
          await pagina.waitForURL("**/quitar");
        },
      },
      {
        archivo: "19-mi-stock-vacio",
        ruta: "/",
        titulo: "Mi stock sin productos",
        descripcion: "Un negocio recién creado ve esta pantalla vacía con un solo camino: agregar su primer producto (o subir su primera boleta, en la Fase 3).",
        pasos: async (pagina) => {
          await entrarComo(pagina, NUEVO.rut, NUEVO.clave);
          await pagina.waitForURL("**/inicio");
          await pagina.goto(URL_APP + "/mi-stock");
        },
      },
    ],
  },

  3: {
    titulo: "Fase 3: Foto de la boleta",
    resumen:
      "Subir boleta ya funciona: sacas la foto, la app la lee, revisas producto por producto (con sugerencias de cuál es) y al confirmar se suma el stock y se recalcula el costo. La app aprende para la próxima vez. La foto queda guardada en privado.",
    preparar: prepararFase3,
    recorrido: async (pagina) => {
      await entrarComo(pagina, ROSA.rut, ROSA.clave);
      await pagina.waitForURL("**/inicio");
      await pausa(pagina);
      await pagina.getByRole("link", { name: /Subir boleta/ }).click();
      await pagina.waitForURL("**/subir-boleta");
      await pausa(pagina, 1500);
      await subirFoto(pagina, FOTO_BOLETA);
      await pagina.getByText("Leyendo tu boleta").waitFor();
      await pagina.waitForURL(/\/subir-boleta\/[0-9a-f-]{36}/, { timeout: 60_000 });
      await pausa(pagina, 1500);
      await revisarBoletaRosa(pagina, { pausar: true });
      await pausa(pagina, 1500);
      await pagina.getByRole("button", { name: "Sumar a mi stock" }).click();
      await pagina.waitForURL("**/subir-boleta?listo=**");
      await pausa(pagina, 2000);
      await irAProducto(pagina, "Arroz");
      await pausa(pagina, 2500);
    },
    pantallas: [
      {
        archivo: "01-subir-boleta",
        ruta: "/",
        titulo: "Subir boleta",
        descripcion:
          "Dos botones grandes: sacar foto o elegir de la galería. Abajo, un ejemplo de foto bien tomada y las últimas compras (la que dice “Falta revisar” está esperando que la confirmes).",
        pasos: async (pagina) => {
          await entrarAlDemo(pagina);
          await pagina.goto(URL_APP + "/subir-boleta");
        },
      },
      {
        archivo: "02-leyendo",
        ruta: "/",
        titulo: "Leyendo tu boleta…",
        descripcion: "Mientras la app lee la foto (unos segundos), se ve la foto y un aviso para no cerrar la pantalla. La foto se achica en el celular antes de subir.",
        pasos: async (pagina) => {
          await entrarComo(pagina, ROSA.rut, ROSA.clave);
          await pagina.waitForURL("**/inicio");
          await pagina.goto(URL_APP + "/subir-boleta");
          await subirFoto(pagina, FOTO_BOLETA);
          await pagina.getByText("Leyendo tu boleta").waitFor();
          await pagina.waitForTimeout(400);
        },
        sinEsperar: true,
      },
      {
        archivo: "03-foto-borrosa",
        ruta: "/",
        titulo: "Si la foto salió mal",
        descripcion: "Si la foto está borrosa, oscura o cortada, la app lo dice en palabras simples y no guarda nada. Se vuelve a sacar al tiro.",
        pasos: async (pagina) => {
          await entrarComo(pagina, ROSA.rut, ROSA.clave);
          await pagina.waitForURL("**/inicio");
          await pagina.waitForTimeout(3500); // que termine la lectura de la captura anterior
          await pagina.goto(URL_APP + "/subir-boleta");
          await subirFoto(pagina, FOTO_MALA);
          await pagina.getByRole("alert").waitFor({ timeout: 30_000 });
        },
      },
      {
        archivo: "04-revisar-datos",
        ruta: "/",
        titulo: "Revisar: datos de la boleta",
        descripcion: "Primero lo general: a quién le compraste, la fecha y el total. Tocando la foto se ve grande.",
        pasos: async (pagina) => {
          await abrirBoletaDemo(pagina);
        },
      },
      {
        archivo: "05-revisar-reconocido",
        ruta: "/",
        titulo: "Revisar: producto reconocido",
        descripcion: "Un producto por pantalla. “✨ La app lo reconoció” porque ya lo compraste antes a este proveedor. Se puede cambiar la cantidad o el precio si la IA leyó mal.",
        pasos: async (pagina) => {
          await abrirBoletaDemo(pagina);
          await pagina.getByRole("button", { name: /Revisar los/ }).click();
        },
      },
      {
        archivo: "06-revisar-nuevo",
        ruta: "/",
        titulo: "Revisar: producto que no tienes",
        descripcion: "Si es algo que nunca habías comprado (maní salado), la app propone “Es un producto nuevo”.",
        pasos: async (pagina) => {
          await abrirBoletaDemo(pagina);
          await pagina.getByRole("button", { name: /Revisar los/ }).click();
          for (let i = 0; i < 5; i++) await pagina.getByRole("button", { name: "Está bien" }).click();
        },
      },
      {
        archivo: "07-producto-nuevo",
        ruta: "/",
        titulo: "Agregar el producto nuevo",
        descripcion: "Nombre, categoría y a cuánto lo venderás. La app sugiere el precio con tu margen objetivo: “Te costó $890. Con tu margen de 35% sugerimos $1.370”.",
        pasos: async (pagina) => {
          await abrirBoletaDemo(pagina);
          await pagina.getByRole("button", { name: /Revisar los/ }).click();
          for (let i = 0; i < 6; i++) await pagina.getByRole("button", { name: "Está bien" }).click();
          await pagina.getByLabel("Categoría").selectOption({ label: "🍫 Snacks y dulces" });
          await pagina.getByLabel("Nombre").fill("Maní salado 200 g");
        },
      },
      {
        archivo: "08-resumen",
        ruta: "/",
        titulo: "Último paso: lo que se va a sumar",
        descripcion: "Todo lo que se sumará a tu stock, con el total. Si la suma no coincide con el total de la boleta, la app avisa. Tocando un producto se puede corregir.",
        pasos: async (pagina) => {
          await abrirBoletaDemo(pagina);
          await revisarBoletaDemo(pagina);
        },
      },
      {
        archivo: "09-demo-no-guarda",
        ruta: "/",
        titulo: "En el demo no se guarda",
        descripcion: "En el Almacén Don Pepe se puede recorrer todo, pero al final no se suma nada. Así el demo siempre queda igual.",
        pasos: async (pagina) => {
          await abrirBoletaDemo(pagina);
          await revisarBoletaDemo(pagina);
          await pagina.getByRole("button", { name: "Sumar a mi stock" }).click();
          await pagina.getByRole("alert").waitFor();
        },
      },
      {
        archivo: "10-sumado",
        ruta: "/",
        titulo: "Listo: se sumó al stock",
        descripcion: "Confirmación visible: “Listo, se sumaron 6 productos a tu stock”. La boleta queda en “Últimas compras” como “Sumada al stock”.",
        pasos: async (pagina) => {
          await entrarComo(pagina, ROSA.rut, ROSA.clave);
          await pagina.waitForURL("**/inicio");
          await pagina.goto(URL_APP + "/subir-boleta");
          await subirFoto(pagina, FOTO_BOLETA);
          await pagina.waitForURL(/\/subir-boleta\/[0-9a-f-]{36}/, { timeout: 60_000 });
          await revisarBoletaRosa(pagina);
          await pagina.getByRole("button", { name: "Sumar a mi stock" }).click();
          await pagina.waitForURL("**/subir-boleta?listo=**");
        },
      },
      {
        archivo: "11-stock-actualizado",
        ruta: "/",
        titulo: "El stock ya cambió",
        descripcion: "En la ficha del arroz aparece la compra (“Lo que compré +10”) y el nuevo stock. El costo se recalcula solo.",
        pasos: async (pagina) => {
          await entrarComo(pagina, ROSA.rut, ROSA.clave);
          await pagina.waitForURL("**/inicio");
          await irAProducto(pagina, "Arroz");
        },
      },
      {
        archivo: "12-boleta-sumada",
        ruta: "/",
        titulo: "Una compra ya sumada",
        descripcion: "Cada compra confirmada queda guardada con sus productos y su foto (en un espacio privado, con enlaces que vencen).",
        pasos: async (pagina) => {
          await entrarAlDemo(pagina);
          await pagina.goto(URL_APP + "/subir-boleta");
          await pagina.getByRole("link", { name: /Sumada al stock/ }).first().click();
          await pagina.waitForURL(/\/subir-boleta\/[0-9a-f-]{36}/);
        },
      },
      {
        archivo: "13-a-mano",
        ruta: "/",
        titulo: "Ingresar una compra a mano",
        descripcion: "Si no hay foto (o la IA no pudo leerla), se puede ingresar a mano con los mismos pasos.",
        pasos: async (pagina) => {
          await entrarComo(pagina, ROSA.rut, ROSA.clave);
          await pagina.waitForURL("**/inicio");
          await pagina.goto(URL_APP + "/subir-boleta");
          await pagina.getByRole("button", { name: /ingresar la compra a mano/ }).click();
          await pagina.waitForURL(/\/subir-boleta\/[0-9a-f-]{36}/);
        },
      },
      {
        archivo: "14-mi-stock-compras",
        ruta: "/",
        titulo: "Mi stock con las compras",
        descripcion: "“Mi stock” ahora avisa si hay boletas por revisar y muestra la última compra.",
        pasos: async (pagina) => {
          await entrarAlDemo(pagina);
          await pagina.goto(URL_APP + "/mi-stock");
        },
      },
    ],
  },

  4: {
    titulo: "Fase 4: Avisos y precios",
    resumen:
      "Los avisos se crean solos: cuando algo se está acabando y cuando una compra cambia el costo más del porcentaje que elegiste. Cada aviso de costo trae el precio sugerido explicado en una frase, con un botón para usarlo. El margen de cada categoría y el porcentaje del aviso se cambian en “Más”. (El envío por correo y al celular se suma cuando estén las cuentas de correo y Vercel.)",
    preparar: prepararFase4,
    recorrido: async (pagina) => {
      await prepararFase4(); // las capturas anteriores marcaron los avisos como vistos
      await entrarComo(pagina, ROSA.rut, ROSA.clave);
      await pagina.waitForURL("**/inicio");
      await pausa(pagina, 1800);
      await pagina.getByRole("link", { name: /Avisos/ }).click();
      await pagina.waitForURL("**/avisos");
      await pausa(pagina, 2200);
      await pagina.getByRole("button", { name: /Ver precio sugerido/ }).first().click();
      await pagina.waitForURL("**/mi-stock/productos/**");
      await pausa(pagina, 2200);
      await pagina.getByRole("button", { name: /^Usar \$/ }).first().click();
      await pagina.waitForURL("**listo=precio**");
      await pausa(pagina, 2500);
    },
    pantallas: [
      {
        archivo: "01-inicio-con-avisos",
        ruta: "/",
        titulo: "Inicio con avisos",
        descripcion: "El botón “Avisos” muestra en rojo cuántos avisos nuevos hay.",
        pasos: entrarAlDemo,
      },
      {
        archivo: "02-avisos",
        ruta: "/",
        titulo: "Avisos",
        descripcion:
          "Tarjetas simples: en rojo lo que se está acabando (con lo que queda hoy) y en amarillo el alza de costo de las galletas con el precio sugerido. Cada una tiene un botón para ir al producto.",
        pasos: async (pagina) => {
          await entrarAlDemo(pagina);
          await pagina.goto(URL_APP + "/avisos");
        },
      },
      {
        archivo: "03-aviso-de-costo",
        ruta: "/",
        titulo: "Del aviso al precio sugerido",
        descripcion:
          "Al tocar el aviso de costo se abre el producto con el aviso arriba: “Tu costo subió de $480 a $520 (+8,3%). Con tu margen objetivo de 35%, el precio sugerido es $800”, y un botón “Usar $800”.",
        pasos: async (pagina) => {
          await entrarAlDemo(pagina);
          await pagina.goto(URL_APP + "/avisos");
          await pagina.getByRole("button", { name: /Ver precio sugerido/ }).first().click();
          await pagina.waitForURL("**/mi-stock/productos/**");
        },
      },
      {
        archivo: "04-gana-poco-sugerencia",
        ruta: "/",
        titulo: "Producto con el que ganas poco",
        descripcion: "La ficha explica el precio sugerido en una frase y ofrece usarlo con un toque.",
        pasos: async (pagina) => {
          await entrarAlDemo(pagina);
          await irAProducto(pagina, "Aceite");
        },
      },
      {
        archivo: "05-precio-cambiado",
        ruta: "/",
        titulo: "Listo: precio cambiado",
        descripcion: "Al tocar “Usar”, el precio de venta cambia al sugerido y se confirma con un mensaje.",
        pasos: async (pagina) => {
          await entrarComo(pagina, ROSA.rut, ROSA.clave);
          await pagina.waitForURL("**/inicio");
          await irAProducto(pagina, "Aceite");
          await pagina.getByRole("button", { name: /^Usar \$/ }).first().click();
          await pagina.waitForURL("**listo=precio**");
        },
      },
      {
        archivo: "06-sin-avisos",
        ruta: "/",
        titulo: "Sin avisos nuevos",
        descripcion: "Con “Ya los vi todos” quedan como vistos (abajo). Si no hay nada nuevo, la pantalla lo dice tranquila.",
        pasos: async (pagina) => {
          await entrarComo(pagina, ROSA.rut, ROSA.clave);
          await pagina.waitForURL("**/inicio");
          await pagina.goto(URL_APP + "/avisos");
          await pagina.getByRole("button", { name: /Ya los vi todos/ }).click();
          await pagina.waitForURL("**listo=leidos**");
        },
      },
      {
        archivo: "07-mas",
        ruta: "/",
        titulo: "Más: ajustes del dueño",
        descripcion: "El dueño tiene dos opciones nuevas: “Cuánto quiero ganar” (margen por categoría) y “Aviso de cambio de costo”.",
        pasos: async (pagina) => {
          await entrarAlDemo(pagina);
          await pagina.goto(URL_APP + "/mas");
        },
      },
      {
        archivo: "08-margenes",
        ruta: "/",
        titulo: "Cuánto quiero ganar",
        descripcion: "El margen objetivo de cada categoría. Con esto se calculan los precios sugeridos.",
        pasos: async (pagina) => {
          await entrarAlDemo(pagina);
          await pagina.goto(URL_APP + "/mas/margenes");
        },
      },
      {
        archivo: "09-cambiar-margen",
        ruta: "/",
        titulo: "Cambiar el margen de una categoría",
        descripcion: "Un solo dato por pantalla, con un ejemplo de qué significa.",
        pasos: async (pagina) => {
          await entrarAlDemo(pagina);
          await pagina.goto(URL_APP + "/mas/margenes");
          await pagina.getByRole("link", { name: /Abarrotes/ }).click();
          await pagina.waitForURL("**/mas/margenes/**");
        },
      },
      {
        archivo: "10-aviso-de-costo-ajuste",
        ruta: "/",
        titulo: "Cuándo avisar un cambio de costo",
        descripcion: "Por defecto 5%: si algo que costaba $1.000 pasa de $1.050, te avisamos.",
        pasos: async (pagina) => {
          await entrarAlDemo(pagina);
          await pagina.goto(URL_APP + "/mas/aviso-costo");
        },
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Ayudas para las pantallas que necesitan sesión o formularios llenos
// ---------------------------------------------------------------------------

/** Administrador ficticio, solo para las capturas en el Supabase local. */
const ADMIN_PRUEBA = { rut: "11.111.111-1", rutNormalizado: "11111111-1", nombre: "Admin de Prueba", clave: "Prueba1234" };

const pausa = (pagina, ms = 1200) => pagina.waitForTimeout(ms);

function rutAlAzar() {
  const numero = String(randomInt(30_000_000, 99_999_999));
  let suma = 0;
  let multiplicador = 2;
  for (let i = numero.length - 1; i >= 0; i--) {
    suma += Number(numero[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  return numero + (resto === 11 ? "0" : resto === 10 ? "K" : String(resto));
}

async function entrarAlDemo(pagina) {
  await pagina.goto(URL_APP + "/");
  await pagina.getByRole("button", { name: "Probar sin registrarse" }).click();
  await pagina.waitForURL("**/inicio");
}

async function entrarComo(pagina, rut, clave) {
  await pagina.goto(URL_APP + "/entrar");
  await pagina.getByLabel("Tu RUT").fill(rut);
  await pagina.getByLabel("Tu clave", { exact: true }).fill(clave);
  await pagina.getByRole("button", { name: "Entrar" }).click();
}

async function llenarPaso1(pagina, { pausar = false } = {}) {
  await pagina.getByLabel("Tu nombre").pressSequentially("Rosa Pérez", { delay: pausar ? 40 : 0 });
  await pagina.getByLabel("Tu RUT").pressSequentially(rutAlAzar(), { delay: pausar ? 40 : 0 });
  await pagina.getByLabel("Tu correo").pressSequentially("rosa@ejemplo.cl", { delay: pausar ? 30 : 0 });
  if (pausar) await pausa(pagina);
  await pagina.getByRole("button", { name: "Seguir" }).click();
  await pagina.getByRole("heading", { name: "Tu negocio" }).waitFor();
}

async function llenarPaso2(pagina, { pausar = false } = {}) {
  await pagina.getByLabel("Nombre de tu negocio").pressSequentially("Almacén Rosita", { delay: pausar ? 40 : 0 });
  await pagina.getByLabel("RUT del negocio").pressSequentially(rutAlAzar(), { delay: pausar ? 40 : 0 });
  if (pausar) await pausa(pagina);
  await pagina.getByRole("button", { name: "Seguir" }).click();
  await pagina.getByRole("heading", { name: "Elige tu clave" }).waitFor();
}

async function llenarRegistro(pagina, opciones = {}) {
  await llenarPaso1(pagina, opciones);
  await llenarPaso2(pagina, opciones);
  await pagina.getByLabel("Tu clave", { exact: true }).pressSequentially("Rosita2026", { delay: opciones.pausar ? 40 : 0 });
  await pagina.getByRole("checkbox", { name: /términos/ }).check();
  await pagina.getByRole("checkbox", { name: /privacidad/ }).check();
  if (opciones.pausar) await pausa(pagina);
  await pagina.getByRole("button", { name: "Crear mi cuenta" }).click();
}

/** Crea (o deja al día) el administrador ficticio en el Supabase LOCAL. Nunca toca un Supabase real. */
async function prepararFase1() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!/127\.0\.0\.1|localhost/.test(url)) {
    throw new Error("Las capturas de la Fase 1 se toman solo con Supabase local (npx supabase start).");
  }
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const correo = `${ADMIN_PRUEBA.rutNormalizado.toLowerCase()}@cuentas.rhstock.cl`;

  const { data: existente } = await admin.from("usuarios").select("id").eq("rut", ADMIN_PRUEBA.rutNormalizado).maybeSingle();
  if (existente) {
    await admin.auth.admin.updateUserById(existente.id, { password: ADMIN_PRUEBA.clave });
    return;
  }
  const { data, error } = await admin.auth.admin.createUser({ email: correo, password: ADMIN_PRUEBA.clave, email_confirm: true });
  if (error) throw error;
  const { error: errorFicha } = await admin.from("usuarios").insert({
    id: data.user.id,
    empresa_id: null,
    rut: ADMIN_PRUEBA.rutNormalizado,
    nombre: ADMIN_PRUEBA.nombre,
    correo: "admin.prueba@ejemplo.cl",
    rol: "admin",
  });
  if (errorFicha) throw errorFicha;
}


/** Negocios de prueba que SÍ se pueden modificar (el demo es solo para mirar). Solo en Supabase local. */
const ROSA = { rut: "15.555.555-6", rutNormalizado: "15555555-6", nombre: "Rosa Prueba", negocio: "Almacén Rosita", rutNegocio: "77777777-7", clave: "Prueba1234" };
const NUEVO = { rut: "16.666.666-K", rutNormalizado: "16666666-K", nombre: "Nelson Prueba", negocio: "Almacén Recién Abierto", rutNegocio: "78888888-0", clave: "Prueba1234" };

const PRODUCTOS_ROSA = [
  ["Panadería", "Pan marraqueta (kg)", "kg", 1990, 1300, 12, 6],
  ["Panadería", "Pan hallulla (kg)", "kg", 1990, 1300, 8, 4],
  ["Bebidas y jugos", "Bebida cola 1,5 L", "unidad", 1990, 1450, 15, 6],
  ["Abarrotes", "Arroz grado 1 1 kg", "unidad", 1490, 1150, 3, 6],
  ["Lácteos y huevos", "Leche entera 1 L", "unidad", 1150, 880, 18, 8],
];

function clienteAdminLocal() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!/127\.0\.0\.1|localhost/.test(url)) throw new Error("Las capturas se toman solo con Supabase local (npx supabase start).");
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

/** Crea desde cero un negocio de prueba (borrando el anterior si existe). */
async function negocioDePrueba(admin, persona, productos = []) {
  const { data: anterior } = await admin.from("usuarios").select("id, empresa_id").eq("rut", persona.rutNormalizado).maybeSingle();
  if (anterior) {
    await admin.auth.admin.deleteUser(anterior.id);
    if (anterior.empresa_id) await admin.from("empresas").delete().eq("id", anterior.empresa_id);
  }
  await admin.from("empresas").delete().eq("rut", persona.rutNegocio);

  const { data, error } = await admin.auth.admin.createUser({
    email: `${persona.rutNormalizado.toLowerCase()}@cuentas.rhstock.cl`,
    password: persona.clave,
    email_confirm: true,
  });
  if (error) throw error;
  const { data: empresaId, error: errorNegocio } = await admin.rpc("registrar_negocio", {
    p_usuario_id: data.user.id,
    p_rut_usuario: persona.rutNormalizado,
    p_nombre: persona.nombre,
    p_correo: "prueba@ejemplo.cl",
    p_rut_empresa: persona.rutNegocio,
    p_nombre_negocio: persona.negocio,
    p_comuna: "Puente Alto",
    p_version_legal: "2026-11-borrador",
    p_ip: "",
  });
  if (errorNegocio) throw errorNegocio;

  const { data: categorias } = await admin.from("categorias").select("id, nombre").eq("empresa_id", empresaId);
  for (const [categoria, nombre, unidad, precio, costo, stock, minimo] of productos) {
    const { data: producto, error: errorProducto } = await admin
      .from("productos")
      .insert({ empresa_id: empresaId, categoria_id: categorias.find((c) => c.nombre === categoria).id, nombre, unidad, precio_venta: precio, stock_minimo: minimo })
      .select("id")
      .single();
    if (errorProducto) throw errorProducto;
    await admin.from("movimientos_stock").insert({
      empresa_id: empresaId,
      producto_id: producto.id,
      tipo: "ajuste",
      motivo: "stock_inicial",
      cantidad: stock,
      costo_unitario: costo,
    });
  }
}

async function prepararFase2() {
  const admin = clienteAdminLocal();
  await negocioDePrueba(admin, ROSA, PRODUCTOS_ROSA);
  await negocioDePrueba(admin, NUEVO);
}

async function irAProducto(pagina, nombre) {
  await pagina.goto(URL_APP + "/mi-stock/productos");
  await pagina.getByRole("link", { name: new RegExp(nombre) }).first().click();
  await pagina.waitForURL("**/mi-stock/productos/*");
}

async function llenarProductoPaso1(pagina) {
  await pagina.getByLabel("Nombre").fill("Galletas de vainilla 120 g");
  await pagina.getByLabel("Categoría").selectOption({ label: "🍫 Snacks y dulces" });
  await pagina.getByRole("button", { name: "Seguir" }).click();
  await pagina.getByRole("heading", { name: "Precios" }).waitFor();
}

async function llenarProductoPaso2(pagina) {
  await pagina.getByLabel(/¿A cuánto lo vendes\?/).fill("790");
  await pagina.getByLabel(/¿Cuánto te costó\?/).fill("480");
  await pagina.getByRole("button", { name: "Seguir" }).click();
  await pagina.getByRole("heading", { name: "¿Cuánto tienes?" }).waitFor();
}

async function contarPanaderia(pagina) {
  await pagina.goto(URL_APP + "/mi-stock/conteo");
  await pagina.getByRole("link", { name: /Panadería/ }).click();
  await pagina.getByLabel(/¿Cuántos hay\?/).fill("10");
  await pagina.getByRole("button", { name: /Siguiente|Terminar/ }).click();
  await pagina.getByRole("button", { name: /Hay lo mismo/ }).click();
  await pagina.getByRole("heading", { name: /diferencia|cuadra/ }).waitFor();
}


const FOTO_BOLETA = path.join(raiz, "public/ejemplos/boleta-bien-tomada.jpg");
/** Foto mínima (1×1 px): en modo de ejemplo la app la trata como "borrosa". */
const FOTO_MALA = {
  name: "borrosa.png",
  mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
};

async function prepararFase3() {
  const admin = clienteAdminLocal();
  await negocioDePrueba(admin, ROSA, PRODUCTOS_ROSA);
  const respuesta = await fetch(URL_APP + "/subir-boleta").catch(() => null);
  if (!respuesta) throw new Error("La app no responde");
  console.log("(Recuerda: la app debe correr con LECTOR_BOLETAS=ejemplo LECTOR_BOLETAS_DEMORA=2500 para estas capturas)");
}

async function subirFoto(pagina, archivo) {
  await pagina.locator('input[type="file"][capture]').setInputFiles(archivo);
}

async function abrirBoletaDemo(pagina) {
  await entrarAlDemo(pagina);
  await pagina.goto(URL_APP + "/subir-boleta");
  await pagina.getByRole("link", { name: /Falta revisar/ }).first().click();
  await pagina.waitForURL(/\/subir-boleta\/[0-9a-f-]{36}/);
}

async function revisarBoletaDemo(pagina) {
  await pagina.getByRole("button", { name: /Revisar los/ }).click();
  for (let i = 0; i < 6; i++) await pagina.getByRole("button", { name: "Está bien" }).click();
  await pagina.getByLabel("Categoría").selectOption({ label: "🍫 Snacks y dulces" });
  await pagina.getByLabel("Nombre").fill("Maní salado 200 g");
  await pagina.getByRole("button", { name: "Seguir" }).click();
  await pagina.getByRole("heading", { name: /Esto se va a sumar/ }).waitFor();
}

/** Rosa solo tiene arroz de lo que trae la boleta: lo demás se agrega como producto nuevo. */
async function revisarBoletaRosa(pagina, { pausar = false } = {}) {
  const CATEGORIAS = ["🍚 Abarrotes", "🍚 Abarrotes", "🍚 Abarrotes", "🍫 Snacks y dulces", "🍚 Abarrotes", "🍫 Snacks y dulces"];
  await pagina.getByRole("button", { name: /Revisar los/ }).click();
  for (let i = 0; i < 6; i++) {
    if (pausar) await pausa(pagina, 700);
    await pagina.getByRole("button", { name: "Está bien" }).click();
    await pagina.waitForTimeout(200);
    const nuevo = pagina.getByRole("heading", { name: "Agregar a mis productos" });
    if (await nuevo.isVisible().catch(() => false)) {
      await pagina.getByLabel("Categoría").selectOption({ label: CATEGORIAS[i] });
      if (pausar) await pausa(pagina, 500);
      await pagina.getByRole("button", { name: "Seguir" }).click();
    }
  }
  await pagina.getByRole("heading", { name: /Esto se va a sumar/ }).waitFor();
}


/** Rosa con un producto que gana poco y una compra con alza de costo (para tener avisos propios). */
async function prepararFase4() {
  const admin = clienteAdminLocal();
  await negocioDePrueba(admin, ROSA, [...PRODUCTOS_ROSA, ["Abarrotes", "Aceite vegetal 1 L", "unidad", 2690, 2350, 8, 4]]);
  const { data: rosa } = await admin.from("usuarios").select("empresa_id").eq("rut", ROSA.rutNormalizado).single();
  const { data: aceite } = await admin.from("productos").select("id").eq("empresa_id", rosa.empresa_id).eq("nombre", "Aceite vegetal 1 L").single();
  await admin
    .from("movimientos_stock")
    .insert({ empresa_id: rosa.empresa_id, producto_id: aceite.id, tipo: "compra", cantidad: 6, costo_unitario: 2550 });
}

const escaparHtml = (texto) =>
  String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

async function appEstaAbierta() {
  try {
    const respuesta = await fetch(URL_APP, { signal: AbortSignal.timeout(5000) });
    return respuesta.ok;
  } catch {
    return false;
  }
}

async function capturar(navegador, carpeta, pantalla, tamano, sufijo, escala) {
  const contexto = await navegador.newContext({ viewport: tamano, deviceScaleFactor: escala, locale: "es-CL" });
  const pagina = await contexto.newPage();
  await pagina.goto(URL_APP + pantalla.ruta, { waitUntil: "networkidle" });
  if (pantalla.pasos) {
    await pantalla.pasos(pagina);
    if (pantalla.sinEsperar) {
      await pagina.evaluate(() => document.fonts.ready);
      const archivo = `${pantalla.archivo}${sufijo}.png`;
      await pagina.screenshot({ path: path.join(carpeta, archivo), fullPage: true });
      await contexto.close();
      return archivo;
    }
    // Espera a que la pantalla termine de cargar (sin quedarse pegado si algo sigue abierto).
    await pagina.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await pagina.waitForTimeout(300);
  }
  await pagina.evaluate(() => document.fonts.ready);
  // En una captura de página completa, la barra fija de ayuda quedaría a media página:
  // se muestra al final, como la ve la persona al llegar abajo.
  await pagina.addStyleTag({ content: "[data-fijo-abajo]{position:static!important}" });
  const archivo = `${pantalla.archivo}${sufijo}.png`;
  await pagina.screenshot({ path: path.join(carpeta, archivo), fullPage: true });
  await contexto.close();
  return archivo;
}

/** Graba en video el recorrido principal de la fase, en tamaño celular. */
async function grabarRecorrido(navegador, carpeta, recorrido) {
  const carpetaVideo = path.join(carpeta, ".video");
  const contexto = await navegador.newContext({ viewport: CELULAR, locale: "es-CL", recordVideo: { dir: carpetaVideo, size: CELULAR } });
  const pagina = await contexto.newPage();
  await recorrido(pagina);
  await contexto.close();
  const archivo = "recorrido.webm";
  await rename(await pagina.video().path(), path.join(carpeta, archivo));
  await rm(carpetaVideo, { recursive: true, force: true });
  return archivo;
}

function paginaDeRevision(config, capturas, video) {
  const tarjetas = capturas
    .map(
      ({ pantalla, celular, escritorio }, i) => `
      <article class="tarjeta">
        <h2><span class="numero">${i + 1}</span> ${escaparHtml(pantalla.titulo)}</h2>
        <p>${escaparHtml(pantalla.descripcion)}</p>
        <div class="imagenes">
          <figure class="celular"><img src="${celular}" alt="${escaparHtml(pantalla.titulo)} en celular" loading="lazy"><figcaption>Celular</figcaption></figure>
          ${escritorio ? `<figure class="escritorio"><img src="${escritorio}" alt="${escaparHtml(pantalla.titulo)} en computador" loading="lazy"><figcaption>Computador</figcaption></figure>` : ""}
        </div>
      </article>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="es-CL">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Revisión ${escaparHtml(config.titulo)} | RH Stock</title>
<style>
  :root { --marca:#0F766E; --texto:#1F2937; --suave:#4B5563; --fondo:#F3F4F6; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--fondo); color:var(--texto); font:18px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; }
  header { background:var(--marca); color:#fff; padding:24px 16px; }
  header h1 { margin:0; font-size:28px; }
  header p { margin:8px 0 0; max-width:720px; }
  main { max-width:1100px; margin:0 auto; padding:16px; display:grid; gap:24px; }
  .tarjeta { background:#fff; border-radius:16px; padding:20px; box-shadow:0 1px 3px rgb(0 0 0 / .08); }
  .tarjeta h2 { margin:0 0 8px; font-size:22px; display:flex; align-items:center; gap:12px; }
  .numero { display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:50%; background:var(--marca); color:#fff; font-size:18px; flex-shrink:0; }
  .tarjeta p { margin:0 0 16px; color:var(--suave); }
  .imagenes { display:flex; flex-wrap:wrap; gap:20px; align-items:flex-start; }
  figure { margin:0; }
  figcaption { text-align:center; color:var(--suave); font-size:16px; margin-top:6px; }
  img { display:block; max-width:100%; height:auto; border:1px solid #E5E7EB; border-radius:12px; }
  .celular img { width:300px; }
  video { display:block; max-width:100%; border-radius:12px; border:1px solid #E5E7EB; }
  .escritorio { flex:1 1 480px; }
  footer { text-align:center; color:var(--suave); font-size:16px; padding:24px 16px 40px; }
</style>
</head>
<body>
<header>
  <h1>RH Stock · ${escaparHtml(config.titulo)}</h1>
  <p>${escaparHtml(config.resumen)}</p>
</header>
<main>
${
  video
    ? `<article class="tarjeta"><h2><span class="numero">▶</span> Video del recorrido</h2><p>El recorrido principal de la fase, como lo haría un almacenero.</p><video src="${video}" controls muted playsinline width="300"></video></article>`
    : ""
}
${tarjetas}
</main>
<footer>Capturas tomadas automáticamente el ${new Date().toLocaleDateString("es-CL", { timeZone: "America/Santiago" })}.</footer>
</body>
</html>
`;
}

async function main() {
  const fase = process.argv[2] ?? "0";
  const config = PANTALLAS[fase];
  if (!config) {
    console.error(`No hay pantallas definidas para la fase ${fase}. Agrégalas en scripts/capturas.mjs.`);
    process.exit(1);
  }

  if (!(await appEstaAbierta())) {
    console.error(`No pude abrir ${URL_APP}. Primero abre la app con "npm run dev" en otra ventana.`);
    process.exit(1);
  }

  const carpeta = path.join(raiz, "previews", `fase-${fase}`);
  await mkdir(carpeta, { recursive: true });

  if (config.preparar) await config.preparar();

  const navegador = await chromium.launch();
  const capturas = [];
  let video = null;
  try {
    for (const pantalla of config.pantallas) {
      const celular = await capturar(navegador, carpeta, pantalla, CELULAR, "", 2);
      const escritorio = pantalla.escritorio ? await capturar(navegador, carpeta, pantalla, ESCRITORIO, "-escritorio", 1) : null;
      capturas.push({ pantalla, celular, escritorio });
      console.log(`✓ ${celular}${escritorio ? ` y ${escritorio}` : ""}`);
    }
    if (config.recorrido) {
      video = await grabarRecorrido(navegador, carpeta, config.recorrido);
      console.log(`✓ ${video}`);
    }
  } finally {
    await navegador.close();
  }

  await writeFile(path.join(carpeta, "index.html"), paginaDeRevision(config, capturas, video));
  console.log(`\nListo. Abre previews/fase-${fase}/index.html en el navegador.`);
}

main().catch((error) => {
  console.error("No se pudieron tomar las capturas:", error);
  process.exit(1);
});
