import { Link } from "react-router-dom";
import { useSeo, absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo";
import { EMAIL, WHATSAPP_DISPLAY } from "@/lib/constants";
import { LegalLayout, Section, Table } from "@/components/legal/LegalLayout";

const LAST_UPDATED = "15 de noviembre de 2026";

const sections = [
  { id: "resumen", label: "En resumen" },
  { id: "cambios", label: "Cambio de talla o color" },
  { id: "retracto", label: "Derecho a retracto" },
  { id: "garantia", label: "Garantía legal" },
  { id: "condiciones", label: "Condiciones de la prenda" },
  { id: "exclusiones", label: "Qué no aplica" },
  { id: "como", label: "Cómo solicitarlo" },
  { id: "reembolsos", label: "Reembolsos y plazos" },
  { id: "envios", label: "Quién paga el envío" },
  { id: "ayuda", label: "¿Necesitas ayuda?" },
];

export default function Returns() {
  useSeo({
    title: "Cambios y devoluciones | LUNÉ Activewear",
    description:
      "Cambia tu talla o color hasta 15 días, ejerce tu derecho a retracto en 10 días o usa la garantía legal de 3 meses. Te explicamos los pasos y los plazos de reembolso.",
    path: "/cambios",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Cambios y devoluciones — LUNÉ Activewear",
      description:
        "Política de cambios, derecho a retracto y garantía legal de LUNÉ Activewear conforme a la Ley 19.496.",
      url: absoluteUrl("/cambios"),
      inLanguage: "es-CL",
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    },
  });

  return (
    <LegalLayout
      title="Cambios y devoluciones"
      updated={LAST_UPDATED}
      navLabel="Contenido de la página de cambios y devoluciones"
      sections={sections}
      intro={
        <>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            Queremos que la prenda te quede bien. Si no es tu talla, no era el color que
            imaginabas o simplemente cambiaste de opinión, escríbenos: tienes derechos y además
            una política de cambios más generosa que la ley.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Esta página se rige por la Ley 19.496 sobre protección de los derechos de los
            consumidores. Nada de lo que diga aquí limita tus derechos legales.
          </p>
        </>
      }
      footer={
        <>
          <p className="font-display text-xl">¿Empezamos el cambio?</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Escríbenos por WhatsApp al {WHATSAPP_DISPLAY} o a{" "}
            <a href={`mailto:${EMAIL}`} className="underline underline-offset-4">
              {EMAIL}
            </a>{" "}
            con tu número de pedido y el motivo. Te respondemos con los pasos exactos.
          </p>
        </>
      }
    >
      <Section id="resumen" title="En resumen">
        <Table
          headers={["Qué necesitas", "Plazo", "Quién cubre el envío"]}
          rows={[
            [
              "Cambiar talla o color (política comercial)",
              "Hasta 15 días corridos desde la recepción",
              "Tú, salvo que el cambio sea por error nuestro",
            ],
            [
              "Retracto: devolver sin dar motivos (Ley 19.496)",
              "Hasta 10 días corridos desde la recepción",
              "Tú, salvo que hayamos informado otra cosa",
            ],
            [
              "Garantía legal por falla de fábrica",
              "Hasta 3 meses desde la recepción",
              "Nosotros",
            ],
          ]}
        />
        <p>
          Los plazos son <strong className="font-medium text-foreground">corridos</strong> (incluyen
          fines de semana y feriados) y se cuentan desde que recibes la prenda, no desde que la
          compras.
        </p>
      </Section>

      <Section id="cambios" title="Cambio de talla o color">
        <p>
          Puedes pedir un cambio dentro de{" "}
          <strong className="font-medium text-foreground">15 días corridos</strong> desde que
          recibes tu pedido, siempre que la prenda esté sin uso y en las condiciones de más abajo.
        </p>
        <ul className="space-y-2">
          <li>
            El cambio está sujeto a <strong className="font-medium text-foreground">stock disponible</strong>{" "}
            de la talla o color que quieras. Si no queda, puedes elegir otra prenda por el mismo
            valor o pedir la devolución del dinero.
          </li>
          <li>
            Si la diferencia de precio es a favor nuestro, se descuenta del reembolso; si es a tu
            favor, pagas solo la diferencia.
          </li>
          <li>
            Cada pedido tiene derecho a <strong className="font-medium text-foreground">un cambio</strong>{" "}
            por este motivo. Si necesitas un segundo cambio, lo evaluamos caso a caso.
          </li>
        </ul>
      </Section>

      <Section id="retracto" title="Derecho a retracto">
        <p>
          Como compras a distancia (por el sitio o por WhatsApp), la Ley 19.496 te da el{" "}
          <strong className="font-medium text-foreground">derecho a retracto</strong>: puedes
          arrepentirte de la compra dentro de los{" "}
          <strong className="font-medium text-foreground">10 días corridos</strong> siguientes a la
          recepción del producto, sin expresar motivo y sin penalidad alguna.
        </p>
        <p>
          Para ejercerlo, avísanos por WhatsApp o correo dentro de ese plazo indicando tu número
          de pedido y que quieres retractarte. Debes devolvernos la prenda en buen estado, con sus
          etiquetas, y te devolvemos el precio pagado.
        </p>
        <p>
          El costo del transporte de la devolución es de cargo de la clienta, salvo que hayamos
          informado lo contrario al momento de la compra. El reembolso se hace dentro de los 10
          días siguientes a la devolución, por el mismo medio en que pagaste.
        </p>
      </Section>

      <Section id="garantia" title="Garantía legal">
        <p>
          Todas nuestras prendas tienen{" "}
          <strong className="font-medium text-foreground">garantía legal de 3 meses</strong> desde
          la recepción, por fallas de fábrica: costuras que se sueltan, cierres defectuosos, telas
          con defecto o cualquier problema que no venga del uso.
        </p>
        <p>
          Ante una falla puedes elegir entre la{" "}
          <strong className="font-medium text-foreground">reparación o la reposición</strong> de la
          prenda. Si ninguna de las dos es posible, tienes derecho a la devolución del precio
          pagado. En todos esos casos el envío corre por nuestra cuenta.
        </p>
        <p>
          La garantía no cubre el desgaste normal, los daños por uso indebido, el lavado
          inadecuado ni las modificaciones hechas por terceros. Si tienes dudas, mándanos fotos y
          te decimos con honestidad si aplica.
        </p>
      </Section>

      <Section id="condiciones" title="Condiciones de la prenda">
        <p>Para aceptar un cambio, un retracto o una devolución, la prenda debe cumplir:</p>
        <ul className="space-y-2">
          <li>Estar sin uso y sin lavar, sin olores ni manchas (perfume, desodorante, maquillaje).</li>
          <li>Conservar sus etiquetas y el empaque original cuando sea posible.</li>
          <li>Volver completa, con todos sus accesorios si los tenía.</li>
          <li>
            Venir protegida para el viaje de vuelta: una bolsa o caja cerrada evita que se dañe en
            el camino.
          </li>
        </ul>
        <p>
          Revisamos cada prenda al recibirla. Si no cumple estas condiciones, te avisamos y
          coordinamos cómo devolvértela.
        </p>
      </Section>

      <Section id="exclusiones" title="Qué no aplica">
        <ul className="space-y-2">
          <li>
            <strong className="font-medium text-foreground">Ropa interior y trajes de baño</strong>{" "}
            no tienen cambio ni retracto por razones de higiene, salvo falla de fábrica cubierta
            por la garantía legal.
          </li>
          <li>Prendas usadas, lavadas, con manchas, olores o sin etiquetas.</li>
          <li>Prendas personalizadas o modificadas a pedido.</li>
          <li>Productos dañados por uso indebido o por lavado fuera de las instrucciones.</li>
        </ul>
        <p>
          Ninguna de estas exclusiones afecta tu garantía legal por fallas de fábrica.
        </p>
      </Section>

      <Section id="como" title="Cómo solicitarlo">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Escríbenos por WhatsApp al {WHATSAPP_DISPLAY} o a{" "}
            <a href={`mailto:${EMAIL}`} className="underline underline-offset-4">
              {EMAIL}
            </a>{" "}
            dentro del plazo que corresponda.
          </li>
          <li>
            Cuéntanos el motivo y adjunta tu <strong className="font-medium text-foreground">número de pedido</strong>{" "}
            (llega en el correo de confirmación) y fotos de la prenda si es por una falla.
          </li>
          <li>
            Te confirmamos si aplica y coordinamos el envío de vuelta: dirección, courier y quién
            lo paga.
          </li>
          <li>
            Al recibir y revisar la prenda, despachamos el cambio o hacemos el reembolso y te
            avisamos por el mismo canal.
          </li>
        </ol>
      </Section>

      <Section id="reembolsos" title="Reembolsos y plazos">
        <p>
          Los reembolsos se hacen por el mismo medio en que pagaste, dentro de los{" "}
          <strong className="font-medium text-foreground">10 días hábiles</strong> siguientes a la
          recepción y revisión de la prenda.
        </p>
        <p>
          Si pagaste por transferencia, te pediremos los datos de la cuenta. Si el pago fue en
          efectivo al retirar en Chillán, coordinamos la entrega en mano.
        </p>
        <p>
          El reembolso incluye el precio de la prenda. El costo del envío original se devuelve solo
          cuando la devolución es por error nuestro, por falla cubierta por la garantía o cuando la
          ley lo exige.
        </p>
      </Section>

      <Section id="envios" title="Quién paga el envío">
        <Table
          headers={["Motivo", "Envío de vuelta", "Envío del cambio"]}
          rows={[
            ["Cambio de talla o color", "Clienta", "Clienta"],
            ["Retracto (10 días)", "Clienta", "No aplica"],
            ["Falla de fábrica o garantía", "LUNÉ", "LUNÉ"],
            ["Error nuestro (prenda equivocada)", "LUNÉ", "LUNÉ"],
          ]}
        />
        <p>
          Cuando el envío corre por tu cuenta, puedes usar el courier que prefieras; te recomendamos
          uno con seguimiento para que el paquete no se pierda.
        </p>
      </Section>

      <Section id="ayuda" title="¿Necesitas ayuda?">
        <p>
          Escríbenos por WhatsApp al{" "}
          <strong className="font-medium text-foreground">{WHATSAPP_DISPLAY}</strong> o a{" "}
          <a href={`mailto:${EMAIL}`} className="underline underline-offset-4">
            {EMAIL}
          </a>
          . Respondemos de lunes a sábado.
        </p>
        <p>
          Si no llegamos a un acuerdo, puedes presentar un reclamo ante el{" "}
          <strong className="font-medium text-foreground">SERNAC</strong>. También puedes revisar
          las páginas de{" "}
          <Link to="/envios" className="underline underline-offset-4">
            envíos y entregas
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
