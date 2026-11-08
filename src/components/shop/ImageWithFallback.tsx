import { useState } from "react";
import { cn } from "@/lib/utils";

interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  /** Marca la imagen como crítica para LCP (hero, ficha de producto). */
  priority?: boolean;
}

/** Imagen con placeholder de marca cuando la URL no carga. */
export function ImageWithFallback({
  src,
  alt,
  className,
  fallbackClassName,
  priority = false,
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-secondary text-primary/40",
          className,
          fallbackClassName
        )}
        role="img"
        aria-label={alt}
      >
        <span className="font-display text-lg tracking-brand">LUNÉ</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
