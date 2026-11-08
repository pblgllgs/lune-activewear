import { useState } from "react";
import { cn } from "@/lib/utils";

interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

/** Imagen con placeholder de marca cuando la URL no carga. */
export function ImageWithFallback({ src, alt, className, fallbackClassName }: ImageWithFallbackProps) {
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
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
