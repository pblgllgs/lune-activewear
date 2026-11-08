import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ImageWithFallback } from "@/components/shop/ImageWithFallback";
import { cn } from "@/lib/utils";

interface HeroCarouselProps {
  images: string[];
  alt: string;
  /** Milisegundos entre imágenes. `0` desactiva el avance automático. */
  interval?: number;
  className?: string;
}

/**
 * Carrusel del hero: desplazamiento horizontal con autoplay, flechas, puntos,
 * swipe táctil y navegación con teclado. Se pausa al pasar el mouse o enfocar y
 * respeta `prefers-reduced-motion`.
 */
export function HeroCarousel({ images, alt, interval = 5500, className }: HeroCarouselProps) {
  const slides = images.filter((src) => Boolean(src));
  const count = slides.length;
  const key = slides.join("|");

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count]
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // Mantiene el índice dentro de rango si el admin quita imágenes.
  useEffect(() => {
    if (index > count - 1) setIndex(0);
  }, [count, index]);

  useEffect(() => {
    if (count < 2 || paused || interval <= 0) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => window.clearInterval(id);
  }, [count, paused, interval]);

  // Precarga el resto de las imágenes después del primer render para que la
  // transición no muestre un hueco (la primera entra como LCP con prioridad).
  useEffect(() => {
    if (count < 2) return;
    const sources = key.split("|").slice(1);
    const id = window.setTimeout(() => {
      sources.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    }, 1200);
    return () => window.clearTimeout(id);
  }, [count, key]);

  if (count === 0) {
    return <div className={cn("h-full w-full bg-secondary", className)} aria-hidden />;
  }

  return (
    <div
      className={cn("group relative h-full w-full overflow-hidden bg-secondary", className)}
      role="region"
      aria-roledescription="carrusel"
      aria-label="Fotos de la colección LUNÉ"
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          next();
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          prev();
        }
      }}
      onTouchStart={(event) => {
        touchX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchX.current === null) return;
        const delta = (event.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
        touchX.current = null;
        if (Math.abs(delta) > 40) {
          if (delta < 0) next();
          else prev();
        }
      }}
    >
      <div
        className={cn(
          "flex h-full w-full",
          !reducedMotion && "transition-transform duration-700 ease-out"
        )}
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative h-full w-full shrink-0"
            aria-hidden={i !== index}
          >
            <ImageWithFallback
              src={src}
              alt={alt}
              priority={i === 0}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Imagen anterior"
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/75 text-primary shadow-sm backdrop-blur transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Imagen siguiente"
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/75 text-primary shadow-sm backdrop-blur transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-background/75 px-2.5 py-1.5 shadow-sm backdrop-blur">
            {slides.map((src, i) => (
              <button
                key={`dot-${src}-${i}`}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ir a la imagen ${i + 1} de ${count}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-5 bg-primary" : "w-1.5 bg-primary/35 hover:bg-primary/60"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
