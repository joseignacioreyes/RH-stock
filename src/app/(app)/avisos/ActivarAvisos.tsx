"use client";

import { useEffect, useState } from "react";
import { clasesBoton } from "@/components/ui/Boton";
import { guardarSuscripcionPush, probarAvisoEnCelular, quitarSuscripcionPush } from "./acciones";

type Estado = "cargando" | "no_soportado" | "iphone_instalar" | "bloqueado" | "inactivo" | "activo";

/** La clave pública VAPID viene en base64 "url"; el navegador la pide como bytes. */
function aBytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const binario = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

async function registro() {
  return navigator.serviceWorker.register("/sw.js").then(() => navigator.serviceWorker.ready);
}

/** Tarjeta "Recibir avisos en este celular": pide permiso y deja el celular listo para las notificaciones. */
export function ActivarAvisos({ clavePublica }: { clavePublica: string }) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vigente = true;
    (async () => {
      const soporta = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      const esIphone = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const instalada = window.matchMedia("(display-mode: standalone)").matches;
      let siguiente: Estado;
      if (!soporta) siguiente = esIphone && !instalada ? "iphone_instalar" : "no_soportado";
      else if (Notification.permission === "denied") siguiente = "bloqueado";
      else {
        const suscripcion = await (await registro()).pushManager.getSubscription().catch(() => null);
        if (suscripcion) await guardarSuscripcionPush(suscripcion.toJSON()).catch(() => null); // por si cambió la persona conectada
        siguiente = suscripcion ? "activo" : "inactivo";
      }
      if (vigente) setEstado(siguiente);
    })();
    return () => {
      vigente = false;
    };
  }, []);

  async function activar() {
    setOcupado(true);
    setMensaje(null);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "bloqueado" : "inactivo");
        return;
      }
      const suscripcion = await (await registro()).pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(clavePublica) });
      const { ok } = await guardarSuscripcionPush(suscripcion.toJSON());
      if (!ok) throw new Error("no se guardó");
      setEstado("activo");
      setMensaje("✅ Listo, este celular recibirá los avisos.");
    } catch {
      setMensaje("No pudimos activar los avisos. Revisa tu internet e intenta de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  async function probar() {
    setOcupado(true);
    const { enviadas } = await probarAvisoEnCelular().catch(() => ({ enviadas: 0 }));
    setMensaje(enviadas > 0 ? "✅ Te enviamos un aviso de prueba. Debería aparecer en unos segundos." : "No pudimos enviar el aviso. Intenta activar de nuevo.");
    setOcupado(false);
  }

  async function desactivar() {
    setOcupado(true);
    const suscripcion = await (await registro()).pushManager.getSubscription().catch(() => null);
    if (suscripcion) {
      await quitarSuscripcionPush(suscripcion.endpoint).catch(() => null);
      await suscripcion.unsubscribe().catch(() => null);
    }
    setEstado("inactivo");
    setMensaje("Listo, este celular ya no recibirá avisos.");
    setOcupado(false);
  }

  if (estado === "cargando" || estado === "no_soportado") return null;

  return (
    <section className="mb-6 rounded-2xl bg-fondo p-5 shadow-sm" aria-label="Avisos en este celular">
      {estado === "activo" ? (
        <>
          <p className="text-lg font-semibold text-texto">📱 Este celular recibe los avisos</p>
          <div className="mt-3 space-y-2">
            <button type="button" onClick={probar} disabled={ocupado} className={clasesBoton("secundario")}>
              <span aria-hidden="true" className="text-2xl leading-none">
                🔔
              </span>
              Mandarme un aviso de prueba
            </button>
            <button type="button" onClick={desactivar} disabled={ocupado} className="min-h-12 w-full text-lg font-semibold text-texto-suave underline">
              No recibir avisos en este celular
            </button>
          </div>
        </>
      ) : estado === "inactivo" ? (
        <>
          <p className="text-lg font-semibold text-texto">📱 ¿Quieres que te avisemos en el celular?</p>
          <p className="mt-1 text-base text-texto-suave">Como un mensaje de WhatsApp, aunque no tengas la app abierta.</p>
          <button type="button" onClick={activar} disabled={ocupado} className={clasesBoton("principal", "mt-3")}>
            <span aria-hidden="true" className="text-2xl leading-none">
              🔔
            </span>
            {ocupado ? "Un momento…" : "Sí, avisarme en este celular"}
          </button>
        </>
      ) : estado === "bloqueado" ? (
        <p className="text-lg text-texto">
          🔕 Los avisos están bloqueados en este celular. Para activarlos: toca el candado 🔒 junto a la dirección, luego{" "}
          <strong>Permisos → Notificaciones → Permitir</strong>.
        </p>
      ) : (
        <p className="text-lg text-texto">
          📱 En iPhone, para recibir avisos primero agrega RH Stock a tu pantalla de inicio: botón <strong>Compartir</strong> →{" "}
          <strong>Agregar a inicio</strong>. Después abre la app desde ahí.
        </p>
      )}
      {mensaje && (
        <p className="mt-3 text-base text-texto" role="status">
          {mensaje}
        </p>
      )}
    </section>
  );
}
