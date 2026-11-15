import { Link } from "react-router-dom";
import { useSeo, absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo";
import { EMAIL, FREE_SHIPPING_THRESHOLD, WHATSAPP_DISPLAY } from "@/lib/constants";
import { LegalLayout, Section, Table } from "@/components/legal/LegalLayout";

const LAST_UPDATED = "15 de noviembre de 2026";

const FREE_SHIPPING = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
}).format(FREE_SHIPPING_THRESHOLD);

const sections = [
  { id: "cobertura", label: "Dónde entregamos" },
  { id: "plazos", label: "Plazos de entrega" },
  { id: "costos", label: "Costos y envío gratis" },
  { id: "retiro", label: "Retiro en Chillán" },
  { id: "seguimiento", label: "Seguimiento del pedido" },
  { id: "embalaje", label: "Cómo llega tu pedido" },
  { id: "problemas", label: "Si algo sale mal" },
  { id: "ayuda", label: "¿Necesitas ayuda?" },
];

export default function Shipping() {
  useSeo({
    title: "Envíos y entregas | LUNÉ Activewear",
    description:
      "Despachamos a todo Chile en 2 a 5 días hábiles. Envío gratis sobre $50.000, retiro en Chillán con cita y seguimiento por correo y WhatsApp.",
    path: "/envios",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Envíos y entregas — LUNÉ Activewear",
      description:
        "Plazos, costos, cobertura y seguimiento de los despachos de LUNÉ Activewear a todo Chile.",
      url: absoluteUrl("/envios"),
      inLanguage: "es-CL",
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    },
  });

  return (
    <LegalLayout
      title="Envíos y entregas"
      updated={LAST_UPDATED}
      navLabel="Contenido de la página de envíos"
      sections={sections}
      intro={
        <>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            Despachamos desde Chillán a todo Chile con courier externo. Acá está lo importante:
            dónde llegamos, cuánto demora, cuánto cuesta y cómo seguir tu pedido.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Los plazos se cuentan en <strong className="font-medium text-foreground">días hábiles</strong>{" "}
            desde que confirmamos el pago, no desde que haces el pedido.
          </p>
        </>
      }
      footer={
        <>
          <p className="font-display text-xl">¿Dudas con tu despacho?</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Escríbenos por WhatsApp al {WHATSAPP_DISPLAY} o a{" "}
            <a href={`mailto:${EMAIL}`} className="underline underline-offset-4">
              {EMAIL}
            </a>{" "}
            con tu nombre y número de pedido. También puedes revisar{" "}
            <Link to="/cambios" className="underline underline-offset-4">
              cambios y devoluciones
            </Link>
            .
          </p>
        </>
      }
    >
      <Section id="cobertura" title="Dónde entregamos">
        <p>
          Llegamos a <strong className="font-medium text-foreground">todo Chile continental</strong>{" "}
          por courier con entrega a domicilio. En zonas extremas, islas y localidades rurales el
          courier puede no tener reparto a domicilio: en ese caso te avisamos antes de despachar y
          coordinamos retiro en sucursal o el envío que exista para tu comuna.
        </p>
        <p>
          Si vives fuera de Chile, escríbenos antes de comprar y vemos una alternativa.
        </p>
      </Section>

      <Section id="plazos" title="Plazos de entrega">
        <p>
          Preparamos tu pedido en 1 a 2 días hábiles. Después corre el plazo del courier, que
          depende de la distancia:
        </p>
        <Table
          headers={["Destino", "Plazo estimado", "Total desde el pago"]}
          rows={[
            ["Chillán y Ñuble", "1 a 2 días hábiles", "1 a 3 días hábiles"],
            ["Biobío, Maule y O'Higgins", "1 a 3 días hábiles", "2 a 4 días hábiles"],
            ["Región Metropolitana y Valparaíso", "2 a 3 días hábiles", "2 a 5 días hábiles"],
            ["Resto del país", "2 a 4 días hábiles", "3 a 5 días hábiles"],
            ["Aysén y Magallanes", "3 a 6 días hábiles", "4 a 8 días hábiles"],
          ]}
        />
        <p>
          Son estimaciones del courier, no una garantía: feriados, paros, clima o peak de
          campañas pueden mover la fecha. Si tu pedido se atrasa más de lo razonable, te avisamos
          sin que tengas que preguntar.
        </p>
      </Section>

      <Section id="costos" title="Costos y envío gratis">
        <p>
          El envío es <strong className="font-medium text-foreground">gratis en compras desde {FREE_SHIPPING}</strong>{" "}
          a cualquier comuna de Chile continental.
        </p>
        <p>
          Bajo ese monto, el costo depende de la comuna y del peso del paquete. Lo calculamos
          antes de que pagues y te lo informamos por WhatsApp junto con el resumen del pedido: no
          hay cargos sorpresa ni cobros después del despacho.
        </p>
        <p>
          Si compras varias prendas juntas, viajan en un solo envío y pagas una sola vez.
        </p>
      </Section>

      <Section id="retiro" title="Retiro en Chillán">
        <p>
          Si estás en Chillán puedes retirar sin costo. Coordinamos día, hora y lugar por WhatsApp
          con cita previa, así te entregamos la prenda en persona y puedes probártela con calma.
        </p>
        <p>
          El retiro se agenda después de confirmar el pago y, por lo general, está disponible el
          mismo día o al día siguiente.
        </p>
      </Section>

      <Section id="seguimiento" title="Seguimiento del pedido">
        <p>
          Cuando despachamos, te enviamos el{" "}
          <strong className="font-medium text-foreground">número de seguimiento</strong> del courier
          por correo y también por WhatsApp, junto con el detalle de lo que compraste.
        </p>
        <p>
          Con ese número puedes revisar el estado en el sitio del courier. Si no lo encuentras,
          búscalo en tu correo (revisa spam o promociones) o pídenoslo por WhatsApp con tu nombre
          y el número de pedido.
        </p>
      </Section>

      <Section id="embalaje" title="Cómo llega tu pedido">
        <p>
          Cada prenda va doblada, protegida y despachada en un embalaje cerrado con los datos del
          destinatario. Usamos el mínimo de plástico necesario y procuramos reutilizar material de
          embalaje cuando está en buen estado.
        </p>
        <p>
          Si tu paquete llega abierto, golpeado o con la prenda dañada,{" "}
          <strong className="font-medium text-foreground">sácale fotos antes de abrirlo del todo</strong>{" "}
          y escríbenos el mismo día: lo resolvemos con el courier y contigo.
        </p>
      </Section>

      <Section id="problemas" title="Si algo sale mal">
        <Table
          headers={["Situación", "Qué hacemos"]}
          rows={[
            [
              "Dirección incompleta o errónea",
              "Te escribimos antes de despachar para corregirla. Si el paquete ya salió y vuelve por dirección errada, el reenvío tiene el costo de un nuevo envío.",
            ],
            [
              "Nadie recibe el paquete",
              "El courier deja aviso o lo devuelve. Reagendamos la entrega según las condiciones del courier.",
            ],
            [
              "Paquete perdido o extraviado",
              "Abrimos el reclamo con el courier y te mantenemos al tanto; si no aparece, te reponemos la prenda o te devolvemos el dinero.",
            ],
            [
              "Prenda equivocada o con falla",
              "Lo asumimos nosotros: cubrimos el envío de vuelta y el reenvío. Revisa los plazos de garantía en cambios y devoluciones.",
            ],
          ]}
        />
        <p>
          Para cualquier reclamo necesitamos tu nombre, número de pedido y, si aplica, fotos del
          paquete o de la prenda.
        </p>
      </Section>

      <Section id="ayuda" title="¿Necesitas ayuda?">
        <p>
          Escríbenos por WhatsApp al{" "}
          <strong className="font-medium text-foreground">{WHATSAPP_DISPLAY}</strong> o a{" "}
          <a href={`mailto:${EMAIL}`} className="underline underline-offset-4">
            {EMAIL}
          </a>
          . Respondemos de lunes a sábado y, si escribes fuera de horario, al día siguiente.
        </p>
        <p>
          También te pueden servir las páginas de{" "}
          <Link to="/cambios" className="underline underline-offset-4">
            cambios y devoluciones
          </Link>{" "}
          y de{" "}
          <Link to="/terminos" className="underline underline-offset-4">
            términos y condiciones
          </Link>
          .
        </p>
      </Section>
    </LegalLayout>
  );
}
