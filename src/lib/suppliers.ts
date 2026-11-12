import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { diffAuditFields, logAudit } from "@/lib/audit";
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
  const name = input.name.trim();
  const ref = await addDoc(collection(db, "suppliers"), {
    ...payload(input),
    createdAt: new Date().toISOString(),
  });
  void logAudit({
    action: "supplier.create",
    entity: "supplier",
    entityId: ref.id,
    entityLabel: name,
    summary: `Creó el proveedor «${name}».`,
    metadata: {
      productIds: input.productIds.length,
      phone: input.phone ?? "",
      email: input.email ?? "",
    },
  });
}

export async function updateSupplier(id: string, input: SupplierInput): Promise<void> {
  if (!db) throw new Error("Firebase no está configurado.");
  const ref = doc(db, "suppliers", id);
  const beforeSnap = await getDoc(ref);
  const before = beforeSnap.exists() ? normalizeSupplier(id, beforeSnap.data()) : null;
  const next = payload(input);
  await updateDoc(ref, next);

  void logAudit({
    action: "supplier.update",
    entity: "supplier",
    entityId: id,
    entityLabel: next.name,
    summary: `Actualizó el proveedor «${next.name}».`,
    changes: before
      ? diffAuditFields(
          {
            name: before.name,
            contactName: before.contactName || null,
            phone: before.phone || null,
            email: before.email || null,
            notes: before.notes || null,
            productIds: before.productIds,
          },
          {
            name: next.name,
            contactName: next.contactName || null,
            phone: next.phone || null,
            email: next.email || null,
            notes: next.notes || null,
            productIds: next.productIds,
          },
          ["name", "contactName", "phone", "email", "notes", "productIds"]
        )
      : undefined,
  });
}

export async function deleteSupplier(id: string): Promise<void> {
  if (!db) throw new Error("Firebase no está configurado.");
  const ref = doc(db, "suppliers", id);
  const beforeSnap = await getDoc(ref);
  const before = beforeSnap.exists() ? normalizeSupplier(id, beforeSnap.data()) : null;
  await deleteDoc(ref);
  void logAudit({
    action: "supplier.delete",
    entity: "supplier",
    entityId: id,
    entityLabel: before?.name ?? id,
    summary: `Eliminó el proveedor «${before?.name ?? id}».`,
    metadata: {
      productIds: before?.productIds.length ?? 0,
      phone: before?.phone ?? "",
      email: before?.email ?? "",
    },
  });
}
