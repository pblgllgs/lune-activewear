import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Supplier, SupplierInput } from "@/types/supplier";

const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export function normalizeSupplier(id: string, data: Record<string, unknown>): Supplier {
  return {
    id,
    name: str(data.name),
    contactName: str(data.contactName) || undefined,
    phone: str(data.phone) || undefined,
    email: str(data.email) || undefined,
    notes: str(data.notes) || undefined,
    productIds: Array.isArray(data.productIds)
      ? data.productIds.filter(
          (value): value is string => typeof value === "string" && Boolean(value)
        )
      : [],
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
  };
}

/** Escucha la colección `suppliers` en vivo (solo admin por reglas). */
export function subscribeSuppliers(callback: (suppliers: Supplier[]) => void): () => void {
  if (!db) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, "suppliers"),
    (snap) => {
      callback(
        snap.docs
          .map((document) => normalizeSupplier(document.id, document.data()))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    },
    () => callback([])
  );
}

function payload(input: SupplierInput) {
  return {
    name: input.name.trim(),
    contactName: input.contactName?.trim() || "",
    phone: input.phone?.trim() || "",
    email: input.email?.trim() || "",
    notes: input.notes?.trim() || "",
    productIds: [...new Set(input.productIds)],
    updatedAt: new Date().toISOString(),
  };
}

export async function createSupplier(input: SupplierInput): Promise<void> {
  if (!db) throw new Error("Firebase no está configurado.");
  await addDoc(collection(db, "suppliers"), {
    ...payload(input),
    createdAt: new Date().toISOString(),
  });
}

export async function updateSupplier(id: string, input: SupplierInput): Promise<void> {
  if (!db) throw new Error("Firebase no está configurado.");
  await updateDoc(doc(db, "suppliers", id), payload(input));
}

export async function deleteSupplier(id: string): Promise<void> {
  if (!db) throw new Error("Firebase no está configurado.");
  await deleteDoc(doc(db, "suppliers", id));
}
