# Fase 7: piloto con 2 o 3 almacenes (4 semanas)

**Para qué:** saber, con almacenes reales, si RH Stock se usa de verdad y vale lo que cuesta, antes de salir a vender.

Preguntas que el piloto tiene que responder:

1. ¿Suben las boletas, sin que haya que recordárselo?
2. ¿La IA lee bien las boletas de sus mayoristas, o hay que corregir mucho?
3. ¿Usan la caja para vender, o la dejan de lado?
4. ¿Les sirven los avisos y el precio sugerido?
5. ¿Pagarían ~$25.000 + IVA al mes?

---

## 1. Antes de empezar (todo debe estar ✅)

**Cuentas y app**
- [ ] Vercel conectado, con todas las variables cargadas (ver `README.md` y `.env.example`), incluida `CRON_SECRET`.
- [ ] Clave de la API de Claude con **límite de gasto mensual** (por ejemplo US$10).
- [ ] La app abre en tu celular desde el link de Vercel (o rhstock.cl, si ya está).
- [ ] Tu cuenta de administrador tiene clave y entra al panel. El panel de uso está en **Panel de administrador → Uso del piloto**.
- [ ] Supabase: con datos reales conviene el **plan Pro**, porque el gratis no tiene respaldos diarios. Si sigues en el gratis, descarga cada semana el Excel de cada almacén como respaldo.

**Prueba tú primero (1 hora)**
- [ ] Sube 3 boletas reales de distintos mayoristas y revisa cuánto hubo que corregir.
- [ ] Vende con el escáner del celular, con los botones y por pesos (pan).
- [ ] Vende con el celular en modo avión y comprueba que la venta llegue al volver la conexión.
- [ ] Haz un cierre de caja.

**Legal**
- [ ] Completa los datos de la SpA en `/privacidad` y `/terminos` (hoy están entre corchetes), que los revise un abogado y **quita el aviso "BORRADOR"** antes de que un cliente real se registre.
- [ ] Ten a mano el procedimiento ante filtraciones (`docs/procedimiento-filtracion.md`).

---

## 2. Elegir los almacenes

Busca **2 o 3** de Puente Alto, ojalá distintos entre sí:

| Perfil | Por qué |
|---|---|
| Almacén que compra en mayorista con **boletas en papel** | Prueba la lectura de la IA con fotos difíciles |
| Negocio que recibe **facturas** de distribuidores | Prueba neto, IVA y RUT del proveedor |
| Negocio que vende **pan o verduras a granel** | Prueba la venta por pesos y los conteos |

Requisitos del dueño:
- Usa un celular Android con WhatsApp (el escáner funciona en Chrome de Android).
- Acepta probar 4 semanas y darte 15 minutos por semana para contarte cómo le va.
- **El piloto es gratis.** A cambio, te da su opinión sincera.

---

## 3. Primera visita (día 0, unos 60 minutos)

Lleva tu celular cargado y anota todo.

1. **Instalar la app:** en Chrome, abrir el link → menú ⋮ → "Agregar a la pantalla de inicio". Que quede junto a WhatsApp.
2. **Crear la cuenta con él:** su RUT, el del negocio y una clave que él recuerde. Que lea y marque los términos y la privacidad.
3. **Subir juntos 2 o 3 boletas recientes:** se crean sus primeros productos. ⏱️ Cronometra cuánto demora la primera boleta: la meta es menos de 2 minutos.
4. **Stock mínimo:** pon "Avísame cuando queden" en sus 5 productos más importantes.
5. **Vendedores:** si tiene ayudantes, agrégalos en **Más → Vendedores** con su PIN.
6. **3 ventas de prueba** en la caja: una con escáner, una con los botones y una de pan por pesos.
7. **Mostrar** "Avisos", "Mi stock" y los botones "¿Cómo se usa?" y "Ayuda por WhatsApp".
8. **Acordar la rutina:**
   - Subir **cada** boleta o factura el mismo día que llega.
   - Vender por la caja (aunque sea en el horario de más venta).
   - Un conteo del pan y la verdura una vez por semana.

Anota: su nombre, cuántos productos tiene más o menos, de qué mayoristas compra y qué fue lo que más le costó entender.

---

## 4. Cada semana (lunes, 20 minutos)

1. Abre **Uso del piloto** con "Últimos 7 días" y aprieta **Descargar a Excel** (guárdalo como respaldo de la semana).
2. Llena la tabla de seguimiento (sección 7).
3. Escríbele a cada dueño por WhatsApp con estas 3 preguntas:
   - ¿Qué fue lo más útil esta semana?
   - ¿Qué te molestó o no entendiste?
   - Del 1 al 5, ¿qué tan fácil te resultó?
4. Revisa las señales:

| Si ves esto en el panel… | Qué hacer |
|---|---|
| 0 boletas subidas | Llámalo. ¿Se le olvida? ¿Le cuesta? Ofrece una visita corta. |
| "% corregido" en rojo (más de 20%) | Pídele una foto de esa boleta. Revisa si es por la luz, el papel o el tipo de boleta, y anótalo para mejorar la lectura. |
| Muchas boletas "ingresadas a mano" | La IA no está pudiendo leer: revisa la clave de Claude y el límite de gasto. |
| 0 ventas en la caja | Pregúntale por qué. ¿Es lenta? ¿Le falta algún producto? ¿Prefiere el cuaderno? |
| Muchas "ventas sin internet" | Su conexión es mala: confirma que las ventas llegan y que el cierre cuadra. |
| Avisos creados pero pocos vistos | Muéstrale el botón "Avisos" del inicio y el número rojo. |
| Pocos días activos | Pregúntale qué días no la usó y por qué. |

---

## 5. Qué medir y la meta

| Qué | Dónde se ve | Meta en la semana 4 |
|---|---|---|
| Días activos por semana | Panel: "Días activos" | 5 o más |
| Boletas subidas por semana | Panel: "Boletas subidas" | 3 o más |
| % de productos que hubo que corregir | Panel: "% corregido" | Menos de 15% |
| Tiempo para subir una boleta | Cronómetro en las visitas | Menos de 2 minutos |
| Ventas en la caja | Panel: "Ventas" | Uso diario (si el negocio usa caja) |
| Avisos vistos | Panel: "Avisos vistos" / creados | La mitad o más |
| Precio sugerido usado | Panel: "Precios sugeridos usados" | Al menos 1 en el mes |
| Conteos | Panel: "Conteos" | Al menos 1 por semana |
| Facilidad (1 a 5) | Pregunta semanal | 4 o más |
| ¿Pagaría? | Entrevista final | Al menos 1 de cada 3 dice que sí |

---

## 6. Entrevista final (semana 4, en persona)

1. ¿Qué cambió en tu negocio desde que usas RH Stock?
2. ¿Qué parte usas más? ¿Cuál nunca usaste?
3. ¿Hubo algo que te hizo perder tiempo o rabiar?
4. ¿La app te avisó algo que no habrías notado?
5. ¿Cambiaste algún precio por la app?
6. Si mañana te la quitara, ¿la echarías de menos? (mucho / un poco / nada)
7. ¿Pagarías $25.000 + IVA al mes? Si no, ¿cuánto pagarías? ¿Qué le falta para que valga eso?
8. ¿Se la recomendarías a otro almacenero? ¿A quién?

---

## 7. Tabla de seguimiento semanal

Cópiala en una planilla, con una fila por almacén por semana.

| Semana | Almacén | Días activos | Boletas | % corregido | Ventas | Avisos vistos | Facilidad (1-5) | Lo más útil | Lo que molestó | Acción que tomé |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | | | |

---

## 8. Al terminar: ¿seguimos?

**Seguimos y salimos a vender** si:
- 2 de los 3 almacenes la usan 4 o más días por semana en la semana 4,
- el % corregido está bajo 15–20%, y
- al menos 1 dice que pagaría.

**Si no se cumple**, ordena lo que dijeron en 3 listas: lo que impide usarla (arreglar primero), lo que la haría más útil, y lo que es "bueno tener". Con eso decidimos los cambios antes de la Fase 8.

---

## 9. Cuidado con los datos durante el piloto

- **Nunca pidas claves** (ni de RH Stock ni del SII) por WhatsApp. Si alguien olvida su clave: `npm run cuenta:enlace-clave` y el enlace se envía **solo a su correo registrado**.
- El panel de uso muestra **solo números**. Para ver el detalle de un negocio (por ejemplo, para ayudar con un error), pídele permiso al dueño primero y anota quién lo vio, cuándo y para qué.
- Si algo sale mal con los datos, sigue `docs/procedimiento-filtracion.md`.
