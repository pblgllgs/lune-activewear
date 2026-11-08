/**
 * Test local de las Pages Functions (edge). No forma parte del build:
 * se ejecuta con node y sirve para validar la lógica antes de publicar.
 */
import { readFile } from "node:fs/promises";
import { onRequest as productoHandler } from "../functions/producto/[id].ts";
import { onRequest as sitemapHandler } from "../functions/sitemap.xml.ts";
import { normalizeDoc } from "../functions/_lib/seo.ts";

const indexHtml = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
const sitemapXml = await readFile(new URL("../dist/sitemap.xml", import.meta.url), "utf8");

const env = {
  ASSETS: {
    async fetch(request) {
      const url = new URL(request.href ?? request.url);
      if (url.pathname === "/sitemap.xml") {
        return new Response(sitemapXml, {
          headers: { "content-type": "application/xml" },
        });
      }
      return new Response(indexHtml, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    },
  },
  VITE_FIREBASE_PROJECT_ID: "lune-activewear",
  VITE_SITE_URL: "https://lune-activewear.pages.dev",
};

const failures = [];
function check(label, condition, detail = "") {
  const ok = Boolean(condition);
  console.log(`${ok ? "OK  " : "FAIL"} ${label}${detail ? ` -> ${detail}` : ""}`);
  if (!ok) failures.push(label);
}

function meta(html, kind, key) {
  const re = new RegExp(`<meta\\s+${kind}="${key}"\\s+content="([^"]*)"`);
  return html.match(re)?.[1] ?? null;
}

/* ---------------------------------------------------------------- producto */
{
  const response = await productoHandler({
    request: new Request("https://lune-activewear.pages.dev/producto/calza-flare"),
    params: { id: "calza-flare" },
    env,
    next: async () => new Response("STATIC", { status: 200 }),
  });
  const html = await response.text();

  check("producto: status 200", response.status === 200, `status=${response.status}`);
  check(
    "producto: title propio (em dash)",
    /<title>Calza Flare — Calzas \| LUNÉ Activewear<\/title>/.test(html),
    html.match(/<title>(.*?)<\/title>/)?.[1]
  );
  check(
    "producto: canonical propio",
    html.includes('<link rel="canonical" href="https://lune-activewear.pages.dev/producto/calza-flare" />')
  );
  check("producto: og:type product", meta(html, "property", "og:type") === "product");
  check("producto: og:title propio", meta(html, "property", "og:title") === "Calza Flare — Calzas | LUNÉ Activewear");
  check("producto: twitter:card", meta(html, "name", "twitter:card") === "summary_large_image");
  check("producto: description no vacía", (meta(html, "name", "description") ?? "").length > 20);
  check("producto: robots index", (meta(html, "name", "robots") ?? "").includes("index"));
  check("producto: cache-control edge", (response.headers.get("cache-control") ?? "").includes("s-maxage"));

  const ld = html.match(/<script type="application\/ld\+json" id="static-page-jsonld">([\s\S]*?)<\/script>/);
  check("producto: JSON-LD presente con id static-page-jsonld", Boolean(ld));
  if (ld) {
    const parsed = JSON.parse(ld[1]);
    const types = parsed.map((entry) => entry["@type"]);
    check("producto: JSON-LD Product + BreadcrumbList", types.includes("Product") && types.includes("BreadcrumbList"), types.join(","));
    const product = parsed.find((entry) => entry["@type"] === "Product");
    check("producto: JSON-LD nombre real", product?.name === "Calza Flare", product?.name);
    check("producto: JSON-LD precio", typeof product?.offers?.price === "number", String(product?.offers?.price));
    check("producto: JSON-LD currency CLP", product?.offers?.priceCurrency === "CLP");
    check("producto: JSON-LD sku = id", product?.sku === "calza-flare");
    check("producto: JSON-LD url canonical", product?.offers?.url === "https://lune-activewear.pages.dev/producto/calza-flare");
    check("producto: JSON-LD sin HTML roto", !/&(?!amp;|lt;|gt;|quot;|#)/.test(ld[1]));
  }

  check("producto: noscript con precio", /<strong>Precio:<\/strong>/.test(html));
  check("producto: noscript con tallas", /<strong>Tallas:<\/strong>/.test(html));
  check("producto: noscript con h1 real", /<h1>Calza Flare<\/h1>/.test(html));
  check("producto: entidades HTML correctas", !html.includes("&amp;"));
}

/* ------------------------------------------------------------- 404 producto */
{
  const response = await productoHandler({
    request: new Request("https://lune-activewear.pages.dev/producto/no-existe-xyz-123"),
    params: { id: "no-existe-xyz-123" },
    env,
    next: async () => new Response("STATIC", { status: 200 }),
  });
  const html = await response.text();

  check("404: status 404", response.status === 404, `status=${response.status}`);
  check("404: x-robots-tag", (response.headers.get("x-robots-tag") ?? "").includes("noindex"));
  check("404: robots noindex", (meta(html, "name", "robots") ?? "").includes("noindex"));
  check("404: canonical tienda", html.includes('href="https://lune-activewear.pages.dev/tienda"'));
  check("404: title propio", /<title>Producto no encontrado \| LUNÉ Activewear<\/title>/.test(html));
  check("404: noscript 404", /<h1>Producto no encontrado<\/h1>/.test(html));
}

/* ---------------------------------------------------- borrador (no publicado) */
{
  const draft = normalizeDoc("borrador-test", {
    name: { stringValue: "Borrador" },
    category: { stringValue: "calzas" },
    price: { integerValue: "10000" },
    published: { booleanValue: false },
  });
  check("borrador: published=false normalizado", draft.published === false);
  const pub = normalizeDoc("publicado-test", {
    name: { stringValue: "Publicado" },
    category: { stringValue: "calzas" },
    price: { integerValue: "10000" },
  });
  check("sin campo published: se considera publicado", pub.published === true);
}

/* ------------------------------------------------- ID con formato inválido */
{
  const response = await productoHandler({
    request: new Request("https://lune-activewear.pages.dev/producto/mal%20id"),
    params: { id: "mal id" },
    env,
    next: async () => new Response("STATIC", { status: 200 }),
  });
  check("id inválido: 404", response.status === 404, `status=${response.status}`);
}

/* ----------------------------------------------------------------- sitemap */
{
  const response = await sitemapHandler({
    request: new Request("https://lune-activewear.pages.dev/sitemap.xml"),
    env,
    next: async () => new Response("STATIC", { status: 200 }),
  });
  const xml = await response.text();
  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

  check("sitemap: status 200", response.status === 200);
  check("sitemap: content-type xml", (response.headers.get("content-type") ?? "").includes("xml"));
  check("sitemap: incluye rutas fijas", locs.includes("https://lune-activewear.pages.dev/tienda"));
  check(
    "sitemap: incluye categorías",
    locs.includes("https://lune-activewear.pages.dev/categoria/calzas")
  );
  check(
    "sitemap: incluye productos vivos",
    locs.includes("https://lune-activewear.pages.dev/producto/calza-flare"),
    `${locs.length} urls`
  );
  check("sitemap: XML bien formado", xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  check("sitemap: sin duplicados", new Set(locs).size === locs.length);
}

console.log(`\n${failures.length === 0 ? "TODO OK" : `FALLOS: ${failures.join(", ")}`}`);
process.exit(failures.length === 0 ? 0 : 1);
