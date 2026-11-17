// Dibuja la boleta de ejemplo (inventada, con datos de src/lib/lector-boletas/ejemplo.ts).
//
//   node scripts/demo/generar-boleta.mjs
//
// Crea:
//   - scripts/demo/boleta-ejemplo.png        la boleta "escaneada" (para el demo: boleta por confirmar)
//   - public/ejemplos/boleta-bien-tomada.jpg  la misma boleta como foto bien tomada (ejemplo en "Subir boleta")

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const ITEMS = [
  ["ARROZ G1 1KG", 10, 1150],
  ["ACEITE VEG 1LT", 6, 2350],
  ["AZUCAR 1KG", 12, 1020],
  ["GALLETA CHOC 120GR", 24, 520],
  ["TE BOLSITAS X100", 4, 1890],
  ["MANI SALADO 200GR", 10, 890],
];
const pesos = (n) => "$" + new Intl.NumberFormat("es-CL").format(n);
const total = ITEMS.reduce((t, [, c, p]) => t + c * p, 0);
const neto = Math.round(total / 1.19);

const filas = ITEMS.map(
  ([d, c, p]) => `<div class="item"><div>${d}</div><div class="fila"><span>${c} x ${pesos(p)}</span><span>${pesos(c * p)}</span></div></div>`,
).join("");

const boleta = `
<div class="boleta">
  <div class="centro fuerte grande">MAYORISTA DEL SUR</div>
  <div class="centro">COMERCIAL MAYORISTA DEL SUR LTDA.</div>
  <div class="centro">R.U.T.: 77.123.456-9</div>
  <div class="centro">AV. INVENTADA 999, PUENTE ALTO</div>
  <div class="linea"></div>
  <div class="centro fuerte">BOLETA ELECTRONICA</div>
  <div class="centro fuerte">N° 004521</div>
  <div class="linea"></div>
  ${filas}
  <div class="linea"></div>
  <div class="fila"><span>NETO</span><span>${pesos(neto)}</span></div>
  <div class="fila"><span>IVA 19%</span><span>${pesos(total - neto)}</span></div>
  <div class="fila fuerte grande"><span>TOTAL</span><span>${pesos(total)}</span></div>
  <div class="linea"></div>
  <div class="centro">EFECTIVO ${pesos(total)}</div>
  <div class="centro">GRACIAS POR SU COMPRA</div>
  <div class="centro pequeno">DOCUMENTO DE EJEMPLO - NO VALIDO</div>
</div>`;

const estilos = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  .boleta { width: 420px; padding: 28px 24px 36px; background: #fdfdf8; color: #222; font: 17px/1.45 "DejaVu Sans Mono", "Courier New", monospace; }
  .centro { text-align: center; }
  .fuerte { font-weight: 700; }
  .grande { font-size: 20px; }
  .pequeno { font-size: 13px; color: #555; margin-top: 8px; }
  .linea { border-top: 2px dashed #888; margin: 10px 0; }
  .item { margin: 4px 0; }
  .fila { display: flex; justify-content: space-between; }
`;

async function main() {
  await mkdir(path.join(raiz, "public/ejemplos"), { recursive: true });
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ deviceScaleFactor: 2 });

  // 1. Boleta "escaneada"
  await pagina.setContent(`<!doctype html><html><head><style>${estilos} body{background:#fdfdf8}</style></head><body>${boleta}</body></html>`);
  await pagina.locator(".boleta").screenshot({ path: path.join(raiz, "scripts/demo/boleta-ejemplo.png") });

  // 2. Foto bien tomada: boleta completa, derecha, con luz pareja sobre un mesón
  await pagina.setViewportSize({ width: 560, height: 820 });
  await pagina.setContent(`<!doctype html><html><head><style>${estilos}
    body { width: 560px; height: 820px; display: flex; align-items: center; justify-content: center;
           background: radial-gradient(circle at 40% 30%, #d9c7a7, #b89b6e); }
    .boleta { transform: rotate(-1.5deg) scale(0.92); box-shadow: 0 10px 24px rgba(0,0,0,.25); }
  </style></head><body>${boleta}</body></html>`);
  await pagina.screenshot({ path: path.join(raiz, "public/ejemplos/boleta-bien-tomada.jpg"), type: "jpeg", quality: 80 });

  await navegador.close();
  console.log("✓ scripts/demo/boleta-ejemplo.png y public/ejemplos/boleta-bien-tomada.jpg");
}

main();
