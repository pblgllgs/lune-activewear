import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  where,
  type DocumentReference,
  type Firestore,
  type Transaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { diffAuditFields, logAudit } from "@/lib/audit";
import type {
  CreateManualOrderInput,
  CreateOrderInput,
  Order,
  OrderCustomer,
  OrderItem,
  OrderStatus,
  UpdateOrderInput,
} from "@/types/order";
import { SALE_STATUSES } from "@/types/order";

const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const int = (value: unknown): number => {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : 0;
};

function normalizeStatus(value: unknown): OrderStatus {
  return value === "aprobada" ||
    value === "rechazada" ||
    value === "pagado" ||
    value === "enviado"
    ? value
    : "pendiente";
}

function isSaleStatus(status: OrderStatus): boolean {
  return (SALE_STATUSES as readonly string[]).includes(status);
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
  const customer = normalizeCustomer(data.customer);
  const customerEmail = str(data.customerEmail).toLowerCase() || customer.email?.toLowerCase();
  const sourceRaw = str(data.source);
  return {
    id,
    code: str(data.code) || id.slice(0, 8).toUpperCase(),
    status: normalizeStatus(data.status),
    customer,
    ...(customerEmail ? { customerEmail } : {}),
    ...(str(data.userId) ? { userId: str(data.userId) } : {}),
    items: Array.isArray(data.items)
      ? data.items.map(normalizeItem).filter((item): item is OrderItem => item !== null)
      : [],
    subtotal: Math.max(0, Math.round(Number(data.subtotal) || 0)),
    coupon: str(data.coupon) || undefined,
    notes: str(data.notes) || undefined,
    stockApplied: data.stockApplied === true,
    ...(sourceRaw === "manual" || sourceRaw === "web" ? { source: sourceRaw } : {}),
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
    approvedAt: data.approvedAt ? String(data.approvedAt) : undefined,
    approvedBy: data.approvedBy ? String(data.approvedBy) : undefined,
    paidAt: data.paidAt ? String(data.paidAt) : undefined,
    paidBy: data.paidBy ? String(data.paidBy) : undefined,
    shippedAt: data.shippedAt ? String(data.shippedAt) : undefined,
    shippedBy: data.shippedBy ? String(data.shippedBy) : undefined,
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
    customerEmail: customer.email?.toLowerCase() ?? "",
    userId: input.userId ?? "",
    items,
    subtotal,
    coupon: input.coupon?.trim() || "",
    notes: input.notes?.trim() || "",
    stockApplied: false,
    source: "web",
    createdAt: now,
    updatedAt: now,
  });

  void logAudit({
    action: "order.create",
    entity: "order",
    entityId: ref.id,
    entityLabel: code,
    summary: `Creó el pedido ${code} (${customer.name}).`,
    metadata: {
      items: items.length,
      subtotal,
      city: customer.city,
      source: "web",
    },
    source: "web",
  });

  return {
    id: ref.id,
    code,
    status: "pendiente",
    customer,
    ...(customer.email ? { customerEmail: customer.email.toLowerCase() } : {}),
    ...(input.userId ? { userId: input.userId } : {}),
    items,
    subtotal,
    coupon: input.coupon?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    stockApplied: false,
    source: "web",
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Pedidos de una clienta, por correo normalizado y por UID cuando tiene sesión.
 * Se ordenan en el cliente para no necesitar un índice compuesto
 * (`customerEmail`/`userId` + `createdAt`).
 */
export async function getMyOrders(email: string, userId?: string): Promise<Order[]> {
  if (!db) return [];
  const normalized = email.trim().toLowerCase();
  const queries: Promise<Order[]>[] = [];

  if (normalized) {
    queries.push(
      getDocs(query(collection(db, "orders"), where("customerEmail", "==", normalized))).then(
        (snap) => snap.docs.map((document) => normalizeOrder(document.id, document.data()))
      )
    );
  }

  if (userId) {
    queries.push(
      getDocs(query(collection(db, "orders"), where("userId", "==", userId))).then((snap) =>
        snap.docs.map((document) => normalizeOrder(document.id, document.data()))
      )
    );
  }

  if (queries.length === 0) return [];

  const byId = new Map<string, Order>();
  (await Promise.all(queries)).flat().forEach((order) => byId.set(order.id, order));

  return [...byId.values()].sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
  );
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
  const snapshot: {
    before?: Order;
    after?: {
      customer: OrderCustomer;
      items: OrderItem[];
      subtotal: number;
      coupon: string;
      notes: string;
    };
  } = {};

  await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error("La orden no existe.");
    const current = normalizeOrder(snap.id, snap.data());
    snapshot.before = current;

    const customer = normalizeCustomer(input.customer);
    let items = current.items;

    if (input.items) {
      if (current.status !== "pendiente") {
        throw new Error("Solo se pueden modificar los productos de una orden pendiente.");
      }
      items = input.items.map(normalizeItem).filter((item): item is OrderItem => item !== null);
      if (items.length === 0) throw new Error("La orden debe tener al menos un producto.");
    }

    const next = {
      customer,
      items,
      subtotal: calculateSubtotal(items),
      coupon: input.coupon?.trim() || "",
      notes: input.notes?.trim() || "",
    };
    snapshot.after = next;

    transaction.update(ref, {
      ...next,
      customerEmail: customer.email?.toLowerCase() ?? "",
      updatedAt: new Date().toISOString(),
    });
  });

  const before = snapshot.before;
  const after = snapshot.after;
  if (before && after) {
    void logAudit({
      action: "order.update",
      entity: "order",
      entityId: orderId,
      entityLabel: before.code,
      summary: `Actualizó el pedido ${before.code} (${after.customer.name}).`,
      changes: diffAuditFields(
        {
          customer: before.customer,
          items: before.items,
          subtotal: before.subtotal,
          coupon: before.coupon || null,
          notes: before.notes || null,
        },
        {
          customer: after.customer,
          items: after.items,
          subtotal: after.subtotal,
          coupon: after.coupon || null,
          notes: after.notes || null,
        },
        ["customer", "items", "subtotal", "coupon", "notes"]
      ),
      metadata: { status: before.status },
    });
  }
}

/* --------------------------- Stock de las órdenes --------------------------- */

type StockProduct = {
  ref: DocumentReference;
  name: string;
  /** Stock por variante (color → talla). */
  stockByVariant: Record<string, Record<string, number>> | null;
  /** Legado: stock por talla compartido entre colores. */
  stockBySize: Record<string, number> | null;
};

function normColor(color: string | undefined): string {
  const c = (color ?? "").trim();
  return c || "Único";
}

/** Agrupa cantidades por producto, color y talla. */
function groupRequested(items: OrderItem[]): Map<string, Map<string, Map<string, number>>> {
  const requested = new Map<string, Map<string, Map<string, number>>>();
  for (const item of items) {
    if (!item.productId || item.qty <= 0) continue;
    const byColor = requested.get(item.productId) ?? new Map<string, Map<string, number>>();
    const color = normColor(item.color);
    const bySize = byColor.get(color) ?? new Map<string, number>();
    bySize.set(item.size, (bySize.get(item.size) ?? 0) + item.qty);
    byColor.set(color, bySize);
    requested.set(item.productId, byColor);
  }
  return requested;
}

/** Lee todos los productos antes de cualquier escritura (requisito de transacciones). */
async function readProducts(
  firestore: Firestore,
  transaction: Transaction,
  requested: Map<string, Map<string, Map<string, number>>>,
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
    const rawVariant = data.stockByVariant;
    const rawStock = data.stockBySize;
    const stockByVariant =
      rawVariant && typeof rawVariant === "object"
        ? Object.fromEntries(
            Object.entries(rawVariant as Record<string, unknown>).map(([color, sizes]) => [
              color,
              sizes && typeof sizes === "object" ? (sizes as Record<string, number>) : {},
            ])
          )
        : null;
    products.push({
      ref: productRef,
      name: str(data.name) || productId,
      stockByVariant,
      stockBySize:
        rawStock && typeof rawStock === "object"
          ? (rawStock as Record<string, number>)
          : null,
    });
  }
  return products;
}

function getCurrentStock(
  product: StockProduct,
  color: string,
  size: string
): number | null | undefined {
  const v = product.stockByVariant?.[color]?.[size];
  if (typeof v === "number" && Number.isFinite(v)) return Math.floor(v);
  // Legado
  const l = product.stockBySize?.[size];
  if (typeof l === "number" && Number.isFinite(l)) return Math.floor(l);
  if (product.stockByVariant || product.stockBySize) return undefined; // registrado pero sin esta variante
  return null; // sin info => ilimitado
}

function validateStock(
  products: StockProduct[],
  requested: Map<string, Map<string, Map<string, number>>>
) {
  for (const product of products) {
    const byColor = requested.get(product.ref.id);
    if (!byColor) continue;
    if (!product.stockByVariant && !product.stockBySize) continue;
    for (const [color, bySize] of byColor) {
      for (const [size, qty] of bySize) {
        const current = getCurrentStock(product, color, size);
        if (current === null) continue; // sin límite
        if (current === undefined) continue; // variante no registrada explícitamente
        if (current < qty) {
          throw new Error(
            `Stock insuficiente de ${product.name} (${color}, talla ${size}): quedan ${current} y la orden pide ${qty}.`
          );
        }
      }
    }
  }
}

function writeStock(
  transaction: Transaction,
  products: StockProduct[],
  requested: Map<string, Map<string, Map<string, number>>>,
  mode: "deduct" | "restore",
  now: string
) {
  for (const product of products) {
    const byColor = requested.get(product.ref.id);
    if (!byColor) continue;

    if (product.stockByVariant) {
      const nextVariant: Record<string, Record<string, number>> = {};
      for (const [c, sizes] of Object.entries(product.stockByVariant)) {
        nextVariant[c] = { ...sizes };
      }
      let changed = false;
      for (const [color, bySize] of byColor) {
        if (!nextVariant[color]) nextVariant[color] = {};
        for (const [size, qty] of bySize) {
          const current = nextVariant[color][size];
          if (typeof current === "number" && Number.isFinite(current)) {
            nextVariant[color][size] =
              mode === "deduct"
                ? Math.max(0, Math.floor(current) - qty)
                : Math.min(9999, Math.floor(current) + qty);
            changed = true;
          }
        }
      }
      if (changed) {
        transaction.update(product.ref, { stockByVariant: nextVariant, updatedAt: now });
      }
      continue;
    }

    if (product.stockBySize) {
      const nextStock = { ...product.stockBySize };
      let changed = false;
      for (const [, bySize] of byColor) {
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
      }
      if (changed) {
        transaction.update(product.ref, { stockBySize: nextStock, updatedAt: now });
      }
    }
  }
}

/**
 * Cambia el estado de una orden y ajusta el stock:
 * - al confirmar venta (aprobada/pagado/enviado), descuenta unidades si aún no se aplicó;
 * - al pasar de una venta aplicada a pendiente/rechazada, devuelve las unidades.
 */
export async function setOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  adminEmail: string,
  reason = ""
): Promise<void> {
  const firestore = db;
  if (!firestore) throw new Error("Firebase no está configurado.");
  const snapshot: { order?: Order } = {};

  await runTransaction(firestore, async (transaction) => {
    const orderRef = doc(firestore, "orders", orderId);
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) throw new Error("La orden no existe.");
    const order = normalizeOrder(orderSnap.id, orderSnap.data());
    snapshot.order = order;
    if (order.status === nextStatus) return;

    const requested = groupRequested(order.items);
    const nextIsSale = isSaleStatus(nextStatus);
    const currentIsSale = isSaleStatus(order.status);
    const deduct = nextIsSale && !order.stockApplied;
    const restore = order.stockApplied && !nextIsSale;

    // Todas las lecturas antes de las escrituras.
    const products =
      deduct || restore
        ? await readProducts(firestore, transaction, requested, deduct)
        : [];

    if (deduct) validateStock(products, requested);

    const now = new Date().toISOString();
    if (deduct) writeStock(transaction, products, requested, "deduct", now);
    if (restore) writeStock(transaction, products, requested, "restore", now);

    const base: Record<string, unknown> = {
      status: nextStatus,
      updatedAt: now,
    };

    if (nextIsSale) {
      base.stockApplied = true;
      base.rejectedAt = deleteField();
      base.rejectedBy = deleteField();
      base.rejectionReason = deleteField();
      // Conserva marcas previas si ya estaba aplicada; agrega la del estado actual.
      if (nextStatus === "aprobada") {
        base.approvedAt = order.approvedAt ?? now;
        base.approvedBy = order.approvedBy ?? adminEmail;
      } else if (nextStatus === "pagado") {
        base.paidAt = order.paidAt ?? now;
        base.paidBy = order.paidBy ?? adminEmail;
      } else if (nextStatus === "enviado") {
        // Si pasa directo a enviado sin pasar por pagado, registra pago también.
        base.paidAt = order.paidAt ?? now;
        base.paidBy = order.paidBy ?? adminEmail;
        base.shippedAt = now;
        base.shippedBy = adminEmail;
      }
      transaction.update(orderRef, base);
      return;
    }

    if (nextStatus === "rechazada") {
      base.stockApplied = false;
      base.rejectedAt = now;
      base.rejectedBy = adminEmail;
      base.rejectionReason = reason.trim();
      base.approvedAt = deleteField();
      base.approvedBy = deleteField();
      transaction.update(orderRef, base);
      return;
    }

    // pendiente
    base.stockApplied = false;
    base.approvedAt = deleteField();
    base.approvedBy = deleteField();
    base.rejectedAt = deleteField();
    base.rejectedBy = deleteField();
    base.rejectionReason = deleteField();
    transaction.update(orderRef, base);
    // currentIsSale used only conceptually; no-op extra.
    void currentIsSale;
  });

  const previous = snapshot.order;
  if (previous && previous.status !== nextStatus) {
    void logAudit({
      action: "order.status",
      entity: "order",
      entityId: orderId,
      entityLabel: previous.code,
      summary: `Cambió el pedido ${previous.code} de «${previous.status}» a «${nextStatus}».`,
      changes: {
        status: { before: previous.status, after: nextStatus },
        ...(reason.trim()
          ? { rejectionReason: { before: previous.rejectionReason ?? null, after: reason.trim() } }
          : {}),
      },
      metadata: {
        customer: previous.customer.name,
        subtotal: previous.subtotal,
        items: previous.items.length,
        stockAppliedBefore: previous.stockApplied,
        stockAppliedAfter: isSaleStatus(nextStatus),
      },
    });
  }
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

/** Registra una orden manual (p. ej. venta por WhatsApp) desde el panel admin. */
export async function createManualOrder(input: CreateManualOrderInput): Promise<Order> {
  const firestore = db;
  if (!firestore) throw new Error("Firebase no está configurado.");

  const customer = normalizeCustomer(input.customer);
  if (customer.name.trim().length < 2) throw new Error("Escribe el nombre de la clienta.");
  if (customer.phone.replace(/\D/g, "").length < 8) throw new Error("Escribe un teléfono válido.");
  if (customer.address.trim().length < 4) throw new Error("Escribe la dirección de envío.");
  if (customer.city.trim().length < 2) throw new Error("Indica la comuna o ciudad.");

  const items = input.items.map(normalizeItem).filter((item): item is OrderItem => item !== null);
  if (items.length === 0) throw new Error("La orden debe tener al menos un producto.");
  for (const item of items) {
    if (!item.name.trim()) throw new Error("Cada producto necesita un nombre.");
    if (!item.size.trim()) throw new Error("Cada producto necesita una talla.");
    if (!item.color.trim()) throw new Error("Cada producto necesita un color.");
    if (item.qty < 1) throw new Error("La cantidad debe ser al menos 1.");
    if (item.price < 0) throw new Error("El precio no puede ser negativo.");
  }

  const status = normalizeStatus(input.status);
  const subtotal =
    typeof input.subtotal === "number" && Number.isFinite(input.subtotal)
      ? Math.max(0, Math.round(input.subtotal))
      : calculateSubtotal(items);
  const code = makeCode();
  const now = new Date().toISOString();
  const orderRef = doc(collection(firestore, "orders"));
  const applied = isSaleStatus(status);
  const requested = groupRequested(items);

  await runTransaction(firestore, async (transaction) => {
    let products: StockProduct[] = [];
    if (applied) {
      products = await readProducts(firestore, transaction, requested, true);
      validateStock(products, requested);
      writeStock(transaction, products, requested, "deduct", now);
    }

    const data: Record<string, unknown> = {
      code,
      status,
      customer,
      customerEmail: customer.email?.toLowerCase() ?? "",
      userId: "",
      items,
      subtotal,
      coupon: input.coupon?.trim() || "",
      notes: input.notes?.trim() || "",
      stockApplied: applied,
      source: "manual",
      createdAt: now,
      updatedAt: now,
    };

    if (status === "aprobada") {
      data.approvedAt = now;
      data.approvedBy = input.adminEmail;
    } else if (status === "pagado") {
      data.paidAt = now;
      data.paidBy = input.adminEmail;
    } else if (status === "enviado") {
      data.paidAt = now;
      data.paidBy = input.adminEmail;
      data.shippedAt = now;
      data.shippedBy = input.adminEmail;
    } else if (status === "rechazada") {
      data.rejectedAt = now;
      data.rejectedBy = input.adminEmail;
      data.rejectionReason = "";
    }

    transaction.set(orderRef, data);
  });

  void logAudit({
    action: "order.manual",
    entity: "order",
    entityId: orderRef.id,
    entityLabel: code,
    summary: `Registró manualmente el pedido ${code} (${customer.name}).`,
    metadata: {
      status,
      items: items.length,
      subtotal,
      source: "manual",
    },
  });

  return {
    id: orderRef.id,
    code,
    status,
    customer,
    ...(customer.email ? { customerEmail: customer.email.toLowerCase() } : {}),
    items,
    subtotal,
    coupon: input.coupon?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    stockApplied: applied,
    source: "manual",
    createdAt: now,
    updatedAt: now,
    ...(status === "aprobada" ? { approvedAt: now, approvedBy: input.adminEmail } : {}),
    ...(status === "pagado" ? { paidAt: now, paidBy: input.adminEmail } : {}),
    ...(status === "enviado"
      ? { paidAt: now, paidBy: input.adminEmail, shippedAt: now, shippedBy: input.adminEmail }
      : {}),
    ...(status === "rechazada" ? { rejectedAt: now, rejectedBy: input.adminEmail } : {}),
  };
}

/**
 * Elimina una orden. Si estaba aprobada y el stock ya se había descontado, lo
 * devuelve antes de borrar el documento.
 */
export async function deleteOrder(orderId: string): Promise<void> {
  const firestore = db;
  if (!firestore) throw new Error("Firebase no está configurado.");
  const snapshot: { order?: Order } = {};

  await runTransaction(firestore, async (transaction) => {
    const orderRef = doc(firestore, "orders", orderId);
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) return;
    const order = normalizeOrder(orderSnap.id, orderSnap.data());
    snapshot.order = order;

    if (order.stockApplied) {
      const requested = groupRequested(order.items);
      const products = await readProducts(firestore, transaction, requested, false);
      writeStock(transaction, products, requested, "restore", new Date().toISOString());
    }

    transaction.delete(orderRef);
  });

  const previous = snapshot.order;
  if (previous) {
    void logAudit({
      action: "order.delete",
      entity: "order",
      entityId: orderId,
      entityLabel: previous.code,
      summary: `Eliminó el pedido ${previous.code} (${previous.customer.name}).`,
      metadata: {
        status: previous.status,
        subtotal: previous.subtotal,
        items: previous.items.length,
        stockApplied: previous.stockApplied,
      },
    });
  }
}
