// Textos de los correos de RH Stock (resumen de avisos y "olvidé mi clave").
// Simples, en español y con letra grande. Sin dependencias del servidor: se prueban en plantillas-correo.test.ts.

export type AvisoCorreo = { tipo: "stock_bajo" | "costo_sube" | "costo_baja" | "pago"; mensaje: string };

const ICONO: Record<AvisoCorreo["tipo"], string> = { stock_bajo: "🔴", costo_sube: "📈", costo_baja: "📉", pago: "💳" };

export function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function marco(contenido: string, sitio: string): string {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;color:#1F2937">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0F766E">RH Stock</p>
<div style="background:#FFFFFF;border-radius:16px;padding:24px;font-size:18px;line-height:1.5">${contenido}</div>
<p style="margin:16px 0 0;font-size:14px;color:#4B5563">RH Stock · Tu inventario con una foto · <a href="${escaparHtml(sitio)}" style="color:#0F766E">${escaparHtml(sitio.replace(/^https?:\/\//, ""))}</a></p>
</div></body></html>`;
}

const boton = (texto: string, url: string) =>
  `<p style="margin:24px 0 0"><a href="${escaparHtml(url)}" style="display:inline-block;background:#0F766E;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:18px;padding:14px 24px;border-radius:12px">${escaparHtml(texto)}</a></p>`;

/** Resumen diario de avisos para el dueño. */
export function correoResumenAvisos(datos: { nombre: string; negocio: string; avisos: AvisoCorreo[]; sitio: string }) {
  const { nombre, negocio, avisos, sitio } = datos;
  const cantidad = avisos.length === 1 ? "1 aviso nuevo" : `${avisos.length} avisos nuevos`;
  const asunto = `${negocio}: ${cantidad} en RH Stock`;
  const lista = avisos
    .map((a) => `<li style="margin:0 0 12px;list-style:none">${ICONO[a.tipo]} ${escaparHtml(a.mensaje)}</li>`)
    .join("");
  const html = marco(
    `<p style="margin:0 0 16px">Hola, ${escaparHtml(nombre)}. Tienes ${cantidad} en <strong>${escaparHtml(negocio)}</strong>:</p>
<ul style="margin:0;padding:0">${lista}</ul>
${boton("Ver mis avisos", `${sitio}/avisos`)}
<p style="margin:24px 0 0;font-size:15px;color:#4B5563">Para dejar de recibir este resumen, entra a Avisos en la app y aprieta “No enviarme correos”.</p>`,
    sitio,
  );
  const texto = [
    `Hola, ${nombre}. Tienes ${cantidad} en ${negocio}:`,
    "",
    ...avisos.map((a) => `- ${a.mensaje}`),
    "",
    `Ver mis avisos: ${sitio}/avisos`,
    "",
    "Para dejar de recibir este resumen, entra a Avisos en la app y aprieta “No enviarme correos”.",
  ].join("\n");
  return { asunto, html, texto };
}

/** Enlace para elegir una clave nueva. */
export function correoRecuperarClave(datos: { nombre: string; enlace: string; sitio: string }) {
  const { nombre, enlace, sitio } = datos;
  const asunto = "Elige tu clave nueva de RH Stock";
  const html = marco(
    `<p style="margin:0 0 16px">Hola, ${escaparHtml(nombre)}.</p>
<p style="margin:0">Pediste elegir una clave nueva. Aprieta el botón (sirve por 1 hora):</p>
${boton("Elegir mi clave nueva", enlace)}
<p style="margin:24px 0 0;font-size:15px;color:#4B5563">Si no fuiste tú, no hagas nada: tu clave sigue igual. Nunca te pediremos tu clave por WhatsApp ni por correo.</p>`,
    sitio,
  );
  const texto = `Hola, ${nombre}.\n\nPediste elegir una clave nueva. Abre este enlace (sirve por 1 hora):\n${enlace}\n\nSi no fuiste tú, no hagas nada: tu clave sigue igual.`;
  return { asunto, html, texto };
}

/** Título y destino de la notificación del celular, según el tipo de aviso. */
export function notificacionDeAviso(aviso: { tipo: AvisoCorreo["tipo"]; mensaje: string; productoId: string | null }) {
  const titulos: Record<AvisoCorreo["tipo"], string> = {
    stock_bajo: "🔴 Se está acabando",
    costo_sube: "📈 Subió un costo",
    costo_baja: "📉 Bajó un costo",
    pago: "💳 Tu plan de RH Stock",
  };
  const url = aviso.tipo === "pago" ? "/mas/mi-plan" : aviso.productoId ? `/mi-stock/productos/${aviso.productoId}` : "/avisos";
  return { titulo: titulos[aviso.tipo], cuerpo: aviso.mensaje, url };
}

/** "joseignacio@gmail.com" → "jo•••@gmail.com" (para mostrar a quién llega sin escribirlo completo). */
export function ocultarCorreo(correo: string): string {
  const [usuario = "", dominio = ""] = correo.split("@");
  return `${usuario.slice(0, 2)}•••@${dominio}`;
}
