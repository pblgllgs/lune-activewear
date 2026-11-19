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

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  pagado: "Pagado",
  enviado: "Enviado",
  rechazada: "Rechazada",
};

export function orderUpdatedEmail(order: OrderEmailData, siteUrl: string): BuiltEmail {
  const name = firstName(order.customerName);
  const accountUrl = `${siteUrl}/cuenta`;
  const date = formatDate(order.createdAt);
  const statusLabel = STATUS_LABEL[order.status] ?? "Actualizado";

  const body = `
    <p style="margin:0 0 18px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:${BRAND.text};">
      Hola ${escapeHtml(name)}, actualizamos tu pedido <strong>${escapeHtml(
        order.code
      )}</strong>. A continuación verás el detalle vigente de tu compra.
    </p>
    ${renderItems(order.items)}
    ${renderTotals({ subtotal: order.subtotal, coupon: order.coupon })}
    <div style="margin-top:26px;">
      ${renderInfoBlock([
        ["Estado", escapeHtml(statusLabel)],
        ["Entrega", `${escapeHtml(order.address)}<br />${escapeHtml(order.city)}`],
        ["Contacto", `${escapeHtml(order.phone)}${order.email ? `<br />${escapeHtml(order.email)}` : ""}`],
        ...(date ? ([["Fecha del pedido", escapeHtml(date)]] as [string, string][]) : []),
        ...(order.coupon ? ([["Cupón", escapeHtml(order.coupon)]] as [string, string][]) : []),
      ])}
    </div>
    ${
      order.notes
        ? `<p style="margin:18px 0 0;padding:12px 16px;background:${BRAND.soft};border-left:3px solid ${BRAND.accent};border-radius:6px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${BRAND.muted};">
            <strong style="color:${BRAND.text};">Nota:</strong> ${escapeHtml(order.notes)}
          </p>`
        : ""
    }
    <p style="margin:22px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:${BRAND.muted};">
      Si tienes dudas sobre este cambio o necesitas ajustar algo, respóndenos este correo y te ayudamos.
    </p>
    ${renderButton(accountUrl, "Ver mi pedido")}
    <p style="margin:16px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:${BRAND.muted};">
      Puedes revisar el estado en <a href="${escapeHtml(
        accountUrl
      )}" style="color:${BRAND.text};">Mi cuenta</a> usando este mismo correo.
    </p>
  `;

  const text = [
    `Hola ${name}, actualizamos tu pedido ${order.code}.`,
    "",
    "Detalle actualizado:",
    ...order.items.map(
      (item) =>
        `- ${item.name} (${item.color}, talla ${item.size}) x${item.qty}: ${formatCLP(
          item.price * item.qty
        )}`
    ),
    "",
    `Subtotal: ${formatCLP(order.subtotal)}`,
    ...(order.coupon ? [`Cupón: ${order.coupon}`] : []),
    `Total: ${formatCLP(order.subtotal)}`,
    "",
    `Estado: ${statusLabel}`,
    `Entrega: ${order.address}, ${order.city}`,
    `Contacto: ${order.phone}`,
    ...(date ? [`Fecha del pedido: ${date}`] : []),
    ...(order.notes ? ["", `Nota: ${order.notes}`] : []),
    "",
    "Si tienes dudas sobre este cambio, respóndenos este correo.",
    `Ver mi pedido: ${accountUrl}`,
    "",
    "LUNÉ Activewear · Chillán, Chile",
  ].join("\n");

  return {
    subject: `Actualización de tu pedido ${order.code} · LUNÉ Activewear`,
    html: renderLayout({
      preheader: `Actualizamos el detalle de tu pedido ${order.code}.`,
      eyebrow: `Pedido ${order.code}`,
      title: "Tu pedido fue actualizado",
      intro: "Hicimos cambios en tu pedido. Revisa la información actualizada a continuación.",
      body,
      siteUrl,
      footerNote: "Recibes este correo porque tu pedido en LUNÉ Activewear fue actualizado.",
    }),
    text,
  };
}