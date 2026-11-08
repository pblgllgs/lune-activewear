import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ArrowUpRight, RefreshCw, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/ProductCard";
import { SectionHeading } from "@/components/shop/SectionHeading";
import { ImageWithFallback } from "@/components/shop/ImageWithFallback";
import { ContactSection } from "@/components/contact/ContactSection";
import { FaqSection, FAQS } from "@/components/shop/FaqSection";
import { CATEGORIES } from "@/lib/categories";
import { getProducts } from "@/lib/catalog";
import { DEFAULT_SITE_CONTENT, getSiteContent } from "@/lib/site-content";
import { faqJsonLd, useSeo } from "@/lib/seo";
import type { Product } from "@/types/product";

const benefits = [
  {
    icon: Truck,
    title: "Envíos a todo Chile",
    text: "Despacho en 2 a 5 días hábiles y retiro gratis en Chillán.",
  },
  {
    icon: RefreshCw,
    title: "Cambios fáciles",
    text: "Si la talla no es la correcta, la cambiamos sin complicaciones.",
  },
  {
    icon: ShieldCheck,
    title: "Compra segura",
    text: "Coordinamos tu pago y envío de forma directa y personalizada.",
  },
  {
    icon: Sparkles,
    title: "Diseñado en Chile",
    text: "Prendas pensadas para el movimiento y el día a día.",
  },
];

export default function Home() {
  const { hash } = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [content, setContent] = useState(DEFAULT_SITE_CONTENT);

  useSeo({
    title: "LUNÉ Activewear — Ropa deportiva femenina en Chile | Chillán",
    description:
      "Calzas, petos, shorts y poleras diseñados en Chillán, Chile. Ropa deportiva femenina con comodidad y estilo. Compra online y coordina tu pedido por WhatsApp.",
    path: "/",
    jsonLd: faqJsonLd(FAQS),
  });

  useEffect(() => {
    getProducts().then(setProducts);
    getSiteContent().then(setContent);
  }, []);

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.replace("#", ""))?.scrollIntoView({ behavior: "smooth" });
    }
  }, [hash]);

  const featured = useMemo(() => {
    const marked = products.filter((p) => p.featured);
    const rest = products.filter((p) => !p.featured);
    return [...marked, ...rest].slice(0, 4);
  }, [products]);

  return (
    <div>
      {/* Hero */}
      <section className="container py-6 md:py-10">
        <div className="grid overflow-hidden rounded-2xl bg-secondary md:grid-cols-2">
          <div className="order-2 flex flex-col justify-center px-7 py-12 md:order-1 md:px-12 md:py-16 lg:px-16">
            <p className="text-[10px] uppercase tracking-brand text-muted-foreground md:text-[11px]">
              The first collection
            </p>
            <h1 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
              Move with
              <br />
              Luné.
            </h1>
            <p className="mt-4 text-[11px] uppercase tracking-brand text-primary/70">
              Sporty · Feminine · Modern
            </p>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground md:text-base">
              Ropa deportiva femenina diseñada para acompañarte dentro y fuera del gimnasio, con
              comodidad y estilo.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/tienda">
                  Explorar colección <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/nosotros">Conoce Luné</Link>
              </Button>
            </div>
          </div>

          <div className="relative order-1 min-h-[340px] md:order-2 md:min-h-[560px]">
            <ImageWithFallback
              src={content.heroImage}
              alt="Modelo con ropa deportiva LUNÉ"
              priority
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="absolute left-4 top-4 rounded-full bg-background/85 px-3 py-1.5 text-[10px] uppercase tracking-wider2 backdrop-blur">
              Nueva colección
            </span>
            <span className="absolute bottom-4 right-4 text-[9px] uppercase tracking-brand text-primary-foreground/90 drop-shadow">
              LUNÉ · Chillán, Chile
            </span>
          </div>
        </div>
      </section>

      {/* Categorías */}
      <section className="py-16 md:py-24">
        <div className="container">
          <SectionHeading
            eyebrow="Encuentra tu estilo"
            title="Pensado para moverte"
            description="Cuatro esenciales para armar tu outfit deportivo, solos o combinados."
          />

          <div className="mt-10 grid grid-cols-2 gap-3 md:mt-14 md:grid-cols-4 md:gap-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                to={`/tienda?categoria=${cat.id}`}
                className={`group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-xl p-5 transition md:aspect-square md:p-6 ${cat.tint}`}
              >
                <div>
                  <h3 className="font-display text-xl font-medium uppercase tracking-[0.18em] md:text-2xl">
                    {cat.label}
                  </h3>
                  <p className="mt-2 max-w-[16ch] text-xs leading-relaxed text-primary/60 opacity-0 transition group-hover:opacity-100">
                    {cat.blurb}
                  </p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Productos destacados */}
      <section className="pb-16 md:pb-24">
        <div className="container">
          <SectionHeading
            align="left"
            eyebrow="Nuestra colección"
            title="Favoritos de la temporada"
            action={
              <Link
                to="/tienda"
                className="group inline-flex items-center gap-1 text-[11px] uppercase tracking-wider2 underline-offset-4 hover:underline"
              >
                Ver todo
                <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            }
          />

          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:mt-12 md:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Statement de marca */}
      <section className="container">
        <div className="rounded-2xl bg-accent px-6 py-16 text-center md:px-16 md:py-20">
          <p className="text-[10px] uppercase tracking-brand text-primary/60 md:text-[11px]">
            The Luné experience
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-medium leading-tight tracking-tight md:text-5xl">
            Confidence in every move.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-primary/70 md:text-base">
            Prendas para acompañarte dentro y fuera del gimnasio, con comodidad y estilo. Diseñadas
            para sentirte segura en cada movimiento.
          </p>
          <Button asChild variant="outline" className="mt-8 border-primary/30">
            <Link to="/nosotros">
              Conoce nuestra historia <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid gap-8 border-y py-10 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <benefit.icon className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-display text-sm font-medium uppercase tracking-wider2">
                    {benefit.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{benefit.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FaqSection />

      <ContactSection />
    </div>
  );
}
