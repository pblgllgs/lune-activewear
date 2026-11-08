import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface SiteContent {
  /** Primera imagen del hero. Se mantiene por compatibilidad con el contenido antiguo. */
  heroImage: string;
  /** Imágenes del carrusel del hero, en orden. */
  heroImages: string[];
  aboutImageOne: string;
  aboutImageTwo: string;
  updatedAt?: string;
}

const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL as string | undefined;

const r2OrFallback = (key: string, fallback: string) =>
  WORKER_URL ? `${WORKER_URL}/file/${key}` : fallback;

/**
 * Imágenes por defecto del sitio. Apuntan a R2 (subidas como muestra) y, si R2
 * no está configurado, a las fotos de Pexels originales.
 */
const HERO_FALLBACKS = [
  "https://images.pexels.com/photos/3823086/pexels-photo-3823086.jpeg?auto=compress&cs=tinysrgb&w=1400",
  "https://images.pexels.com/photos/4498606/pexels-photo-4498606.jpeg?auto=compress&cs=tinysrgb&w=1400",
  "https://images.pexels.com/photos/6456303/pexels-photo-6456303.jpeg?auto=compress&cs=tinysrgb&w=1400",
  "https://images.pexels.com/photos/3822906/pexels-photo-3822906.jpeg?auto=compress&cs=tinysrgb&w=1400",
  "https://images.pexels.com/photos/4498157/pexels-photo-4498157.jpeg?auto=compress&cs=tinysrgb&w=1400",
];

export const DEFAULT_HERO_IMAGES: string[] = HERO_FALLBACKS.map((fallback, index) =>
  r2OrFallback(`site/hero-${index + 1}.jpg`, fallback)
);

export const DEFAULT_SITE_CONTENT: SiteContent = {
  heroImage: DEFAULT_HERO_IMAGES[0],
  heroImages: DEFAULT_HERO_IMAGES,
  aboutImageOne: r2OrFallback(
    "site/about-1.jpg",
    "https://images.pexels.com/photos/3822906/pexels-photo-3822906.jpeg?auto=compress&cs=tinysrgb&w=1000"
  ),
  aboutImageTwo: r2OrFallback(
    "site/about-2.jpg",
    "https://images.pexels.com/photos/4498157/pexels-photo-4498157.jpeg?auto=compress&cs=tinysrgb&w=1000"
  ),
};

const text = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value : fallback;

const imageList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item): item is string => Boolean(item));
};

export async function getSiteContent(): Promise<SiteContent> {
  if (!db) return DEFAULT_SITE_CONTENT;
  try {
    const snap = await getDoc(doc(db, "settings", "site"));
    if (!snap.exists()) return DEFAULT_SITE_CONTENT;
    const data = snap.data();

    // `heroImages` manda. Si el documento viene del formato anterior (solo
    // `heroImage`) se usa el carrusel nuevo por defecto: la portada pasó de una
    // imagen única a la colección de slides.
    const stored = imageList(data.heroImages);
    const heroImages = stored.length ? stored : DEFAULT_HERO_IMAGES;

    return {
      heroImage: heroImages[0],
      heroImages,
      aboutImageOne: text(data.aboutImageOne, DEFAULT_SITE_CONTENT.aboutImageOne),
      aboutImageTwo: text(data.aboutImageTwo, DEFAULT_SITE_CONTENT.aboutImageTwo),
      updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
    };
  } catch (error) {
    console.warn("No se pudo leer el contenido del sitio; se usan las imágenes por defecto.", error);
    return DEFAULT_SITE_CONTENT;
  }
}
