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
  type OrderEmailItem,
} from "./layout";

export interface OrderEmailData {
  code: string;
  status: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  items: OrderEmailItem[];
  subtotal: number;
  coupon?: string;
  notes?: string;
  trackingNumber?: string;
  rejectionReason?: string;
  createdAt?: string;
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

export function orderConfirmationEmail(order: OrderEmailData, siteUrl: string): BuiltEmail {
  const name = firstName(order.customerName);
  const accountUrl = `${siteUrl}/cuenta`;
  const date = formatDate(order.createdAt);

  const body = `
    <p style="margin:0 0 18px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:${BRAND.text};">
      Hola ${escapeHtml(name)}, recibimos tu pedido <strong>${escapeHtml(
        order.code
      )}</strong> y ya lo estamos preparando.
    </p>
    ${renderItems(order.items)}
    ${renderTotals({ subtotal: order.subtotal, coupon: order.coupon })}
    <div style="margin-top:26px;">
      ${renderInfoBlock([
        ["Entrega", `${escapeHtml(order.address)}<br />${escapeHtml(order.city)}`],
        ["Contacto", `${escapeHtml(order.phone)}${order.email ? `<br />${escapeHtml(order.email)}` : ""}`],
        ...(date ? [["Fecha", escapeHtml(date)] as [string, string]] : []),
        ...(order.coupon ? [["Cupón", escapeHtml(order.coupon)] as [string, string]] : []),
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
      Te escribiremos por WhatsApp al <strong style="color:${BRAND.text};">${escapeHtml(
        order.phone
      )}</strong> para coordinar el pago y la entrega. Si necesitas cambiar algo, respóndenos este correo.
    </p>
    ${renderButton(accountUrl, "Ver mi pedido")}
    <p style="margin:16px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:${BRAND.muted};">
      Puedes revisar el estado en <a href="${escapeHtml(
        accountUrl
      )}" style="color:${BRAND.text};">Mi cuenta</a> usando este mismo correo.
    </p>
  `;

  const text = [
    `Hola ${name}, recibimos tu pedido ${order.code}.`,
    "",
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
    `Entrega: ${order.address}, ${order.city}`,
    `Contacto: ${order.phone}`,
    ...(date ? [`Fecha: ${date}`] : []),
    ...(order.notes ? ["", `Nota: ${order.notes}`] : []),
    "",
    `Te escribiremos por WhatsApp al ${order.phone} para coordinar el pago y la entrega.`,
    `Ver mi pedido: ${accountUrl}`,
    "",
    "LUNÉ Activewear · Chillán, Chile",
  ].join("\n");

  return {
    subject: `Pedido ${order.code} recibido · LUNÉ Activewear`,
    html: renderLayout({
      preheader: `Recibimos tu pedido ${order.code}. Te contactaremos para coordinar la entrega.`,
      eyebrow: `Pedido ${order.code}`,
      title: "Gracias por tu compra",
      intro:
        "Tu pedido quedó registrado. Revisa el detalle y los datos de entrega a continuación.",
      body,
      siteUrl,
    }),
    text,
  };
}
