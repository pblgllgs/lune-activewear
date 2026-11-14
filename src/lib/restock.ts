import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Suscripción al aviso de reposición de una variante agotada.
 *
 * El ID del documento es un hash de correo + talla + color, así la misma
 * clienta no genera duplicados y puede volver a suscribirse sin crear ruido.
 */

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function hashRequestId(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 40);
}

export interface RestockSubscription {
  email: string;
  size: string;
  color: string;
}

export async function subscribeRestock(
  productId: string,
  { email, size, color }: RestockSubscription
): Promise<void> {
  if (!db) throw new Error("Firebase no está configurado.");

  const normalized = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(normalized)) {
    throw new Error("Escribe un correo válido.");
  }

  const id = await hashRequestId(`${normalized}|${size}|${color}`);
  await setDoc(doc(db, "products", productId, "restockRequests", id), {
    email: normalized,
    size,
    color,
    productId,
    createdAt: new Date().toISOString(),
    notifiedAt: null,
  });
}
