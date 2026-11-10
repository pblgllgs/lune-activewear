import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  runTransaction,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  CreateOrderInput,
  Order,
  OrderCustomer,
  OrderItem,
  OrderStatus,
} from "@/types/order";

const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const int = (value: unknown): number => {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : 0;
};

function normalizeStatus(value: unknown): OrderStatus {
  return value === "aprobada" || value === "rechazada" ? value : "pendiente";
}

function normalizeCustomer(value: unknown): OrderCustomer {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    name: str(data.name),
    phone: str(data.phone),
    email: str(data.email) || undefined,
    address: str(data.address),
    city: str(data.city),
  };
}

function normalizeItem(value: unknown): OrderItem | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const productId = str(data.productId);
  const name = str(data.name);
  if (!productId && !name) return null;
  return {
    productId,
    name: name || productId,
    image: str(data.image) || undefined,
    size: str(data.size),
    color: str(data.color),
    qty: int(data.qty),
    price: Math.max(0, Math.round(Number(data.price) || 0)),
  };
}

export function normalizeOrder(id: string, data: Record<string, unknown>): Order {
  return {
    id,
    code: str(data.code) || id.slice(0, 8).toUpperCase(),
    status: normalizeStatus(data.status),
    customer: normalizeCustomer(data.customer),
    items: Array.isArray(data.items)
      ? data.items.map(normalizeItem).filter((item): item is OrderItem => item !== null)
      : [],
    subtotal: Math.max(0, Math.round(Number(data.subtotal) || 0)),
    coupon: str(data.coupon) || undefined,
    notes: str(data.notes) || undefined,
    stockApplied: data.stockApplied === true,
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
    approvedAt: data.approvedAt ? String(data.approvedAt) : undefined,
    approvedBy: data.approvedBy ? String(data.approvedBy) : undefined,
    rejectedAt: data.rejectedAt ? String(data.rejectedAt) : undefined,
    rejectedBy: data.rejectedBy ? String(data.rejectedBy) : undefined,
    rejectionReason: data.rejectionReason ? String(data.rejectionReason) : undefined,
  };
}

function makeCode(): string {
  const now = new Date();
  const date = [
    String(now.getFullYear()).slice(2),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LUN-${date}-${random}`;
}

/** Escucha todas las órdenes, más recientes primero (solo admin por reglas). */
export function subscribeOrders(callback: (orders: Order[]) => void): () => void {
  if (!db) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, "orders"),
    (snap) => {
      callback(
        snap.docs
          .map((document) => normalizeOrder(document.id, document.data()))
          .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      );
    },
    () => callback([])
  );
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  if (!db) throw new Error("Firebase no está configurado.");
  const code = makeCode();
  const now = new Date().toISOString();
  const customer = normalizeCustomer(input.customer);
  const items = input.items
    .map(normalizeItem)
    .filter((item): item is OrderItem => item !== null);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  const ref = await addDoc(collection(db, "orders"), {
    code,
    status: "pendiente",
    customer,
    items,
    subtotal,
    coupon: input.coupon?.trim() || "",
    notes: input.notes?.trim() || "",
    stockApplied: false,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: ref.id,
    code,
    status: "pendiente",
    customer,
    items,
    subtotal,
    coupon: input.coupon?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    stockApplied: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Aprueba una orden y descuenta el stock por talla en una transacción.
 * Si algún producto no existe o no hay unidades suficientes, no se cambia nada.
 */
export async function approveOrder(orderId: string, adminEmail: string): Promise<void> {
  const firestore = db;
  if (!firestore) throw new Error("Firebase no está configurado.");

  await runTransaction(firestore, async (transaction) => {
    const orderRef = doc(firestore, "orders", orderId);
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) throw new Error("La orden no existe.");
    const order = normalizeOrder(orderSnap.id, orderSnap.data());
    if (order.status !== "pendiente") throw new Error("La orden ya fue procesada.");
    if (order.stockApplied) throw new Error("El stock de esta orden ya fue descontado.");

    // Agrupar cantidades por producto y talla (puede haber varios colores).
    const requested = new Map<string, Map<string, number>>();
    for (const item of order.items) {
      if (!item.productId || item.qty <= 0) continue;
      const bySize = requested.get(item.productId) ?? new Map<string, number>();
      bySize.set(item.size, (bySize.get(item.size) ?? 0) + item.qty);
      requested.set(item.productId, bySize);
    }

    // Todas las lecturas antes de cualquier escritura (requisito de transacciones).
    const products: {
      ref: ReturnType<typeof doc>;
      name: string;
      stockBySize: Record<string, number> | null;
    }[] = [];

    for (const productId of requested.keys()) {
      const productRef = doc(firestore, "products", productId);
      const productSnap = await transaction.get(productRef);
      if (!productSnap.exists()) {
        throw new Error(`El producto de la orden ya no existe (${productId}).`);
      }
      const data = productSnap.data();
      const rawStock = data.stockBySize;
      products.push({
        ref: productRef,
        name: str(data.name) || productId,
        stockBySize:
          rawStock && typeof rawStock === "object"
            ? (rawStock as Record<string, number>)
            : null,
      });
    }

    // Validar stock antes de escribir.
    for (let index = 0; index < products.length; index += 1) {
      const product = products[index];
      const bySize = requested.get(str(product.ref.id));
      if (!product.stockBySize || !bySize) continue;
      for (const [size, qty] of bySize) {
        const current = product.stockBySize[size];
        if (typeof current === "number" && Number.isFinite(current)) {
          if (current < qty) {
            throw new Error(
              `Stock insuficiente de ${product.name} talla ${size}: quedan ${current} y la orden pide ${qty}.`
            );
          }
        }
      }
    }

    // Descontar y actualizar la orden.
    const now = new Date().toISOString();
    for (let index = 0; index < products.length; index += 1) {
      const product = products[index];
      const bySize = requested.get(str(product.ref.id));
      if (!product.stockBySize || !bySize) continue;
      const nextStock = { ...product.stockBySize };
      let changed = false;
      for (const [size, qty] of bySize) {
        const current = nextStock[size];
        if (typeof current === "number" && Number.isFinite(current)) {
          nextStock[size] = Math.max(0, Math.floor(current) - qty);
          changed = true;
        }
      }
      if (changed) {
        transaction.update(product.ref, { stockBySize: nextStock, updatedAt: now });
      }
    }

    transaction.update(orderRef, {
      status: "aprobada",
      stockApplied: true,
      approvedAt: now,
      approvedBy: adminEmail,
      updatedAt: now,
    });
  });
}

export async function rejectOrder(
  orderId: string,
  reason: string,
  adminEmail: string
): Promise<void> {
  if (!db) throw new Error("Firebase no está configurado.");
  const now = new Date().toISOString();
  await updateDoc(doc(db, "orders", orderId), {
    status: "rechazada",
    rejectedAt: now,
    rejectedBy: adminEmail,
    rejectionReason: reason.trim(),
    updatedAt: now,
  });
}
