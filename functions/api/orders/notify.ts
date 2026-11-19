/**
 * POST /api/orders/notify
 *
 * Envía la confirmación de un pedido o el aviso de cambio de estado.
 * - `event: "confirmation"` es público: solo puede enviarse al correo del propio
 *   pedido y una única vez (idempotente).
 * - El resto de eventos exige el ID token de un admin.
 *
 * Body: { orderId: string, event: "confirmation" | "aprobada" | "pagado" |
 *         "enviado" | "rechazada", force?: boolean }
 */

import { requireAdmin } from "../../_lib/auth";
import { isEmailConfigured, sendEmail } from "../../_lib/email";
import { orderConfirmationEmail } from "../../_lib/emails/order-confirmation";
import { orderStatusEmail, type StatusEvent } from "../../_lib/emails/order-status";
import { orderUpdatedEmail } from "../../_lib/emails/order-updated";
import { getDocument, isFirestoreConfigured, patchDocument } from "../../_lib/firebase-admin";
import { json, methodNotAllowed } from "../../_lib/http";
import { normalizeOrderForEmail, orderEmails } from "../../_lib/orders";
import { siteUrl } from "../../_lib/seo";

type Env = Record<string, string | undefined>;

const STATUS_EVENTS: StatusEvent[] = ["aprobada", "pagado", "enviado", "rechazada"];
type NotifyEvent = "confirmation" | StatusEvent | "actualizada";

function normalizeEvent(value: unknown): NotifyEvent | null {
  const event = typeof value === "string" ? value.trim() : "";
  if (event === "confirmation") return "confirmation";
  if (event === "actualizada") return "actualizada";
  return (STATUS_EVENTS as string[]).includes(event) ? (event as StatusEvent) : null;
}

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;

  if (!isFirestoreConfigured(env)) {
    return json({ error: "Firestore no está configurado en el servidor." }, 503);
  }
  if (!isEmailConfigured(env)) {
    return json({ error: "El correo no está configurado en el servidor." }, 503);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Cuerpo JSON inválido." }, 400);
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(orderId)) {
    return json({ error: "Pedido inválido." }, 400);
  }

  const event = normalizeEvent(body.event);
  if (!event) return json({ error: "Evento inválido." }, 400);

  // El token solo es obligatorio para eventos de administración; si una sesión
  // de admin reenvía la confirmación, se valida igual y puede usar `force`.
  const admin = await requireAdmin(env, request);
  if (event !== "confirmation" && !admin) {
    return json({ error: "No autorizado." }, 401);
  }
  const force = body.force === true && admin !== null;

  try {
    const raw = await getDocument(env, `orders/${orderId}`);
    if (!raw) return json({ error: "Pedido no encontrado." }, 404);

    const order = normalizeOrderForEmail(raw);
    if (!order.email) {
      return json({ error: "El pedido no tiene correo registrado." }, 422);
    }
    if (event !== "confirmation" && event !== "actualizada" && order.status !== event) {
      return json({ error: "El estado del pedido no coincide con el evento." }, 409);
    }

    const emails = orderEmails(raw.emails);
    if (!force && emails[event]?.sentAt) {
      return json({ ok: true, skipped: "already-sent" });
    }

    const built =
      event === "confirmation"
        ? orderConfirmationEmail(order, siteUrl(env))
        : event === "actualizada"
          ? orderUpdatedEmail(order, siteUrl(env))
          : orderStatusEmail(order, event, siteUrl(env));

    const result = await sendEmail(env, {
      to: order.email,
      subject: built.subject,
      html: built.html,
      text: built.text,
      tags: ["pedido", event],
    });

    await patchDocument(env, `orders/${orderId}`, {
      emails: {
        ...emails,
        [event]: {
          sentAt: new Date().toISOString(),
          messageId: result.id,
          to: order.email,
          by: admin ?? "web",
        },
      },
    });

    return json({ ok: true, id: result.id, provider: result.provider });
  } catch (error) {
    console.warn("[email] order notify:", error);
    return json({ error: "No se pudo enviar el correo." }, 502);
  }
}

export function onRequest(): Response {
  return methodNotAllowed();
}
