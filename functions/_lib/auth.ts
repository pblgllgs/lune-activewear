/**
 * Verificación del ID token de Firebase para endpoints de administración.
 *
 * Se usa `accounts:lookup` con la API key web (pública) para resolver el correo
 * del token y compararlo con la lista de admins. No se necesita service account
 * para esta comprobación.
 */

type Env = Record<string, string | undefined>;

export function adminEmails(env: Env): string[] {
  return (env.ADMIN_EMAILS || env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
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

  return adminEmails(env).includes(email) ? email : null;
}
