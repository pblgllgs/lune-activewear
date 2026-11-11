import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { getGuideBySlug } from "@/lib/guides";
import { richTextToDisplayHtml } from "@/lib/rich-text";
import { useSeo, SITE_URL } from "@/lib/seo";
import type { Guide } from "@/types/guide";

function formatDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
}

export default function GuideDetail() {
  const { slug } = useParams();
  const [guide, setGuide] = useState<Guide | null | undefined>(undefined);

  useEffect(() => {
    if (!slug) {
      setGuide(null);
      return;
    }
    getGuideBySlug(slug)
      .then((g) => setGuide(g && g.published ? g : null))
      .catch(() => setGuide(null));
  }, [slug]);

  const path = slug ? `/guias/${slug}` : "/guias";
  const title = guide?.title ? `${guide.title} | LUNÉ Activewear` : "Guía | LUNÉ Activewear";
  const description = guide?.excerpt || "Guías y consejos de activewear femenino de LUNÉ.";

  useSeo({
    title,
    description,
    path,
    image: guide?.coverImage,
    type: "article",
    noindex: guide === null,
    jsonLd:
      guide && guide.published
        ? {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: guide.title,
            description: guide.excerpt,
            image: guide.coverImage ? [guide.coverImage] : undefined,
            datePublished: guide.publishedAt || guide.createdAt,
            dateModified: guide.updatedAt || guide.publishedAt || guide.createdAt,
            author: { "@type": "Organization", name: "LUNÉ Activewear" },
            publisher: { "@type": "Organization", name: "LUNÉ Activewear" },
            mainEntityOfPage: `${SITE_URL}${path}`,
          }
        : undefined,
  });

  if (guide === undefined) {
    return <div className="container py-24 text-center text-sm text-muted-foreground">Cargando…</div>;
  }

  if (!guide) {
    return (
      <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-[10px] uppercase tracking-brand text-muted-foreground">Guía</p>
        <h1 className="font-display text-3xl font-medium">Esta guía no está disponible.</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Puede que el enlace haya cambiado o la guía ya no esté publicada.
        </p>
        <Link to="/guias" className="rounded-md bg-primary px-6 py-3 text-[11px] uppercase tracking-wider2 text-primary-foreground">
          Ver guías
        </Link>
      </div>
    );
  }

  const body = richTextToDisplayHtml(guide.content);
  const date = formatDate(guide.publishedAt || guide.updatedAt || guide.createdAt);

  return (
    <article className="container max-w-3xl py-12">
      <Link to="/guias" className="inline-flex items-center gap-1 text-xs uppercase tracking-wider2 text-muted-foreground transition hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> Volver a guías
      </Link>

      <header className="mt-6">
        {date && <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{date}</p>}
        <h1 className="mt-2 font-display text-4xl font-medium leading-tight tracking-tight">{guide.title}</h1>
        {guide.excerpt && <p className="mt-4 text-base text-muted-foreground">{guide.excerpt}</p>}
      </header>

      {guide.coverImage && (
        <div className="mt-8 overflow-hidden rounded-xl border bg-secondary">
          <img src={guide.coverImage} alt={guide.title} className="h-auto w-full object-cover" />
        </div>
      )}

      <div
        className="prose prose-neutral mt-8 max-w-none text-foreground prose-headings:font-display prose-a:text-primary"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </article>
  );
}