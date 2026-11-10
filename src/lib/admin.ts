/** Correos con acceso al panel. Debe coincidir con `VITE_ADMIN_EMAILS` y `firestore.rules`. */
export const ADMIN_EMAILS = ((import.meta.env.VITE_ADMIN_EMAILS as string) || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

/** `true` si el correo pertenece a una cuenta administradora. */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
