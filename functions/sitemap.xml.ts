/**
 * Sitemap dinámico.
 *
 * Toma el `sitemap.xml` estático del build (home, tienda, categorías, nosotros,
 * privacidad, guías) y reemplaza las entradas de producto y de guías por las que
 * devuelve Firestore ahora. Así, contenido nuevo aparece en el sitemap sin redesplegar.
 */

import { escapeXml, fetchGuides, fetchProducts, siteUrl, type EdgeEnv } from "./_lib/seo.ts";

interface Context {
  request: Request;
  env: EdgeEnv;
  next(): Promise<Response>;
}

export async function onRequest(context: Context): Promise<Response> {
  const { env } = context;

  try {
    const base = siteUrl(env);
    const [staticXml, products, guides] = await Promise.all([
      context.env.ASSETS.fetch(new URL("/sitemap.xml", context.request.url)).then((r) => r.text()),
      fetchProducts(env),
      fetchGuides(env),
    ]);

    const blocks = staticXml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
    const staticBlocks = blocks.filter(
      (block) => !block.includes("/producto/") && !block.includes("/guias/")
    );

    const today = new Date().toISOString().slice(0, 10);
    const productBlocks = products.map((product) => {
      const loc = escapeXml(`${base}/producto/${product.id}`);
      const lastmod = product.lastmod || today;
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });
    const guideBlocks = guides.map((guide) => {
      const loc = escapeXml(`${base}/guias/${guide.slug || guide.id}`);
      const lastmod = guide.lastmod || today;
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticBlocks, ...productBlocks, ...guideBlocks].join("\n")}
</urlset>
`;

    return new Response(xml, {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=0, s-maxage=900",
      },
    });
  } catch (error) {
    console.warn("[edge] sitemap: fallback al estático", error);
    return context.next();
  }
}
