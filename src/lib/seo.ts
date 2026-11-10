import { useEffect } from "react";
import type { Product } from "@/types/product";
import { categoryLabel } from "@/lib/categories";
import { isSoldOut } from "@/lib/stock";
import { richTextToPlainText } from "@/lib/rich-text";

export const SITE_NAME = "LUNÉ Activewear";
export const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined) ?? "https://lune-activewear.pages.dev"
).replace(/\/$/, "");
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function truncate(text: string, max = 155) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

type MetaKind = "name" | "property";

function upsertMeta(kind: MetaKind, key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${kind}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(kind, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function removeMeta(kind: MetaKind, key: string) {
  document.head.querySelector<HTMLMetaElement>(`meta[${kind}="${key}"]`)?.remove();
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLd(jsonLd: unknown) {
  const id = "page-jsonld";
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(jsonLd);
}

function removeJsonLd() {
  document.getElementById("page-jsonld")?.remove();
}

export interface SeoOptions {
  title: string;
  description: string;
  /** Ruta canónica relativa al sitio, por ejemplo `/tienda`. */
  path: string;
  /** Imagen para Open Graph/Twitter. Si se omite usa la imagen de marca. */
  image?: string;
  type?: "website" | "product" | "article";
  noindex?: boolean;
  jsonLd?: unknown;
}

/**
 * Actualiza título, descripción, canonical, Open Graph, Twitter y JSON-LD
 * en cada cambio de ruta. Pensado para una SPA sin SSR.
 */
export function useSeo({
  title,
  description,
  path,
  image,
  type = "website",
  noindex = false,
  jsonLd,
}: SeoOptions) {
  const jsonLdString = jsonLd ? JSON.stringify(jsonLd) : "";
  const canonical = absoluteUrl(path);
  const ogImage = image ? absoluteUrl(image) : DEFAULT_OG_IMAGE;

  useEffect(() => {
    // Las páginas estáticas generadas en el build incluyen JSON-LD; al hidratar
    // se reemplaza por la versión dinámica para no duplicar datos estructurados.
    document.getElementById("static-page-jsonld")?.remove();

    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta(
      "name",
      "robots",
      noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large"
    );

    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:locale", "es_CL");
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", ogImage);
    upsertMeta("property", "og:image:alt", title);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", ogImage);
    upsertMeta("name", "twitter:image:alt", title);

    if (ogImage === DEFAULT_OG_IMAGE) {
      upsertMeta("property", "og:image:width", "1200");
      upsertMeta("property", "og:image:height", "630");
    } else {
      removeMeta("property", "og:image:width");
      removeMeta("property", "og:image:height");
    }

    upsertLink("canonical", canonical);

    if (jsonLdString) {
      setJsonLd(JSON.parse(jsonLdString));
    } else {
      removeJsonLd();
    }

    return () => {
      removeJsonLd();
    };
  }, [title, description, canonical, ogImage, type, noindex, jsonLdString]);
}

export function productJsonLd(product: Product) {
  const url = absoluteUrl(`/producto/${product.id}`);
  const soldOut = isSoldOut(product);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: richTextToPlainText(product.description),
    image: product.images.length > 0 ? product.images.map((src) => absoluteUrl(src)) : undefined,
    sku: product.sku || product.id,
    category: categoryLabel(product.category),
    brand: { "@type": "Brand", name: SITE_NAME },
    color: product.colors.map((color) => color.name).join(", ") || undefined,
    size: product.sizes.join(", ") || undefined,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "CLP",
      price: product.price,
      availability: soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function collectionPageJsonLd({
  name,
  description,
  path,
}: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(path),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
