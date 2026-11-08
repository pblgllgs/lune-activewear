import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Product } from "@/types/product";

const img = (id: string, w = 1000) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const SIZES = ["XS", "S", "M", "L", "XL"];

/**
 * Catálogo de demostración. Se muestra cuando Firebase no está configurado
 * (o si la lectura falla). Al conectar Firestore, el panel admin reemplaza
 * estos productos por los reales.
 */
export const DEMO_PRODUCTS: Product[] = [
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
    images: [img("photo-1506629082955-511b1aa562c8"), img("photo-1544367567-0f2fcb009e0b")],
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
    images: [img("photo-1518611012118-696072aa579a"), img("photo-1552674605-db6ffd4facb5")],
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
    images: [img("photo-1571019613454-1cb2f99b2d8b"), img("photo-1594381898411-846e7d193883")],
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
    images: [img("photo-1556906781-9a412961c28c"), img("photo-1518310383802-640c2de311b2")],
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
    images: [img("photo-1538805060514-97d9cc17730c"), img("photo-1483721310020-03333e577078")],
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
    images: [img("photo-1548690312-e3b507d8c110"), img("photo-1517836357463-d25dfeac3438")],
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
    images: [img("photo-1523381210434-271e8be1f52b"), img("photo-1503342217505-b0a15ec3261c")],
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
    images: [img("photo-1593079831268-3381b0db4a77"), img("photo-1483985988355-763728e1935b")],
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
    images: [img("photo-1544367567-0f2fcb009e0b"), img("photo-1518310383802-640c2de311b2")],
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
    images: [img("photo-1518611012118-696072aa579a"), img("photo-1594381898411-846e7d193883")],
    isNew: true,
    createdAt: "2026-01-20T10:00:00.000Z",
  },
];

export function normalizeProduct(id: string, data: Record<string, unknown>): Product {
  return {
    id,
    name: String(data.name ?? "Producto"),
    category: String(data.category ?? "otros"),
    price: Number(data.price ?? 0),
    compareAtPrice: data.compareAtPrice ? Number(data.compareAtPrice) : undefined,
    description: String(data.description ?? ""),
    composition: data.composition ? String(data.composition) : undefined,
    care: data.care ? String(data.care) : undefined,
    shipping: data.shipping ? String(data.shipping) : undefined,
    sizes: Array.isArray(data.sizes) ? (data.sizes as string[]) : [],
    colors: Array.isArray(data.colors) ? (data.colors as Product["colors"]) : [],
    images: Array.isArray(data.images) ? (data.images as string[]) : [],
    featured: Boolean(data.featured),
    isNew: Boolean(data.isNew),
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
  };
}

export async function getProducts(): Promise<Product[]> {
  if (!db) return DEMO_PRODUCTS;
  try {
    const snap = await getDocs(collection(db, "products"));
    return snap.docs
      .map((d) => normalizeProduct(d.id, d.data()))
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
    return snap.exists() ? normalizeProduct(snap.id, snap.data()) : null;
  } catch (error) {
    console.warn("No se pudo leer el producto desde Firestore.", error);
    return null;
  }
}
