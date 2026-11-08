/**
 * Cloudflare Worker para subir y servir archivos del bucket R2 "lune-activewear".
 *
 * - PUT /upload?key=<ruta>&token=<VITE_UPLOAD_TOKEN>  → sube el body al bucket
 * - DELETE /delete?key=<ruta>&token=<VITE_UPLOAD_TOKEN> → elimina un archivo
 * - GET /file/<ruta>                                  → sirve el archivo (público)
 *
 * Despliegue:
 *   cd worker
 *   npm install
 *   npx wrangler secret put UPLOAD_TOKEN
 *   npm run deploy
 */

export interface Env {
  LUNE_BUCKET: R2Bucket;
  ALLOWED_ORIGIN: string;
  UPLOAD_TOKEN: string;
}

/**
 * ALLOWED_ORIGIN acepta una lista separada por comas y comodines de subdominio
 * (ej. "https://*.lune-activewear.pages.dev" para previews de Pages).
 * Se devuelve el origen exacto de la petición cuando coincide.
 */
const cors = (request: Request, allowedOrigin: string) => {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = (allowedOrigin || "*")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const matches = allowed.some((value) => {
    if (value === "*" || value === origin) return true;
    if (value.includes("*")) {
      const [prefix, suffix] = value.split("*");
      return origin.startsWith(prefix) && origin.endsWith(suffix);
    }
    return false;
  });

  return {
    "Access-Control-Allow-Origin": matches ? origin || "*" : allowed[0] ?? "*",
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
};

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const headers = cors(request, env.ALLOWED_ORIGIN || "*");

    if (request.method === "OPTIONS") return new Response(null, { headers });

    // Subida protegida por token
    if (url.pathname === "/upload" && request.method === "PUT") {
      const key = url.searchParams.get("key");
      const token = url.searchParams.get("token");
      if (!key || key.includes("..")) return Response.json({ error: "key inválida" }, { status: 400, headers });
      if (!env.UPLOAD_TOKEN || token !== env.UPLOAD_TOKEN) {
        return Response.json({ error: "no autorizado" }, { status: 401, headers });
      }
      const contentType =
        url.searchParams.get("contentType") ||
        CONTENT_TYPES[key.split(".").pop()?.toLowerCase() ?? ""] ||
        "application/octet-stream";
      await env.LUNE_BUCKET.put(key, request.body, { httpMetadata: { contentType } });
      return Response.json({ key }, { headers });
    }

    // Eliminar un archivo (protegido por token)
    if (url.pathname === "/delete" && request.method === "DELETE") {
      const key = url.searchParams.get("key");
      const token = url.searchParams.get("token");
      if (!key) return Response.json({ error: "key inválida" }, { status: 400, headers });
      if (!env.UPLOAD_TOKEN || token !== env.UPLOAD_TOKEN) {
        return Response.json({ error: "no autorizado" }, { status: 401, headers });
      }
      await env.LUNE_BUCKET.delete(key);
      return Response.json({ ok: true }, { headers });
    }

    // Servir archivos (público)
    if (url.pathname.startsWith("/file/") && request.method === "GET") {
      const key = url.pathname.slice("/file/".length);
      const object = await env.LUNE_BUCKET.get(key);
      if (!object) return Response.json({ error: "no encontrado" }, { status: 404, headers });
      return new Response(object.body, {
        headers: {
          ...headers,
          "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    return Response.json({ error: "Not found" }, { status: 404, headers });
  },
};
