// Dibuja un comprobante de transferencia INVENTADO (captura de pantalla de la app de un banco ficticio).
// Lo usa el negocio de ejemplo (seed:demo) y las capturas de la Fase 5.
//
//   node scripts/demo/generar-comprobante.mjs     → scripts/demo/comprobante-ejemplo.png
//
// Todo es inventado: banco, cuentas, nombres y número de operación.

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pesos = (n) => "$" + new Intl.NumberFormat("es-CL").format(n);

function html({ fecha, monto, operacion }) {
  const [anio, mes, dia] = fecha.split("-");
  return `<!doctype html><html><head><style>
    * { box-sizing: border-box; }
    body { margin: 0; width: 390px; height: 760px; background: #eef2f7; font: 16px/1.4 "DejaVu Sans", Arial, sans-serif; color: #1f2937; }
    .barra { background: #1e3a8a; color: white; padding: 18px 20px; font-weight: 700; font-size: 19px; }
    .tarjeta { margin: 18px; background: white; border-radius: 16px; padding: 22px; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .ok { width: 64px; height: 64px; border-radius: 50%; background: #16a34a; color: white; font-size: 38px; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
    h1 { text-align: center; font-size: 22px; margin: 14px 0 4px; }
    .monto { text-align: center; font-size: 34px; font-weight: 700; margin: 6px 0 16px; }
    .fila { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0; border-top: 1px solid #e5e7eb; font-size: 15px; }
    .fila span:first-child { color: #6b7280; }
    .fila span:last-child { font-weight: 600; text-align: right; }
    .pie { text-align: center; color: #6b7280; font-size: 12px; margin-top: 10px; }
  </style></head><body>
    <div class="barra">Banco Ficticio</div>
    <div class="tarjeta">
      <div class="ok">✓</div>
      <h1>Transferencia exitosa</h1>
      <div class="monto">${pesos(monto)}</div>
      <div class="fila"><span>Fecha</span><span>${dia}-${mes}-${anio} 10:42</span></div>
      <div class="fila"><span>Desde</span><span>Pepe Demo<br>Cuenta vista ****4321</span></div>
      <div class="fila"><span>Para</span><span>RH Stock SpA (ejemplo)<br>Banco de Ejemplo</span></div>
      <div class="fila"><span>Cuenta destino</span><span>00-123-45678-90</span></div>
      <div class="fila"><span>Mensaje</span><span>Pago RH Stock</span></div>
      <div class="fila"><span>N° de operación</span><span>${operacion}</span></div>
    </div>
    <div class="pie">COMPROBANTE DE EJEMPLO - NO VÁLIDO</div>
  </body></html>`;
}

/** Devuelve el PNG del comprobante. */
export async function dibujarComprobante({ fecha, monto = 30000, operacion = "000123456" }) {
  const { chromium } = await import("@playwright/test");
  const navegador = await chromium.launch();
  try {
    const pagina = await navegador.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2 });
    await pagina.setContent(html({ fecha, monto, operacion }));
    return await pagina.screenshot({ type: "png" });
  } finally {
    await navegador.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
  await writeFile(path.join(raiz, "scripts/demo/comprobante-ejemplo.png"), await dibujarComprobante({ fecha: hoy }));
  console.log("✓ scripts/demo/comprobante-ejemplo.png");
}
