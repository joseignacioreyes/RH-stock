import type { Metadata } from "next";
import Link from "next/link";
import { DocumentoLegal, RESPONSABLE } from "@/components/DocumentoLegal";
import { telefonoLegible } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Términos y condiciones" };

export default function PaginaTerminos() {
  return (
    <DocumentoLegal titulo="Términos y condiciones">
      <p>
        Estos términos explican cómo funciona el servicio RH Stock, que entrega {RESPONSABLE.razonSocial}, RUT{" "}
        {RESPONSABLE.rut}. Al crear tu cuenta, aceptas estas reglas.
      </p>

      <h2>1. Qué es RH Stock</h2>
      <p>
        RH Stock es una app web para llevar el inventario de tu negocio: registrar compras con fotos de tus boletas, registrar
        ventas, ver tu stock y recibir avisos. Se usa desde el navegador del celular o del computador.
      </p>
      <p>
        <strong>RH Stock no emite boletas ni facturas electrónicas</strong> y no se conecta con el SII. Tus obligaciones
        tributarias siguen siendo tuyas.
      </p>

      <h2>2. Tu cuenta</h2>
      <ul>
        <li>Entras con tu RUT y una clave. Cuida tu clave y no la compartas.</li>
        <li>Tus empleados pueden tener su propia cuenta o un PIN para vender. Tú respondes por lo que hacen en tu negocio.</li>
        <li>Debes entregar datos verdaderos al registrarte.</li>
      </ul>

      <h2>3. Suscripción y pagos</h2>
      <ul>
        <li>RH Stock se paga mensualmente según el plan que elijas. El precio vigente te lo informamos antes de contratar.</li>
        <li>El pago se hace por transferencia bancaria a la cuenta de la empresa. Subes el comprobante en la app y lo confirmamos.</li>
        <li>Te recordaremos el pago 3 días antes del vencimiento.</li>
        <li>
          Si pasan 10 días de atraso, tu cuenta queda en modo &quot;solo mirar&quot;: puedes ver tus datos, pero no registrar
          compras ni ventas, hasta que confirmemos tu pago. <strong>Nunca borramos tus datos por atraso.</strong>
        </li>
      </ul>

      <h2>4. Cómo terminar el servicio</h2>
      <ul>
        <li>Puedes dejar de usar RH Stock cuando quieras, avisándonos por WhatsApp o por correo.</li>
        <li>Antes de irte puedes descargar todos tus datos.</li>
        <li>
          Podemos terminar el servicio si se usa para algo ilegal o para dañar a otros, avisándote antes cuando sea posible.
        </li>
      </ul>

      <h2>5. Lectura automática de fotos</h2>
      <p>
        La app lee tus boletas con inteligencia artificial, pero puede equivocarse. Por eso siempre te mostramos lo que leyó
        para que lo revises y confirmes antes de sumar el stock. Lo que confirmas queda bajo tu responsabilidad.
      </p>

      <h2>6. Disponibilidad</h2>
      <p>
        Hacemos todo lo posible para que la app funcione siempre, pero puede haber cortes por mantención o por problemas de
        internet o de nuestros proveedores. RH Stock es una ayuda para tu negocio: no respondemos por pérdidas causadas por
        cortes del servicio o por datos mal ingresados.
      </p>

      <h2>7. Tus datos</h2>
      <p>
        Tus datos son tuyos. Cómo los cuidamos está en la{" "}
        <Link href="/privacidad" className="font-semibold text-marca underline">
          política de privacidad
        </Link>
        .
      </p>

      <h2>8. Cambios a estos términos</h2>
      <p>Si cambiamos estos términos, te avisaremos dentro de la app con anticipación. Si no estás de acuerdo, puedes terminar el servicio.</p>

      <h2>9. Contacto y ley aplicable</h2>
      <p>
        Escríbenos a {RESPONSABLE.correo} o por WhatsApp al {telefonoLegible()}. Estos términos se rigen por las leyes de
        Chile.
      </p>
    </DocumentoLegal>
  );
}
