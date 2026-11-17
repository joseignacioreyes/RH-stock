# Cuentas que necesitas crear

Estas cuentas tienen que estar **a tu nombre** (o a nombre de la SpA). Yo no puedo crearlas por ti ni inventar claves.

> 🔒 **Regla de oro:** las claves secretas (de Supabase, de Claude, de correo) **nunca se pegan en el chat ni se suben a GitHub**. Se guardan solo en Vercel y en tu computador. Cuando llegue el momento de usarlas te diré exactamente dónde ponerlas.

## Resumen

| # | Cuenta | Para qué sirve | ¿Cuándo? | Costo aproximado |
|---|---|---|---|---|
| 1 | **Vercel** | Publicar la app en internet | **Ahora** (Fase 0) | US$20 al mes (plan Pro) |
| 2 | **Dominio rhstock.cl** (NIC Chile) | La dirección de la app | **Ahora** (Fase 0) | ~$11.800 al año |
| 3 | **Supabase** | Base de datos, inicio de sesión y fotos | Antes de la Fase 1 | Gratis para construir; US$25 al mes antes de tener clientes |
| 4 | **API de Claude** | Leer las fotos de boletas y comprobantes | Antes de la Fase 3 | Se paga por uso (centavos de dólar por foto) |
| 5 | **Resend** | Enviar correos (avisos y recordatorios) | Antes de la Fase 4 | Gratis al inicio (3.000 correos al mes) |

Costo fijo cuando haya clientes: unos US$45 al mes (~$43.000 CLP) + el dominio. Está dentro del objetivo de ~$50.000 al mes.

---

## 1. Vercel (publicar la app)

1. Entra a **vercel.com** y aprieta **Sign Up**.
2. Elige **Continue with GitHub** y entra con la misma cuenta de GitHub donde está el proyecto RH-stock.
3. Elige el plan:
   - **Pro (US$20 al mes)** es el que corresponde para un negocio, porque el plan gratis (Hobby) no permite uso comercial.
   - Si prefieres esperar, puedes partir con **Hobby** mientras construimos y cambiarte a Pro **antes de cobrarle al primer cliente**.
4. **No importes el proyecto todavía.** Primero hay que pasar el trabajo de la Fase 0 a la rama principal (`main`); hoy esa rama solo tiene la guía y el logo, así que la publicación fallaría. Avísame cuando tengas la cuenta y lo dejamos listo.
5. Cuando `main` ya tenga la Fase 0: **Add New… → Project** → elige **RH-stock** → **Import**.
   - Si no aparece el repositorio: **Adjust GitHub App Permissions** y dale acceso a RH-stock.
6. Antes de apretar **Deploy**, abre **Environment Variables** y agrega:
   - `NEXT_PUBLIC_SITE_URL` = `https://rhstock.cl`
   - `NEXT_PUBLIC_WHATSAPP_SOPORTE` = `56977766584`
7. Aprieta **Deploy**. En 1 o 2 minutos te da un link del tipo `rh-stock-xxxx.vercel.app`. Ábrelo en tu celular.

Desde ese momento, **cada vez que yo suba cambios, Vercel crea solo un link de prueba**, que es el que te voy a pasar al final de cada fase.

## 2. Dominio rhstock.cl (NIC Chile)

1. Entra a **nic.cl** y busca `rhstock`.
2. Si aparece disponible, aprieta **Inscribir**. Te pide crear una cuenta con tu RUT y datos de contacto.
   - Si ya tienes la SpA creada, inscríbelo **a nombre de la SpA**.
3. Paga (unos $11.800 al año).
4. Conectarlo a Vercel (después del paso 1):
   1. En Vercel: tu proyecto → **Settings → Domains** → escribe `rhstock.cl` → **Add**. Agrega también `www.rhstock.cl`.
   2. Vercel te mostrará cómo conectarlo. Elige la opción de **Nameservers** (servidores DNS). Normalmente son `ns1.vercel-dns.com` y `ns2.vercel-dns.com`, pero copia los que te muestre Vercel.
   3. En NIC Chile: **Mis dominios → rhstock.cl → Modificar servidores DNS** y pega esos dos nombres.
   4. Puede tardar unas horas. Cuando Vercel muestre el dominio con ✅, la app estará en **https://rhstock.cl**.

## 3. Supabase (antes de la Fase 1)

1. Entra a **supabase.com** → **Start your project** → entra con **GitHub**.
2. Crea una organización llamada `RH Stock`.
   - Plan **Free** para construir. Antes de tener clientes hay que pasar a **Pro (US$25 al mes)**, porque el plan gratis pausa el proyecto si pasa una semana sin uso y no tiene respaldos diarios.
3. **New project**:
   - Nombre: `rh-stock`
   - Región: **South America (São Paulo)**, la más cercana a Chile.
   - Contraseña de la base de datos: aprieta **Generate a password**, cópiala y guárdala en un lugar seguro. **No me la mandes.**
4. Espera unos 2 minutos a que se cree.
5. Avísame. En la Fase 1 te diré exactamente qué tres valores copiar (la dirección del proyecto y dos claves) y dónde pegarlos.

## 4. API de Claude (antes de la Fase 3)

1. Entra a **platform.claude.com** y crea una cuenta con tu correo.
2. En **Billing**, carga créditos de prepago. Con US$5 a US$10 alcanza para cientos de fotos de prueba.
3. En **Limits**, pon un límite de gasto mensual (por ejemplo US$20), para no llevarte sorpresas.
4. En **API Keys → Create Key**, ponle de nombre `rh-stock`.
   - La clave se muestra **una sola vez**: cópiala y guárdala en un lugar seguro.
   - Irá en Vercel con el nombre `ANTHROPIC_API_KEY`. **No la pegues en el chat.**

## 5. Resend, para enviar correos (antes de la Fase 4)

1. Entra a **resend.com** → **Sign up** (puedes entrar con GitHub).
2. El plan gratis permite 3.000 correos al mes (100 al día), suficiente para partir.
3. Lo conectamos con `rhstock.cl` en la Fase 4. Si usas los servidores DNS de Vercel (paso 2), los datos que pide Resend se agregan en Vercel → **Domains → rhstock.cl → DNS Records**. Te guiaré en ese momento.

---

## Qué me tienes que avisar

- [ ] "Tengo la cuenta de Vercel" (y si elegiste Pro o Hobby).
- [ ] "Compré rhstock.cl" (o si no estaba disponible, para elegir otro nombre).
- [ ] Más adelante: "Tengo Supabase", "Tengo la API de Claude", "Tengo Resend".
