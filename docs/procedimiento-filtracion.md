# Qué hacer si hay una filtración de datos

> **BORRADOR: revisar antes de publicar.** Este procedimiento cumple lo básico de la Ley 21.719 (vigente desde el 1-12-2026). Revísalo con un abogado.

Una **filtración** (o "brecha de seguridad") es cuando alguien que no debía ve, copia, cambia o borra datos de RH Stock. Por ejemplo: se filtró una clave secreta, alguien entró con la cuenta de otro, un negocio vio datos de otro negocio, o se perdió un computador con datos.

## 1. Las primeras horas: frenar el daño

1. **Anota la hora** en que te diste cuenta y qué viste. Todo lo que pase desde ahora, anótalo con fecha y hora.
2. **Cambia las claves** que puedan estar comprometidas:
   - Supabase: Project Settings → API Keys → crear claves nuevas y borrar las antiguas. Cambiarlas también en Vercel (Environment Variables) y volver a publicar.
   - API de Claude, Resend, token de acceso de Supabase: borrar y crear de nuevo.
   - Tu clave de administrador de RH Stock y la de tu correo.
3. Si una cuenta de un cliente fue usada por otra persona: genera un enlace para elegir clave nueva (`npm run cuenta:enlace-clave`) y envíaselo **solo a su correo registrado**.
4. Si el problema es un error de la app, **pausa la app** en Vercel (o publica la versión anterior) hasta corregirlo.

## 2. El primer día: entender qué pasó

Responde por escrito:

- ¿Qué datos se vieron afectados? (RUT, nombres, correos, datos de negocios, fotos de boletas, pagos…)
- ¿De cuántas personas y de qué negocios?
- ¿Desde cuándo y hasta cuándo?
- ¿Cómo pasó? Revisa: registros de Vercel (Logs), de Supabase (Logs → Auth y API) y el historial de GitHub.
- ¿Los datos quedaron expuestos o solo hubo riesgo?

## 3. Avisar (lo antes posible, sin esperar a tener todo resuelto)

- **A la Agencia de Protección de Datos Personales**, cuando la filtración pueda afectar a las personas (por ejemplo, si se expusieron RUT, correos o datos de los negocios). Usa el canal que la Agencia publique en su sitio.
- **A las personas y negocios afectados**, por correo y WhatsApp, en palabras simples:
  - qué pasó y cuándo,
  - qué datos suyos se vieron afectados,
  - qué hicimos para arreglarlo,
  - qué les recomendamos hacer (por ejemplo, cambiar su clave),
  - cómo contactarnos (WhatsApp +56 9 7776 6584 y correo).
- **A los proveedores** involucrados (Supabase, Vercel, Anthropic, Resend) si el problema vino de ellos o los afecta.

## 4. Después: que no vuelva a pasar

1. Corrige la causa y agrega una prueba automática que la detecte (como las de `pruebas/db/`).
2. Guarda un registro de la filtración (qué pasó, a quién se avisó, qué se cambió). Guárdalo al menos 5 años.
3. Revisa este procedimiento: ¿faltó algo?

## Datos de contacto (completar)

| Quién | Contacto |
|---|---|
| Responsable de los datos (la SpA) | [nombre, correo, teléfono] |
| Abogado | [nombre, correo, teléfono] |
| Agencia de Protección de Datos Personales | [sitio web y canal de denuncias] |
