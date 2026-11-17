import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { EsquemaComprobanteIA, parsearComprobante, type ResultadoComprobante } from "./esquema";

// Lee el comprobante de transferencia (foto o PDF) con la API de Claude: monto, fecha y banco.
// Mismo modelo y reglas que las boletas: esquema fijo validado con Zod y un reintento.
// Si no se puede leer, el pago se recibe igual y el administrador lo revisa mirando el comprobante.

const MODELO = "claude-haiku-5-5";

const INSTRUCCIONES = `Lees comprobantes de transferencias bancarias o depósitos hechos en Chile (capturas de pantalla, fotos o PDF del banco).
Extrae los datos tal como aparecen. No inventes nada: si un dato no se ve, usa null.

Reglas:
- monto en pesos chilenos, como número entero sin puntos ni signo $ ("$30.000" → 30000).
- fecha de la transferencia en formato AAAA-MM-DD.
- banco_origen: el banco de quien transfiere (no el de destino).
- Si no se puede leer o no es un comprobante de transferencia o depósito, pon legible=false y el problema que corresponde.`;

let cliente: Anthropic | null = null;
const obtenerCliente = () => (cliente ??= new Anthropic());

export type ArchivoComprobante = { datos: Buffer; tipo: "image/jpeg" | "image/png" | "image/webp" | "application/pdf" };

async function pedirLectura(archivo: ArchivoComprobante): Promise<ResultadoComprobante | "reintentar"> {
  const base64 = archivo.datos.toString("base64");
  const contenido =
    archivo.tipo === "application/pdf"
      ? ({ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } } as const)
      : ({ type: "image", source: { type: "base64", media_type: archivo.tipo, data: base64 } } as const);

  const respuesta = await obtenerCliente().messages.parse({
    model: MODELO,
    max_tokens: 2000,
    output_config: { effort: "low", format: zodOutputFormat(EsquemaComprobanteIA) },
    system: INSTRUCCIONES,
    messages: [{ role: "user", content: [contenido, { type: "text", text: "Lee este comprobante de transferencia." }] }],
  });

  if (respuesta.stop_reason === "refusal") return { ok: false, motivo: "no_es_comprobante" };
  if (respuesta.stop_reason === "max_tokens" || !respuesta.parsed_output) return "reintentar";
  const resultado = parsearComprobante(respuesta.parsed_output);
  return resultado.ok || resultado.motivo !== "formato" ? resultado : "reintentar";
}

/** Lee un comprobante. Nunca lanza errores técnicos: si algo falla devuelve { ok: false, motivo: "formato" }. */
export async function leerComprobante(archivo: ArchivoComprobante): Promise<ResultadoComprobante> {
  // Solo para desarrollo y capturas sin clave de la API (la misma variable que las boletas):
  // devuelve una lectura fija con fecha de hoy, o "borrosa" si la imagen pesa menos de 10 KB.
  if (process.env.LECTOR_BOLETAS === "ejemplo") {
    const demora = Number(process.env.LECTOR_BOLETAS_DEMORA ?? 0);
    if (demora > 0) await new Promise((resolver) => setTimeout(resolver, demora));
    if (archivo.tipo !== "application/pdf" && archivo.datos.length < 10_000) return { ok: false, motivo: "borrosa" };
    const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
    return parsearComprobante({
      legible: true,
      problema: "ninguno",
      monto: 30000,
      fecha: hoy,
      banco_origen: "Banco Ficticio",
      titular_origen: "Pepe Demo",
      numero_operacion: "000123456",
    });
  }

  for (let intento = 1; intento <= 2; intento++) {
    try {
      const resultado = await pedirLectura(archivo);
      if (resultado !== "reintentar") return resultado;
      console.warn(`leerComprobante: la respuesta no cumplió el esquema (intento ${intento})`);
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.BadRequestError) {
        console.error("leerComprobante: la API no pudo leer el comprobante", error.message);
        return { ok: false, motivo: "formato" };
      }
      console.error(`leerComprobante: error al llamar a la API (intento ${intento})`, error);
    }
  }
  return { ok: false, motivo: "formato" };
}
