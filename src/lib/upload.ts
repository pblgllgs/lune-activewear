/**
 * Sube un archivo a Cloudflare R2 a través del worker (ver carpeta /worker).
 * Devuelve la URL pública servida por el propio worker (/file/<key>).
 *
 * Convención de claves en R2:
 *   products/<slug-producto>/<timestamp>-<nombre>
 */
const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL as string | undefined;
const UPLOAD_TOKEN = import.meta.env.VITE_UPLOAD_TOKEN as string | undefined;

export function isUploadConfigured() {
  return Boolean(WORKER_URL && UPLOAD_TOKEN);
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
  if (!WORKER_URL || !UPLOAD_TOKEN) {
    throw new Error("Falta configurar VITE_R2_WORKER_URL y VITE_UPLOAD_TOKEN.");
  }

  const key = `${folder}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

  const res = await fetch(
    `${WORKER_URL}/upload?key=${encodeURIComponent(key)}&token=${encodeURIComponent(UPLOAD_TOKEN)}&contentType=${encodeURIComponent(file.type)}`,
    { method: "PUT", body: file }
  );
  if (!res.ok) throw new Error("Error al subir el archivo a R2");

  return `${WORKER_URL}/file/${key}`;
}

/** Elimina un archivo de R2 a partir de su URL pública (/file/<key>). */
export async function deleteFromR2(url: string): Promise<void> {
  const idx = url.indexOf("/file/");
  if (idx === -1 || !WORKER_URL || !UPLOAD_TOKEN) return;
  const key = url.slice(idx + "/file/".length);

  const res = await fetch(
    `${WORKER_URL}/delete?key=${encodeURIComponent(key)}&token=${encodeURIComponent(UPLOAD_TOKEN)}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error("Error al eliminar el archivo de R2");
}
