import {
  addDoc,
  collection,
  deleteField,
  doc,
  onSnapshot,
  runTransaction,
  type DocumentReference,
  type Firestore,
  type Transaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  CreateOrderInput,
  Order,
  OrderCustomer,
  OrderItem,
  OrderStatus,
  UpdateOrderInput,
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

function calculateSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
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
  const subtotal = calculateSubtotal(items);

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
 * Edita los datos de una orden. Los productos solo se pueden cambiar mientras la
 * orden está pendiente; en una orden ya procesada se editan los datos de contacto,
 * cupón y notas (para tocar productos primero hay que devolverla a pendiente, lo
 * que repone el stock si estaba aprobada).
 */
export async function updateOrder(orderId: string, input: UpdateOrderInput): Promise<void> {
  const firestore = db;
  if (!firestore) throw new Error("Firebase no está configurado.");
  const ref = doc(firestore, "orders", orderId);

  await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error("La orden no existe.");
    const current = normalizeOrder(snap.id, snap.data());

    const customer = normalizeCustomer(input.customer);
    let items = current.items;

    if (input.items) {
      if (current.status !== "pendiente") {
        throw new Error("Solo se pueden modificar los productos de una orden pendiente.");
      }
      items = input.items.map(normalizeItem).filter((item): item is OrderItem => item !== null);
      if (items.length === 0) throw new Error("La orden debe tener al menos un producto.");
    }

    transaction.update(ref, {
      customer,
      items,
      subtotal: calculateSubtotal(items),
      coupon: input.coupon?.trim() || "",
      notes: input.notes?.trim() || "",
      updatedAt: new Date().toISOString(),
    });
  });
}

/* --------------------------- Stock de las órdenes --------------------------- */

type StockProduct = {
  ref: DocumentReference;
  name: string;
  stockBySize: Record<string, number> | null;
};

/** Agrupa cantidades por producto y talla (varios colores del mismo producto suman). */
function groupRequested(items: OrderItem[]): Map<string, Map<string, number>> {
  const requested = new Map<string, Map<string, number>>();
  for (const item of items) {
    if (!item.productId || item.qty <= 0) continue;
    const bySize = requested.get(item.productId) ?? new Map<string, number>();
    bySize.set(item.size, (bySize.get(item.size) ?? 0) + item.qty);
    requested.set(item.productId, bySize);
  }
  return requested;
}

/** Lee todos los productos antes de cualquier escritura (requisito de transacciones). */
async function readProducts(
  firestore: Firestore,
  transaction: Transaction,
  requested: Map<string, Map<string, number>>,
  requireExisting: boolean
): Promise<StockProduct[]> {
  const products: StockProduct[] = [];
  for (const productId of requested.keys()) {
    const productRef = doc(firestore, "products", productId);
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) {
      if (requireExisting) {
        throw new Error(`El producto de la orden ya no existe (${productId}).`);
      }
      continue;
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
  return products;
}

function validateStock(products: StockProduct[], requested: Map<string, Map<string, number>>) {
  for (const product of products) {
    const bySize = requested.get(product.ref.id);
    if (!product.stockBySize || !bySize) continue;
    for (const [size, qty] of bySize) {
      const current = product.stockBySize[size];
      if (typeof current === "number" && Number.isFinite(current) && current < qty) {
        throw new Error(
          `Stock insuficiente de ${product.name} talla ${size}: quedan ${current} y la orden pide ${qty}.`
        );
      }
    }
  }
}

function writeStock(
  transaction: Transaction,
  products: StockProduct[],
  requested: Map<string, Map<string, number>>,
  mode: "deduct" | "restore",
  now: string
) {
  for (const product of products) {
    const bySize = requested.get(product.ref.id);
    if (!product.stockBySize || !bySize) continue;
    const nextStock = { ...product.stockBySize };
    let changed = false;
    for (const [size, qty] of bySize) {
      const current = nextStock[size];
      if (typeof current === "number" && Number.isFinite(current)) {
        nextStock[size] =
          mode === "deduct"
            ? Math.max(0, Math.floor(current) - qty)
            : Math.min(9999, Math.floor(current) + qty);
        changed = true;
      }
    }
    if (changed) {
      transaction.update(product.ref, { stockBySize: nextStock, updatedAt: now });
    }
  }
}

/**
 * Cambia el estado de una orden y ajusta el stock:
 * - al aprobar, descuenta las unidades (valida stock antes de escribir);
 * - al pasar de aprobada a pendiente/rechazada, devuelve las unidades al stock.
 */
export async function setOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  adminEmail: string,
  reason = ""
): Promise<void> {
  const firestore = db;
  if (!firestore) throw new Error("Firebase no está configurado.");

  await runTransaction(firestore, async (transaction) => {
    const orderRef = doc(firestore, "orders", orderId);
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) throw new Error("La orden no existe.");
    const order = normalizeOrder(orderSnap.id, orderSnap.data());
    if (order.status === nextStatus) return;

    const requested = groupRequested(order.items);
    const deduct = nextStatus === "aprobada" && !order.stockApplied;
    const restore = order.stockApplied && nextStatus !== "aprobada";

    // Todas las lecturas antes de las escrituras.
    const products =
      deduct || restore
        ? await readProducts(firestore, transaction, requested, deduct)
        : [];

    if (deduct) validateStock(products, requested);

    const now = new Date().toISOString();
    if (deduct) writeStock(transaction, products, requested, "deduct", now);
    if (restore) writeStock(transaction, products, requested, "restore", now);

    if (nextStatus === "aprobada") {
      transaction.update(orderRef, {
        status: nextStatus,
        stockApplied: true,
        approvedAt: now,
        approvedBy: adminEmail,
        rejectedAt: deleteField(),
        rejectedBy: deleteField(),
        rejectionReason: deleteField(),
        updatedAt: now,
      });
      return;
    }

    if (nextStatus === "rechazada") {
      transaction.update(orderRef, {
        status: nextStatus,
        stockApplied: false,
        rejectedAt: now,
        rejectedBy: adminEmail,
        rejectionReason: reason.trim(),
        approvedAt: deleteField(),
        approvedBy: deleteField(),
        updatedAt: now,
      });
      return;
    }

    transaction.update(orderRef, {
      status: "pendiente",
      stockApplied: false,
      approvedAt: deleteField(),
      approvedBy: deleteField(),
      rejectedAt: deleteField(),
      rejectedBy: deleteField(),
      rejectionReason: deleteField(),
      updatedAt: now,
    });
  });
}

/** Atajo para aprobar una orden pendiente. */
export async function approveOrder(orderId: string, adminEmail: string): Promise<void> {
  await setOrderStatus(orderId, "aprobada", adminEmail);
}

/** Atajo para rechazar una orden (devuelve el stock si estaba aprobada). */
export async function rejectOrder(
  orderId: string,
  reason: string,
  adminEmail: string
): Promise<void> {
  await setOrderStatus(orderId, "rechazada", adminEmail, reason);
}

/**
 * Elimina una orden. Si estaba aprobada y el stock ya se había descontado, lo
 * devuelve antes de borrar el documento.
 */
export async function deleteOrder(orderId: string): Promise<void> {
  const firestore = db;
  if (!firestore) throw new Error("Firebase no está configurado.");

  await runTransaction(firestore, async (transaction) => {
    const orderRef = doc(firestore, "orders", orderId);
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) return;
    const order = normalizeOrder(orderSnap.id, orderSnap.data());

    if (order.stockApplied) {
      const requested = groupRequested(order.items);
      const products = await readProducts(firestore, transaction, requested, false);
      writeStock(transaction, products, requested, "restore", new Date().toISOString());
    }

    transaction.delete(orderRef);
  });
}
