/**
 * POST /api/restock/notify
 *
 * Envía los avisos de reposición pendientes de un producto y los marca como
 * notificados. Solo admins.
 *
 * Body: { productId: string }
 */

import { requireAdmin } from "../../_lib/auth";
import { isEmailConfigured, sendEmail } from "../../_lib/email";
import { restockEmail } from "../../_lib/emails/restock";
import {
  getDocument,
  isFirestoreConfigured,
  listDocuments,
  patchDocument,
} from "../../_lib/firebase-admin";
import { json, methodNotAllowed } from "../../_lib/http";
import { siteUrl } from "../../_lib/seo";

type Env = Record<string, string | undefined>;

// Cada aviso son 2 subrequests (Brevo + Firestore). El plan de Workers permite
// 50 por invocación, así que se deja margen para listar y autenticar.
const MAX_PER_CALL = 15;

const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const num = (value: unknown): number => {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;

  const admin = await requireAdmin(env, request);
  if (!admin) return json({ error: "No autorizado." }, 401);

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

  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(productId)) {
    return json({ error: "Producto inválido." }, 400);
  }

  try {
    const product = await getDocument(env, `products/${productId}`);
    if (!product) return json({ error: "Producto no encontrado." }, 404);

    const productName = str(product.name) || productId;
    const images = Array.isArray(product.images) ? (product.images as unknown[]) : [];
    const image = str(images[0]);
    const price = num(product.price);

    const requests = await listDocuments(env, `products/${productId}/restockRequests`);
    const pending = requests.filter(
      (entry) => entry.data.notifiedAt == null && str(entry.data.email).includes("@")
    );

    const batch = pending.slice(0, MAX_PER_CALL);
    let sent = 0;
    let failed = 0;

    for (const entry of batch) {
      const email = str(entry.data.email);
      try {
        const built = restockEmail(
          {
            productId,
            productName,
            image: image || undefined,
            size: str(entry.data.size),
            color: str(entry.data.color),
            price: price || undefined,
            email,
          },
          siteUrl(env)
        );

        await sendEmail(env, {
          to: email,
          subject: built.subject,
          html: built.html,
          text: built.text,
          tags: ["reposicion", productId],
        });

        await patchDocument(env, `products/${productId}/restockRequests/${entry.id}`, {
          notifiedAt: new Date().toISOString(),
          notifiedBy: admin,
        });
        sent += 1;
      } catch (error) {
        console.warn("[email] restock notify:", entry.id, error);
        failed += 1;
      }
    }

    return json({
      ok: true,
      sent,
      failed,
      pending: Math.max(0, pending.length - sent),
      total: pending.length,
    });
  } catch (error) {
    console.warn("[email] restock:", error);
    return json({ error: "No se pudieron enviar los avisos." }, 502);
  }
}

export function onRequest(): Response {
  return methodNotAllowed();
}
