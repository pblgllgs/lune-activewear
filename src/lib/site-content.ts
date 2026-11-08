import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface SiteContent {
  heroImage: string;
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
export const DEFAULT_SITE_CONTENT: SiteContent = {
  heroImage: r2OrFallback(
    "site/hero.jpg",
    "https://images.pexels.com/photos/3823086/pexels-photo-3823086.jpeg?auto=compress&cs=tinysrgb&w=1400"
  ),
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

export async function getSiteContent(): Promise<SiteContent> {
  if (!db) return DEFAULT_SITE_CONTENT;
  try {
    const snap = await getDoc(doc(db, "settings", "site"));
    if (!snap.exists()) return DEFAULT_SITE_CONTENT;
    const data = snap.data();
    return {
      heroImage: text(data.heroImage, DEFAULT_SITE_CONTENT.heroImage),
      aboutImageOne: text(data.aboutImageOne, DEFAULT_SITE_CONTENT.aboutImageOne),
      aboutImageTwo: text(data.aboutImageTwo, DEFAULT_SITE_CONTENT.aboutImageTwo),
      updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
    };
  } catch (error) {
    console.warn("No se pudo leer el contenido del sitio; se usan las imágenes por defecto.", error);
    return DEFAULT_SITE_CONTENT;
  }
}
