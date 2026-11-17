// Configuración general de RH Stock.
// Lo que puede cambiar entre ambientes (local, prueba, producción) viene de variables de entorno.
// Ver `.env.example` para la lista completa.

/** Dirección pública de la app. Se usa para los enlaces al compartir por WhatsApp o redes. */
export const SITIO_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://rhstock.cl";

/**
 * WhatsApp de soporte y ventas, solo números y con código de país (56).
 * Para cambiarlo, cambia NEXT_PUBLIC_WHATSAPP_SOPORTE en Vercel y en `.env.local`.
 * El valor de respaldo es solo para que el botón nunca quede roto si falta la variable.
 */
export const WHATSAPP_SOPORTE = process.env.NEXT_PUBLIC_WHATSAPP_SOPORTE || "56977766584";
