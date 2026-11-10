import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  SupplierPurchase,
  SupplierPurchaseInput,
  SupplierPurchaseItem,
} from "@/types/supplier-purchase";

const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

function normalizeItem(value: unknown): SupplierPurchaseItem | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const productId = str(data.productId);
  const productName = str(data.productName);
  if (!productId && !productName) return null;
  const quantity = Math.max(0, Math.floor(Number(data.quantity)));
  const unitCost = Math.max(0, Math.round(Number(data.unitCost)));
  return {
    productId,
    productName: productName || productId,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    unitCost: Number.isFinite(unitCost) ? unitCost : 0,
  };
}

function purchaseTotal(items: SupplierPurchaseItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
}

export function normalizePurchase(
  id: string,
  supplierId: string,
  data: Record<string, unknown>
): SupplierPurchase {
  const items = Array.isArray(data.items)
    ? data.items
        .map(normalizeItem)
        .filter((item): item is SupplierPurchaseItem => item !== null)
    : [];
  return {
    id,
    supplierId,
    date: str(data.date),
    items,
    total: purchaseTotal(items),
    notes: str(data.notes) || undefined,
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
  };
}

/** Escucha las compras de un proveedor, más recientes primero. */
export function subscribePurchases(
  supplierId: string,
  callback: (purchases: SupplierPurchase[]) => void
): () => void {
  if (!db) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, "suppliers", supplierId, "purchases"),
    (snap) => {
      callback(
        snap.docs
          .map((document) => normalizePurchase(document.id, supplierId, document.data()))
          .sort(
            (a, b) =>
              b.date.localeCompare(a.date) ||
              (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
          )
      );
    },
    () => callback([])
  );
}

function payload(input: SupplierPurchaseInput) {
  const items = input.items
    .map((item) => ({
      productId: item.productId.trim(),
      productName: item.productName.trim() || item.productId.trim(),
      quantity: Math.max(0, Math.floor(item.quantity)),
      unitCost: Math.max(0, Math.round(item.unitCost)),
    }))
    .filter((item) => item.productId && item.quantity > 0);

  return {
    supplierId: input.supplierId,
    date: input.date,
    items,
    total: purchaseTotal(items),
    notes: input.notes?.trim() || "",
    updatedAt: new Date().toISOString(),
  };
}

export async function createPurchase(input: SupplierPurchaseInput): Promise<void> {
  if (!db) throw new Error("Firebase no está configurado.");
  await addDoc(collection(db, "suppliers", input.supplierId, "purchases"), {
    ...payload(input),
    createdAt: new Date().toISOString(),
  });
}

export async function updatePurchase(
  supplierId: string,
  purchaseId: string,
  input: SupplierPurchaseInput
): Promise<void> {
  if (!db) throw new Error("Firebase no está configurado.");
  await updateDoc(doc(db, "suppliers", supplierId, "purchases", purchaseId), payload(input));
}

export async function deletePurchase(supplierId: string, purchaseId: string): Promise<void> {
  if (!db) throw new Error("Firebase no está configurado.");
  await deleteDoc(doc(db, "suppliers", supplierId, "purchases", purchaseId));
}
