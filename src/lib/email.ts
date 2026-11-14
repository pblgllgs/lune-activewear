import { auth } from "@/lib/firebase";

/**
 * Cliente de los endpoints de correo (`/api/*`).
 *
 * El envío real ocurre en las Pages Functions: aquí nunca hay API keys. Los
 * endpoints de administración envían el ID token de la sesión actual.
 */

interface ApiError {
  error?: string;
}

async function authorization(): Promise<Record<string, string>> {
  const user = auth?.currentUser;
  if (!user) return {};
  try {
    const token = await user.getIdToken();
    return { authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

async function post<T>(
  path: string,
  body: unknown,
  authenticated: boolean
): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (authenticated) Object.assign(headers, await authorization());

  const response = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) {
    throw new Error(data?.error || "No se pudo enviar el correo.");
  }
  return data;
}

export type OrderEmailEvent =
  | "confirmation"
  | "aprobada"
  | "pagado"
  | "enviado"
  | "rechazada";

/** Envía la confirmación o el aviso de cambio de estado de un pedido. */
export function notifyOrderEmail(
  orderId: string,
  event: OrderEmailEvent,
  options: { force?: boolean } = {}
): Promise<{ ok: boolean; id?: string; skipped?: string }> {
  return post(
    "/api/orders/notify",
    { orderId, event, force: options.force === true },
    event !== "confirmation"
  );
}

/** Avisa a quienes pidieron reposición de un producto (solo admin). */
export function notifyRestock(
  productId: string
): Promise<{ ok: boolean; sent: number; failed: number; pending: number; total: number }> {
  return post("/api/restock/notify", { productId }, true);
}

/** Envía un correo de prueba con la plantilla de confirmación (solo admin). */
export function sendTestEmail(
  to: string
): Promise<{ ok: boolean; id?: string; provider?: string }> {
  return post("/api/email/test", { to }, true);
}
