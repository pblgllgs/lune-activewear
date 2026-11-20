import {
  BRAND,
  escapeHtml,
  firstName,
  formatCLP,
  formatDate,
  renderButton,
  renderInfoBlock,
  renderItems,
  renderLayout,
  renderTotals,
} from "./layout";
import type { BuiltEmail, OrderEmailData } from "./order-confirmation";
import { carrierTrackingUrl } from "../carriers";

export type StatusEvent = "aprobada" | "pagado" | "enviado" | "rechazada";

const COPY: Record<
  StatusEvent,
  { title: string; intro: string; subject: (code: string) => string; preheader: string }
> = {
  aprobada: {
    title: "Pedido confirmado",
    intro: "Confirmamos tu pedido y ya estamos preparando tus prendas.",
    subject: (code) => `Pedido ${code} confirmado · LUNÉ Activewear`,
    preheader: "Tu pedido fue confirmado. Te avisaremos cuando salga.",
  },
  pagado: {
    title: "Pago recibido",
    intro: "Registramos el pago de tu pedido. Gracias por confiar en LUNÉ.",
    subject: (code) => `Pago recibido · Pedido ${code} · LUNÉ Activewear`,
    preheader: "Recibimos tu pago y seguimos con la preparación del pedido.",
  },
  enviado: {
    title: "Tu pedido está en camino",
    intro: "Despachamos tu pedido. Revisa los datos de envío para saber dónde va.",
    subject: (code) => `Tu pedido ${code} está en camino · LUNÉ Activewear`,
    preheader: "Tu pedido fue despachado. Aquí tienes el seguimiento.",
  },
  rechazada: {
    title: "Pedido no confirmado",
    intro: "No pudimos confirmar tu pedido. Te contamos el motivo y cómo seguir.",
    subject: (code) => `Actualización de tu pedido ${code} · LUNÉ Activewear`,
    preheader: "Hubo un cambio en tu pedido. Revisa el detalle.",
  },
};

export function orderStatusEmail(
  order: OrderEmailData,
  status: StatusEvent,
  siteUrl: string
): BuiltEmail {
  const copy = COPY[status];
  const name = firstName(order.customerName);
  const accountUrl = `${siteUrl}/cuenta`;

  const trackingUrl = status === "enviado" ? carrierTrackingUrl(order.carrier) : null;
  /** Nombre del courier; enlazado a su página de rastreo cuando existe. */
  const carrierHtml = order.carrier
    ? trackingUrl
      ? `<a href="${escapeHtml(trackingUrl)}" style="color:${BRAND.text};text-decoration:underline;">${escapeHtml(
          order.carrier
        )}</a>`
      : escapeHtml(order.carrier)
    : "";

  const trackingBlock =
    status === "enviado" && (order.trackingNumber || order.carrier)
      ? (() => {
          const eyebrow = order.trackingNumber ? "Número de seguimiento" : "Empresa de envío";
          const main = order.trackingNumber ? escapeHtml(order.trackingNumber) : carrierHtml;
          const detail = order.trackingNumber && order.carrier ? `Envío por ${carrierHtml}` : "";
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;background:${BRAND.soft};border-radius:10px;">
          <tr>
            <td style="padding:18px 20px;">
              <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${BRAND.muted};">
                ${eyebrow}
              </p>
              <p style="margin:8px 0 0;font-family:'Jost',Helvetica,Arial,sans-serif;font-size:20px;letter-spacing:0.12em;color:${BRAND.text};">
                ${main}
              </p>
              ${detail
                ? `<p style="margin:6px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};">${detail}</p>`
                : ""}
              ${trackingUrl
                ? `<p style="margin:14px 0 0;"><a href="${escapeHtml(
                    trackingUrl
                  )}" style="display:inline-block;padding:11px 20px;border:1px solid ${BRAND.text};border-radius:8px;font-family:'Jost',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${BRAND.text};text-decoration:none;">Rastrear en ${escapeHtml(
                    order.carrier ?? ""
                  )}</a></p>`
                : ""}
            </td>
          </tr>
        </table>`;
        })()
      : "";

  const reasonBlock =
    status === "rechazada" && order.rejectionReason
      ? `<p style="margin:20px 0 0;padding:14px 16px;background:${BRAND.soft};border-left:3px solid ${BRAND.accent};border-radius:6px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:${BRAND.text};">
          <strong>Motivo:</strong> ${escapeHtml(order.rejectionReason)}
        </p>`
      : "";

  const helpText =
    status === "rechazada"
      ? `Si crees que es un error o quieres coordinar otra forma de pago, respóndenos este correo y lo revisamos.`
      : `Si tienes dudas sobre tu pedido, respóndenos este correo y te ayudamos.`;

  const body = `
    <p style="margin:0 0 18px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:${BRAND.text};">
      Hola ${escapeHtml(name)}, tu pedido <strong>${escapeHtml(order.code)}</strong> cambió de estado.
    </p>
    ${reasonBlock}
    ${trackingBlock}
    ${renderItems(order.items)}
    ${renderTotals({ subtotal: order.subtotal, discount: order.discount, coupon: order.coupon })}
    <div style="margin-top:26px;">
      ${renderInfoBlock([
        ["Estado", escapeHtml(copy.title)],
        ["Entrega", `${escapeHtml(order.address)}<br />${escapeHtml(order.city)}`],
        ...(status === "enviado" && order.trackingNumber
          ? [["Seguimiento", escapeHtml(order.trackingNumber)] as [string, string]]
          : []),
        ...(order.carrier ? [["Transporte", carrierHtml] as [string, string]] : []),
        ...(order.createdAt
          ? [["Pedido", escapeHtml(formatDate(order.createdAt))] as [string, string]]
          : []),
      ])}
    </div>
    <p style="margin:22px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:${BRAND.muted};">
      ${escapeHtml(helpText)}
    </p>
    ${renderButton(accountUrl, "Ver mi pedido")}
  `;

  const text = [
    `Hola ${name}, tu pedido ${order.code} cambió de estado: ${copy.title}.`,
    ...(status === "rechazada" && order.rejectionReason
      ? ["", `Motivo: ${order.rejectionReason}`]
      : []),
    ...(status === "enviado" && order.trackingNumber
      ? ["", `Número de seguimiento: ${order.trackingNumber}`]
      : []),
    ...(order.carrier ? ["", `Proveedor de envío: ${order.carrier}`] : []),
    ...(trackingUrl ? [`Rastrear en ${order.carrier}: ${trackingUrl}`] : []),
    "",
    ...order.items.map(
      (item) => `- ${item.name} (${item.color}, talla ${item.size}) x${item.qty}`
    ),
    "",
    ...((order.discount ?? 0) > 0 ? [`Descuento${order.coupon ? ` (${order.coupon})` : ""}: -${formatCLP(order.discount ?? 0)}`] : []),
    `Total: ${formatCLP(Math.max(0, order.subtotal - (order.discount ?? 0)))}`,
    "",
    `Entrega: ${order.address}, ${order.city}`,
    "",
    helpText,
    `Ver mi pedido: ${accountUrl}`,
    "",
    "LUNÉ Activewear · Chillán, Chile",
  ].join("\n");

  return {
    subject: copy.subject(order.code),
    html: renderLayout({
      preheader: copy.preheader,
      eyebrow: `Pedido ${order.code}`,
      title: copy.title,
      intro: copy.intro,
      body,
      siteUrl,
      footerNote:
        status === "rechazada"
          ? "Este correo es informativo sobre tu pedido en LUNÉ Activewear."
          : "Recibes este correo porque hiciste un pedido en LUNÉ Activewear.",
    }),
    text,
  };
}
