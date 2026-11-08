/**
 * Sube un archivo a Cloudflare R2 a través del worker (ver carpeta /worker).
 * Devuelve la URL pública servida por el propio worker (/file/<key>).
 *
 * Convención de claves en R2:
 *   products/<slug-producto>/<timestamp>-<nombre>
 */
// Se leen dentro de cada función: Vite reemplaza estos valores en tiempo de
// arranque/build, pero así el error indica exactamente qué variable falta.
const workerUrl = () => import.meta.env.VITE_R2_WORKER_URL as string | undefined;
const uploadToken = () => import.meta.env.VITE_UPLOAD_TOKEN as string | undefined;

export function isUploadConfigured() {
  return Boolean(workerUrl() && uploadToken());
}

export function missingUploadConfig(): string[] {
  const missing: string[] = [];
  if (!workerUrl()) missing.push("VITE_R2_WORKER_URL");
  if (!uploadToken()) missing.push("VITE_UPLOAD_TOKEN");
  return missing;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function uploadToR2(file: File, folder: string): Promise<string> {
  const base = workerUrl();
  const token = uploadToken();
  if (!base || !token) {
    throw new Error(`Falta configurar ${missingUploadConfig().join(" y ")}.`);
  }

  const key = `${folder}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

  const res = await fetch(
    `${base}/upload?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}&contentType=${encodeURIComponent(file.type)}`,
    { method: "PUT", body: file }
  );
  if (!res.ok) throw new Error("Error al subir el archivo a R2");

  return `${base}/file/${key}`;
}

/** Elimina un archivo de R2 a partir de su URL pública (/file/<key>). */
export async function deleteFromR2(url: string): Promise<void> {
  const base = workerUrl();
  const token = uploadToken();
  const idx = url.indexOf("/file/");
  if (idx === -1 || !base || !token) return;
  const key = url.slice(idx + "/file/".length);

  const res = await fetch(
    `${base}/delete?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error("Error al eliminar el archivo de R2");
}
