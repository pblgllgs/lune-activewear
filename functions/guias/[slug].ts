/**
 * Edge SEO de guías/blog.
 *
 * `/guias/<slug>` se responde en el edge: se lee la guía en Firestore (REST
 * público) y se inyectan sus metadatos en el `index.html` del build.
 * Así, una guía creada después del último build ya tiene title, description,
 * canonical, Open Graph, Twitter y JSON-LD propios, sin redesplegar.
 */

import {
  fetchGuide,
  injectGuideMeta,
  injectGuideNotFoundMeta,
  siteUrl,
  type EdgeEnv,
} from "../_lib/seo.ts";

interface Context {
  request: Request;
  params: { slug?: string };
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

  const slug = decodeURIComponent(params.slug ?? "").trim();
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(slug)) {
    return notFound(context);
  }

  try {
    const base = siteUrl(env);
    const guide = await fetchGuide(slug, env);
    const template = await getTemplate(context);

    if (!guide || !guide.title || guide.published !== true) {
      return new Response(injectGuideNotFoundMeta(template, base), {
        status: 404,
        headers: {
          ...HTML_HEADERS,
          "x-robots-tag": "noindex, nofollow",
          "cache-control": "public, max-age=300",
        },
      });
    }

    return new Response(injectGuideMeta(template, guide, base), {
      headers: {
        ...HTML_HEADERS,
        "cache-control": "public, max-age=0, s-maxage=300",
      },
    });
  } catch (error) {
    console.warn("[edge] guia: fallback a asset estático", error);
    return context.next();
  }
}

async function getTemplate(context: Context): Promise<string> {
  const response = await context.env.ASSETS.fetch(new URL("/index.html", context.request.url));
  return response.text();
}

async function notFound(context: Context): Promise<Response> {
  try {
    const base = siteUrl(context.env);
    const template = await getTemplate(context);
    return new Response(injectGuideNotFoundMeta(template, base), {
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
