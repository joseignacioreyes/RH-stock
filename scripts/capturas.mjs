// Toma las capturas de pantalla de una fase y arma su página de revisión.
//
//   1. En una ventana:  npm run dev
//   2. En otra ventana: npm run capturas -- 0        (el número es la fase)
//
// Deja las imágenes y la página en previews/fase-N/. Abre previews/fase-N/index.html en el navegador.
// Si la app corre en otra dirección: URL_APP=http://localhost:3001 npm run capturas -- 0

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

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
};

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
  await pagina.evaluate(() => document.fonts.ready);
  const archivo = `${pantalla.archivo}${sufijo}.png`;
  await pagina.screenshot({ path: path.join(carpeta, archivo), fullPage: true });
  await contexto.close();
  return archivo;
}

function paginaDeRevision(config, capturas) {
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

  const navegador = await chromium.launch();
  const capturas = [];
  try {
    for (const pantalla of config.pantallas) {
      const celular = await capturar(navegador, carpeta, pantalla, CELULAR, "", 2);
      const escritorio = pantalla.escritorio ? await capturar(navegador, carpeta, pantalla, ESCRITORIO, "-escritorio", 1) : null;
      capturas.push({ pantalla, celular, escritorio });
      console.log(`✓ ${celular}${escritorio ? ` y ${escritorio}` : ""}`);
    }
  } finally {
    await navegador.close();
  }

  await writeFile(path.join(carpeta, "index.html"), paginaDeRevision(config, capturas));
  console.log(`\nListo. Abre previews/fase-${fase}/index.html en el navegador.`);
}

main().catch((error) => {
  console.error("No se pudieron tomar las capturas:", error);
  process.exit(1);
});
