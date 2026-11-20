/**
 * Verificación del ID token de Firebase para endpoints de administración.
 *
 * Se usa `accounts:lookup` con la API key web (pública) para resolver el correo
 * del token y compararlo con el super admin, los admins de respaldo (.env) y
 * los admins administrados desde el panel (Firestore `settings/adminAccess`).
 */

import { getDocument, isFirestoreConfigured } from "./firebase-admin";

type Env = Record<string, string | undefined>;

const DEFAULT_SUPER_ADMIN = "pablogallegosgonzalez@gmail.com";

export function superAdminEmail(env: Env): string {
  return (env.SUPER_ADMIN_EMAIL || env.VITE_SUPER_ADMIN_EMAIL || DEFAULT_SUPER_ADMIN)
    .trim()
    .toLowerCase();
}

export function adminEmails(env: Env): string[] {
  const emails = (env.ADMIN_EMAILS || env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const superAdmin = superAdminEmail(env);
  if (superAdmin && !emails.includes(superAdmin)) emails.push(superAdmin);
  return emails;
}

async function managedAccess(env: Env): Promise<{ active: string[]; disabled: string[] }> {
  if (!isFirestoreConfigured(env)) return { active: [], disabled: [] };
  try {
    const doc = await getDocument(env, "settings/adminAccess");
    const rawAdmins = doc?.admins;
    if (Array.isArray(rawAdmins)) {
      const active: string[] = [];
      const disabled: string[] = [];
      for (const value of rawAdmins) {
        if (!value || typeof value !== "object" || Array.isArray(value)) continue;
        const record = value as Record<string, unknown>;
        const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
        if (!email) continue;
        if (record.active === false) disabled.push(email);
        else active.push(email);
      }
      return { active, disabled };
    }

    const raw = doc?.emails;
    const active = Array.isArray(raw)
      ? raw
          .filter((value): value is string => typeof value === "string")
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)
      : [];
    const rawDisabled = doc?.disabledEmails;
    const disabled = Array.isArray(rawDisabled)
      ? rawDisabled
          .filter((value): value is string => typeof value === "string")
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)
      : [];
    return { active, disabled };
  } catch {
    return { active: [], disabled: [] };
  }
}

export async function requireAdmin(env: Env, request: Request): Promise<string | null> {
  const header = request.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const key = env.FIREBASE_API_KEY || env.VITE_FIREBASE_API_KEY;
  if (!key) return null;

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    }
  );
  if (!response.ok) return null;

  const data = (await response.json()) as { users?: Array<{ email?: string }> };
  const email = (data.users?.[0]?.email ?? "").trim().toLowerCase();
  if (!email) return null;

  if (email === superAdminEmail(env)) return email;

  const managed = await managedAccess(env);
  if (managed.disabled.includes(email)) return null;
  if (managed.active.includes(email)) return email;
  if (adminEmails(env).includes(email)) return email;
  return null;
}
