import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { diffAuditFields, logAudit } from "@/lib/audit";
import { isSuperAdminEmail, normalizeEmail, SUPER_ADMIN_EMAIL } from "@/lib/admin";

/** Documento que almacena los admins administrados por el super admin. */
export const ADMIN_ACCESS_DOC = "settings/adminAccess";

export interface ManagedAdmin {
  /** Correo del administrador. */
  email: string;
  /** Si es `false`, el acceso está desactivado pero se mantiene en la lista. */
  active: boolean;
}

export interface AdminAccess {
  /** Todos los admins administrados/anulados desde el panel (activos e inactivos). */
  admins: ManagedAdmin[];
  /** Correos con acceso activo administrado (derivado; compatibilidad/reglas). */
  emails: string[];
  /** Correos desactivados explícitamente desde el panel (incluye respaldos .env). */
  disabledEmails: string[];
  updatedAt?: string;
  updatedBy?: string;
}

function normalizeManagedAdmins(data: Record<string, unknown> | undefined): ManagedAdmin[] {
  const rawAdmins = data?.admins;
  const byEmail = new Map<string, ManagedAdmin>();

  if (Array.isArray(rawAdmins)) {
    for (const value of rawAdmins) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const record = value as Record<string, unknown>;
      const email = normalizeEmail(typeof record.email === "string" ? record.email : "");
      if (!email || !email.includes("@") || isSuperAdminEmail(email)) continue;
      byEmail.set(email, { email, active: record.active !== false });
    }
  } else if (Array.isArray(data?.emails)) {
    // Compatibilidad: formato anterior (lista de correos activos).
    for (const value of data.emails) {
      if (typeof value !== "string") continue;
      const email = normalizeEmail(value);
      if (!email || !email.includes("@") || isSuperAdminEmail(email)) continue;
      byEmail.set(email, { email, active: true });
    }
  }

  return Array.from(byEmail.values()).sort((a, b) => a.email.localeCompare(b.email));
}

export function normalizeAdminAccess(data: Record<string, unknown> | undefined): AdminAccess {
  const admins = normalizeManagedAdmins(data);
  return {
    admins,
    emails: admins.filter((admin) => admin.active).map((admin) => admin.email),
    disabledEmails: admins.filter((admin) => !admin.active).map((admin) => admin.email),
    ...(typeof data?.updatedAt === "string" ? { updatedAt: data.updatedAt } : {}),
    ...(typeof data?.updatedBy === "string" ? { updatedBy: data.updatedBy } : {}),
  };
}

export async function getAdminAccess(): Promise<AdminAccess> {
  if (!db) return { admins: [], emails: [], disabledEmails: [] };
  try {
    const snap = await getDoc(doc(db, ADMIN_ACCESS_DOC));
    return snap.exists()
      ? normalizeAdminAccess(snap.data() as Record<string, unknown>)
      : { admins: [], emails: [], disabledEmails: [] };
  } catch {
    return { admins: [], emails: [], disabledEmails: [] };
  }
}

export function subscribeAdminAccess(callback: (access: AdminAccess) => void): () => void {
  if (!db) {
    callback({ admins: [], emails: [], disabledEmails: [] });
    return () => {};
  }
  return onSnapshot(
    doc(db, ADMIN_ACCESS_DOC),
    (snap) => {
      callback(
        snap.exists()
          ? normalizeAdminAccess(snap.data() as Record<string, unknown>)
          : { admins: [], emails: [], disabledEmails: [] }
      );
    },
    () => callback({ admins: [], emails: [], disabledEmails: [] })
  );
}

/** Guarda los admins administrados (activos/inactivos). Solo el super admin. */
export async function saveAdminAccess(
  admins: ManagedAdmin[],
  actorEmail: string
): Promise<AdminAccess> {
  if (!db) throw new Error("Firebase no está configurado.");
  if (!isSuperAdminEmail(actorEmail)) {
    throw new Error("Solo el super admin puede administrar los accesos.");
  }

  const before = await getAdminAccess();
  const next = normalizeAdminAccess({ admins } as Record<string, unknown>);
  const now = new Date().toISOString();
  const saved: AdminAccess = {
    ...next,
    updatedAt: now,
    updatedBy: normalizeEmail(actorEmail),
  };

  await setDoc(
    doc(db, ADMIN_ACCESS_DOC),
    {
      superAdmin: SUPER_ADMIN_EMAIL,
      // `emails` = activos; `disabledEmails` = desactivados explícitos (reglas/acceso).
      emails: saved.emails,
      disabledEmails: saved.disabledEmails,
      admins: saved.admins,
      updatedAt: now,
      updatedBy: normalizeEmail(actorEmail),
    },
    { merge: true }
  );

  const beforeState = before.admins.map(
    (admin) => `${admin.email}:${admin.active ? "on" : "off"}`
  );
  const nextState = saved.admins.map((admin) => `${admin.email}:${admin.active ? "on" : "off"}`);
  void logAudit({
    action: "settings.admins",
    entity: "settings",
    entityId: "adminAccess",
    entityLabel: "Administradores",
    summary: "Actualizó los administradores del panel.",
    changes: diffAuditFields({ admins: beforeState }, { admins: nextState }, ["admins"]),
    metadata: {
      total: saved.admins.length,
      active: saved.emails.length,
      inactive: saved.disabledEmails.length,
    },
  });

  return saved;
}
