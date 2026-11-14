import {
  BRAND,
  escapeHtml,
  formatCLP,
  renderButton,
  renderLayout,
} from "./layout";
import type { BuiltEmail } from "./order-confirmation";

export interface RestockEmailData {
  productId: string;
  productName: string;
  image?: string;
  size: string;
  color: string;
  price?: number;
  email: string;
}

export function restockEmail(data: RestockEmailData, siteUrl: string): BuiltEmail {
  const url = `${siteUrl}/producto/${encodeURIComponent(data.productId)}`;
  const variant = [data.color, data.size ? `Talla ${data.size}` : ""]
    .filter(Boolean)
    .map((value) => escapeHtml(value))
    .join(" · ");

  const image = data.image
    ? `<img src="${escapeHtml(data.image)}" alt="${escapeHtml(
        data.productName
      )}" width="180" style="display:block;width:180px;max-width:100%;border-radius:10px;border:1px solid ${
        BRAND.border
      };" />`
    : "";

  const body = `
    <p style="margin:0 0 20px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:${BRAND.text};">
      El producto que estabas esperando volvió a estar disponible.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.soft};border-radius:12px;">
      <tr>
        <td style="padding:22px;text-align:center;">
          ${image}
          <p style="margin:16px 0 0;font-family:'Jost',Helvetica,Arial,sans-serif;font-size:18px;color:${BRAND.text};">
            ${escapeHtml(data.productName)}
          </p>
          <p style="margin:6px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;color:${BRAND.muted};">
            ${variant}
          </p>
          ${
            typeof data.price === "number"
              ? `<p style="margin:8px 0 0;font-family:'Jost',Helvetica,Arial,sans-serif;font-size:16px;color:${BRAND.text};">${formatCLP(
                  data.price
                )}</p>`
              : ""
          }
        </td>
      </tr>
    </table>
    <p style="margin:22px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:${BRAND.muted};">
      El stock es limitado, así que te recomendamos asegurar tu talla pronto.
    </p>
    ${renderButton(url, "Ver producto")}
  `;

  const text = [
    `${data.productName} volvió a estar disponible.`,
    "",
    `Variante: ${data.color}, talla ${data.size}`,
    ...(typeof data.price === "number" ? [`Precio: ${formatCLP(data.price)}`] : []),
    "",
    `Ver producto: ${url}`,
    "",
    "LUNÉ Activewear · Chillán, Chile",
  ].join("\n");

  return {
    subject: `Volvió ${data.productName} · LUNÉ Activewear`,
    html: renderLayout({
      preheader: `${data.productName} está disponible otra vez en ${data.color}, talla ${data.size}.`,
      eyebrow: "Aviso de reposición",
      title: "Ya está disponible",
      intro: "Nos pediste que te avisáramos y aquí está.",
      body,
      siteUrl,
      footerNote:
        "Recibes este correo porque pediste aviso de reposición en LUNÉ Activewear.",
    }),
    text,
  };
}
