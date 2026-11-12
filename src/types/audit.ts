/** Quién realizó la acción registrada en la auditoría. */
export type AuditActorRole = "admin" | "client" | "system";

/** Desde dónde se originó la acción. */
export type AuditSource = "admin" | "web" | "system";

export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "product.create"
  | "product.update"
  | "product.delete"
  | "product.featured"
  | "product.sku"
  | "catalog.seed"
  | "order.create"
  | "order.manual"
  | "order.update"
  | "order.status"
  | "order.delete"
  | "supplier.create"
  | "supplier.update"
  | "supplier.delete"
  | "purchase.create"
  | "purchase.update"
  | "purchase.delete"
  | "guide.create"
  | "guide.update"
  | "guide.delete"
  | "guide.visibility"
  | "review.create"
  | "review.approve"
  | "review.delete"
  | "settings.magicLink"
  | "settings.whatsapp"
  | "settings.content";

/** Diferencia de un campo entre el estado anterior y el nuevo. */
export interface AuditChange {
  before?: unknown;
  after?: unknown;
}

/**
 * Entrada del registro de auditoría (`auditLogs` en Firestore).
 * Se guarda con `timestamp: serverTimestamp()` para que la fecha sea la del
 * servidor y no dependa del reloj del dispositivo.
 */
export interface AuditLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  actorName: string;
  actorRole: AuditActorRole;
  action: string;
  entity: string;
  entityId?: string;
  entityLabel?: string;
  summary: string;
  changes?: Record<string, AuditChange>;
  metadata?: Record<string, unknown>;
  source: AuditSource;
  timestamp: Date | null;
  /** Respaldo ISO por si el `timestamp` del servidor aún no se resolvió. */
  createdAt: string;
}

/** Datos que recibe el logger central antes de completar el actor y la fecha. */
export interface AuditLogInput {
  action: AuditAction;
  entity: string;
  entityId?: string;
  entityLabel?: string;
  summary: string;
  changes?: Record<string, AuditChange>;
  metadata?: Record<string, unknown>;
  source?: AuditSource;
}
