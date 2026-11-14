/**
 * Estructura y piezas comunes de los correos transaccionales.
 *
 * La estética replica la tienda: fondo porcelana (#F8F5F1), chocolate (#49372D),
 * crema (#EEE7DF) y rosa empolvado (#EADDE0). Todo el CSS va inline y en tablas
 * porque Gmail y Outlook descartan hojas de estilo y flex/grid.
 */

export const BRAND = {
  background: "#F8F5F1",
  card: "#FFFDFB",
  border: "#EEE7DF",
  text: "#49372D",
  muted: "#7A6C61",
  accent: "#EADDE0",
  soft: "#F3EDE6",
};

const DISPLAY = "'Jost', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const BODY = "'Inter', Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatCLP(value: number): string {
  const amount = Math.max(0, Math.round(Number(value) || 0));
  return `$${amount.toLocaleString("es-CL")}`;
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function formatDate(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCDate()} de ${MONTHS[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
}

export function firstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] || "hola";
}

export function renderButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px;">
  <tr>
    <td style="border-radius:8px;background:${BRAND.text};">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;font-family:${DISPLAY};font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:${BRAND.background};text-decoration:none;border-radius:8px;">${escapeHtml(
        label
      )}</a>
    </td>
  </tr>
</table>`;
}

export function renderInfoBlock(rows: Array<[string, string]>): string {
  const cells = rows
    .map(
      ([label, value]) => `<tr>
      <td style="padding:6px 0;font-family:${BODY};font-size:12px;color:${BRAND.muted};width:42%;vertical-align:top;">${escapeHtml(
        label
      )}</td>
      <td style="padding:6px 0;font-family:${BODY};font-size:13px;color:${BRAND.text};vertical-align:top;">${value}</td>
    </tr>`
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.soft};border-radius:10px;padding:4px;">
  <tr><td style="padding:14px 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cells}</table>
  </td></tr>
</table>`;
}

export interface OrderEmailItem {
  name: string;
  image?: string;
  size: string;
  color: string;
  qty: number;
  price: number;
}

export function renderItems(items: OrderEmailItem[]): string {
  const rows = items
    .map((item) => {
      const image = item.image
        ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(
            item.name
          )}" width="56" height="70" style="display:block;width:56px;height:70px;object-fit:cover;border-radius:6px;border:1px solid ${
            BRAND.border
          };" />`
        : `<div style="width:56px;height:70px;border-radius:6px;border:1px solid ${BRAND.border};background:${BRAND.soft};"></div>`;

      const variant = [item.color, item.size ? `Talla ${item.size}` : ""]
        .filter(Boolean)
        .map((value) => escapeHtml(value))
        .join(" · ");

      return `<tr>
        <td style="padding:12px 0;border-bottom:1px solid ${BRAND.border};width:68px;vertical-align:top;">${image}</td>
        <td style="padding:12px 0 12px 14px;border-bottom:1px solid ${BRAND.border};vertical-align:top;">
          <p style="margin:0;font-family:${BODY};font-size:13px;font-weight:500;color:${BRAND.text};">${escapeHtml(
            item.name
          )}</p>
          <p style="margin:4px 0 0;font-family:${BODY};font-size:11px;color:${BRAND.muted};">${variant}</p>
          <p style="margin:4px 0 0;font-family:${BODY};font-size:11px;color:${BRAND.muted};">Cantidad: ${item.qty}</p>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid ${BRAND.border};vertical-align:top;text-align:right;white-space:nowrap;">
          <span style="font-family:${BODY};font-size:13px;color:${BRAND.text};">${formatCLP(
            item.price * item.qty
          )}</span>
        </td>
      </tr>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 0;">${rows}</table>`;
}

export function renderTotals(input: { subtotal: number; coupon?: string; shipping?: number }): string {
  const rows: string[] = [
    `<tr>
      <td style="padding:4px 0;font-family:${BODY};font-size:12px;color:${BRAND.muted};">Subtotal</td>
      <td style="padding:4px 0;font-family:${BODY};font-size:12px;color:${BRAND.text};text-align:right;">${formatCLP(
        input.subtotal
      )}</td>
    </tr>`,
  ];

  if (input.coupon) {
    rows.push(`<tr>
      <td style="padding:4px 0;font-family:${BODY};font-size:12px;color:${BRAND.muted};">Cupón</td>
      <td style="padding:4px 0;font-family:${BODY};font-size:12px;color:${BRAND.text};text-align:right;">${escapeHtml(
        input.coupon
      )}</td>
    </tr>`);
  }

  if (typeof input.shipping === "number") {
    rows.push(`<tr>
      <td style="padding:4px 0;font-family:${BODY};font-size:12px;color:${BRAND.muted};">Envío</td>
      <td style="padding:4px 0;font-family:${BODY};font-size:12px;color:${BRAND.text};text-align:right;">${
        input.shipping === 0 ? "Gratis" : formatCLP(input.shipping)
      }</td>
    </tr>`);
  }

  rows.push(`<tr>
    <td style="padding:12px 0 0;border-top:1px solid ${BRAND.border};font-family:${DISPLAY};font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.text};">Total</td>
    <td style="padding:12px 0 0;border-top:1px solid ${BRAND.border};font-family:${DISPLAY};font-size:16px;color:${BRAND.text};text-align:right;">${formatCLP(
      input.subtotal + (input.shipping ?? 0)
    )}</td>
  </tr>`);

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">${rows.join(
    ""
  )}</table>`;
}

export interface LayoutOptions {
  /** Texto que se ve en la bandeja antes de abrir el correo. */
  preheader: string;
  /** Pequeña etiqueta sobre el título (ej. el código del pedido). */
  eyebrow?: string;
  title: string;
  intro?: string;
  body: string;
  footerNote?: string;
  siteUrl: string;
}

export function renderLayout(options: LayoutOptions): string {
  const displayUrl = options.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const eyebrow = options.eyebrow
    ? `<p style="margin:0 0 10px;font-family:${BODY};font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:${BRAND.muted};">${escapeHtml(
        options.eyebrow
      )}</p>`
    : "";
  const intro = options.intro
    ? `<p style="margin:14px 0 0;font-family:${BODY};font-size:14px;line-height:1.65;color:${BRAND.muted};">${options.intro}</p>`
    : "";
  const footerNote =
    options.footerNote ||
    "Recibes este correo porque hiciste un pedido en LUNÉ Activewear.";

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.background};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(
    options.preheader
  )}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${
    BRAND.background
  };padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${
          BRAND.card
        };border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:34px 32px 0;text-align:center;">
              <a href="${escapeHtml(options.siteUrl)}" style="text-decoration:none;">
                <span style="font-family:${DISPLAY};font-size:24px;font-weight:500;letter-spacing:0.38em;color:${
                  BRAND.text
                };">LUNÉ</span>
              </a>
              <p style="margin:6px 0 0;font-family:${BODY};font-size:9px;letter-spacing:0.45em;text-transform:uppercase;color:${
                BRAND.muted
              };">Activewear</p>
              <div style="height:1px;background:${BRAND.accent};margin:24px 0 0;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 32px 8px;">
              ${eyebrow}
              <h1 style="margin:0;font-family:${DISPLAY};font-size:27px;font-weight:400;line-height:1.25;color:${
                BRAND.text
              };">${escapeHtml(options.title)}</h1>
              ${intro}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 36px;font-family:${BODY};font-size:14px;line-height:1.65;color:${
              BRAND.text
            };">${options.body}</td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background:${BRAND.background};border-top:1px solid ${
              BRAND.border
            };">
              <p style="margin:0;font-family:${BODY};font-size:11px;line-height:1.6;color:${BRAND.muted};text-align:center;">
                ${escapeHtml(footerNote)}
              </p>
              <p style="margin:10px 0 0;font-family:${BODY};font-size:11px;line-height:1.6;color:${BRAND.muted};text-align:center;">
                LUNÉ Activewear · Chillán, Chile
              </p>
              <p style="margin:6px 0 0;font-family:${BODY};font-size:11px;line-height:1.6;color:${BRAND.muted};text-align:center;">
                <a href="${escapeHtml(options.siteUrl)}" style="color:${BRAND.muted};text-decoration:underline;">${escapeHtml(
                  displayUrl
                )}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
