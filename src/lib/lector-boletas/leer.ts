import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { EsquemaLecturaIA, parsearLectura, type ResultadoLectura } from "./esquema";
import { LECTURA_DE_EJEMPLO } from "./ejemplo";

// Lee la foto de una boleta o factura con la API de Claude y devuelve los datos ya validados.
// Modelo y esquema fijos (CLAUDE.md, sección 5). Si la respuesta no cumple el esquema se
// reintenta una vez; si vuelve a fallar, la boleta queda para "revisión manual".

const MODELO = "claude-haiku-5-5";

const INSTRUCCIONES = `Lees fotos de boletas y facturas de COMPRA de almacenes de barrio en Chile (mayoristas, distribuidores, ferias).
Extrae los datos tal como aparecen en el documento. No inventes nada: si un dato no se ve, usa null.

Reglas:
- Montos en pesos chilenos, como números enteros sin puntos ni signo $ ("$1.350" → 1350).
- En Chile el punto separa miles y la coma los decimales ("2,5 KG" → cantidad 2.5).
- Cada línea de producto: la descripción tal cual, la cantidad, el precio de UNA unidad y el total de la línea.
  Si la línea dice "10 x 1.150" la cantidad es 10 y el precio unitario 1150.
- No incluyas como productos los descuentos, la propina, el vuelto, el IVA ni los subtotales.
- fecha en formato AAAA-MM-DD.
- tipo: "factura" si dice FACTURA; si no, "boleta".
- Si la foto está borrosa, oscura, cortada o no es una boleta/factura, pon legible=false, el problema que corresponde y items vacío.`;

let cliente: Anthropic | null = null;
const obtenerCliente = () => (cliente ??= new Anthropic());

export type ImagenBoleta = { datos: Buffer; tipo: "image/jpeg" | "image/png" | "image/webp" };

async function pedirLectura(imagen: ImagenBoleta): Promise<ResultadoLectura | "reintentar"> {
  const respuesta = await obtenerCliente().messages.parse({
    model: MODELO,
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(EsquemaLecturaIA) },
    system: INSTRUCCIONES,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: imagen.tipo, data: imagen.datos.toString("base64") } },
          { type: "text", text: "Lee esta boleta o factura de compra." },
        ],
      },
    ],
  });

  if (respuesta.stop_reason === "refusal") return { ok: false, motivo: "no_es_documento" };
  if (respuesta.stop_reason === "max_tokens" || !respuesta.parsed_output) return "reintentar";

  const resultado = parsearLectura(respuesta.parsed_output);
  return resultado.ok || resultado.motivo !== "formato" ? resultado : "reintentar";
}

/**
 * Lee una boleta. Nunca lanza errores técnicos hacia la pantalla: si algo falla, devuelve
 * { ok: false, motivo: "formato" } y la boleta se ofrece para ingresar a mano.
 */
export async function leerBoleta(imagen: ImagenBoleta): Promise<ResultadoLectura> {
  // Solo para desarrollo y capturas sin clave de la API: LECTOR_BOLETAS=ejemplo devuelve una lectura fija
  // (y "foto borrosa" si la imagen pesa menos de 10 KB, para poder ver ese mensaje).
  if (process.env.LECTOR_BOLETAS === "ejemplo") {
    const demora = Number(process.env.LECTOR_BOLETAS_DEMORA ?? 0);
    if (demora > 0) await new Promise((resolver) => setTimeout(resolver, demora));
    return imagen.datos.length < 10_000 ? { ok: false, motivo: "borrosa" } : parsearLectura(LECTURA_DE_EJEMPLO);
  }

  for (let intento = 1; intento <= 2; intento++) {
    try {
      const resultado = await pedirLectura(imagen);
      if (resultado !== "reintentar") return resultado;
      console.warn(`leerBoleta: la respuesta no cumplió el esquema (intento ${intento})`);
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        console.error("leerBoleta: falta o es inválida ANTHROPIC_API_KEY");
        return { ok: false, motivo: "formato" };
      }
      if (error instanceof Anthropic.BadRequestError) {
        console.error("leerBoleta: la API rechazó la imagen", error.message);
        return { ok: false, motivo: "formato" };
      }
      // Límite de uso, servidor ocupado o sin conexión: el SDK ya reintentó; probamos una vez más.
      console.error(`leerBoleta: error al llamar a la API (intento ${intento})`, error);
    }
  }
  return { ok: false, motivo: "formato" };
}
