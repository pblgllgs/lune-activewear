/**
 * POST /api/email/test
 *
 * Envía un correo de prueba con la plantilla de confirmación. Solo admins.
 *
 * Body: { to?: string }
 */

import { requireAdmin } from "../../_lib/auth";
import { isEmailConfigured, sender, sendEmail } from "../../_lib/email";
import { orderConfirmationEmail } from "../../_lib/emails/order-confirmation";
import { json, methodNotAllowed } from "../../_lib/http";
import { siteUrl } from "../../_lib/seo";

type Env = Record<string, string | undefined>;

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;

  const admin = await requireAdmin(env, request);
  if (!admin) return json({ error: "No autorizado." }, 401);

  if (!isEmailConfigured(env)) {
    return json({ error: "El correo no está configurado en el servidor." }, 503);
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const to = typeof body.to === "string" ? body.to.trim().toLowerCase() : admin;
  if (!EMAIL_PATTERN.test(to)) return json({ error: "Correo inválido." }, 400);

  try {
    const built = orderConfirmationEmail(
      {
        code: "LUN-TEST-0001",
        status: "pendiente",
        customerName: "Clienta de prueba",
        email: to,
        phone: "+56 9 1234 5678",
        address: "Av. Argentina 123",
        city: "Chillán",
        items: [
          {
            name: "Calza Flare Chocolate",
            size: "M",
            color: "Chocolate",
            qty: 1,
            price: 24990,
          },
          {
            name: "Polera Manga Larga Crema",
            size: "S",
            color: "Crema",
            qty: 2,
            price: 17990,
          },
        ],
        subtotal: 60970,
        coupon: "BIENVENIDA10",
        createdAt: new Date().toISOString(),
      },
      siteUrl(env)
    );

    const result = await sendEmail(env, {
      to,
      subject: `[Prueba] ${built.subject}`,
      html: built.html,
      text: built.text,
      tags: ["prueba"],
    });

    return json({
      ok: true,
      id: result.id,
      provider: result.provider,
      from: sender(env),
    });
  } catch (error) {
    console.warn("[email] test:", error);
    return json({ error: "No se pudo enviar el correo de prueba." }, 502);
  }
}

export function onRequest(): Response {
  return methodNotAllowed();
}
