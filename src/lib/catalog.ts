import { addDoc, collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeSizeGuide } from "@/lib/size-guide";
import type { Product } from "@/types/product";

const img = (id: number, w = 1000) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const SIZES = ["XS", "S", "M", "L", "XL"];

/**
 * Catálogo de demostración. Se muestra cuando Firebase no está configurado
 * (o si la lectura falla). Al conectar Firestore, el panel admin reemplaza
 * estos productos por los reales.
 */
const DEMO_BASE: Product[] = [
  {
    id: "demo-calza-flare",
    name: "Calza Flare",
    category: "calzas",
    price: 18990,
    compareAtPrice: 22990,
    description:
      "Calza de tiro alto con pierna flare y tela de compresión suave. Realza la silueta y acompaña cada movimiento con total libertad.",
    composition: "78% poliamida · 22% elastano. Forro interior suave al tacto.",
    care: "Lavar a mano o en ciclo frío. No usar blanqueador. Secar a la sombra.",
    shipping: "Despacho a todo Chile en 2 a 5 días hábiles. Retiro gratis en Chillán.",
    sizes: SIZES,
    colors: [
      { name: "Chocolate", hex: "#49372D" },
      { name: "Negro", hex: "#1C1A19" },
    ],
    images: [img(3823086), img(3823039)],
    featured: true,
    isNew: true,
    createdAt: "2026-01-02T10:00:00.000Z",
  },
  {
    id: "demo-calza-seamless",
    name: "Calza Seamless",
    category: "calzas",
    price: 19990,
    description:
      "Tejido seamless de segunda piel con cintura alta y soporte medio. Sin costuras que marquen, ideal para entrenar o para todo el día.",
    composition: "70% nylon reciclado · 30% elastano.",
    care: "Lavar del revés en ciclo suave. No planchar.",
    shipping: "Despacho a todo Chile en 2 a 5 días hábiles.",
    sizes: SIZES,
    colors: [
      { name: "Rosa empolvado", hex: "#EADDE0" },
      { name: "Taupe", hex: "#B9A99C" },
    ],
    images: [img(4498151), img(3764014)],
    featured: true,
    createdAt: "2026-01-04T10:00:00.000Z",
  },
  {
    id: "demo-peto-deportivo",
    name: "Peto Deportivo",
    category: "petos",
    price: 14990,
    description:
      "Peto de sujeción media con espalda deportiva y copas removibles. Diseñado para acompañarte en cada rutina con comodidad y estilo.",
    composition: "75% poliamida · 25% elastano. Copas removibles.",
    care: "Lavar a mano. Secar a la sombra. No retorcer.",
    shipping: "Despacho a todo Chile en 2 a 5 días hábiles.",
    sizes: SIZES,
    colors: [
      { name: "Rosa empolvado", hex: "#EADDE0" },
      { name: "Chocolate", hex: "#49372D" },
    ],
    images: [img(3768916), img(866027)],
    featured: true,
    isNew: true,
    createdAt: "2026-01-06T10:00:00.000Z",
  },
  {
    id: "demo-top-rib",
    name: "Top Rib",
    category: "petos",
    price: 12990,
    description:
      "Top de canalé con escote redondo y tirantes ajustables. Suave, liviano y perfecto para combinar con cualquier calza.",
    composition: "92% algodón · 8% elastano.",
    care: "Lavar en ciclo frío. No usar secadora.",
    shipping: "Despacho a todo Chile en 2 a 5 días hábiles.",
    sizes: ["XS", "S", "M", "L"],
    colors: [
      { name: "Marfil", hex: "#FFFFFF" },
      { name: "Chocolate", hex: "#49372D" },
    ],
    images: [img(4056535), img(4498157)],
    createdAt: "2026-01-08T10:00:00.000Z",
  },
  {
    id: "demo-short-ciclista",
    name: "Short Ciclista",
    category: "shorts",
    price: 13990,
    compareAtPrice: 16990,
    description:
      "Short ciclista de tiro alto con bolsillo lateral invisible. Compresión justa y tejido fresco para entrenamientos intensos.",
    composition: "80% poliamida · 20% elastano.",
    care: "Lavar a máquina en ciclo frío. No planchar.",
    shipping: "Despacho a todo Chile en 2 a 5 días hábiles.",
    sizes: SIZES,
    colors: [
      { name: "Negro", hex: "#1C1A19" },
      { name: "Chocolate", hex: "#49372D" },
    ],
    images: [img(414029), img(4498151)],
    featured: true,
    createdAt: "2026-01-10T10:00:00.000Z",
  },
  {
    id: "demo-short-running",
    name: "Short Running",
    category: "shorts",
    price: 15990,
    description:
      "Short liviano con short interior y cintura elástica. Pensado para correr, caminar y moverte sin límites.",
    composition: "100% poliéster reciclado. Forro interior de malla.",
    care: "Lavar en ciclo suave. Secar al aire.",
    shipping: "Despacho a todo Chile en 2 a 5 días hábiles.",
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Taupe", hex: "#B9A99C" },
      { name: "Crema", hex: "#EEE7DF" },
    ],
    images: [img(866027), img(3764014)],
    createdAt: "2026-01-12T10:00:00.000Z",
  },
  {
    id: "demo-polera-oversize",
    name: "Polera Oversize",
    category: "poleras",
    price: 16990,
    description:
      "Polera oversize de algodón pesado con caída perfecta. Para entrenar o para el después, con el sello de Luné.",
    composition: "100% algodón peinado 240 g.",
    care: "Lavar del revés. No usar secadora.",
    shipping: "Despacho a todo Chile en 2 a 5 días hábiles.",
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Crema", hex: "#EEE7DF" },
      { name: "Blanco", hex: "#FFFFFF" },
    ],
    images: [img(6456301), img(6456299)],
    createdAt: "2026-01-14T10:00:00.000Z",
  },
  {
    id: "demo-polera-manga-larga",
    name: "Polera Manga Larga",
    category: "poleras",
    price: 19990,
    description:
      "Polera manga larga de tejido suave y calce relajado. La capa ideal para entrar y salir del gimnasio con estilo.",
    composition: "95% algodón · 5% elastano.",
    care: "Lavar en ciclo frío. Planchar a baja temperatura.",
    shipping: "Despacho a todo Chile en 2 a 5 días hábiles.",
    sizes: ["S", "M", "L"],
    colors: [
      { name: "Chocolate", hex: "#49372D" },
      { name: "Taupe", hex: "#B9A99C" },
    ],
    images: [img(6456299), img(6456301)],
    featured: true,
    createdAt: "2026-01-16T10:00:00.000Z",
  },
  {
    id: "demo-calza-push-up",
    name: "Calza Push Up",
    category: "calzas",
    price: 17990,
    description:
      "Calza con realce y tiro alto que estiliza la figura. Tela opaca, elástica y cómoda para acompañarte todo el día.",
    composition: "77% poliamida · 23% elastano.",
    care: "Lavar a mano. No usar blanqueador.",
    shipping: "Despacho a todo Chile en 2 a 5 días hábiles.",
    sizes: SIZES,
    colors: [
      { name: "Chocolate", hex: "#49372D" },
      { name: "Negro", hex: "#1C1A19" },
    ],
    images: [img(3823039), img(3823086)],
    createdAt: "2026-01-18T10:00:00.000Z",
  },
  {
    id: "demo-top-cruzado",
    name: "Top Cruzado",
    category: "petos",
    price: 13990,
    description:
      "Top de tirantes cruzados y espalda abierta. Sujeción ligera y un detalle femenino que lo cambia todo.",
    composition: "80% poliamida · 20% elastano.",
    care: "Lavar a mano. Secar a la sombra.",
    shipping: "Despacho a todo Chile en 2 a 5 días hábiles.",
    sizes: ["XS", "S", "M", "L"],
    colors: [
      { name: "Blanco", hex: "#FFFFFF" },
      { name: "Rosa empolvado", hex: "#EADDE0" },
    ],
    images: [img(4498157), img(4056535)],
    isNew: true,
    createdAt: "2026-01-20T10:00:00.000Z",
  },
];

/** El catálogo de ejemplo parte con 5 unidades por color y talla. */
export const DEMO_PRODUCTS: Product[] = DEMO_BASE.map((product) => {
  const colorNames =
    product.colors.map((c) => c.name.trim()).filter(Boolean).length > 0
      ? product.colors.map((c) => c.name.trim()).filter(Boolean)
      : ["Único"];
  return {
    ...product,
    stockByVariant: Object.fromEntries(
      colorNames.map((color) => [
        color,
        Object.fromEntries(product.sizes.map((size) => [size, 5])),
      ])
    ),
  };
});

function normalizeImageColors(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([url, color]) => [url.trim(), typeof color === "string" ? color.trim() : ""] as const)
    .filter(([url, color]) => Boolean(url) && Boolean(color));
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function cleanQty(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : null;
}

function normalizeLegacyStock(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([size, qty]) => [size, cleanQty(qty)] as const)
    .filter((entry): entry is readonly [string, number] => entry[1] !== null);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function normalizeVariantStock(
  value: unknown
): Record<string, Record<string, number>> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const byColor: Record<string, Record<string, number>> = {};
  for (const [rawColor, sizesValue] of Object.entries(value as Record<string, unknown>)) {
    const color = rawColor.trim();
    if (!color || !sizesValue || typeof sizesValue !== "object") continue;
    const bySize: Record<string, number> = {};
    for (const [size, qty] of Object.entries(sizesValue as Record<string, unknown>)) {
      const clean = cleanQty(qty);
      if (clean !== null) bySize[size] = clean;
    }
    if (Object.keys(bySize).length > 0) byColor[color] = bySize;
  }
  return Object.keys(byColor).length > 0 ? byColor : undefined;
}

function expandLegacyStock(
  stockBySize: Record<string, number> | undefined,
  colors: { name: string }[],
  sizes: string[]
): Record<string, Record<string, number>> | undefined {
  if (!stockBySize || Object.keys(stockBySize).length === 0) return undefined;
  const colorNames =
    colors.map((c) => c.name.trim()).filter(Boolean).length > 0
      ? colors.map((c) => c.name.trim()).filter(Boolean)
      : ["Único"];
  const sizeKeys = sizes.length > 0 ? sizes : Object.keys(stockBySize);
  const out: Record<string, Record<string, number>> = {};
  for (const color of colorNames) {
    const bySize: Record<string, number> = {};
    for (const size of sizeKeys) {
      if (stockBySize[size] !== undefined) bySize[size] = stockBySize[size];
    }
    if (Object.keys(bySize).length > 0) out[color] = bySize;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function normalizeProduct(id: string, data: Record<string, unknown>): Product {
  const sizes = Array.isArray(data.sizes) ? (data.sizes as string[]) : [];
  const colors = Array.isArray(data.colors)
    ? (data.colors as Product["colors"])
        .map((color) => ({
          name: String(color?.name ?? "").trim(),
          hex: String(color?.hex ?? ""),
        }))
        .filter((color) => color.name)
    : [];
  const legacyStock = normalizeLegacyStock(data.stockBySize);
  const stockByVariant =
    normalizeVariantStock(data.stockByVariant) ?? expandLegacyStock(legacyStock, colors, sizes);

  return {
    id,
    sku:
      typeof data.sku === "string" && data.sku.trim()
        ? data.sku.trim().toUpperCase()
        : undefined,
    name: String(data.name ?? "Producto"),
    category: String(data.category ?? "otros"),
    price: Number(data.price ?? 0),
    compareAtPrice: data.compareAtPrice ? Number(data.compareAtPrice) : undefined,
    description: String(data.description ?? ""),
    composition: data.composition ? String(data.composition) : undefined,
    care: data.care ? String(data.care) : undefined,
    shipping: data.shipping ? String(data.shipping) : undefined,
    sizes,
    sizeGuide: normalizeSizeGuide(data.sizeGuide),
    stockByVariant,
    stockBySize: legacyStock,
    colors,
    images: Array.isArray(data.images) ? (data.images as string[]) : [],
    imageColors: normalizeImageColors(data.imageColors),
    featured: Boolean(data.featured),
    isNew: Boolean(data.isNew),
    // Sin el campo se considera publicado (catálogo anterior a los borradores).
    published: data.published === undefined ? true : Boolean(data.published),
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
  };
}

/** Un producto sin el campo `published` se considera publicado. */
export function isPublished(product: Product): boolean {
  return product.published !== false;
}

export async function getProducts(): Promise<Product[]> {
  if (!db) return DEMO_PRODUCTS;
  try {
    const snap = await getDocs(collection(db, "products"));
    // Mientras el catálogo real esté vacío se mantiene la vitrina de ejemplo.
    if (snap.empty) return DEMO_PRODUCTS;
    return snap.docs
      .map((d) => normalizeProduct(d.id, d.data()))
      .filter(isPublished)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  } catch (error) {
    console.warn("No se pudo leer Firestore, se usa el catálogo de demostración.", error);
    return DEMO_PRODUCTS;
  }
}

export async function getProduct(id: string): Promise<Product | null> {
  const demo = DEMO_PRODUCTS.find((p) => p.id === id);
  if (demo) return demo;
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, "products", id));
    if (!snap.exists()) return null;
    const product = normalizeProduct(snap.id, snap.data());
    // Los borradores solo existen en el panel admin.
    return isPublished(product) ? product : null;
  } catch (error) {
    console.warn("No se pudo leer el producto desde Firestore.", error);
    return null;
  }
}

/**
 * Copia el catálogo de demostración a Firestore para que el administrador
 * pueda editarlo desde el panel. Devuelve cuántos productos se importaron.
 */
export async function seedDemoProducts(): Promise<number> {
  if (!db) throw new Error("Firebase no está configurado.");

  for (const product of DEMO_PRODUCTS) {
    const data: Record<string, unknown> = { ...product };
    delete data.id;
    await addDoc(collection(db, "products"), {
      ...data,
      createdAt: data.createdAt ?? new Date().toISOString(),
    });
  }

  return DEMO_PRODUCTS.length;
}
