# RH Stock

**Tu inventario con una foto.** App web de inventario por suscripción para almacenes y negocios de barrio de Puente Alto.

- Sube una foto de la boleta de compra y el stock se actualiza solo.
- Vende escaneando o con botones grandes, y el stock se descuenta solo.
- Avisos cuando un producto se está acabando o cuando sube su costo.

## Cómo se construye

Este proyecto se construye con Claude Code siguiendo `CLAUDE.md`, por fases y con previsualización al final de cada una.

| Fase | Estado |
|---|---|
| 0. Preparación | ✅ Aprobada |
| 1. Cuentas y seguridad | ✅ Aprobada |
| 2. Productos e inventario | ✅ Aprobada |
| 2b. Modo caja | Pendiente (se hará después de la Fase 3) |
| 3. Foto de la boleta | 🔍 En revisión ([capturas](previews/fase-3/index.html)); falta probar la lectura real con la clave de Claude |
| 4. Avisos y precios | 🔍 En revisión ([capturas](previews/fase-4/index.html)); el envío por correo y push se suma con Resend y Vercel |

## Cuentas necesarias

Paso a paso en [`docs/fase-0-cuentas.md`](docs/fase-0-cuentas.md): Vercel, dominio rhstock.cl, Supabase, API de Claude y Resend.

## Instalar en tu computador

Necesitas [Node.js](https://nodejs.org) 22 o más nuevo.

Necesitas además [Docker](https://www.docker.com) para la base de datos de prueba.

```bash
npm install
npx playwright install chromium   # solo la primera vez, para las capturas
npx supabase start                # base de datos de prueba en tu computador
cp .env.example .env.local        # y completa con lo que muestra "npx supabase status"
npm run seed:demo                 # carga el negocio de ejemplo Almacén Don Pepe
npm run dev                       # abre http://localhost:3000
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Abre la app en tu computador (http://localhost:3000) |
| `npm run build` | Prepara la versión final (lo mismo que hace Vercel) |
| `npm test` | Corre las pruebas automáticas (RUT, formularios, stock, costo promedio, margen, formatos) |
| `npm run test:db` | Prueba la seguridad entre negocios y el inventario en la base de datos (necesita `npx supabase start`) |
| `npm run seed:demo` | Crea o deja como nuevo el negocio de ejemplo Almacén Don Pepe |
| `npm run cuenta:admin -- --rut … --nombre "…" --correo …` | Crea la cuenta de administrador y entrega un enlace para elegir la clave |
| `npm run cuenta:enlace-clave -- --rut …` | Enlace para que alguien elija una clave nueva (enviarlo solo a su correo registrado) |
| `npm run produccion:migrar` | Aplica en el Supabase de producción las migraciones que falten (necesita `SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROYECTO`) |
| `npm run demo:boleta` | Vuelve a dibujar la boleta de ejemplo (inventada) |
| `npm run db:tipos` | Actualiza los tipos de la base de datos después de cambiar una migración |
| `npm run lint` / `npm run typecheck` | Revisan el código en busca de errores |
| `npm run capturas -- 0` | Toma las capturas de la fase indicada (con `npm run dev` abierto en otra ventana) y arma `previews/fase-N/index.html` |
| `npm run marca` | Vuelve a generar el favicon, los íconos y la imagen para compartir desde los SVG de `public/brand/` |

## Variables de entorno

Están documentadas en [`.env.example`](.env.example). En tu computador van en `.env.local` (que nunca se sube a GitHub) y en Vercel en **Settings → Environment Variables**.

## Publicar en Vercel

1. Importa el repositorio en Vercel (Next.js se detecta solo).
2. Carga las variables de entorno.
3. Cada cambio en `main` se publica en producción; cada cambio en otra rama crea un link de prueba.
4. Conecta el dominio en **Settings → Domains** (detalle en [`docs/fase-0-cuentas.md`](docs/fase-0-cuentas.md)).

## Base de datos

- Las tablas y reglas de seguridad están en `supabase/migrations/`. Cada negocio ve solo sus datos (RLS) y las pruebas están en `pruebas/db/rls.test.ts`.
- **Nadie edita el stock a mano.** El stock solo cambia con movimientos (`movimientos_stock`: compra, venta, ajuste, merma), que no se pueden cambiar ni borrar. `productos.stock_actual` y `costo_promedio` se actualizan solos con cada movimiento (costo promedio ponderado).
- **Boletas:** la foto se guarda en el espacio privado `boletas` (carpeta por negocio, enlaces firmados que vencen). La IA (`claude-haiku-5-5`, en `src/lib/lector-boletas/`) lee la foto con un esquema fijo validado con Zod; si falla dos veces, la boleta queda para revisión manual. El stock se suma solo al confirmar (`confirmar_documento`, todo o nada) y la app aprende la asociación descripción → producto (`alias_productos`).
- **Avisos:** se crean solos con cada movimiento (`alertas`): "se está acabando" al cruzar el mínimo (y se resuelve al reponer) y cambios de costo de compra mayores al % de `empresas.umbral_aviso_costo` (5% por defecto), con el precio sugerido por el margen de la categoría.
- Los empleados no ven costos: el dueño los obtiene con la función `costos_de_mi_negocio()`.
- Las personas entran con RUT y clave. Por dentro, Supabase Auth usa un correo interno armado con el RUT (`12345678-5@cuentas.rhstock.cl`); el correo real queda en la tabla `usuarios` y se usa solo para recuperar la clave.
- En el Supabase de producción: **Authentication → Sign In / Providers → desactivar "Allow new users to sign up"** (las cuentas las crea solo la app).

## Crear el primer administrador

```bash
npm run cuenta:admin -- --rut 11.111.111-1 --nombre "Nombre Apellido" --correo nombre@correo.cl
```

Muestra un enlace (dura 1 hora) para elegir la clave. Los datos se escriben al correr el comando y no quedan en el código.

## Estructura

```
src/app/            Pantallas (Next.js App Router), íconos y datos de la app instalable
src/components/     Piezas reutilizables (logo, botón de WhatsApp…)
src/lib/            Configuración y funciones (con sus pruebas *.test.ts)
src/proxy.ts        Renueva la sesión y protege las pantallas privadas
supabase/           Configuración local y migraciones de la base de datos
pruebas/db/         Pruebas de seguridad contra la base de datos
public/brand/       Logo, ícono y sus versiones PNG
scripts/            Generar íconos y tomar capturas
previews/fase-N/    Capturas y página de revisión de cada fase
docs/               Guías para José
```

## Marca

- Logo: `public/brand/rhstock-logo.svg` (y `rhstock-logo-trazos.svg`, con el texto convertido a trazos para imprenta o redes)
- Ícono: `public/brand/rhstock-icono.svg`
- Colores: verde `#0F766E`, amarillo `#FBBF24`, texto `#1F2937` (todos en `src/app/globals.css`)
- Letras: Poppins (títulos y logo) e Inter (resto)
- Soporte y ventas por WhatsApp: +56 9 7776 6584
