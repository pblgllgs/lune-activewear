import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { isAdminEmail } from "@/lib/admin";
import type {
  AuditActorRole,
  AuditChange,
  AuditLog,
  AuditLogInput,
  AuditSource,
} from "@/types/audit";

const MAX_STRING = 1200;
const MAX_ARRAY = 25;
const MAX_KEYS = 40;
const MAX_DEPTH = 4;
const SENSITIVE_KEY = /(password|contraseña|token|secret|api[_-]?key|authorization|credential)/i;

/** Etiquetas legibles para las acciones registradas. */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "auth.login": "Inicio de sesión",
  "auth.logout": "Cierre de sesión",
  "product.create": "Producto creado",
  "product.update": "Producto actualizado",
  "product.delete": "Producto eliminado",
  "product.featured": "Destacado actualizado",
  "product.sku": "SKU actualizado",
  "catalog.seed": "Catálogo importado",
  "order.create": "Pedido creado",
  "order.manual": "Pedido manual registrado",
  "order.update": "Pedido actualizado",
  "order.status": "Estado del pedido cambiado",
  "order.delete": "Pedido eliminado",
  "supplier.create": "Proveedor creado",
  "supplier.update": "Proveedor actualizado",
  "supplier.delete": "Proveedor eliminado",
  "purchase.create": "Compra registrada",
  "purchase.update": "Compra actualizada",
  "purchase.delete": "Compra eliminada",
  "guide.create": "Guía creada",
  "guide.update": "Guía actualizada",
  "guide.delete": "Guía eliminada",
  "guide.visibility": "Visibilidad de guías",
  "review.create": "Comentario enviado",
  "review.approve": "Comentario aprobado",
  "review.delete": "Comentario eliminado",
  "settings.magicLink": "Enlace mágico",
  "settings.whatsapp": "WhatsApp actualizado",
  "settings.content": "Contenido actualizado",
};

/** Etiquetas legibles para las entidades afectadas. */
export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  session: "Sesión",
  product: "Producto",
  catalog: "Catálogo",
  order: "Pedido",
  supplier: "Proveedor",
  purchase: "Compra",
  guide: "Guía",
  review: "Comentario",
  settings: "Ajustes",
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function auditEntityLabel(entity: string): string {
  return AUDIT_ENTITY_LABELS[entity] ?? entity;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Convierte Timestamp de Firestore, ISO o Date en `Date` sin romper la UI. */
function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string" && value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (value && typeof value === "object" && "toDate" in value) {
    const candidate = (value as Timestamp).toDate();
    return candidate instanceof Date && !Number.isNaN(candidate.getTime()) ? candidate : null;
  }
  return null;
}

/** Recorta y redacta datos para que una entrada no crezca sin control. */
function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return String(value);
  if (depth >= MAX_DEPTH) return "[…]";

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY).map((item) => sanitizeValue(item, depth + 1));
  }

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (Object.keys(output).length >= MAX_KEYS) break;
    output[key] = SENSITIVE_KEY.test(key) ? "[redactado]" : sanitizeValue(item, depth + 1);
  }
  return output;
}

function sanitizeRecord(value: Record<string, unknown> | undefined): Record<string, unknown> {
  const clean = sanitizeValue(value);
  return isRecord(clean) ? clean : {};
}

/** Compara dos objetos planos y devuelve solo los campos que cambiaron. */
export function diffAuditFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: readonly string[]
): Record<string, AuditChange> | undefined {
  const changes: Record<string, AuditChange> = {};
  for (const field of fields) {
    const previous = before[field] ?? null;
    const next = after[field] ?? null;
    let equal = previous === next;
    if (!equal && typeof previous === "object" && typeof next === "object") {
      try {
        equal = JSON.stringify(previous) === JSON.stringify(next);
      } catch {
        equal = false;
      }
    }
    if (!equal) changes[field] = { before: previous, after: next };
  }
  return Object.keys(changes).length > 0 ? changes : undefined;
}

/**
 * Registra una acción en `auditLogs`.
 *
 * Es best-effort: si no hay sesión, Firebase no está configurado o la escritura
 * falla, la acción principal continúa sin lanzar errores.
 */
export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    if (!db) return;
    const user = auth?.currentUser;
    if (!user) return;

    const email = str(user.email).toLowerCase();
    const actorRole: AuditActorRole = isAdminEmail(email) ? "admin" : "client";
    const source: AuditSource = input.source ?? (actorRole === "admin" ? "admin" : "web");

    await addDoc(collection(db, "auditLogs"), {
      actorUid: user.uid,
      actorEmail: email,
      actorName: str(user.displayName) || email || "Usuario",
      actorRole,
      action: input.action.slice(0, 80),
      entity: input.entity.slice(0, 80),
      entityId: (input.entityId ?? "").slice(0, 300),
      entityLabel: (input.entityLabel ?? "").slice(0, 300),
      summary: input.summary.slice(0, 500),
      changes: sanitizeRecord(input.changes),
      metadata: sanitizeRecord(input.metadata),
      source,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn("No se pudo registrar la actividad en la auditoría.", error);
  }
}

export function normalizeAuditLog(id: string, data: Record<string, unknown>): AuditLog {
  const actorRole: AuditActorRole =
    data.actorRole === "admin" ? "admin" : data.actorRole === "system" ? "system" : "client";
  const source: AuditSource =
    data.source === "web" ? "web" : data.source === "system" ? "system" : "admin";

  return {
    id,
    actorUid: str(data.actorUid),
    actorEmail: str(data.actorEmail),
    actorName: str(data.actorName) || str(data.actorEmail) || "Usuario",
    actorRole,
    action: str(data.action) || "unknown",
    entity: str(data.entity),
    entityId: str(data.entityId) || undefined,
    entityLabel: str(data.entityLabel) || undefined,
    summary: str(data.summary),
    changes: isRecord(data.changes) ? (data.changes as Record<string, AuditChange>) : undefined,
    metadata: isRecord(data.metadata) ? data.metadata : undefined,
    source,
    timestamp: toDate(data.timestamp) ?? toDate(data.createdAt),
    createdAt: str(data.createdAt),
  };
}

interface AuditSubscriptionOptions {
  /** Máximo de entradas recientes a escuchar. Por defecto 500. */
  max?: number;
  onError?: (error: Error) => void;
}

/**
 * Escucha las entradas más recientes de la auditoría.
 *
 * Se ordena por `timestamp` descendente y se limita en Firestore para no
 * requerir índices compuestos. Los filtros y la paginación se hacen en cliente.
 */
export function subscribeAuditLogs(
  callback: (logs: AuditLog[]) => void,
  options: AuditSubscriptionOptions = {}
): () => void {
  if (!db) {
    callback([]);
    return () => {};
  }
  const { max = 500, onError } = options;
  const recent = query(
    collection(db, "auditLogs"),
    orderBy("timestamp", "desc"),
    limit(max)
  );
  return onSnapshot(
    recent,
    (snap) => {
      callback(
        snap.docs.map((document) =>
          normalizeAuditLog(document.id, document.data() as Record<string, unknown>)
        )
      );
    },
    (error) => {
      console.warn("No se pudo escuchar el registro de auditoría.", error);
      onError?.(error);
      callback([]);
    }
  );
}
