import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { diffAuditFields, logAudit } from "@/lib/audit";
import { isSuperAdminEmail, normalizeEmail, SUPER_ADMIN_EMAIL } from "@/lib/admin";

/** Documento que almacena los correos admin administrados por el super admin. */
export const ADMIN_ACCESS_DOC = "settings/adminAccess";

export interface AdminAccess {
  /** Correos con acceso admin (además del super admin). */
  emails: string[];
  updatedAt?: string;
  updatedBy?: string;
}

function normalizeEmails(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const unique = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const email = normalizeEmail(value);
    if (!email || !email.includes("@")) continue;
    // El super admin no se almacena en la lista: siempre tiene acceso.
    if (isSuperAdminEmail(email)) continue;
    unique.add(email);
  }
  return Array.from(unique).sort((a, b) => a.localeCompare(b));
}

export function normalizeAdminAccess(data: Record<string, unknown> | undefined): AdminAccess {
  return {
    emails: normalizeEmails(data?.emails),
    ...(typeof data?.updatedAt === "string" ? { updatedAt: data.updatedAt } : {}),
    ...(typeof data?.updatedBy === "string" ? { updatedBy: data.updatedBy } : {}),
  };
}

export async function getAdminAccess(): Promise<AdminAccess> {
  if (!db) return { emails: [] };
  try {
    const snap = await getDoc(doc(db, ADMIN_ACCESS_DOC));
    return snap.exists() ? normalizeAdminAccess(snap.data() as Record<string, unknown>) : { emails: [] };
  } catch {
    return { emails: [] };
  }
}

export function subscribeAdminAccess(callback: (access: AdminAccess) => void): () => void {
  if (!db) {
    callback({ emails: [] });
    return () => {};
  }
  return onSnapshot(
    doc(db, ADMIN_ACCESS_DOC),
    (snap) => {
      callback(snap.exists() ? normalizeAdminAccess(snap.data() as Record<string, unknown>) : { emails: [] });
    },
    () => callback({ emails: [] })
  );
}

/** Guarda la lista de admins administrados. Solo debe usarla el super admin. */
export async function saveAdminAccess(emails: string[], actorEmail: string): Promise<AdminAccess> {
  if (!db) throw new Error("Firebase no está configurado.");
  if (!isSuperAdminEmail(actorEmail)) {
    throw new Error("Solo el super admin puede administrar los accesos.");
  }

  const before = await getAdminAccess();
  const nextEmails = normalizeEmails(emails);
  const now = new Date().toISOString();
  const next: AdminAccess = {
    emails: nextEmails,
    updatedAt: now,
    updatedBy: normalizeEmail(actorEmail),
  };

  await setDoc(
    doc(db, ADMIN_ACCESS_DOC),
    {
      superAdmin: SUPER_ADMIN_EMAIL,
      emails: nextEmails,
      updatedAt: now,
      updatedBy: normalizeEmail(actorEmail),
    },
    { merge: true }
  );

  void logAudit({
    action: "settings.admins",
    entity: "settings",
    entityId: "adminAccess",
    entityLabel: "Administradores",
    summary: "Actualizó la lista de administradores.",
    changes: diffAuditFields(
      { emails: before.emails },
      { emails: nextEmails },
      ["emails"]
    ),
    metadata: { count: nextEmails.length },
  });

  return next;
}
