/**
 * Utilidades compartidas por las Pages Functions (edge).
 *
 * Objetivo: que un producto creado **después** del último build ya tenga su
 * HTML con metadatos propios (title, description, canonical, Open Graph,
 * Twitter y JSON-LD) sin necesidad de redesplegar la web.
 *
 * No hay dependencias: todo usa `fetch` contra la API REST pública de
 * Firestore y la inyección es de texto sobre el `index.html` del build.
 */

export interface EdgeEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_SITE_URL?: string;
}

export interface ProductMeta {
  id: string;
  /** SKU generado al crear el producto; si falta se usa el ID. */
  sku?: string;
  name: string;
  description: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  sizes: string[];
  colors: string[];
  images: string[];
  soldOut: boolean;
  /** `false` = borrador: no se sirve ni entra al sitemap. */
  published: boolean;
  lastmod: string;
}

export const SITE_NAME = "LUNÉ Activewear";
export const DEFAULT_SITE_URL = "https://lune-activewear.pages.dev";

export const CATEGORY_LABELS: Record<string, string> = {
  calzas: "Calzas",
  petos: "Petos",
  shorts: "Shorts",
  poleras: "Poleras",
  otros: "Otros",
};

export function siteUrl(env: EdgeEnv) {
  return (env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
}

export function categoryLabel(id: string) {
  return CATEGORY_LABELS[id] ?? id;
}

function projectId(env: EdgeEnv) {
  return env.VITE_FIREBASE_PROJECT_ID || "lune-activewear";
}

/* -------------------------------------------------------------------------- */
/* Firestore (REST público)                                                    */
/* -------------------------------------------------------------------------- */

const str = (field: unknown): string =>
  (field as { stringValue?: string })?.stringValue ?? "";

const num = (field: unknown): number =>
  Number(
    (field as { doubleValue?: number; integerValue?: number })?.doubleValue ??
      (field as { integerValue?: number })?.integerValue ??
      0
  );

const arr = (field: unknown): unknown[] =>
  (field as { arrayValue?: { values?: unknown[] } })?.arrayValue?.values ?? [];

const map = (field: unknown): Record<string, unknown> =>
  (field as { mapValue?: { fields?: Record<string, unknown> } })?.mapValue?.fields ?? {};

/** Convierte un documento de Firestore (REST) en los datos que usa el edge. */
export function normalizeDoc(id: string, fields: Record<string, unknown>): ProductMeta {
  const sizes = arr(fields.sizes).map((value) => str(value));
  const legacyStock = map(fields.stockBySize);
  const variantStock = map(fields.stockByVariant);
  const variantColors = Object.keys(variantStock);
  let soldOut = false;
  if (sizes.length > 0) {
    if (variantColors.length > 0) {
      soldOut = sizes.every((size) =>
        variantColors.every((color) => {
          const bySize = map(variantStock[color]);
          const entry = bySize[size];
          return entry ? num(entry) === 0 : false;
        })
      );
    } else {
      soldOut = sizes.every((size) => {
        const entry = legacyStock[size];
        return entry ? num(entry) === 0 : false;
      });
    }
  }
  const publishedField = fields.published as { booleanValue?: boolean } | undefined;

  return {
    id,
    sku: str(fields.sku).trim().toUpperCase() || undefined,
    name: str(fields.name),
    description: str(fields.description),
    category: str(fields.category),
    price: num(fields.price),
    compareAtPrice: fields.compareAtPrice ? num(fields.compareAtPrice) : undefined,
    sizes,
    colors: arr(fields.colors).map((color) => str(map(color).name)),
    images: arr(fields.images).map((image) => str(image)),
    soldOut,
    // Sin el campo se considera publicado (catálogo anterior a los borradores).
    published: publishedField ? publishedField.booleanValue === true : true,
    lastmod: (str(fields.updatedAt) || str(fields.createdAt)).slice(0, 10),
  };
}

/** Caché en memoria del isolate (5 min) para no pegarle a Firestore siempre. */
const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, { at: number; value: unknown }>();

function cached<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > CACHE_TTL) {
    cache.delete(key);
    return undefined;
  }
  return hit.value as T;
}

function remember<T>(key: string, value: T) {
  cache.set(key, { at: Date.now(), value });
}

export async function fetchProduct(id: string, env: EdgeEnv): Promise<ProductMeta | null> {
  const key = `product:${id}`;
  const hit = cached<ProductMeta | null>(key);
  if (hit !== undefined) return hit;

  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId(env)
  )}/databases/(default)/documents/products/${encodeURIComponent(id)}`;

  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (response.status === 404) {
    remember(key, null);
    return null;
  }
  if (!response.ok) throw new Error(`Firestore respondió ${response.status}`);

  const data = (await response.json()) as { fields?: Record<string, unknown> };
  const product = normalizeDoc(id, data.fields ?? {});
  remember(key, product);
  return product;
}

export async function fetchProducts(env: EdgeEnv): Promise<ProductMeta[]> {
  const key = "products:all";
  const hit = cached<ProductMeta[]>(key);
  if (hit) return hit;

  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId(env)
  )}/databases/(default)/documents/products?pageSize=300`;

  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Firestore respondió ${response.status}`);

  const data = (await response.json()) as { documents?: { name?: string; fields?: Record<string, unknown> }[] };
  const products = (data.documents ?? [])
    .map((doc) => {
      const id = String(doc.name ?? "").split("/").pop() ?? "";
      return normalizeDoc(id, doc.fields ?? {});
    })
    .filter(
      (product) =>
        product.id && product.name.trim().toLowerCase() !== "test" && product.published !== false
    );

  remember(key, products);
  return products;
}

/* -------------------------------------------------------------------------- */
/* Inyección de metadatos                                                     */
/* -------------------------------------------------------------------------- */

export function escapeHtml(value: string) {
  const amp = String.fromCharCode(38);
  return String(value)
    .replace(/&/g, amp + "amp;")
    .replace(/</g, amp + "lt;")
    .replace(/>/g, amp + "gt;");
}

export function escapeAttr(value: string) {
  return escapeHtml(value).replace(/"/g, String.fromCharCode(38) + "quot;");
}

export function escapeXml(value: string) {
  const amp = String.fromCharCode(38);
  return String(value)
    .replace(/&/g, amp + "amp;")
    .replace(/</g, amp + "lt;")
    .replace(/>/g, amp + "gt;")
    .replace(/"/g, amp + "quot;")
    .replace(/'/g, amp + "apos;");
}

export function truncate(value: string, max = 155) {
  const clean = String(value).replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/** Quita el HTML de la descripción enriquecida y decodifica entidades básicas. */
export function stripHtml(value: string) {
  const amp = String.fromCharCode(38);
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(new RegExp(`${amp}nbsp;`, "gi"), " ")
    .replace(new RegExp(`${amp}amp;`, "gi"), amp)
    .replace(new RegExp(`${amp}lt;`, "gi"), "<")
    .replace(new RegExp(`${amp}gt;`, "gi"), ">")
    .replace(new RegExp(`${amp}quot;`, "gi"), '"')
    .replace(new RegExp(`${amp}#39;`, "gi"), "'")
    .replace(/\\[nr]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function replaceTitle(html: string, title: string) {
  return html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
}

function replaceMeta(html: string, kind: "name" | "property", key: string, content: string) {
  const re = new RegExp(`<meta\\s+${kind}="${key}"[^>]*>`);
  const tag = `<meta ${kind}="${key}" content="${escapeAttr(content)}" />`;
  return re.test(html) ? html.replace(re, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}

function removeMeta(html: string, kind: "name" | "property", key: string) {
  return html.replace(new RegExp(`\\s*<meta\\s+${kind}="${key}"[^>]*>`), "");
}

function replaceCanonical(html: string, href: string) {
  return html.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${escapeAttr(href)}" />`
  );
}

function setJsonLd(html: string, jsonLd: unknown) {
  const tag = `<script type="application/ld+json" id="static-page-jsonld">${JSON.stringify(
    jsonLd
  )}</script>`;
  const re = /<script type="application\/ld\+json" id="static-page-jsonld">[\s\S]*?<\/script>/;
  return re.test(html) ? html.replace(re, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}

function setNoscript(html: string, heading: string, description: string, extra = "") {
  const block = `<noscript>
      <div style="max-width: 640px; margin: 0 auto; padding: 48px 24px; font-family: Georgia, serif; color: #49372d; background: #f8f5f1;">
        <h1>${escapeHtml(heading)}</h1>
        <p>${escapeHtml(description)}</p>
        ${extra}
        <p>
          <a href="/tienda">Ver la colección</a> ·
          <a href="/nosotros">Conoce Luné</a> ·
          <a href="https://wa.me/56957592973">WhatsApp +56 9 5759 2973</a>
        </p>
      </div>
    </noscript>`;
  return html.replace(/<noscript>[\s\S]*?<\/noscript>/, block);
}

function absolute(url: string, base: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

export function productJsonLd(product: ProductMeta, base: string) {
  const url = `${base}/producto/${product.id}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: stripHtml(product.description),
    image: product.images.map((image) => absolute(image, base)),
    sku: product.sku || product.id,
    category: categoryLabel(product.category),
    brand: { "@type": "Brand", name: SITE_NAME },
    color: product.colors.join(", ") || undefined,
    size: product.sizes.join(", ") || undefined,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "CLP",
      price: product.price,
      availability: product.soldOut
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
}

export function breadcrumbJsonLd(product: ProductMeta, base: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: "Tienda", item: `${base}/tienda` },
      {
        "@type": "ListItem",
        position: 3,
        name: categoryLabel(product.category),
        item: `${base}/categoria/${product.category}`,
      },
      { "@type": "ListItem", position: 4, name: product.name, item: `${base}/producto/${product.id}` },
    ],
  };
}

/** Escribe en el HTML los metadatos de un producto (title, OG, Twitter, JSON-LD). */
export function injectProductMeta(html: string, product: ProductMeta, base: string) {
  const label = categoryLabel(product.category);
  const title = `${product.name} — ${label} | ${SITE_NAME}`;
  const description = truncate(
    stripHtml(product.description) ||
      `${product.name} de ${SITE_NAME}. Ropa deportiva femenina diseñada en Chillán, Chile.`
  );
  const canonical = `${base}/producto/${product.id}`;
  const image = product.images[0] ? absolute(product.images[0], base) : `${base}/og-image.jpg`;

  let out = replaceTitle(html, title);
  out = replaceMeta(out, "name", "description", description);
  out = replaceMeta(out, "name", "robots", "index,follow,max-image-preview:large");
  out = replaceCanonical(out, canonical);
  out = replaceMeta(out, "property", "og:type", "product");
  out = replaceMeta(out, "property", "og:title", title);
  out = replaceMeta(out, "property", "og:description", description);
  out = replaceMeta(out, "property", "og:url", canonical);
  out = replaceMeta(out, "property", "og:image", image);
  out = replaceMeta(out, "property", "og:image:alt", title);
  out = replaceMeta(out, "name", "twitter:card", "summary_large_image");
  out = replaceMeta(out, "name", "twitter:title", title);
  out = replaceMeta(out, "name", "twitter:description", description);
  out = replaceMeta(out, "name", "twitter:image", image);
  out = replaceMeta(out, "name", "twitter:image:alt", title);
  out = removeMeta(out, "property", "og:image:width");
  out = removeMeta(out, "property", "og:image:height");

  out = setJsonLd(out, [productJsonLd(product, base), breadcrumbJsonLd(product, base)]);

  const price = product.price
    ? new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }).format(product.price)
    : "";
  const extra = [
    price ? `<p><strong>Precio:</strong> ${escapeHtml(price)}</p>` : "",
    product.sizes.length
      ? `<p><strong>Tallas:</strong> ${escapeHtml(product.sizes.join(" · "))}</p>`
      : "",
    product.soldOut ? "<p><strong>Estado:</strong> Agotado</p>" : "",
  ]
    .filter(Boolean)
    .join("\n        ");

  out = setNoscript(out, product.name, description, extra);
  return out;
}

/** Escribe en el HTML los metadatos de un producto inexistente (404 + noindex). */
export function injectNotFoundMeta(html: string, base: string) {
  const title = `Producto no encontrado | ${SITE_NAME}`;
  const description = "La prenda que buscas no existe o ya no está disponible.";

  let out = replaceTitle(html, title);
  out = replaceMeta(out, "name", "description", description);
  out = replaceMeta(out, "name", "robots", "noindex,nofollow");
  out = replaceCanonical(out, `${base}/tienda`);
  out = replaceMeta(out, "property", "og:title", title);
  out = replaceMeta(out, "property", "og:description", description);
  out = replaceMeta(out, "property", "og:url", `${base}/tienda`);
  out = replaceMeta(out, "name", "twitter:title", title);
  out = replaceMeta(out, "name", "twitter:description", description);
  return setNoscript(out, "Producto no encontrado", description);
}
