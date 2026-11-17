// Service worker de RH Stock: permite abrir la caja (/vender) sin internet y muestra los avisos
// que llegan al celular (notificaciones push).
// - La pantalla /vender: primero internet; si no hay, la última versión guardada.
// - Archivos de la app (_next/static, íconos): desde lo guardado, porque no cambian.
// Las ventas sin internet se guardan en IndexedDB (src/lib/caja/navegador.ts), no aquí.

const CACHE = "rh-stock-caja-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  const url = new URL(pedido.url);
  if (pedido.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/")) {
    evento.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const guardada = await cache.match(pedido);
        if (guardada) return guardada;
        const respuesta = await fetch(pedido);
        if (respuesta.ok) cache.put(pedido, respuesta.clone());
        return respuesta;
      }),
    );
    return;
  }

  if (pedido.mode === "navigate" && url.pathname === "/vender") {
    evento.respondWith(
      fetch(pedido)
        .then((respuesta) => {
          if (respuesta.ok && !respuesta.redirected) {
            const copia = respuesta.clone();
            caches.open(CACHE).then((cache) => cache.put("/vender", copia));
          }
          return respuesta;
        })
        .catch(async () => (await caches.match("/vender")) ?? Response.error()),
    );
  }
});

// ---------------------------------------------------------------------------
// Avisos al celular: el servidor envía { titulo, cuerpo, url } (src/lib/push.ts).
// ---------------------------------------------------------------------------
self.addEventListener("push", (evento) => {
  let datos = { titulo: "RH Stock", cuerpo: "Tienes un aviso nuevo.", url: "/avisos" };
  try {
    datos = { ...datos, ...evento.data.json() };
  } catch {
    /* aviso sin datos: se muestra el texto por defecto */
  }
  evento.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      icon: "/brand/icono-192.png",
      badge: "/brand/icono-192.png",
      lang: "es-CL",
      data: { url: datos.url },
    }),
  );
});

// Al tocar el aviso: abre la app en la pantalla del aviso (o usa la ventana ya abierta).
self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const destino = new URL(evento.notification.data?.url || "/avisos", self.location.origin);
  if (destino.origin !== self.location.origin) return;
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => new URL(v.url).origin === self.location.origin);
      if (abierta) return abierta.navigate(destino.href).then((v) => (v ?? abierta).focus());
      return self.clients.openWindow(destino.href);
    }),
  );
});
