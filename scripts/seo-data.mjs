/**
 * URL de Pages mientras no exista el dominio definitivo. Cualquier aparición de
 * esta cadena en el HTML/TXT del build se reemplaza por SITE_URL, de modo que
 * al comprar el dominio solo haya que cambiar VITE_SITE_URL.
 */
export const PROVISIONAL_URL = "https://lune-activewear.pages.dev";

export const SITE_URL = (
  process.env.VITE_SITE_URL || PROVISIONAL_URL
).replace(/\/$/, "");
export const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || "lune-activewear";
export const TODAY = new Date().toISOString().slice(0, 10);

export const CATEGORIES = ["calzas", "petos", "shorts", "poleras"];

/** Slugs sembrados conocidos, usados si Firestore no responde durante el build. */
export const FALLBACK_PRODUCTS = [
  "calza-flare",
  "calza-seamless",
  "peto-deportivo",
  "top-rib",
  "short-ciclista",
  "short-running",
  "polera-oversize",
  "polera-manga-larga",
  "calza-push-up",
  "top-cruzado",
].map((id) => ({
  id,
  name: "",
  description: "",
  category: "",
  price: 0,
  compareAtPrice: 0,
  sizes: [],
  colors: [],
  images: [],
  soldOut: false,
  published: true,
  lastmod: "",
}));

const str = (field) => field?.stringValue ?? "";
const num = (field) => Number(field?.doubleValue ?? field?.integerValue ?? 0);
const arr = (field) => field?.arrayValue?.values ?? [];
const map = (field) => field?.mapValue?.fields ?? {};

export async function fetchProducts() {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    PROJECT_ID
  )}/databases/(default)/documents/products?pageSize=300`;

  try {
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const docs = Array.isArray(data.documents) ? data.documents : [];

    const all = docs
      .map((doc) => {
        const id = String(doc.name ?? "").split("/").pop() ?? "";
        const fields = doc.fields ?? {};
        const name = str(fields.name);
        const sizes = arr(fields.sizes).map((value) => str(value));
        const stockBySize = map(fields.stockBySize);
        const soldOut =
          sizes.length > 0 &&
          sizes.every((size) => {
            const entry = stockBySize[size];
            return entry ? num(entry) === 0 : false;
          });

        return {
          id,
          name,
          description: str(fields.description),
          category: str(fields.category),
          price: num(fields.price),
          compareAtPrice: num(fields.compareAtPrice),
          sizes,
          colors: arr(fields.colors).map((value) => str(value?.mapValue?.fields?.name)),
          images: arr(fields.images).map((value) => str(value)),
          soldOut,
          // Sin el campo se considera publicado. Los borradores no entran al
          // sitemap ni tienen página estática.
          published: fields.published ? fields.published.booleanValue === true : true,
          lastmod: str(fields.updatedAt || fields.createdAt).slice(0, 10),
        };
      })
      .filter((product) => product.id && product.name.trim().toLowerCase() !== "test");

    if (all.length === 0) throw new Error("catálogo vacío");
    // Los borradores no se publican ni entran al sitemap.
    return all.filter((product) => product.published !== false);
  } catch (error) {
    console.warn(
      `[seo] No se pudo leer Firestore (${error.message}). Se usan los slugs conocidos.`
    );
    return FALLBACK_PRODUCTS;
  }
}

export async function fetchGuides() {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    PROJECT_ID
  )}/databases/(default)/documents/guides?pageSize=300`;

  try {
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const docs = Array.isArray(data.documents) ? data.documents : [];

    return docs
      .map((doc) => {
        const id = String(doc.name ?? "").split("/").pop() ?? "";
        const fields = doc.fields ?? {};
        const published = fields.published ? fields.published.booleanValue === true : false;
        const slug = str(fields.slug) || id;
        return {
          id,
          slug,
          title: str(fields.title),
          excerpt: str(fields.excerpt),
          content: str(fields.content),
          coverImage: str(fields.coverImage),
          published,
          lastmod: str(fields.updatedAt || fields.publishedAt || fields.createdAt).slice(0, 10),
        };
      })
      .filter((guide) => guide.id && guide.title && guide.published !== false);
  } catch (error) {
    console.warn(`[seo] No se pudieron leer guías (${error.message}).`);
    return [];
  }
}

export function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}
