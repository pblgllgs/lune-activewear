import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSeo, absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo";
import { EMAIL, WHATSAPP_DISPLAY } from "@/lib/constants";

const LAST_UPDATED = "8 de noviembre de 2026";

const sections = [
  { id: "responsable", label: "Responsable del tratamiento" },
  { id: "datos", label: "Qué datos tratamos" },
  { id: "plazos", label: "Para qué y por cuánto tiempo" },
  { id: "cookies", label: "Cookies" },
  { id: "proveedores", label: "Con quién los compartimos" },
  { id: "derechos", label: "Tus derechos" },
  { id: "seguridad", label: "Seguridad" },
  { id: "menores", label: "Menores de edad" },
  { id: "cambios", label: "Cambios en esta política" },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-border/70 pt-8 first:border-t-0 first:pt-0">
      <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base">
        {children}
      </div>
    </section>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-left text-xs md:text-sm">
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                scope="col"
                className="border-b border-border py-2 pr-4 text-[10px] uppercase tracking-wider2 text-muted-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="align-top">
              {row.map((cell, index) => (
                <td
                  key={`${row[0]}-${index}`}
                  className="border-b border-border/60 py-3 pr-4 text-muted-foreground"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Privacy() {
  const { hash } = useLocation();

  useSeo({
    title: "Política de datos y privacidad | LUNÉ Activewear",
    description:
      "Qué datos personales recogemos, para qué los usamos, cuánto tiempo los conservamos y cómo ejercer tus derechos, conforme a la Ley 21.719. Incluye el detalle de cookies de la tienda.",
    path: "/privacidad",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Política de datos y privacidad — LUNÉ Activewear",
      description:
        "Política de tratamiento de datos personales y aviso de cookies de LUNÉ Activewear conforme a la Ley 21.719.",
      url: absoluteUrl("/privacidad"),
      inLanguage: "es-CL",
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    },
  });

  // La página se carga de forma diferida: el ancla (#cookies) se busca a mano
  // para que el salto funcione al coming desde el aviso de cookies.
  useEffect(() => {
    if (!hash) return;
    const id = hash.replace("#", "");
    const target = document.getElementById(id);
    if (!target) return;
    const timer = window.setTimeout(
      () => target.scrollIntoView({ behavior: "smooth", block: "start" }),
      80
    );
    return () => window.clearTimeout(timer);
  }, [hash]);

  return (
    <div className="container py-12 md:py-16">
      <div className="grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-16">
        {/* Índice */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-[10px] uppercase tracking-brand text-muted-foreground">Legal</p>
          <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight md:text-4xl">
            Política de datos y privacidad
          </h1>
          <p className="mt-3 text-xs text-muted-foreground">Última actualización: {LAST_UPDATED}</p>

          <nav aria-label="Contenido de la política" className="mt-6 hidden lg:block">
            <ul className="space-y-2 text-xs text-muted-foreground">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="transition hover:text-foreground hover:underline underline-offset-4"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Contenido */}
        <article className="max-w-3xl space-y-8">
          <div className="rounded-xl border bg-secondary/40 p-5 md:p-6">
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              En LUNÉ Activewear cuidamos tus datos personales. Compramos y vendemos en línea,
              conversamos por WhatsApp y usamos el mínimo de información necesaria para que tu
              pedido llegue bien. Esta página explica, en palabras simples, qué datos tocamos, por
              qué, con quién los compartimos y cómo puedes pedirnos que los eliminemos o los
              corrijamos.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Este documento se elaboró conforme a la Ley 21.719 sobre protección de datos
              personales y a la normativa de comercio electrónico aplicable en Chile.
            </p>
          </div>

          <Section id="responsable" title="Responsable del tratamiento">
            <p>
              El responsable es <strong className="font-medium text-foreground">LUNÉ Activewear</strong>,
              marca de ropa deportiva femenina que opera como negocio virtual desde Chillán,
              Ñuble, Chile. No tenemos tienda física: el retiro en Chillán se coordina por
              WhatsApp.
            </p>
            <ul className="space-y-1">
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
                <strong className="font-medium text-foreground">Sitio web:</strong>{" "}
                {absoluteUrl("/")}
              </li>
            </ul>
          </Section>

          <Section id="datos" title="Qué datos tratamos">
            <p>
              Solo tratamos los datos que nos das para poder atenderte, y los datos mínimos de
              navegación que nos permiten medir el uso del sitio cuando lo autorizas.
            </p>
            <Table
              headers={["Dato", "De dónde viene", "Para qué lo usamos"]}
              rows={[
                [
                  "Nombre, teléfono y correo",
                  "Nos los envías por WhatsApp, correo o el formulario de contacto",
                  "Confirmar pedidos, coordinar el despacho y responder tus consultas",
                ],
                [
                  "Dirección de envío y comuna",
                  "Nos la entregas al confirmar un pedido",
                  "Calcular el costo y plazo de envío y entregar la prenda",
                ],
                [
                  "Prenda, talla y color elegidos",
                  "Tu navegación y tu pedido",
                  "Preparar el pedido y verificar el stock disponible",
                ],
                [
                  "Historial de pedidos y conversaciones",
                  "Nuestras atenciones y registros internos",
                  "Atender postventa, cambios, devoluciones y garantías",
                ],
                [
                  "Datos de navegación agregados (páginas vistas, dispositivo, ciudad)",
                  "Google Analytics 4, solo con tu consentimiento",
                  "Entender qué secciones interesan y mejorar la tienda",
                ],
              ]}
            />
            <p>
              No solicitamos <strong className="font-medium text-foreground">categorías especiales de datos</strong>{" "}
              (salud, biometría, religión, orientación sexual, afiliación política). Si nos
              escribes con esa información por un motivo que no sea una necesidad de tu pedido,
              podemos eliminarla.
            </p>
            <p>
              Además, tu navegador guarda localmente el carrito ({`lune-cart`}), los favoritos (
              {`lune-wishlist`}) y tu elección sobre cookies ({`lune-cookie-consent`}). Esos datos{" "}
              <strong className="font-medium text-foreground"> no salen de tu dispositivo</strong>{" "}
              y puedes borrarlos desde la configuración de tu navegador cuando quieras.
            </p>
          </Section>

          <Section id="plazos" title="Para qué y por cuánto tiempo">
            <p>
              Usamos tus datos solo para las finalidades indicadas y los conservamos el tiempo
              necesario para cada una.
            </p>
            <Table
              headers={["Finalidad", "Base legal", "Plazo de conservación"]}
              rows={[
                [
                  "Gestionar pedidos, envíos y postventa",
                  "Ejecución del contrato",
                  "Mientras dure el pedido y hasta 6 años después, por obligaciones tributarias y contables",
                ],
                [
                  "Responder consultas y solicitudes de derechos",
                  "Consentimiento y obligaciones legales",
                  "Hasta 12 meses desde la última comunicación",
                ],
                [
                  "Medir el uso del sitio (analítica agregada)",
                  "Consentimiento revocable",
                  "Hasta 14 meses (retención estándar de Google Analytics 4)",
                ],
                [
                  "Carrito, favoritos y preferencia de cookies",
                  "Tu solicitud o consentimiento",
                  "Hasta que los borres de tu navegador",
                ],
              ]}
            />
          </Section>

          <Section id="cookies" title="Cookies">
            <p>
              Una cookie es un pequeño archivo que el sitio guarda en tu navegador. LUNÉ usa dos
              tipos: las <strong className="font-medium text-foreground">cookies propias</strong>{" "}
              (necesarias para que la tienda funcione) y las{" "}
              <strong className="font-medium text-foreground">cookies analíticas</strong> de Google
              Analytics, que solo se activan si aceptas el aviso.
            </p>
            <Table
              headers={["Nombre", "Tipo", "Para qué sirve", "Cuánto dura"]}
              rows={[
                [
                  "lune-cart",
                  "Propia (almacenamiento local)",
                  "Recordar los productos que dejaste en el carrito",
                  "Hasta que la borres",
                ],
                [
                  "lune-wishlist",
                  "Propia (almacenamiento local)",
                  "Recordar tus favoritos",
                  "Hasta que la borres",
                ],
                [
                  "lune-cookie-consent",
                  "Propia (almacenamiento local)",
                  "Recordar si aceptaste o rechazaste el aviso de cookies",
                  "Hasta que la borres",
                ],
                [
                  "_ga, _ga_XXXXXX",
                  "Analítica (Google Analytics 4)",
                  "Medir de forma agregada cómo se usa la tienda (visitas, páginas vistas)",
                  "2 años (configuración predeterminada de GA4)",
                ],
              ]}
            />
            <p>
              <strong className="font-medium text-foreground">Cómo controlarlas:</strong> al
              rechazar el aviso, Google Analytics no se carga y no se miden tus visitas; el
              carrito y los favoritos siguen funcionando, pero se borran al cerrar el navegador.
              Puedes cambiar tu decisión cuando quieras con el enlace{" "}
              <strong className="font-medium text-foreground">“Preferencias de cookies”</strong>{" "}
              del pie de página, o borrar las cookies desde la configuración de tu navegador.
            </p>
            <p>
              Hoy <strong className="font-medium text-foreground">no</strong> usamos cookies de
              publicidad comportamental ni píxeles de Meta (Facebook/Instagram). Si eso cambia,
              actualizaremos esta política y te avisaremos antes de activar esas herramientas.
            </p>
          </Section>

          <Section id="proveedores" title="Con quién los compartimos">
            <p>
              No vendemos tus datos ni los cedemos con fines publicitarios. Los compartimos solo
              con los proveedores que hacen posible la tienda:
            </p>
            <ul className="space-y-2">
              <li>
                <strong className="font-medium text-foreground">Google (Firebase):</strong> guarda
                el catálogo de productos y administra el acceso del panel de administración.
                Google Analytics 4 se usa solo con tu consentimiento.
              </li>
              <li>
                <strong className="font-medium text-foreground">Cloudflare:</strong> aloja el sitio
                y almacena las fotos de las prendas en un bucket privado (R2) con acceso
                protegido por token.
              </li>
              <li>
                <strong className="font-medium text-foreground">Servicios de despacho:</strong>{" "}
                cuando confirmas un pedido, compartimos con el courier solo el nombre, el
                teléfono y la dirección de entrega.
              </li>
            </ul>
            <p>
              Algunos de estos proveedores pueden tratar información fuera de Chile. Cuando eso
              ocurre, se aplican garantías contractuales para que el tratamiento respete la
              normativa chilena de protección de datos.
            </p>
          </Section>

          <Section id="derechos" title="Tus derechos">
            <p>
              La Ley 21.719 te reconoce los derechos de acceso, rectificación, supresión
              (cancelación), oposición, portabilidad y limitación del tratamiento. Para ejercer
              cualquiera de ellos, escríbenos a{" "}
              <a href={`mailto:${EMAIL}`} className="underline underline-offset-4">
                {EMAIL}
              </a>{" "}
              con el asunto{" "}
              <strong className="font-medium text-foreground">“Solicitud de derechos (Ley 21.719)”</strong>{" "}
              e indica qué quieres que hagamos con tus datos. Respondemos dentro del plazo legal
              vigente.
            </p>
            <p>
              Si sientes que no hemos atendido correctamente tu solicitud, puedes presentar un
              reclamo ante la Agencia de Protección de Datos Personales, la autoridad competente
              en Chile.
            </p>
          </Section>

          <Section id="seguridad" title="Seguridad">
            <ul className="space-y-2">
              <li>El sitio se sirve con HTTPS y certificados válidos.</li>
              <li>
                Las imágenes se guardan en un bucket privado; solo se entregan mediante una URL
                firmada y un token de subida que no se expone en el sitio.
              </li>
              <li>El acceso al panel de administración está restringido a las cuentas autorizadas.</li>
              <li>
                Noguardamos datos de tarjetas de crédito: el pago se coordina directamente por
                WhatsApp o en el medio que acordemos, y no hay pasarela de pago en el sitio.
              </li>
            </ul>
          </Section>

          <Section id="menores" title="Menores de edad">
            <p>
              La tienda no está dirigida a menores de 14 años y no reunimos datos de forma
              deliberada de ese grupo etario. Si crees que una menor nos entregó datos, escríbenos
              y los eliminaremos.
            </p>
          </Section>

          <Section id="cambios" title="Cambios en esta política">
            <p>
              Podemos actualizar esta política cuando cambien los servicios o la normativa. En
              ese caso cambia la fecha de “última actualización” al inicio de la página y, si el
              cambio afecta tus derechos, lo avisaremos de forma visible en el sitio.
            </p>
          </Section>

          <div className="rounded-xl bg-secondary/60 p-5 md:p-6">
            <p className="font-display text-xl">¿Tienes dudas sobre tus datos?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Escríbenos a{" "}
              <a href={`mailto:${EMAIL}`} className="underline underline-offset-4">
                {EMAIL}
              </a>{" "}
              o por WhatsApp al {WHATSAPP_DISPLAY}. También puedes volver a la{" "}
              <Link to="/tienda" className="underline underline-offset-4">
                tienda
              </Link>
              .
            </p>
          </div>        </article>
      </div>
    </div>
  );
}
