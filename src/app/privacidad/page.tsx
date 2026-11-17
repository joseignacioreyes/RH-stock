import type { Metadata } from "next";
import { DocumentoLegal, RESPONSABLE } from "@/components/DocumentoLegal";
import { telefonoLegible } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Política de privacidad" };

// BORRADOR redactado según la Ley 21.719 de protección de datos personales (vigente desde el 1-12-2026).
export default function PaginaPrivacidad() {
  return (
    <DocumentoLegal titulo="Política de privacidad">
      <p>
        En RH Stock cuidamos tus datos. Aquí te contamos, en palabras simples, qué datos guardamos, para qué los usamos y
        qué puedes hacer con ellos.
      </p>

      <h2>1. Quién es responsable de tus datos</h2>
      <p>
        {RESPONSABLE.razonSocial}, RUT {RESPONSABLE.rut}, con domicilio en {RESPONSABLE.domicilio}. Puedes escribirnos a{" "}
        {RESPONSABLE.correo} o por WhatsApp al {telefonoLegible()}.
      </p>

      <h2>2. Qué datos guardamos</h2>
      <ul>
        <li>
          <strong>Tus datos de cuenta:</strong> nombre, RUT, correo y la clave (guardada cifrada: nadie puede leerla, ni
          siquiera nosotros).
        </li>
        <li>
          <strong>Los datos de tu negocio:</strong> nombre, RUT, comuna, productos, compras, ventas, stock y vendedores.
        </li>
        <li>
          <strong>Las fotos que subes:</strong> boletas, facturas y comprobantes de transferencia. Pueden traer datos de tus
          proveedores.
        </li>
        <li>
          <strong>Datos técnicos:</strong> la fecha y la dirección IP cuando aceptas estos términos, y registros básicos para
          mantener la app segura.
        </li>
      </ul>
      <p>
        <strong>Nunca te pediremos tu clave del SII.</strong> Solo recogemos los datos necesarios para que la app funcione.
      </p>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Para que puedas usar RH Stock: llevar tu stock, tus compras y tus ventas.</li>
        <li>Para leer automáticamente las fotos de tus boletas y comprobantes.</li>
        <li>Para enviarte avisos (stock bajo, alzas de costo) y recordatorios de pago.</li>
        <li>Para darte soporte cuando lo pides.</li>
        <li>Para cobrar la suscripción y cumplir nuestras obligaciones tributarias.</li>
      </ul>
      <p>
        Solo si tú lo aceptas aparte (es opcional), usaremos los precios de tus compras, sin tu nombre ni el de tu negocio, para
        calcular promedios de precios por comuna. Nunca mostramos un promedio con menos de 3 negocios, para que nadie pueda
        reconocerte.
      </p>

      <h2>4. Con quién los compartimos</h2>
      <p>No vendemos tus datos. Solo los compartimos con los servicios que necesitamos para que la app funcione:</p>
      <ul>
        <li>Vercel (alojamiento de la app web, Estados Unidos).</li>
        <li>Supabase (base de datos y archivos, servidores en Canadá).</li>
        <li>Anthropic (inteligencia artificial que lee las fotos de boletas y comprobantes, Estados Unidos).</li>
        <li>Un proveedor de correo para enviarte avisos (Estados Unidos).</li>
      </ul>
      <p>
        Estos servicios están fuera de Chile. Les exigimos medidas de seguridad adecuadas y que usen tus datos solo para
        prestarnos su servicio.
      </p>

      <h2>5. Cuánto tiempo los guardamos</h2>
      <ul>
        <li>Mientras tu cuenta esté activa.</li>
        <li>Si pides eliminar tu cuenta, borramos tus datos y tus fotos dentro de 30 días.</li>
        <li>
          Los registros de los pagos de tu suscripción los guardamos 6 años, porque la ley tributaria nos obliga.
        </li>
        <li>Si te atrasas en un pago, no borramos tus datos: tu cuenta queda en modo &quot;solo mirar&quot; hasta que pagues.</li>
      </ul>

      <h2>6. Tus derechos</h2>
      <p>En cualquier momento puedes pedirnos:</p>
      <ul>
        <li>
          <strong>Acceso:</strong> saber qué datos tenemos de ti y descargarlos.
        </li>
        <li>
          <strong>Rectificación:</strong> corregir datos que estén mal.
        </li>
        <li>
          <strong>Supresión:</strong> que borremos tus datos.
        </li>
        <li>
          <strong>Oposición:</strong> que dejemos de usar tus datos para algún fin.
        </li>
        <li>
          <strong>Portabilidad:</strong> recibir tus datos en un archivo para llevarlos a otro servicio.
        </li>
        <li>
          <strong>Bloqueo:</strong> que suspendamos temporalmente el uso de tus datos mientras revisamos una solicitud.
        </li>
      </ul>
      <p>
        Escríbenos a {RESPONSABLE.correo} o por WhatsApp al {telefonoLegible()}. Te respondemos dentro de 30 días corridos. Si
        no quedas conforme, puedes reclamar ante la Agencia de Protección de Datos Personales.
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Tus datos viajan cifrados (HTTPS). Cada negocio ve solo su información. Las fotos se guardan en un espacio privado y
        solo se pueden ver con enlaces que vencen. Si ocurriera una filtración que te afecte, te avisaremos a ti y a la
        autoridad, como manda la ley.
      </p>

      <h2>8. Cambios a esta política</h2>
      <p>Si cambiamos esta política, te avisaremos dentro de la app antes de que el cambio empiece a regir.</p>
    </DocumentoLegal>
  );
}
