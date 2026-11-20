const DEFAULT_SUPER_ADMIN = "pablogallegosgonzalez@gmail.com";

/** Super admin: puede administrar a los demás admins (configurable por entorno). */
export const SUPER_ADMIN_EMAIL = (
  (import.meta.env.VITE_SUPER_ADMIN_EMAIL as string) || DEFAULT_SUPER_ADMIN
)
  .trim()
  .toLowerCase();

/** Correos admin de respaldo (.env). Los admins se gestionan desde el panel. */
export const LEGACY_ADMIN_EMAILS = ((import.meta.env.VITE_ADMIN_EMAILS as string) || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function normalizeEmail(email?: string | null): string {
  return (email ?? "").trim().toLowerCase();
}

export function isSuperAdminEmail(email?: string | null): boolean {
  const value = normalizeEmail(email);
  return Boolean(value) && value === SUPER_ADMIN_EMAIL;
}

/** `true` si el correo tiene acceso admin (respeta desactivaciones del panel). */
export function isAdminEmail(
  email?: string | null,
  managed?: string[] | { active?: string[]; disabled?: string[] }
): boolean {
  const value = normalizeEmail(email);
  if (!value) return false;
  if (value === SUPER_ADMIN_EMAIL) return true;

  if (Array.isArray(managed)) {
    return managed.some((item) => normalizeEmail(item) === value);
  }

  const disabled = new Set((managed?.disabled ?? []).map(normalizeEmail).filter(Boolean));
  if (disabled.has(value)) return false;

  const active = managed?.active;
  if (active && active.some((item) => normalizeEmail(item) === value)) return true;

  // Respaldo .env: acceso por defecto salvo desactivación explícita en panel.
  return LEGACY_ADMIN_EMAILS.includes(value);
}

/** Compatibilidad: lista base conocida (super admin + respaldo .env). */
export const ADMIN_EMAILS = Array.from(
  new Set([SUPER_ADMIN_EMAIL, ...LEGACY_ADMIN_EMAILS].filter(Boolean))
);
