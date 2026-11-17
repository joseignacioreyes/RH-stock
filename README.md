# RH Stock

**Tu inventario con una foto.** App web de inventario por suscripción para almacenes y negocios de barrio de Puente Alto.

- Sube una foto de la boleta de compra y el stock se actualiza solo.
- Vende escaneando o con botones grandes, y el stock se descuenta solo.
- Avisos cuando un producto se está acabando o cuando sube su costo.

## Cómo se construye

Este proyecto se construye con Claude Code siguiendo `CLAUDE.md`, por fases y con previsualización al final de cada una.

| Fase | Estado |
|---|---|
| 0. Preparación | ✅ Lista (falta publicarla en rhstock.cl: ver [cuentas](docs/fase-0-cuentas.md)) |
| 1. Cuentas y seguridad | Pendiente |

## Cuentas necesarias

Paso a paso en [`docs/fase-0-cuentas.md`](docs/fase-0-cuentas.md): Vercel, dominio rhstock.cl, Supabase, API de Claude y Resend.

## Instalar en tu computador

Necesitas [Node.js](https://nodejs.org) 22 o más nuevo.

```bash
npm install
npx playwright install chromium   # solo la primera vez, para las capturas
cp .env.example .env.local        # y completa los valores
npm run dev                       # abre http://localhost:3000
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Abre la app en tu computador (http://localhost:3000) |
| `npm run build` | Prepara la versión final (lo mismo que hace Vercel) |
| `npm test` | Corre las pruebas automáticas |
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

## Crear el primer administrador

Se agrega en la Fase 1.

## Estructura

```
src/app/            Pantallas (Next.js App Router), íconos y datos de la app instalable
src/components/     Piezas reutilizables (logo, botón de WhatsApp…)
src/lib/            Configuración y funciones (con sus pruebas *.test.ts)
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
