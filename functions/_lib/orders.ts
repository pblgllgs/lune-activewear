/** Normalización del documento de pedido para las plantillas de correo. */

import type { OrderEmailData } from "./emails/order-confirmation";
import type { OrderEmailItem } from "./emails/layout";

const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const num = (value: unknown): number => {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

function normalizeItem(value: unknown): OrderEmailItem | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const name = str(data.name);
  if (!name) return null;
  return {
    name,
    image: str(data.image) || undefined,
    size: str(data.size),
    color: str(data.color) || "Único",
    qty: Math.max(1, Math.round(Number(data.qty) || 1)),
    price: Math.max(0, Math.round(Number(data.price) || 0)),
  };
}

export function normalizeOrderForEmail(data: Record<string, unknown>): OrderEmailData {
  const customer =
    data.customer && typeof data.customer === "object"
      ? (data.customer as Record<string, unknown>)
      : {};
  const email = (str(data.customerEmail) || str(customer.email)).toLowerCase();

  return {
    code: str(data.code) || "LUNÉ",
    status: str(data.status) || "pendiente",
    customerName: str(customer.name),
    email,
    phone: str(customer.phone),
    address: str(customer.address),
    city: str(customer.city),
    items: Array.isArray(data.items)
      ? data.items.map(normalizeItem).filter((item): item is OrderEmailItem => item !== null)
      : [],
    subtotal: num(data.subtotal),
    coupon: str(data.coupon) || undefined,
    notes: str(data.notes) || undefined,
    trackingNumber: str(data.trackingNumber) || undefined,
    rejectionReason: str(data.rejectionReason) || undefined,
    createdAt: str(data.createdAt) || undefined,
  };
}

/** Estado de los correos enviados, guardado en el propio pedido. */
export interface OrderEmails {
  [event: string]: { sentAt?: string; messageId?: string; to?: string; by?: string };
}

export function orderEmails(value: unknown): OrderEmails {
  if (!value || typeof value !== "object") return {};
  return value as OrderEmails;
}
