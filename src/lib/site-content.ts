import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type HeroSlideFit = "cover" | "contain";
export type HeroSlidePosition = "center" | "top" | "bottom";

export interface HeroSlide {
  url: string;
  /** `contain` muestra la foto completa; `cover` rellena el panel y puede recortar. */
  fit: HeroSlideFit;
  /** Punto de la foto que se mantiene visible cuando `fit` es `cover`. */
  position: HeroSlidePosition;
}

export interface Testimonial {
  id: string;
  name: string;
  text: string;
  /** 1–5 estrellas. Opcional. */
  rating?: number;
  /** URL de foto/avatar (opcional). */
  photoUrl?: string;
  /** Si es `false`, el testimonio existe pero no se muestra. */
  visible: boolean;
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
  /** Testimonios/comentarios de clientas. */
  testimonials: Testimonial[];
  /** Si es `false`, la sección de testimonios se oculta en el inicio. */
  showTestimonialsOnHome: boolean;
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
  testimonials: [],
  showTestimonialsOnHome: true,
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

const testimonialList = (value: unknown): Testimonial[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const textValue = typeof record.text === "string" ? record.text.trim() : "";
    if (!name || !textValue) return [];
    const rating =
      typeof record.rating === "number" && Number.isFinite(record.rating)
        ? Math.min(5, Math.max(1, Math.round(record.rating)))
        : undefined;
    const photoUrl =
      typeof record.photoUrl === "string" && record.photoUrl.trim() ? record.photoUrl.trim() : undefined;
    return [
      {
        id: typeof record.id === "string" && record.id.trim() ? record.id.trim() : `t-${index}`,
        name,
        text: textValue,
        ...(rating ? { rating } : {}),
        ...(photoUrl ? { photoUrl } : {}),
        visible: record.visible !== false,
      },
    ];
  });
};

export async function getSiteContent(): Promise<SiteContent> {
  if (!db) return DEFAULT_SITE_CONTENT;
  try {
    const snap = await getDoc(doc(db, "settings", "site"));
    if (!snap.exists()) return DEFAULT_SITE_CONTENT;
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

    return {
      heroImage: heroSlides[0].url,
      heroImages: heroSlides.map((slide) => slide.url),
      heroSlides,
      aboutImageOne: text(data.aboutImageOne, DEFAULT_SITE_CONTENT.aboutImageOne),
      aboutImageTwo: text(data.aboutImageTwo, DEFAULT_SITE_CONTENT.aboutImageTwo),
      testimonials: testimonialList(data.testimonials),
      showTestimonialsOnHome: data.showTestimonialsOnHome !== false,
      updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
    };
  } catch (error) {
    console.warn("No se pudo leer el contenido del sitio; se usan las imágenes por defecto.", error);
    return DEFAULT_SITE_CONTENT;
  }
}
