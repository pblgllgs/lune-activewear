import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  PROVISIONAL_URL,
  SITE_URL,
  escapeAttr,
  escapeHtml,
  fetchGuides,
  fetchProducts,
} from "./seo-data.mjs";

const dist = path.resolve("dist");
const template = await readFile(path.join(dist, "index.html"), "utf8");
const [products, guides] = await Promise.all([fetchProducts(), fetchGuides()]);

const CATEGORY_LABELS = {
  calzas: "Calzas",
  petos: "Petos",
  shorts: "Shorts",
  poleras: "Poleras",
};

/** Categorías con su texto de portada (para las páginas estáticas). */
const CATEGORY_PAGES = [
  {
    id: "calzas",
    label: "Calzas",
    blurb: "Tiro alto, compresión suave y silueta que acompaña.",
  },
  {
    id: "petos",
    label: "Petos",
    blurb: "Sujeción y comodidad para entrenar sin distracciones.",
  },
  {
    id: "shorts",
    label: "Shorts",
    blurb: "Libertad de movimiento para tus días más activos.",
  },
  {
    id: "poleras",
    label: "Poleras",
    blurb: "Capas ligeras para antes y después del gym.",
  },
];

const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;
const SITE_NAME = "LUNÉ Activewear";

const absolute = (value) =>
  /^https?:\/\//i.test(value)
    ? value
    : `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;

const truncate = (text, max = 155) => {
  const clean = String(text).replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
};

const stripHtml = (value) =>
  String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\\[nr]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function setTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
}

function setMeta(html, attr, key, content) {
  const re = new RegExp(`<meta\\s+${attr}="${key}"[^>]*>`);
  const tag = `<meta ${attr}="${key}" content="${escapeAttr(content)}" />`;
  return re.test(html) ? html.replace(re, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}

function removeMeta(html, attr, key) {
  return html.replace(new RegExp(`\\s*<meta\\s+${attr}="${key}"[^>]*>`), "");
}

function setCanonical(html, href) {
  return html.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${escapeAttr(href)}" />`
  );
}

function setJsonLd(html, jsonLd) {
  const tag = `<script type="application/ld+json" id="static-page-jsonld">${JSON.stringify(
    jsonLd
  )}</script>`;
  const re =
    /<script type="application\/ld\+json" id="static-page-jsonld">[\s\S]*?<\/script>/;
  return re.test(html) ? html.replace(re, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}

function setNoscript(html, heading, description, extra = "") {
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

function applyMeta(html, meta) {
  const image = meta.image ? absolute(meta.image) : DEFAULT_IMAGE;
  let out = setTitle(html, meta.title);
  out = setMeta(out, "name", "description", meta.description);
  out = setMeta(out, "name", "robots", meta.robots ?? "index,follow,max-image-preview:large");
  out = setCanonical(out, meta.canonical);
  out = setMeta(out, "property", "og:type", meta.type ?? "website");
  out = setMeta(out, "property", "og:title", meta.title);
  out = setMeta(out, "property", "og:description", meta.description);
  out = setMeta(out, "property", "og:url", meta.canonical);
  out = setMeta(out, "property", "og:image", image);
  out = setMeta(out, "property", "og:image:alt", meta.title);
  out = setMeta(out, "name", "twitter:title", meta.title);
  out = setMeta(out, "name", "twitter:description", meta.description);
  out = setMeta(out, "name", "twitter:image", image);
  out = setMeta(out, "name", "twitter:image:alt", meta.title);

  if (image === DEFAULT_IMAGE) {
    out = setMeta(out, "property", "og:image:width", "1200");
    out = setMeta(out, "property", "og:image:height", "630");
  } else {
    out = removeMeta(out, "property", "og:image:width");
    out = removeMeta(out, "property", "og:image:height");
  }

  if (meta.jsonLd) out = setJsonLd(out, meta.jsonLd);
  out = setNoscript(out, meta.heading ?? meta.title, meta.description, meta.noscriptExtra ?? "");
  return out;
}

function productJsonLd(product) {
  const url = `${SITE_URL}/producto/${product.id}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map(absolute),
    sku: product.id,
    category: CATEGORY_LABELS[product.category] ?? product.category,
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

function breadcrumbJsonLd(product) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Tienda", item: `${SITE_URL}/tienda` },
      {
        "@type": "ListItem",
        position: 3,
        name: CATEGORY_LABELS[product.category] ?? product.category,
        item: `${SITE_URL}/categoria/${product.category}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: product.name,
        item: `${SITE_URL}/producto/${product.id}`,
      },
    ],
  };
}

async function writePage(route, html) {
  const file = path.join(dist, route.slice(1), "index.html");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html, "utf8");
}

let count = 0;

const shopMeta = {
  title: "Tienda — Calzas, petos, shorts y poleras | LUNÉ Activewear",
  description:
    "Explora calzas, petos, shorts y poleras LUNÉ Activewear. Ropa deportiva femenina diseñada en Chillán, Chile, con envíos a todo el país y compra por WhatsApp.",
  canonical: `${SITE_URL}/tienda`,
  heading: "Nuestra colección",
  jsonLd: {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Tienda LUNÉ Activewear",
    description:
      "Colección de ropa deportiva femenina LUNÉ Activewear: calzas, petos, shorts y poleras.",
    url: `${SITE_URL}/tienda`,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  },
};

const aboutMeta = {
  title: "Nosotros — Ropa deportiva diseñada en Chillán | LUNÉ Activewear",
  description:
    "Conoce LUNÉ Activewear: ropa deportiva femenina nacida en Chillán, Chile. Prendas cómodas, femeninas y modernas, diseñadas para acompañarte dentro y fuera del gimnasio.",
  canonical: `${SITE_URL}/nosotros`,
  heading: "Nacimos para moverte.",
  jsonLd: {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Nosotros — LUNÉ Activewear",
    description:
      "Historia de LUNÉ Activewear, marca de ropa deportiva femenina creada en Chillán, Chile.",
    url: `${SITE_URL}/nosotros`,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  },
};

const privacyMeta = {
  title: "Política de datos y privacidad | LUNÉ Activewear",
  description:
    "Qué datos personales recogemos, para qué los usamos, cuánto tiempo los conservamos y cómo ejercer tus derechos conforme a la Ley 21.719. Incluye el detalle de cookies de la tienda.",
  canonical: `${SITE_URL}/privacidad`,
  heading: "Política de datos y privacidad",
  jsonLd: {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Política de datos y privacidad — LUNÉ Activewear",
    description:
      "Política de tratamiento de datos personales y aviso de cookies de LUNÉ Activewear conforme a la Ley 21.719.",
    url: `${SITE_URL}/privacidad`,
    inLanguage: "es-CL",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  },
};

const guidesMeta = {
  title: "Guías y consejos | LUNÉ Activewear",
  description:
    "Guías de activewear: cómo elegir calzas según tu cuerpo, guía de tallas y outfits para entrenar con comodidad y estilo.",
  canonical: `${SITE_URL}/guias`,
  heading: "Guías y consejos",
  jsonLd: {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Guías y consejos — LUNÉ Activewear",
    description:
      "Guías y consejos de activewear femenino: elección de calzas, tallas y outfits.",
    url: `${SITE_URL}/guias`,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  },
};

const adminMeta = {
  title: "Administración | LUNÉ Activewear",
  description: "Panel privado de administración de LUNÉ Activewear.",
  canonical: `${SITE_URL}/admin`,
  heading: "Administración",
  robots: "noindex,nofollow",
};

await writePage("/tienda", applyMeta(template, shopMeta));
count += 1;

for (const category of CATEGORY_PAGES) {
  const path = `/categoria/${category.id}`;
  await writePage(
    path,
    applyMeta(template, {
      title: `${category.label} — Tienda | LUNÉ Activewear`,
      description: `${category.blurb} Descubre nuestra colección de ${category.label.toLowerCase()} LUNÉ Activewear, diseñada en Chillán, Chile, con envíos a todo el país.`,
      canonical: `${SITE_URL}${path}`,
      heading: category.label,
      noscriptExtra: `<p>${escapeHtml(category.blurb)}</p>`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${category.label} — LUNÉ Activewear`,
        description: `${category.blurb} Colección de ${category.label.toLowerCase()} LUNÉ Activewear.`,
        url: `${SITE_URL}${path}`,
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
      },
    })
  );
  count += 1;
}

await writePage("/nosotros", applyMeta(template, aboutMeta));
count += 1;
await writePage("/privacidad", applyMeta(template, privacyMeta));
count += 1;
await writePage("/guias", applyMeta(template, guidesMeta));
count += 1;
await writePage("/admin", applyMeta(template, adminMeta));
count += 1;

for (const product of products) {
  if (!product.name) continue;

  const category = CATEGORY_LABELS[product.category] ?? product.category;
  const title = `${product.name} — ${category} | LUNÉ Activewear`;
  const description = truncate(
    stripHtml(product.description) ||
      `${product.name} de LUNÉ Activewear. Ropa deportiva femenina diseñada en Chillán, Chile.`
  );
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

  await writePage(
    `/producto/${product.id}`,
    applyMeta(template, {
      title,
      description,
      canonical: `${SITE_URL}/producto/${product.id}`,
      image: product.images[0],
      type: "product",
      heading: product.name,
      noscriptExtra: extra,
      jsonLd: [productJsonLd(product), breadcrumbJsonLd(product)],
    })
  );
  count += 1;
}

for (const guide of guides) {
  if (!guide.title) continue;
  const slug = guide.slug || guide.id;
  const title = `${guide.title} | LUNÉ Activewear`;
  const description = truncate(
    stripHtml(guide.excerpt || guide.content) ||
      `${guide.title}. Guía de activewear femenino de LUNÉ.`
  );
  const canonical = `${SITE_URL}/guias/${slug}`;
  const noscriptExtra = guide.excerpt ? `<p>${escapeHtml(guide.excerpt)}</p>` : "";
  await writePage(
    `/guias/${slug}`,
    applyMeta(template, {
      title,
      description,
      canonical,
      image: guide.coverImage || undefined,
      type: "article",
      heading: guide.title,
      noscriptExtra,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: guide.title,
        description,
        image: guide.coverImage ? [guide.coverImage] : undefined,
        author: { "@type": "Organization", name: SITE_NAME },
        publisher: { "@type": "Organization", name: SITE_NAME },
        mainEntityOfPage: canonical,
      },
    })
  );
  count += 1;
}

console.log(`[seo-pages] ${count} páginas estáticas generadas en ${dist}`);

// Reglas explícitas para servir las páginas con meta propio. Las rutas no
// listadas (productos nuevos, 404) las resuelve el fallback SPA de Pages:
// sin un 404.html propio, Pages sirve el index.html raíz en rutas sin asset.
const redirects = [
  "/tienda /tienda/index.html 200",
  "/nosotros /nosotros/index.html 200",
  "/privacidad /privacidad/index.html 200",
  "/guias /guias/index.html 200",
  "/admin /admin/index.html 200",
  ...CATEGORY_PAGES.map(
    (category) => `/categoria/${category.id} /categoria/${category.id}/index.html 200`
  ),
  ...products
    .filter((product) => product.name)
    .map((product) => `/producto/${product.id} /producto/${product.id}/index.html 200`),
  ...guides
    .filter((guide) => guide.title)
    .map((guide) => `/guias/${guide.slug || guide.id} /guias/${guide.slug || guide.id}/index.html 200`),
].join("\n");

await writeFile(path.join(dist, "_redirects"), `${redirects}\n`, "utf8");
console.log(`[seo-pages] _redirects con ${redirects.split("\n").length} reglas`);

// Rutas que invocan las Pages Functions (edge). El resto se sirve como asset
// estático y no consume invocaciones de Functions.
const routes = {
  version: 1,
  include: ["/producto/*", "/guias/*", "/sitemap.xml"],
  exclude: [],
};
await writeFile(path.join(dist, "_routes.json"), `${JSON.stringify(routes, null, 2)}\n`, "utf8");
console.log("[seo-pages] _routes.json: solo /producto/*, /guias/* y /sitemap.xml invocan Functions");

// La URL del sitio es provisoria hasta comprar el dominio. Se reescribe en el
// build (index.html, robots.txt y páginas generadas) para que el cambio dependa
// solo de VITE_SITE_URL.
async function replaceProvisionalUrl(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  let replaced = 0;

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      replaced += await replaceProvisionalUrl(full);
      continue;
    }
    if (!/\.(html|txt|xml)$/i.test(entry.name)) continue;

    const content = await readFile(full, "utf8");
    if (!content.includes(PROVISIONAL_URL)) continue;

    await writeFile(full, content.split(PROVISIONAL_URL).join(SITE_URL), "utf8");
    replaced += 1;
  }

  return replaced;
}

if (SITE_URL !== PROVISIONAL_URL) {
  const replaced = await replaceProvisionalUrl(dist);
  console.log(`[seo-pages] URL provisoria reemplazada por ${SITE_URL} en ${replaced} archivos`);
} else {
  console.log("[seo-pages] VITE_SITE_URL sin dominio definitivo: se mantiene la URL provisoria");
}
