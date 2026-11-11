import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { getSiteContent } from "@/lib/site-content";
import { listPublishedGuides } from "@/lib/guides";
import { useSeo } from "@/lib/seo";
import type { Guide } from "@/types/guide";

function formatDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
}

export default function Guides() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState<string | undefined>();

  useEffect(() => {
    getSiteContent().then((content) => setImage(content.heroSlides[0]?.url || content.heroImage));
  }, []);

  useEffect(() => {
    listPublishedGuides()
      .then(setGuides)
      .finally(() => setLoading(false));
  }, []);

  useSeo({
    title: "Guías y consejos | LUNÉ Activewear",
    description:
      "Guías de activewear: cómo elegir calzas según tu cuerpo, guía de tallas y outfits para entrenar con comodidad y estilo.",
    path: "/guias",
    image,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Guías y consejos — LUNÉ Activewear",
      description:
        "Guías y consejos de activewear femenino: elección de calzas, tallas y outfits.",
      url: `${window.location.origin}/guias`,
    },
  });

  return (
    <div className="container py-12">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-[10px] uppercase tracking-brand text-muted-foreground">Contenido</p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight">Guías y consejos</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Tips para elegir tu activewear, encontrar tu talla ideal y crear outfits cómodos para entrenar.
        </p>
      </header>

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Cargando guías…</p>
      ) : guides.length === 0 ? (
        <div className="mx-auto mt-10 max-w-md rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          <BookOpen className="mx-auto mb-3 h-6 w-6" />
          <p>Aún no hay guías publicadas. Pronto compartiremos consejos y contenido para ti.</p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <Link
              key={guide.id}
              to={`/guias/${guide.slug || guide.id}`}
              className="group overflow-hidden rounded-xl border bg-card transition hover:border-primary/30 hover:shadow-sm"
            >
              <div className="aspect-[16/10] overflow-hidden bg-secondary">
                {guide.coverImage ? (
                  <img
                    src={guide.coverImage}
                    alt={guide.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <BookOpen className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="p-4">
                {formatDate(guide.publishedAt || guide.updatedAt || guide.createdAt) && (
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {formatDate(guide.publishedAt || guide.updatedAt || guide.createdAt)}
                  </p>
                )}
                <h2 className="mt-1 font-display text-xl font-medium leading-snug group-hover:text-primary">
                  {guide.title}
                </h2>
                {guide.excerpt && (
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{guide.excerpt}</p>
                )}
                <span className="mt-3 inline-block text-[11px] uppercase tracking-wider2 text-primary">
                  Leer guía
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}