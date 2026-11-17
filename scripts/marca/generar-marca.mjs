// Genera todos los archivos de marca a partir de los dos SVG originales de public/brand/.
//
//   npm run marca
//
// Qué crea:
//   - public/brand/rhstock-logo-trazos.svg   logo con el texto convertido a trazos (para usar fuera de la web)
//   - public/brand/icono-192.png, icono-512.png               íconos de la app instalable
//   - public/brand/icono-maskable-192.png, icono-maskable-512.png   versión "maskable" (Android recorta el borde)
//   - src/app/favicon.ico (16, 32 y 48 px) y src/app/icon.svg  ícono de la pestaña del navegador
//   - src/app/apple-icon.png (180 px)                          ícono para iPhone
//   - src/app/opengraph-image.png (1200×630)                   imagen al compartir por WhatsApp o redes
//
// Usa el Chromium de Playwright para dibujar los SVG, así no hace falta instalar nada más.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "@playwright/test";
import opentype from "opentype.js";

const require = createRequire(import.meta.url);
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const brand = (archivo) => path.join(raiz, "public/brand", archivo);
const app = (archivo) => path.join(raiz, "src/app", archivo);

const VERDE = "#0F766E";

// ---------------------------------------------------------------------------
// 1. Logo con el texto convertido a trazos
// ---------------------------------------------------------------------------

async function cargarPoppins(peso) {
  const archivo = require.resolve(`@fontsource/poppins/files/poppins-latin-${peso}-normal.woff`);
  const datos = await readFile(archivo);
  return opentype.parse(datos.buffer.slice(datos.byteOffset, datos.byteOffset + datos.byteLength));
}

/** Convierte un texto en un <path> SVG. */
function textoATrazo(fuente, texto, x, y, tamano, color) {
  const d = fuente.getPath(texto, x, y, tamano).toPathData(2);
  return `<path fill="${color}" d="${d}"/>`;
}

async function generarLogoEnTrazos() {
  const original = await readFile(brand("rhstock-logo.svg"), "utf8");
  const poppins700 = await cargarPoppins(700);
  const poppins400 = await cargarPoppins(400);

  // Mismas posiciones, tamaños y colores que el logo original.
  const xRH = 250;
  const xStock = xRH + poppins700.getAdvanceWidth("RH", 104) + 24;
  const trazos = [
    textoATrazo(poppins700, "RH", xRH, 138, 104, "#1F2937"),
    textoATrazo(poppins700, "Stock", xStock, 138, 104, VERDE),
    textoATrazo(poppins400, "Tu inventario con una foto", 254, 192, 34, "#4B5563"),
  ];

  const icono = original.match(/<g transform[\s\S]*?<\/g>/)?.[0];
  if (!icono) throw new Error("No encontré el ícono dentro de rhstock-logo.svg");

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 240" width="860" height="240">`,
    `  <title>RH Stock: Tu inventario con una foto</title>`,
    `  ${icono}`,
    ...trazos.map((t) => `  ${t}`),
    `</svg>`,
    ``,
  ].join("\n");

  await writeFile(brand("rhstock-logo-trazos.svg"), svg);
  return svg;
}

// ---------------------------------------------------------------------------
// 2. Variantes del ícono
// ---------------------------------------------------------------------------

/** Ícono cuadrado sin esquinas redondeadas: iPhone y Android las redondean solos. */
function iconoCuadrado(svgIcono) {
  return svgIcono.replace(/<rect width="512" height="512" rx="112"/, '<rect width="512" height="512"');
}

/**
 * Ícono "maskable": fondo verde hasta el borde y el dibujo más chico,
 * para que Android pueda recortarlo en círculo sin cortar la caja.
 */
function iconoMaskable(svgIcono) {
  const cuadrado = iconoCuadrado(svgIcono);
  return cuadrado
    .replace(/(<rect width="512" height="512"[^>]*\/>)/, '$1\n  <g transform="translate(256 256) scale(0.82) translate(-256 -256)">')
    .replace(/<\/svg>/, "  </g>\n</svg>");
}

// ---------------------------------------------------------------------------
// 3. Dibujar con Chromium
// ---------------------------------------------------------------------------

const comoDataUrl = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

async function dibujar(pagina, html, ancho, alto, { transparente = false } = {}) {
  await pagina.setViewportSize({ width: ancho, height: alto });
  await pagina.setContent(
    `<!doctype html><html><head><style>html,body{margin:0;padding:0;background:${transparente ? "transparent" : "#fff"}}</style></head><body>${html}</body></html>`,
  );
  await pagina.evaluate(() => Promise.all([...document.images].map((img) => img.decode())));
  return pagina.screenshot({ omitBackground: transparente, clip: { x: 0, y: 0, width: ancho, height: alto } });
}

async function svgAPng(pagina, svg, lado, opciones) {
  return dibujar(pagina, `<img src="${comoDataUrl(svg)}" width="${lado}" height="${lado}" style="display:block">`, lado, lado, opciones);
}

/** Arma un .ico con varias imágenes PNG adentro (formato que entienden todos los navegadores). */
function armarIco(imagenes) {
  const cabecera = Buffer.alloc(6);
  cabecera.writeUInt16LE(0, 0); // reservado
  cabecera.writeUInt16LE(1, 2); // tipo: ícono
  cabecera.writeUInt16LE(imagenes.length, 4);

  let desplazamiento = 6 + 16 * imagenes.length;
  const entradas = imagenes.map(({ lado, png }) => {
    const entrada = Buffer.alloc(16);
    entrada.writeUInt8(lado >= 256 ? 0 : lado, 0);
    entrada.writeUInt8(lado >= 256 ? 0 : lado, 1);
    entrada.writeUInt8(0, 2); // sin paleta
    entrada.writeUInt8(0, 3); // reservado
    entrada.writeUInt16LE(1, 4); // planos
    entrada.writeUInt16LE(32, 6); // bits por píxel
    entrada.writeUInt32LE(png.length, 8);
    entrada.writeUInt32LE(desplazamiento, 12);
    desplazamiento += png.length;
    return entrada;
  });

  return Buffer.concat([cabecera, ...entradas, ...imagenes.map((i) => i.png)]);
}

// ---------------------------------------------------------------------------

async function main() {
  const svgIcono = await readFile(brand("rhstock-icono.svg"), "utf8");
  const logoTrazos = await generarLogoEnTrazos();
  console.log("✓ public/brand/rhstock-logo-trazos.svg");

  await mkdir(app(""), { recursive: true });
  await writeFile(app("icon.svg"), svgIcono);
  console.log("✓ src/app/icon.svg");

  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ deviceScaleFactor: 1 });

  try {
    // Íconos de la app instalable
    for (const lado of [192, 512]) {
      await writeFile(brand(`icono-${lado}.png`), await svgAPng(pagina, svgIcono, lado, { transparente: true }));
      await writeFile(brand(`icono-maskable-${lado}.png`), await svgAPng(pagina, iconoMaskable(svgIcono), lado));
      console.log(`✓ public/brand/icono-${lado}.png y icono-maskable-${lado}.png`);
    }

    // iPhone: sin transparencia y sin esquinas (iOS las redondea)
    await writeFile(app("apple-icon.png"), await svgAPng(pagina, iconoCuadrado(svgIcono), 180));
    console.log("✓ src/app/apple-icon.png");

    // Favicon con 3 tamaños
    const tamanos = [16, 32, 48];
    const pngs = [];
    for (const lado of tamanos) pngs.push({ lado, png: await svgAPng(pagina, svgIcono, lado, { transparente: true }) });
    await writeFile(app("favicon.ico"), armarIco(pngs));
    console.log("✓ src/app/favicon.ico");

    // Imagen para compartir (WhatsApp, Facebook, etc.): logo sobre fondo blanco.
    // El logo original tiene espacio vacío a la derecha, así que se recorta a lo
    // que realmente se dibuja para que quede bien centrado.
    await pagina.setViewportSize({ width: 1200, height: 630 });
    await pagina.setContent(`<!doctype html><html><body style="margin:0">${logoTrazos}</body></html>`);
    const caja = await pagina.evaluate(() => {
      const { x, y, width, height } = document.querySelector("svg").getBBox();
      return { x, y, width, height };
    });
    const logoRecortado = logoTrazos.replace(
      'viewBox="0 0 860 240" width="860" height="240"',
      `viewBox="${caja.x} ${caja.y} ${caja.width} ${caja.height}" width="${caja.width}" height="${caja.height}"`,
    );
    const anchoLogo = 900;
    const altoLogo = Math.round((anchoLogo * caja.height) / caja.width);
    const og = await dibujar(
      pagina,
      `<div style="width:1200px;height:630px;display:flex;align-items:center;justify-content:center;background:#fff">
         <img src="${comoDataUrl(logoRecortado)}" width="${anchoLogo}" height="${altoLogo}">
       </div>`,
      1200,
      630,
    );
    await writeFile(app("opengraph-image.png"), og);
    console.log("✓ src/app/opengraph-image.png");
  } finally {
    await navegador.close();
  }
}

main().catch((error) => {
  console.error("No se pudieron generar los archivos de marca:", error);
  process.exit(1);
});
