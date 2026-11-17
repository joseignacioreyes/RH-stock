// Service worker de RH Stock: permite abrir la caja (/vender) sin internet.
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
