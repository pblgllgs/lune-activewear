import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SupplierPurchase, SupplierPurchaseInput } from "@/types/supplier-purchase";

const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

function normalizeNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const names = value
    .map((name) => (typeof name === "string" ? name.trim() : ""))
    .filter(Boolean);
  return [...new Set(names)];
}

/** Compatibilidad con compras antiguas que guardaban líneas con `productName`. */
function legacyNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return normalizeNames(
    value.map((item) => {
      if (!item || typeof item !== "object") return "";
      return str((item as Record<string, unknown>).productName);
    })
  );
}

export function normalizePurchase(
  id: string,
  supplierId: string,
  data: Record<string, unknown>
): SupplierPurchase {
  return {
    id,
    supplierId,
    date: str(data.date),
    productNames:
      Array.isArray(data.productNames) && data.productNames.length > 0
        ? normalizeNames(data.productNames)
        : legacyNames(data.items),
    documentUrl: str(data.documentUrl) || undefined,
    documentName: str(data.documentName) || undefined,
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
  return {
    supplierId: input.supplierId,
    date: input.date,
    productNames: normalizeNames(input.productNames),
    documentUrl: input.documentUrl?.trim() || "",
    documentName: input.documentName?.trim() || "",
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
