import { Star } from "lucide-react";
import type { Testimonial } from "@/lib/site-content";
import { SectionHeading } from "@/components/shop/SectionHeading";
import { ImageWithFallback } from "@/components/shop/ImageWithFallback";

function Stars({ rating }: { rating?: number }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} de 5 estrellas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? "fill-primary text-primary" : "text-primary/20"}`}
        />
      ))}
    </div>
  );
}

export function TestimonialsSection({
  testimonials,
  showOnHome,
}: {
  testimonials: Testimonial[];
  showOnHome: boolean;
}) {
  const visible = testimonials.filter((t) => t.visible && t.name.trim() && t.text.trim());
  if (!showOnHome || visible.length === 0) return null;

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <SectionHeading
          eyebrow="Lo que dicen"
          title="Comentarios de nuestras clientas"
          description="Experiencias reales con LUNÉ Activewear."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 md:mt-14">
          {visible.map((t) => (
            <article
              key={t.id}
              className="flex flex-col rounded-xl border bg-card p-6 shadow-sm"
            >
              <Stars rating={t.rating} />
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                “{t.text}”
              </p>
              <div className="mt-5 flex items-center gap-3 border-t pt-4">
                {t.photoUrl ? (
                  <ImageWithFallback
                    src={t.photoUrl}
                    alt={t.name}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-medium uppercase text-primary">
                    {t.name.slice(0, 1)}
                  </span>
                )}
                <span className="text-sm font-medium">{t.name}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
