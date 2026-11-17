import "server-only";
import { generateVAPIDKeys, sendNotification, WebPushError } from "web-push";
import { SITIO_URL } from "./config";
import { crearClienteAdmin } from "./supabase/admin";

// Notificaciones al celular (Web Push). Las claves VAPID se toman de VAPID_PUBLIC_KEY y
// VAPID_PRIVATE_KEY si existen; si no, se crean solas la primera vez y se guardan en la
// tabla privada claves_push (solo el servidor la lee). Así no hay que configurar nada.

type Claves = { publica: string; privada: string };
let claves: Claves | null = null;

export async function clavesPush(): Promise<Claves> {
  if (claves) return claves;
  const { VAPID_PUBLIC_KEY: publica, VAPID_PRIVATE_KEY: privada } = process.env;
  if (publica && privada) return (claves = { publica, privada });

  const admin = crearClienteAdmin();
  const { data } = await admin.from("claves_push").select("publica, privada").maybeSingle();
  if (data) return (claves = data);
  const nuevas = generateVAPIDKeys();
  await admin.from("claves_push").upsert({ id: true, publica: nuevas.publicKey, privada: nuevas.privateKey }, { onConflict: "id", ignoreDuplicates: true });
  // Si otro servidor la creó al mismo tiempo, vale la que quedó guardada.
  const { data: guardadas } = await admin.from("claves_push").select("publica, privada").single();
  return (claves = guardadas!);
}

export type Notificacion = { titulo: string; cuerpo: string; url: string };
export type SuscripcionPush = { id: string; endpoint: string; p256dh: string; auth: string };

/** Envía una notificación. Si el celular ya no la acepta (desinstaló o bloqueó), se borra su suscripción. */
export async function enviarPush(suscripcion: SuscripcionPush, notificacion: Notificacion): Promise<boolean> {
  const { publica, privada } = await clavesPush();
  try {
    await sendNotification(
      { endpoint: suscripcion.endpoint, keys: { p256dh: suscripcion.p256dh, auth: suscripcion.auth } },
      JSON.stringify(notificacion),
      { vapidDetails: { subject: SITIO_URL.startsWith("https://") ? SITIO_URL : "https://rhstock.cl", publicKey: publica, privateKey: privada }, TTL: 24 * 3600, urgency: "normal" },
    );
    return true;
  } catch (error) {
    if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
      await crearClienteAdmin().from("suscripciones_push").delete().eq("id", suscripcion.id);
    } else {
      console.error("enviarPush:", error);
    }
    return false;
  }
}
