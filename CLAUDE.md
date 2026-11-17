# Prompt para construir "RH Stock": app web de inventario para almacenes de barrio

> Este archivo es la guía del proyecto RH Stock. Para empezar, pide: "Empieza por la Fase 0".

**Marca:** RH Stock (de Reyes Herrera). Eslogan: "Tu inventario con una foto". Dominio previsto: rhstock.cl. Como "RH" en Chile se asocia a Recursos Humanos, el logo, los textos y la portada deben dejar claro desde el primer vistazo que es una app de inventario para almacenes.

### Logo y colores (ya diseñados, úsalos tal cual)

- Archivos que te entrego: `rhstock-logo.svg` (logo horizontal con eslogan) y `rhstock-icono.svg` (ícono cuadrado: una caja abierta con cinta amarilla y barras de stock). Ponlos en `public/brand/`.
- Desde el ícono genera: favicon, íconos de la app instalable (192 y 512 px, y la versión "maskable") y la imagen para compartir en WhatsApp/redes (1200×630 con el logo sobre fondo blanco).
- El texto del logo usa la fuente **Poppins** (700 para "RH Stock", 400 para el eslogan). Cárgala con `next/font`. Si el SVG se usa fuera de la web, convierte el texto a trazos.
- Colores:
  - Verde principal `#0F766E`: botones principales, encabezados y marca.
  - Amarillo `#FBBF24`: solo para destacar (alertas de "por acabarse", insignias). Nunca texto amarillo sobre blanco.
  - Texto `#1F2937`, texto secundario `#4B5563`, fondos `#FFFFFF` y `#F3F4F6`.
  - Rojo `#DC2626` para "falta" o error, verde `#16A34A` para "al día" u "OK".
- Tipografía de la app: Poppins para títulos e Inter o la fuente del sistema para el resto.

## 0. Regla número uno: la web tiene que ser muy simple

Los usuarios son dueños de almacenes y vendedores, muchos mayores de 50 años, que usan el celular para WhatsApp y poco más. **Si una persona así no entiende una pantalla en 5 segundos, la pantalla está mal.** Aplica estas reglas en todas las fases:

1. **Una pantalla, una tarea.** Nada de menús con muchas opciones. La pantalla de inicio tiene solo 4 botones grandes con ícono y texto:
   - 📷 **Subir boleta** (lo que compré)
   - 🛒 **Vender**
   - 📦 **Mi stock** (qué tengo y qué falta)
   - 🔔 **Avisos**
   El resto (ajustes, pagos, vendedores, exportar) va en un botón "Más" al final.
2. **Botones grandes:** mínimo 56 px de alto, ancho completo en el celular y separados entre sí. Letra base de 18 px; nunca menor a 16 px.
3. **Palabras simples, nunca técnicas.** Usa: "Lo que compré", "Lo que vendí", "Me queda", "Se está acabando", "Guardar", "Listo". Evita: "SKU", "inventario valorizado", "transacción", "sincronizar", "dashboard", "CRUD", "ítem".
4. **Siempre un camino claro:** un botón principal por pantalla (verde y grande), y como máximo uno secundario. Botón "Volver" visible arriba a la izquierda.
5. **Ícono + texto siempre juntos.** Ningún botón solo con ícono.
6. **Confirmaciones visibles y amables:** "✅ Listo, se sumaron 12 productos a tu stock". Errores que digan qué hacer: "La foto salió borrosa. Intenta de nuevo con más luz".
7. **Nada de formularios largos.** Máximo 3 campos por pantalla. Si hace falta más, se divide en pasos ("Paso 1 de 3").
8. **Pocos números y con significado:** en lugar de tablas, tarjetas como "🔴 Te faltan 5 productos" con un botón "Ver cuáles".
9. **Ayuda en el mismo lugar:** cada pantalla importante tiene un botón "¿Cómo se usa?" que muestra 3 pasos con dibujos simples, y un botón fijo "Ayuda por WhatsApp" que abre un chat con el soporte.
   - **WhatsApp de soporte y ventas: +56 9 7776 6584.** Link: `https://wa.me/56977766584?text=Hola%2C%20necesito%20ayuda%20con%20RH%20Stock`
   - Guarda el número en una sola variable de configuración (`NEXT_PUBLIC_WHATSAPP_SOPORTE=56977766584`), para cambiarlo en un solo lugar.
   - El mismo botón va en la portada pública con otro texto: "Quiero probar RH Stock".
10. **Primer uso guiado:** al entrar por primera vez, un recorrido de 3 pantallas, y luego "Sube tu primera boleta", con un ejemplo de foto bien tomada.
11. **Nada se borra sin preguntar,** con un mensaje claro: "¿Seguro que quieres borrar el pan? Esto no se puede deshacer".
12. **Accesibilidad:** buen contraste (WCAG AA), compatible con el zoom del celular, y que funcione con una sola mano.
13. **Prueba de la abuela:** al final de cada fase, revisa cada pantalla y pregúntate: "¿Mi abuela podría usar esto sin ayuda?" Si la respuesta es no, simplifica antes de entregar.

---

## 1. Tu rol

Eres el desarrollador principal de una app web SaaS (software por suscripción) para pequeños negocios de Puente Alto, Chile: almacenes, botillerías, minimarkets, pastelerías, peluquerías y negocios que compran mercadería. El dueño del producto es José, que no es programador experto. Por lo tanto:

- Trabaja por fases, en el orden de la sección 9. No avances a la siguiente fase sin mostrarme el resultado y esperar mi OK.
- Antes de cada fase, explica en 5 a 10 líneas simples qué vas a hacer y qué voy a poder probar al final.
- Al terminar cada fase, dame los pasos exactos para probarla (qué abrir, qué apretar y qué debería ver).
- Si algo requiere una cuenta, una clave de API o un pago de mi parte, detente y dime exactamente qué crear y dónde. Nunca inventes claves.
- Escribe el código y los comentarios en español. Los nombres de variables y funciones pueden ir en inglés.
- Prefiere soluciones simples y baratas, porque el costo fijo objetivo es de unos $50.000 CLP al mes.

## 2. Qué problema resuelve

El dueño de un almacén compra mercadería en mayoristas (Alvi, Mayorista 10, ferias, distribuidores) y recibe boletas o facturas, muchas en papel. Hoy no sabe con exactitud qué le queda, qué le falta, cuánto le cuesta cada producto ni si su precio de venta es bueno. Además, no quiere aprender un sistema complicado como un ERP.

**La promesa:** "Sácale una foto a tu boleta y tu inventario se actualiza solo."

## 3. Usuarios y roles

- **Dueño del negocio (cliente):** usa la app todos los días, sobre todo desde el celular.
- **Empleado del negocio (opcional):** puede registrar compras y ventas, pero no ve costos ni pagos de la suscripción.
- **Administrador (José):** ve todos los clientes, el estado de los pagos y las métricas de uso. No ve el detalle del negocio de un cliente salvo que el cliente lo autorice para dar soporte.
- **Contadora (socia):** puede exportar las facturas de compra de los clientes que contrataron el servicio de contabilidad.

## 4. Funciones

### MVP (lo mínimo para cobrar)

1. **Registro e inicio de sesión con RUT y contraseña.**
   - El RUT se valida con dígito verificador (módulo 11) y se guarda normalizado (sin puntos, con guion).
   - La contraseña es propia de la app. **Nunca pedir ni guardar la clave del SII.**
   - Pedir un correo para recuperar la contraseña.
   - Aceptar los términos y la política de privacidad al registrarse, con casillas separadas y sin marcar por defecto.
2. **Catálogo de productos:** nombre, categoría, unidad (unidad, kg, litro, caja), código de barras (opcional), stock actual, stock mínimo, costo promedio y precio de venta.
3. **Subir una boleta o factura de compra con una foto:**
   - La foto se sube desde el celular (cámara o galería).
   - La IA extrae proveedor, RUT del proveedor si aparece, fecha, número de documento, ítems (descripción, cantidad, precio unitario, total), neto, IVA y total.
   - Pantalla de confirmación: el usuario revisa cada ítem, lo asocia a un producto existente o crea uno nuevo, corrige lo que esté mal y confirma.
   - Solo después de confirmar se suma el stock y se recalcula el costo promedio ponderado.
   - La app aprende la asociación entre la descripción del proveedor y el producto, para sugerirla la próxima vez.
   - Se guarda la imagen original como respaldo.
4. **Modo caja: ventas que descuentan stock solas, sin editar nada a mano.** Esta es la segunda función más importante después de la foto de la boleta. La regla es que **nadie debe "editar el stock"**: el stock se mueve solo con compras (foto de la boleta), ventas (modo caja) y conteos.
   - **Pantalla de caja** pensada para vender en menos de 3 segundos por producto:
     - **Escáner de códigos de barras con la cámara del celular** (librería en el navegador, sin app nativa). Cada lectura suma 1 unidad al carrito, y si se escanea dos veces, suma 2.
     - **Lector de códigos USB o Bluetooth** (opcional, cuestan poco): funciona como un teclado, así que el campo de búsqueda debe aceptar la lectura y agregar el producto automáticamente al recibir un "Enter".
     - **Grilla de "más vendidos"**: botones grandes con foto o nombre de los ~20 productos que más se venden (se calcula solo) para lo que no tiene código: pan, cigarros sueltos, bebidas frías, etc. Un toque = 1 unidad.
     - **Productos a granel** (pan, verduras, fiambre): venta por peso o por monto ("$1.000 de pan"), y la app calcula la cantidad con el precio por kg.
     - Botón "Cobrar": registra la venta y descuenta el stock en una sola transacción. Opciones de pago efectivo, débito, crédito o transferencia, solo como registro (sin integrar máquinas de pago).
   - **Varios vendedores en el mismo equipo:** cada vendedor entra con un **PIN de 4 dígitos** sobre la sesión del negocio (sin escribir RUT y clave cada vez). Cada venta queda con el vendedor que la hizo, para ver ventas por vendedor y diferencias de caja.
   - **Modo sin internet:** el modo caja debe seguir funcionando si se cae internet. Guarda las ventas en el dispositivo (IndexedDB) y las sincroniza al volver la conexión, sin duplicarlas (cada venta con un id único generado en el dispositivo).
   - **Cierre de caja diario:** total vendido por medio de pago y por vendedor, más un campo para el efectivo contado, que muestra la diferencia.
   - **Conteo rápido en lugar de editar:** para lo que no se registra en caja (mermas, productos a granel, consumo propio), un "conteo" por categoría desde el celular. El usuario escribe cuánto hay realmente, y la app registra la diferencia como movimiento de ajuste con su motivo. Nunca se sobrescribe el stock sin dejar el movimiento registrado.
   - **Ajustes rápidos** con motivo predefinido: merma, vencido, consumo propio o regalo.
5. **Panel principal:**
   - Qué falta: productos bajo el stock mínimo, en rojo.
   - Qué sobra: productos sin movimiento en 30 días.
   - Valor total del inventario a costo.
   - Margen por producto: (precio de venta − costo) / precio de venta.
   - Últimas compras.
6. **Alertas por notificación push** (app web instalable) y por correo cuando:
   - un producto queda bajo el stock mínimo;
   - el costo de compra de un producto subió o bajó más de un X% (configurable, 5% por defecto) respecto de la compra anterior.
7. **Recomendación de precio de venta:** a partir del costo promedio y de un margen objetivo por categoría (configurable), y avisando si el precio actual queda bajo ese margen. Las sugerencias deben explicarse en una frase, por ejemplo: "Tu costo subió de $1.200 a $1.350. Con tu margen objetivo de 25%, el precio sugerido es $1.800".
8. **Suscripción y pagos por transferencia:**
   - Cada negocio tiene un plan, una fecha de pago y un estado (al día, por vencer, atrasado o suspendido).
   - Recordatorio automático por correo y push 3 días antes del vencimiento, con los datos de transferencia de la empresa.
   - El cliente sube la foto o el PDF de su comprobante de transferencia, y la IA extrae monto, fecha y banco.
   - El administrador confirma el pago con un clic.
   - Pasados 10 días de atraso (configurable), el acceso queda en modo "solo lectura" hasta que se confirme el pago. Nunca se borran los datos por atraso.
9. **Exportar** productos, compras y movimientos a Excel o CSV.

### Fase 2 (después de tener clientes pagando)

10. **Precios del mercado cercano:**
    - Fuente 1: datos abiertos de ODEPA (precios al consumidor en ferias y supermercados de la Región Metropolitana). Importarlos con una tarea programada semanal.
    - Fuente 2: precios de compra anónimos y agregados de los propios clientes, por comuna y proveedor. Solo de clientes que aceptaron compartir datos anónimos (consentimiento aparte y opcional), y mostrando un promedio solo cuando haya al menos 3 negocios distintos, para que nadie pueda identificar a otro.
    - **No hacer scraping de sitios de supermercados ni de mayoristas.**
    - Alertas del tipo: "El aceite de 1 L subió 8% este mes en compras de negocios de Puente Alto".
11. **Venta por voz:** el vendedor dice "dos Coca-Cola de un litro y medio y un kilo de pan", la IA lo convierte en un carrito y el vendedor confirma con un toque.
11b. **Importar ventas desde otro sistema:** si el cliente ya usa una caja o un sistema de boletas que exporta un archivo de ventas (CSV o Excel), permitir subirlo y descontar el stock automáticamente, asociando productos por código de barras o por nombre (con la misma pantalla de confirmación y aprendizaje de alias que en las compras).
11c. **Ventas por diferencia** para negocios que no quieren usar el modo caja: stock anterior + compras − conteo actual = vendido. Así se estiman ventas y márgenes solo con fotos de boletas y un conteo semanal.
12. **Exportación para la contadora:** compras del mes con neto e IVA, en el formato que ella pida.
13. **Panel para varios locales** (un dueño con 2 o más negocios).

### Fuera del alcance (no construir)

- No emitir boletas ni facturas electrónicas al SII, porque eso requiere certificación del SII y es otro proyecto.
- No conectarse con el SII usando la clave tributaria del cliente.
- No ofrecer app nativa en las tiendas por ahora: solo app web instalable.

## 5. Tecnología

- **Frontend y backend:** Next.js (App Router) con TypeScript, desplegado en Vercel (plan Pro, porque el plan gratis no permite uso comercial).
- **Base de datos, autenticación y archivos:** Supabase (Postgres, Auth y Storage).
- **Seguridad entre clientes:** Row Level Security (RLS) en todas las tablas, para que cada negocio vea solo sus datos. Es obligatorio y debe tener pruebas automáticas.
- **Lectura de boletas y comprobantes:** API de Claude con el modelo `claude-haiku-5-5`, enviando la imagen y pidiendo un JSON con un esquema fijo. Validar el JSON con Zod. Si la respuesta no cumple el esquema, reintentar una vez y luego marcar el documento como "revisión manual".
- **Interfaz:** Tailwind CSS. Pensada primero para celular: botones grandes, letra grande y pocos pasos.
- **App web instalable (PWA):** manifest, service worker y Web Push (con claves VAPID) para las notificaciones.
- **Correos:** un proveedor de correo transaccional en su plan gratis al inicio.
- **Tareas programadas:** Vercel Cron o Supabase Scheduled Functions, para los recordatorios de pago, las alertas diarias y la importación de ODEPA.
- **Moneda y formato:** pesos chilenos sin decimales, con separador de miles con punto ($1.350), fechas DD-MM-AAAA y zona horaria America/Santiago.
- **Claves y secretos:** solo en variables de entorno, con un `.env.example` documentado. Nunca subirlos al repositorio.

## 6. Modelo de datos (tablas mínimas)

Todas las tablas de negocio llevan `empresa_id` y tienen RLS por empresa. Usa `created_at` y `updated_at` en todas.

- `empresas`: id, rut, razon_social, nombre_fantasia, comuna, plan, estado_suscripcion, dia_pago, creada_en
- `usuarios`: id (de Supabase Auth), empresa_id, rut, nombre, correo, rol (dueño, empleado o admin)
- `consentimientos`: usuario_id, tipo (terminos, privacidad, datos_anonimos), version, aceptado (sí o no), fecha, ip
- `categorias`: empresa_id, nombre, margen_objetivo
- `productos`: empresa_id, nombre, categoria_id, unidad, codigo_barras, stock_actual, stock_minimo, costo_promedio, precio_venta, activo
- `proveedores`: empresa_id, nombre, rut
- `documentos_compra`: empresa_id, proveedor_id, tipo (boleta o factura), numero, fecha, neto, iva, total, imagen_url, estado (procesando, por_confirmar, confirmado, revision_manual), datos_extraidos (JSON)
- `items_documento`: documento_id, descripcion_original, cantidad, precio_unitario, total, producto_id
- `alias_productos`: empresa_id, proveedor_id, descripcion_original, producto_id (para aprender las asociaciones)
- `vendedores`: empresa_id, nombre, pin_hash, activo
- `ventas`: empresa_id, id_local (uuid generado en el dispositivo, único, para no duplicar al sincronizar), vendedor_id, fecha, total, medio_pago, sincronizada_en
- `items_venta`: venta_id, producto_id, cantidad, precio_unitario, total
- `cierres_caja`: empresa_id, fecha, vendedor_id, total_sistema, efectivo_contado, diferencia
- `movimientos_stock`: empresa_id, producto_id, tipo (compra, venta, ajuste, merma), cantidad (+/−), costo_unitario, referencia_id, motivo, usuario_id
- `alertas`: empresa_id, tipo, producto_id, mensaje, leida, enviada_push, enviada_correo
- `suscripciones_push`: usuario_id, endpoint, claves
- `pagos`: empresa_id, periodo (AAAA-MM), monto, estado (pendiente, informado, confirmado o rechazado), comprobante_url, datos_extraidos, confirmado_por, fecha_confirmacion
- `precios_mercado` (fase 2): fuente (odepa o agregado_clientes), producto_normalizado, comuna, precio_promedio, n_negocios, fecha

El stock se calcula siempre a partir de `movimientos_stock` (fuente de verdad). `productos.stock_actual` es solo un valor cacheado que se actualiza dentro de la misma transacción.

## 7. Requisitos legales (Chile)

La Ley 21.719 de protección de datos personales rige desde el 1 de diciembre de 2026. La app debe:

1. Tener una **política de privacidad** y **términos y condiciones** en páginas públicas (`/privacidad` y `/terminos`), escritos en lenguaje simple. Redacta un borrador que diga:
   - quién es el responsable (la SpA, con su RUT y correo de contacto);
   - qué datos se recogen y para qué;
   - cuánto tiempo se guardan;
   - con qué proveedores se comparten (hosting, base de datos, IA, correo);
   - cómo ejercer los derechos de acceso, rectificación, supresión, oposición y portabilidad;
   - condiciones de pago, suspensión por atraso y término del servicio.
   Marca el borrador como "BORRADOR: revisar antes de publicar".
2. Pedir consentimiento expreso al registrarse, y uno separado y opcional para compartir datos anónimos de precios.
3. Tener una página **"Mis datos"** para que el usuario descargue todos sus datos (exportación completa) y pida eliminar su cuenta. Al eliminarla, borrar los datos y las imágenes en un plazo definido, salvo los respaldos de pagos que la ley tributaria obliga a guardar.
4. Recoger solo los datos necesarios. Las boletas pueden traer datos personales del proveedor o del cliente: guardarlas en un bucket privado, con URLs firmadas que expiren.
5. Contraseñas: usar solo el hash de Supabase Auth. Agregar límite de intentos de inicio de sesión. Exigir HTTPS en todo.
6. Llevar un registro de accesos del administrador a los datos de un cliente (quién, cuándo y para qué).
7. Dejar documentado un procedimiento simple ante una filtración: qué revisar y a quién avisar.

## 8. Calidad

- Pruebas automáticas como mínimo para: sincronización de ventas sin internet (sin duplicados), validación de RUT, cálculo del costo promedio ponderado, cálculo del stock, recomendación de precio, RLS (un usuario de la empresa A no puede leer ni escribir datos de la empresa B) y el parser del JSON de la IA.
- Datos de ejemplo: ver la sección 8b (perfil de ejemplo).
- Mensajes de error en español y amables. Nunca mostrar errores técnicos al usuario final.
- La app debe funcionar bien en un celular Android de gama baja y con conexión lenta (imágenes comprimidas antes de subirlas, máximo ~1.500 px por lado).
- Un `README.md` con cómo instalar, configurar las variables, desplegar en Vercel y crear el primer administrador.

## 8b. Perfil de ejemplo (créalo en la Fase 1 y complétalo en cada fase)

Crea un **negocio ficticio completo** para probar, para las capturas de cada fase y para mostrárselo a clientes en las ventas. Todo es inventado: ningún RUT, nombre ni teléfono real. Genéralo con un script de seed que se pueda volver a correr (`npm run seed:demo`) y que deje el demo siempre igual.

**Negocio:** Almacén Don Pepe
- RUT empresa (ficticio, con dígito verificador válido): 76.543.210-3
- Comuna: Puente Alto. Dirección: "Av. Ejemplo 1234" (inventada).
- Plan: Mensual, estado "al día", día de pago 5.

**Usuarios de ejemplo** (las claves solo existen en el entorno de prueba y nunca en producción):
- Dueño: Pepe Demo, RUT 12.345.678-5, clave `Demo1234`.
- Vendedora: Carla, PIN `1111`.
- Vendedor: Matías, PIN `2222`.
- Administrador de RH Stock: cuenta de José. Créala con los datos que él entregue en la Fase 1; no inventes una.

**Categorías con margen objetivo:**

| Categoría | Ícono | Margen objetivo |
|---|---|---|
| Bebidas y jugos | 🥤 | 25% |
| Abarrotes (arroz, fideos, aceite, azúcar) | 🍚 | 18% |
| Lácteos y huevos | 🥛 | 20% |
| Panadería | 🍞 | 30% |
| Fiambrería y quesos | 🧀 | 30% |
| Snacks y dulces | 🍫 | 35% |
| Frutas y verduras | 🥬 | 35% |
| Congelados y helados | 🧊 | 30% |
| Limpieza del hogar | 🧽 | 25% |
| Aseo personal | 🧴 | 25% |
| Mascotas | 🐶 | 25% |
| Otros | 📦 | 25% |

**Productos de ejemplo:** 40 productos repartidos en las categorías, con nombres genéricos (por ejemplo "Bebida cola 1,5 L", "Arroz grado 1 1 kg", "Pan marraqueta (kg)", "Leche entera 1 L", "Huevos bandeja 30", "Detergente 3 L") y con precios de costo y de venta inventados pero creíbles para un almacén de barrio en pesos chilenos. No uses marcas registradas reales en los nombres. Incluye:
- algunos con código de barras ficticio, para probar el escáner;
- algunos a granel (pan, palta, tomate, queso laminado por kg);
- 5 productos bajo el stock mínimo (para que aparezca "Se está acabando");
- 3 productos sin movimiento en 30 días (para que aparezca "Sin venta hace un mes");
- 2 productos con margen bajo el objetivo (para que aparezca una recomendación de precio).

**Historial de un mes:**
- 3 proveedores ficticios ("Mayorista del Sur", "Distribuidora Andes", "Panadería La Espiga").
- 6 boletas y facturas de compra ya confirmadas, con sus ítems. Una debe mostrar un alza de costo de más de 5% en un producto, para que se vea la alerta.
- 1 boleta en estado "por confirmar", para probar la pantalla de confirmación. Incluye una imagen de boleta de ejemplo **generada por ti** (un PNG simple con aspecto de boleta), sin usar boletas reales.
- Ventas diarias de un mes de Carla y Matías, con más venta los fines de semana. Incluye 2 cierres de caja: uno cuadrado y uno con $1.500 de diferencia.
- 2 ajustes: una merma de pan y un vencido de lácteos.
- Pagos de la suscripción: el mes anterior confirmado y el actual "informado" con comprobante de ejemplo, para que el administrador lo confirme.

**Botón "Probar sin registrarse" en la portada:** entra al Almacén Don Pepe en **modo demo**. El demo es de solo lectura o se reinicia solo cada noche, para que nadie lo deje desordenado. Muestra una franja arriba: "Estás viendo un negocio de ejemplo. [Crear mi cuenta]". Sirve para que José muestre la app a los clientes en una visita.

## 9. Plan de trabajo por fases

- **Fase 0. Preparación:** lista de cuentas que debo crear (Vercel, Supabase, API de Claude, proveedor de correo y dominio .cl), estructura del proyecto, `.env.example`, logo e íconos en `public/brand/`, colores y tipografía configurados, Playwright instalado para las capturas, y una página "Hola mundo" con la marca publicada en mi dominio.
- **Fase 1. Cuentas y seguridad:** registro e inicio de sesión con RUT, empresas, roles, RLS con sus pruebas, consentimientos, páginas legales (borradores), perfil de ejemplo Almacén Don Pepe con sus categorías y el botón "Probar sin registrarse".
- **Fase 2. Productos e inventario:** catálogo, movimientos, ajustes, conteo rápido y panel principal.
- **Fase 2b. Modo caja:** escáner con la cámara, lector USB, grilla de más vendidos, granel, PIN por vendedor, modo sin internet y cierre de caja. Pruébalo en un celular Android de gama baja.
- **Fase 3. Foto de la boleta:** subida, lectura con IA, pantalla de confirmación, asociación de productos y aprendizaje de alias.
- **Fase 4. Alertas y precios:** stock bajo, cambios de costo, recomendación de precio, push y correo.
- **Fase 5. Suscripciones y pagos:** planes, recordatorios, comprobante de transferencia, panel de administrador y modo solo lectura.
- **Fase 6. Exportaciones y "Mis datos".**
- **Fase 7. Piloto:** checklist para probar con 2 o 3 almacenes reales durante un mes, con lo que hay que medir (cuántas boletas suben, cuántas correcciones hacen, qué alertas usan).
- **Fase 8 (después del piloto):** precios de mercado (ODEPA + datos anónimos), venta por voz, importar ventas desde otros sistemas, ventas por diferencia y varios locales.

## 9b. Previsualización obligatoria al final de CADA fase

José quiere ver lo que construiste antes de aprobar la fase. Al terminar cada fase, y **antes de pedir el OK**, haz siempre esto:

1. **Levanta la app en local** (`npm run dev`) con el perfil de ejemplo (Almacén Don Pepe, sección 8b) cargado, para que las pantallas no se vean vacías. Toma las capturas entrando como Pepe Demo, o como Carla en las pantallas de caja.
2. **Toma capturas automáticas** con Playwright de **todas las pantallas nuevas o cambiadas en la fase**:
   - En tamaño celular (390×844), que es como la usarán los clientes.
   - Además en escritorio (1366×768), solo para las pantallas de administrador.
   - Guárdalas en `previews/fase-N/` con nombres claros y numerados en el orden de uso: `01-inicio.png`, `02-subir-boleta.png`, `03-confirmar-productos.png`…
   - Incluye también los estados importantes: pantalla vacía, cargando, éxito y error (por ejemplo "foto borrosa").
3. **Arma una página de revisión** `previews/fase-N/index.html` que muestre las capturas en orden, cada una con una frase simple que explique qué hace la pantalla y qué debería probar José. Ábrela en el navegador.
4. **Graba un video corto o GIF** (Playwright con grabación de video) del recorrido principal de la fase: por ejemplo, subir una boleta → confirmar → ver el stock actualizado. Guárdalo en `previews/fase-N/recorrido.webm`.
5. **Publica una versión de prueba** en Vercel (deployment de preview, no producción) y dame el link, para que José pueda abrirla **en su propio celular** e instalarla en la pantalla de inicio.
6. **Entrega un resumen corto** de la fase, en lenguaje simple:
   - Qué hice (3 a 5 líneas, sin palabras técnicas).
   - Qué puedes probar (pasos numerados).
   - Qué falta o qué decisiones necesito de ti.
7. **Espera el OK de José.** Si pide cambios, hazlos, vuelve a tomar las capturas de las pantallas cambiadas y actualiza la página de revisión antes de pasar a la siguiente fase.

Desde la Fase 1, **no hay fase terminada sin capturas, página de revisión y link de prueba.** En la Fase 0, la previsualización es el "Hola mundo" con el logo, los colores y la tipografía de la marca, publicado en el dominio.

## 10. Costos objetivo (referencia)

- Fijo: Vercel Pro (~US$20 al mes) + Supabase Pro (~US$25 al mes) + dominio .cl (~$11.800 al año) + patente municipal.
- Variable: lectura de imágenes con Claude Haiku 5.5 (fracciones de peso por foto).
- Precio al cliente: ~$25.000 + IVA al mes. Si una decisión técnica sube el costo fijo por sobre ~$60.000 CLP al mes, avísame antes.
