import { Link } from "react-router-dom";
import { useSeo, absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo";
import { BUSINESS, EMAIL, FREE_SHIPPING_THRESHOLD, WHATSAPP_DISPLAY } from "@/lib/constants";
import { LegalLayout, Section } from "@/components/legal/LegalLayout";

const LAST_UPDATED = "15 de noviembre de 2026";

const FREE_SHIPPING = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
}).format(FREE_SHIPPING_THRESHOLD);

const sections = [
  { id: "identificacion", label: "Quién vende" },
  { id: "aceptacion", label: "Aceptación" },
  { id: "productos", label: "Productos y stock" },
  { id: "precios", label: "Precios y moneda" },
  { id: "compra", label: "Cómo se compra" },
  { id: "pago", label: "Medios de pago" },
  { id: "despacho", label: "Despacho y entrega" },
  { id: "cambios", label: "Cambios y devoluciones" },
  { id: "datos", label: "Datos personales" },
  { id: "propiedad", label: "Propiedad intelectual" },
  { id: "uso", label: "Uso del sitio" },
  { id: "responsabilidad", label: "Responsabilidad" },
  { id: "ley", label: "Ley aplicable y reclamos" },
  { id: "vigencia", label: "Vigencia y cambios" },
];

export default function Terms() {
  useSeo({
    title: "Términos y condiciones | LUNÉ Activewear",
    description:
      "Condiciones de compra de LUNÉ Activewear: quién vende, precios en pesos chilenos, cómo se cierra el pedido por WhatsApp, despachos, cambios y ley aplicable.",
    path: "/terminos",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Términos y condiciones — LUNÉ Activewear",
      description:
        "Términos y condiciones de compra y uso del sitio de LUNÉ Activewear, Chile.",
      url: absoluteUrl("/terminos"),
      inLanguage: "es-CL",
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    },
  });

  return (
    <LegalLayout
      title="Términos y condiciones"
      updated={LAST_UPDATED}
      navLabel="Contenido de los términos y condiciones"
      sections={sections}
      intro={
        <>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            Estas son las reglas con las que vendemos y con las que puedes usar este sitio. Están
            escritas para leerse: si algo no queda claro, pregúntanos antes de comprar y te lo
            explicamos sin letra chica.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Al usar el sitio o cerrar un pedido aceptas estos términos. Se rigen por la legislación
            chilena, en particular la Ley 19.496 sobre protección de los derechos de los
            consumidores.
          </p>
        </>
      }
      footer={
        <>
          <p className="font-display text-xl">¿Una duda antes de comprar?</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Escríbenos por WhatsApp al {WHATSAPP_DISPLAY} o a{" "}
            <a href={`mailto:${EMAIL}`} className="underline underline-offset-4">
              {EMAIL}
            </a>
            . También puedes leer las páginas de{" "}
            <Link to="/envios" className="underline underline-offset-4">
              envíos
            </Link>{" "}
            y de{" "}
            <Link to="/cambios" className="underline underline-offset-4">
              cambios y devoluciones
            </Link>
            .
          </p>
        </>
      }
    >
      <Section id="identificacion" title="Quién vende">
        <p>
          Este sitio es operado por{" "}
          <strong className="font-medium text-foreground">{BUSINESS.name}</strong>, marca de ropa
          deportiva femenina con domicilio en {BUSINESS.address}. No tenemos tienda física: el
          retiro en Chillán se coordina con cita previa por WhatsApp.
        </p>
        <ul className="space-y-1">
          {BUSINESS.rut ? (
            <li>
              <strong className="font-medium text-foreground">RUT:</strong> {BUSINESS.rut}
            </li>
          ) : null}
          <li>
            <strong className="font-medium text-foreground">Correo:</strong>{" "}
            <a href={`mailto:${EMAIL}`} className="underline underline-offset-4">
              {EMAIL}
            </a>
          </li>
          <li>
            <strong className="font-medium text-foreground">WhatsApp:</strong> {WHATSAPP_DISPLAY}
          </li>
          <li>
            <strong className="font-medium text-foreground">Sitio web:</strong> {absoluteUrl("/")}
          </li>
        </ul>
      </Section>

      <Section id="aceptacion" title="Aceptación">
        <p>
          Al navegar, comprar o enviarnos un pedido por WhatsApp aceptas estos términos y la{" "}
          <Link to="/privacidad" className="underline underline-offset-4">
            política de datos
          </Link>
          . Si no estás de acuerdo con alguna parte, no uses el sitio ni cierres el pedido.
        </p>
        <p>
          Estos términos conviven con tus derechos como consumidora: si alguna cláusula los
          contradice, prevalece la ley.
        </p>
      </Section>

      <Section id="productos" title="Productos y stock">
        <p>
          Cada ficha muestra la prenda, sus tallas, colores, medidas de referencia y las unidades
          disponibles. Las fotos son de la prenda real, aunque el color puede variar levemente
          según la pantalla y la luz.
        </p>
        <p>
          El stock se actualiza en línea, pero puede cambiar mientras completas la compra. Si la
          prenda que elegiste se agota antes de confirmar el pago, te avisamos y te ofrecemos otra
          talla, otra prenda o la devolución total.
        </p>
      </Section>

      <Section id="precios" title="Precios y moneda">
        <p>
          Todos los precios están en{" "}
          <strong className="font-medium text-foreground">pesos chilenos (CLP)</strong> e incluyen
          impuestos. El valor que ves en la ficha es el valor de la prenda; el envío se suma aparte
          cuando corresponde.
        </p>
        <p>
          El envío es gratis desde {FREE_SHIPPING}. Bajo ese monto, el costo se calcula según la
          comuna y se informa por WhatsApp antes de que pagues.
        </p>
        <p>
          Si detectamos un error evidente de precio o de stock, te avisamos antes de cobrar y
          puedes continuar o cancelar sin costo.
        </p>
      </Section>

      <Section id="compra" title="Cómo se compra">
        <p>
          El sitio funciona como catálogo: eliges tus prendas, las agregas al carrito y cierras el
          pedido por WhatsApp. No hay pasarela de pago en línea ni cobros automáticos.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Armas tu carrito y completas tus datos de contacto y envío.</li>
          <li>
            Al confirmar, se registra el pedido y se abre WhatsApp con el resumen para coordinar
            pago y entrega.
          </li>
          <li>Confirmamos stock, costo de envío y total.</li>
          <li>Pagas y preparamos el despacho.</li>
        </ol>
        <p>
          El pedido queda confirmado cuando lo acordamos por WhatsApp y se acredita el pago. Si no
          recibimos respuesta en un plazo razonable, el pedido puede liberarse y el stock volver a
          la tienda.
        </p>
      </Section>

      <Section id="pago" title="Medios de pago">
        <p>
          Coordinamos el pago directamente por WhatsApp. Según el caso aceptamos transferencia
          bancaria y pago en efectivo al retirar en Chillán. No almacenamos datos de tarjetas ni
          procesamos pagos con tarjeta en el sitio.
        </p>
        <p>
          Emitimos comprobante de la venta. Si necesitas factura, pídenosla al momento de pagar con
          los datos de tu empresa.
        </p>
      </Section>

      <Section id="despacho" title="Despacho y entrega">
        <p>
          Despachamos a todo Chile continental con courier externo y también ofrecemos retiro
          coordinado en Chillán. Los plazos, costos y condiciones están en{" "}
          <Link to="/envios" className="underline underline-offset-4">
            envíos y entregas
          </Link>
          .
        </p>
        <p>
          Los plazos son estimaciones del courier y se cuentan en días hábiles desde la confirmación
          del pago. Si el paquete se atrasa, nos hacemos cargo del seguimiento con el courier y te
          mantenemos informada.
        </p>
      </Section>

      <Section id="cambios" title="Cambios y devoluciones">
        <p>
          Tienes derecho a retracto dentro de 10 días corridos, garantía legal de 3 meses por fallas
          de fábrica y, además, una política comercial de cambios dentro de 15 días. El detalle, los
          pasos y quién paga cada envío están en{" "}
          <Link to="/cambios" className="underline underline-offset-4">
            cambios y devoluciones
          </Link>
          .
        </p>
      </Section>

      <Section id="datos" title="Datos personales">
        <p>
          Tratamos tus datos solo para gestionar el pedido, despacharlo y atenderte. El detalle de
          qué datos usamos, por cuánto tiempo y cómo ejercer tus derechos está en la{" "}
          <Link to="/privacidad" className="underline underline-offset-4">
            política de datos y privacidad
          </Link>
          .
        </p>
      </Section>

      <Section id="propiedad" title="Propiedad intelectual">
        <p>
          El nombre LUNÉ, el logotipo, los textos, las fotos y el diseño del sitio son de nuestra
          propiedad o se usan con autorización. No puedes copiarlos, reproducirlos ni usarlos con
          fines comerciales sin permiso escrito.
        </p>
        <p>
          Puedes compartir enlaces y fotos del sitio en redes sociales mencionando a la marca, que
          es justamente lo que queremos.
        </p>
      </Section>

      <Section id="uso" title="Uso del sitio">
        <ul className="space-y-2">
          <li>No está permitido intentar vulnerar la seguridad, el acceso o el funcionamiento del sitio.</li>
          <li>No se permite extraer el catálogo ni los precios de forma automatizada.</li>
          <li>Debes entregar datos reales y actualizados al hacer un pedido.</li>
          <li>El acceso al panel de administración está restringido a cuentas autorizadas.</li>
        </ul>
      </Section>

      <Section id="responsabilidad" title="Responsabilidad">
        <p>
          Cuidamos la información del sitio, pero puede contener errores tipográficos, de stock o de
          precio. Cuando detectamos uno, lo corregimos y te avisamos si afecta tu pedido.
        </p>
        <p>
          Nuestra responsabilidad se limita al valor de la compra, sin perjuicio de los derechos que
          la ley te reconoce como consumidora.
        </p>
      </Section>

      <Section id="ley" title="Ley aplicable y reclamos">
        <p>
          Estos términos se rigen por la ley chilena. Cualquier controversia se somete a los
          tribunales competentes de Chile.
        </p>
        <p>
          Si tienes un problema con tu compra, escríbenos primero: casi todo se resuelve
          conversando. Si no llegamos a acuerdo, puedes presentar un reclamo ante el{" "}
          <strong className="font-medium text-foreground">SERNAC</strong> o ejercer las acciones que
          la Ley 19.496 te franquea.
        </p>
      </Section>

      <Section id="vigencia" title="Vigencia y cambios">
        <p>
          Estos términos rigen desde la fecha de última actualización indicada arriba. Podemos
          modificarlos cuando cambien nuestros servicios o la normativa; la versión vigente es
          siempre la publicada en esta página.
        </p>
        <p>
          Los cambios no afectan pedidos ya confirmados, salvo que la ley disponga otra cosa.
        </p>
      </Section>
    </LegalLayout>
  );
}
