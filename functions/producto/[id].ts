/**
 * Edge SEO de fichas de producto.
 *
 * `/producto/<slug>` se responde en el edge: se lee el producto en Firestore
 * (REST público) y se inyectan sus metadatos en el `index.html` del build.
 * Así, un producto creado **después** del último build ya tiene title,
 * description, canonical, Open Graph, Twitter y JSON-LD propios, sin
 * redesplegar la web.
 *
 * Si el producto no existe se responde 404 con `noindex`. Si Firestore falla,
 * se cae al asset estático (que tiene sus propios metadatos).
 */

import {
  fetchProduct,
  injectNotFoundMeta,
  injectProductMeta,
  siteUrl,
  type EdgeEnv,
} from "../_lib/seo.ts";

interface Context {
  request: Request;
  params: { id?: string };
  env: EdgeEnv;
  next(): Promise<Response>;
}

const HTML_HEADERS: Record<string, string> = {
  "content-type": "text/html; charset=utf-8",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
};

export async function onRequest(context: Context): Promise<Response> {
  const { request, params, env } = context;

  if (request.method !== "GET" && request.method !== "HEAD") {
    return context.next();
  }

  const id = decodeURIComponent(params.id ?? "").trim().toLowerCase();
  if (!/^[a-z0-9-]{1,80}$/.test(id)) {
    return notFound(context);
  }

  try {
    const base = siteUrl(env);
    const product = await fetchProduct(id, env);
    const template = await getTemplate(context);

    if (!product || !product.name) {
      return new Response(injectNotFoundMeta(template, base), {
        status: 404,
        headers: {
          ...HTML_HEADERS,
          "x-robots-tag": "noindex, nofollow",
          "cache-control": "public, max-age=300",
        },
      });
    }

    return new Response(injectProductMeta(template, product, base), {
      headers: {
        ...HTML_HEADERS,
        "cache-control": "public, max-age=0, s-maxage=300",
      },
    });
  } catch (error) {
    // Cualquier fallo (Firestore caído, plantilla ausente) cae al asset estático.
    console.warn("[edge] producto: fallback a asset estático", error);
    return context.next();
  }
}

async function getTemplate(context: Context): Promise<string> {
  const response = await context.env.ASSETS.fetch(
    new URL("/index.html", context.request.url)
  );
  return response.text();
}

async function notFound(context: Context): Promise<Response> {
  try {
    const base = siteUrl(context.env);
    const template = await getTemplate(context);
    return new Response(injectNotFoundMeta(template, base), {
      status: 404,
      headers: {
        ...HTML_HEADERS,
        "x-robots-tag": "noindex, nofollow",
        "cache-control": "public, max-age=300",
      },
    });
  } catch {
    return context.next();
  }
}
