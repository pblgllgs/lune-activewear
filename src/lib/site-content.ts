import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_WHATSAPP_NUMBER, normalizeWhatsAppNumber, setWhatsAppNumber } from "@/lib/contact";

export type HeroSlideFit = "cover" | "contain";
export type HeroSlidePosition = "center" | "top" | "bottom";

export interface HeroSlide {
  url: string;
  /** `contain` muestra la foto completa; `cover` rellena el panel y puede recortar. */
  fit: HeroSlideFit;
  /** Punto de la foto que se mantiene visible cuando `fit` es `cover`. */
  position: HeroSlidePosition;
}

export interface SiteContent {
  /** Primera imagen del hero. Se mantiene por compatibilidad con el contenido antiguo. */
  heroImage: string;
  /** URLs de las slides, en orden. Derivado de `heroSlides`. */
  heroImages: string[];
  /** Slides del carrusel con su ajuste de visualización. */
  heroSlides: HeroSlide[];
  aboutImageOne: string;
  aboutImageTwo: string;
  /** Muestra u oculta el enlace "Guías" en el navbar público. */
  guidesEnabled: boolean;
  /** Número de WhatsApp (solo dígitos, para wa.me). */
  whatsappNumber: string;
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

/** Las fotos de la colección se muestran completas por defecto. */
export const DEFAULT_HERO_SLIDES: HeroSlide[] = DEFAULT_HERO_IMAGES.map((url) => ({
  url,
  fit: "contain",
  position: "center",
}));

export const DEFAULT_SITE_CONTENT: SiteContent = {
  heroImage: DEFAULT_HERO_IMAGES[0],
  heroImages: DEFAULT_HERO_IMAGES,
  heroSlides: DEFAULT_HERO_SLIDES,
  aboutImageOne: r2OrFallback(
    "site/about-1.jpg",
    "https://images.pexels.com/photos/3822906/pexels-photo-3822906.jpeg?auto=compress&cs=tinysrgb&w=1000"
  ),
  aboutImageTwo: r2OrFallback(
    "site/about-2.jpg",
    "https://images.pexels.com/photos/4498157/pexels-photo-4498157.jpeg?auto=compress&cs=tinysrgb&w=1000"
  ),
  guidesEnabled: true,
  whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
};

const text = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value : fallback;

const imageList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item): item is string => Boolean(item));
};

const isFit = (value: unknown): value is HeroSlideFit => value === "cover" || value === "contain";
const isPosition = (value: unknown): value is HeroSlidePosition =>
  value === "center" || value === "top" || value === "bottom";

const slideList = (value: unknown): HeroSlide[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const url = typeof record.url === "string" ? record.url.trim() : "";
    if (!url) return [];
    return [
      {
        url,
        fit: isFit(record.fit) ? record.fit : "contain",
        position: isPosition(record.position) ? record.position : "center",
      },
    ];
  });
};

export async function getSiteContent(): Promise<SiteContent> {
  if (!db) {
    setWhatsAppNumber(DEFAULT_SITE_CONTENT.whatsappNumber);
    return DEFAULT_SITE_CONTENT;
  }
  try {
    const snap = await getDoc(doc(db, "settings", "site"));
    if (!snap.exists()) {
      setWhatsAppNumber(DEFAULT_SITE_CONTENT.whatsappNumber);
      return DEFAULT_SITE_CONTENT;
    }
    const data = snap.data();

    // `heroSlides` manda. Los documentos antiguos guardaban `heroImages`
    // (solo URLs) o `heroImage` (una sola foto): en ambos casos se usa el
    // carrusel nuevo por defecto.
    const storedSlides = slideList(data.heroSlides);
    const storedImages = imageList(data.heroImages);
    const heroSlides = storedSlides.length
      ? storedSlides
      : storedImages.length
        ? storedImages.map((url) => ({ url, fit: "contain" as const, position: "center" as const }))
        : DEFAULT_HERO_SLIDES;

    const whatsappNumber =
      normalizeWhatsAppNumber(text(data.whatsappNumber, "")) || DEFAULT_WHATSAPP_NUMBER;
    setWhatsAppNumber(whatsappNumber);

    return {
      heroImage: heroSlides[0].url,
      heroImages: heroSlides.map((slide) => slide.url),
      heroSlides,
      aboutImageOne: text(data.aboutImageOne, DEFAULT_SITE_CONTENT.aboutImageOne),
      aboutImageTwo: text(data.aboutImageTwo, DEFAULT_SITE_CONTENT.aboutImageTwo),
      guidesEnabled: typeof data.guidesEnabled === "boolean" ? data.guidesEnabled : true,
      whatsappNumber,
      updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
    };
  } catch (error) {
    console.warn("No se pudo leer el contenido del sitio; se usan las imágenes por defecto.", error);
    setWhatsAppNumber(DEFAULT_SITE_CONTENT.whatsappNumber);
    return DEFAULT_SITE_CONTENT;
  }
}
