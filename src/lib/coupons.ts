import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { diffAuditFields, logAudit } from "@/lib/audit";
import { formatCLP } from "@/lib/utils";
import type { Coupon, CouponInput, CouponType } from "@/types/coupon";

const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const money = (value: unknown): number => {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/** Normaliza un código para comparar: mayúsculas, sin espacios ni símbolos raros. */
export function normalizeCouponCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9-_]/g, "")
    .slice(0, 24);
}

function normalizeType(value: unknown): CouponType {
  return value === "fixed" ? "fixed" : "percent";
}

export function normalizeCoupon(id: string, data: Record<string, unknown>): Coupon {
  const expiresAt = str(data.expiresAt);
  return {
    id,
    code: normalizeCouponCode(str(data.code)),
    type: normalizeType(data.type),
    value: money(data.value),
    active: data.active !== false,
    ...(money(data.minPurchase) > 0 ? { minPurchase: money(data.minPurchase) } : {}),
    ...(expiresAt ? { expiresAt } : {}),
    ...(str(data.description) ? { description: str(data.description) } : {}),
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
  };
}

/** Escucha la colección `coupons` en vivo (solo el admin puede escribir). */
export function subscribeCoupons(callback: (coupons: Coupon[]) => void): () => void {
  if (!db) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, "coupons"),
    (snap) => {
      callback(
        snap.docs
          .map((document) => normalizeCoupon(document.id, document.data()))
          .sort((a, b) => a.code.localeCompare(b.code))
      );
    },
    () => callback([])
  );
}

function payload(input: CouponInput) {
  return {
    code: normalizeCouponCode(input.code),
    type: normalizeType(input.type),
    value: Math.max(0, Math.round(input.value)),
    active: input.active,
    minPurchase: Math.max(0, Math.round(input.minPurchase ?? 0)),
    expiresAt: input.expiresAt?.trim() || "",
    description: input.description?.trim() || "",
    updatedAt: new Date().toISOString(),
  };
}

function validateInput(input: CouponInput): void {
  const code = normalizeCouponCode(input.code);
  if (code.length < 3) throw new Error("El código debe tener al menos 3 caracteres.");
  if (input.type === "percent" && (input.value <= 0 || input.value > 100)) {
    throw new Error("El porcentaje debe estar entre 1 y 100.");
  }
  if (input.type === "fixed" && input.value <= 0) {
    throw new Error("El monto del descuento debe ser mayor que cero.");
  }
}

export async function createCoupon(input: CouponInput): Promise<void> {
  if (!db) throw new Error("Firebase no está configurado.");
  validateInput(input);
  const next = payload(input);
  const ref = await addDoc(collection(db, "coupons"), {
    ...next,
    createdAt: new Date().toISOString(),
  });
  void logAudit({
    action: "coupon.create",
    entity: "coupon",
    entityId: ref.id,
    entityLabel: next.code,
    summary: `Creó el cupón «${next.code}».`,
    metadata: { type: next.type, value: next.value, active: next.active },
  });
}

export async function updateCoupon(id: string, input: CouponInput): Promise<void> {
  if (!db) throw new Error("Firebase no está configurado.");
  validateInput(input);
  const ref = doc(db, "coupons", id);
  const beforeSnap = await getDoc(ref);
  const before = beforeSnap.exists() ? normalizeCoupon(id, beforeSnap.data()) : null;
  const next = payload(input);
  await updateDoc(ref, next);

  void logAudit({
    action: "coupon.update",
    entity: "coupon",
    entityId: id,
    entityLabel: next.code,
    summary: `Actualizó el cupón «${next.code}».`,
    changes: before
      ? diffAuditFields(
          {
            code: before.code,
            type: before.type,
            value: before.value,
            active: before.active,
            minPurchase: before.minPurchase ?? 0,
            expiresAt: before.expiresAt || null,
            description: before.description || null,
          },
          {
            code: next.code,
            type: next.type,
            value: next.value,
            active: next.active,
            minPurchase: next.minPurchase,
            expiresAt: next.expiresAt || null,
            description: next.description || null,
          },
          ["code", "type", "value", "active", "minPurchase", "expiresAt", "description"]
        )
      : undefined,
  });
}

export async function setCouponActive(id: string, active: boolean): Promise<void> {
  if (!db) throw new Error("Firebase no está configurado.");
  const ref = doc(db, "coupons", id);
  const snap = await getDoc(ref);
  const before = snap.exists() ? normalizeCoupon(id, snap.data()) : null;
  await updateDoc(ref, { active, updatedAt: new Date().toISOString() });
  if (before) {
    void logAudit({
      action: "coupon.update",
      entity: "coupon",
      entityId: id,
      entityLabel: before.code,
      summary: `${active ? "Activó" : "Desactivó"} el cupón «${before.code}».`,
      changes: { active: { before: before.active, after: active } },
    });
  }
}

export async function deleteCoupon(id: string): Promise<void> {
  if (!db) throw new Error("Firebase no está configurado.");
  const ref = doc(db, "coupons", id);
  const snap = await getDoc(ref);
  const before = snap.exists() ? normalizeCoupon(id, snap.data()) : null;
  await deleteDoc(ref);
  void logAudit({
    action: "coupon.delete",
    entity: "coupon",
    entityId: id,
    entityLabel: before?.code ?? id,
    summary: `Eliminó el cupón «${before?.code ?? id}».`,
    metadata: before ? { type: before.type, value: before.value } : {},
  });
}

/** Busca un cupón por código (lectura pública, usada al validar en el carrito). */
export async function findCouponByCode(code: string): Promise<Coupon | null> {
  if (!db) return null;
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;
  const snap = await getDocs(
    query(collection(db, "coupons"), where("code", "==", normalized), limit(1))
  );
  const document = snap.docs[0];
  return document ? normalizeCoupon(document.id, document.data()) : null;
}

/** Descuento que genera el cupón sobre un monto (sin validar vigencia). */
export function couponDiscount(coupon: Pick<Coupon, "type" | "value">, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (coupon.type === "percent") {
    return Math.min(amount, Math.round((amount * Math.min(100, coupon.value)) / 100));
  }
  return Math.min(amount, Math.round(coupon.value));
}

/**
 * Devuelve el motivo por el que el cupón no aplica a un monto, o cadena vacía
 * si es válido. Se usa tanto en la ficha como en el carrito.
 */
export function couponValidity(
  coupon: Pick<Coupon, "active" | "minPurchase" | "expiresAt">,
  amount: number,
  now: Date = new Date()
): string {
  if (!coupon.active) return "Este cupón no está activo.";
  if (coupon.expiresAt) {
    const end = new Date(`${coupon.expiresAt}T23:59:59`);
    if (Number.isFinite(end.getTime()) && end.getTime() < now.getTime()) {
      return `Este cupón venció el ${formatCouponDate(coupon.expiresAt)}.`;
    }
  }
  if (coupon.minPurchase && amount < coupon.minPurchase) {
    return `Este cupón requiere una compra mínima de ${formatCLP(coupon.minPurchase)}.`;
  }
  return "";
}

function formatCouponDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export interface CouponValidation {
  coupon: Coupon | null;
  discount: number;
  error: string;
}

/** Valida un código contra Firestore y calcula el descuento para un monto. */
export async function validateCouponCode(code: string, amount: number): Promise<CouponValidation> {
  const normalized = normalizeCouponCode(code);
  if (normalized.length < 3) {
    return { coupon: null, discount: 0, error: "Escribe un código válido." };
  }
  if (!db) {
    return { coupon: null, discount: 0, error: "Los cupones no están disponibles ahora." };
  }

  let coupon: Coupon | null = null;
  try {
    coupon = await findCouponByCode(normalized);
  } catch {
    return { coupon: null, discount: 0, error: "No se pudo validar el cupón. Inténtalo de nuevo." };
  }

  if (!coupon) return { coupon: null, discount: 0, error: "El cupón no existe." };

  const problem = couponValidity(coupon, amount);
  if (problem) return { coupon: null, discount: 0, error: problem };

  const discount = couponDiscount(coupon, amount);
  if (discount <= 0) {
    return { coupon: null, discount: 0, error: "El cupón no aplica a este monto." };
  }

  return { coupon, discount, error: "" };
}
