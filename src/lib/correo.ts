import "server-only";

// Envía correos con Resend (resend.com), usando su API directa (sin librerías extra).
// Variables: RESEND_API_KEY (secreta, solo en Vercel) y CORREO_REMITENTE (por ejemplo
// "RH Stock <avisos@rhstock.cl>"). Mientras rhstock.cl no esté verificado en Resend, se usa
// el remitente de prueba de Resend, que SOLO puede enviar al correo dueño de la cuenta de Resend.

export type ResultadoCorreo = { ok: true } | { ok: false; motivo: "sin_configurar" | "rechazado" | "error" };

const REMITENTE_PRUEBA = "RH Stock <onboarding@resend.dev>";

export async function enviarCorreo(correo: { para: string; asunto: string; html: string; texto: string }): Promise<ResultadoCorreo> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) {
    // En tu computador, sin clave: se muestra en la consola para revisar el texto.
    console.info(`[correo sin enviar: falta RESEND_API_KEY] Para: ${correo.para} · ${correo.asunto}\n${correo.texto}`);
    return { ok: false, motivo: "sin_configurar" };
  }
  try {
    const respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CORREO_REMITENTE?.trim() || REMITENTE_PRUEBA,
        to: [correo.para],
        subject: correo.asunto,
        html: correo.html,
        text: correo.texto,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (respuesta.ok) return { ok: true };
    // 403 típico: el dominio no está verificado y se intentó enviar a otra persona.
    console.error(`enviarCorreo: Resend respondió ${respuesta.status}`, (await respuesta.text()).slice(0, 300));
    return { ok: false, motivo: "rechazado" };
  } catch (error) {
    console.error("enviarCorreo:", error);
    return { ok: false, motivo: "error" };
  }
}
