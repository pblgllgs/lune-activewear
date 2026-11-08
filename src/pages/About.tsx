import { Link } from "react-router-dom";
import { ArrowRight, Heart, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/shop/ImageWithFallback";

const IMAGE_ONE =
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1000&q=80";
const IMAGE_TWO =
  "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1000&q=80";

const values = [
  {
    icon: Heart,
    title: "Diseñado para sentirte bien",
    text: "Elegimos telas suaves, elásticas y opacas que acompañan el cuerpo sin incomodar.",
  },
  {
    icon: Sparkles,
    title: "Detalles femeninos",
    text: "Cortes y colores pensados para que te sientas segura dentro y fuera del gimnasio.",
  },
  {
    icon: Sun,
    title: "Hecho en Chile",
    text: "Nacimos en Chillán y diseñamos pensando en el ritmo y el clima de nuestro país.",
  },
];

export default function About() {
  return (
    <div>
      <section className="container py-12 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[10px] uppercase tracking-brand text-muted-foreground md:text-[11px]">
            Nuestra historia
          </p>
          <h1 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-tight md:text-6xl">
            Nacimos para
            <br />
            moverte.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Luné es una marca de ropa deportiva femenina creada en Chillán, Chile. Nace de las ganas
            de vestir el movimiento con comodidad, delicadeza y estilo.
          </p>
        </div>

        <div className="mt-12 grid gap-3 md:grid-cols-[1.2fr_1fr] md:gap-4">
          <div className="aspect-[4/5] overflow-hidden rounded-xl bg-secondary md:aspect-[5/6]">
            <ImageWithFallback
              src={IMAGE_ONE}
              alt="Mujer entrenando con ropa deportiva"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="grid gap-3 md:gap-4">
            <div className="aspect-[4/3] overflow-hidden rounded-xl bg-secondary">
              <ImageWithFallback
                src={IMAGE_TWO}
                alt="Detalle de ropa deportiva femenina"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-center rounded-xl bg-accent px-6 py-8 md:px-8">
              <p className="text-[10px] uppercase tracking-brand text-primary/60">The Luné experience</p>
              <p className="mt-3 font-display text-2xl leading-snug md:text-3xl">
                Confidence in every move.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-secondary/60 py-16 md:py-24">
        <div className="container grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-[10px] uppercase tracking-brand text-muted-foreground md:text-[11px]">
              Por qué Luné
            </p>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight md:text-4xl">
              Prendas que acompañan, no que limitan.
            </h2>
          </div>
          <div className="space-y-6 text-sm leading-relaxed text-muted-foreground md:text-base">
            <p>
              Creemos que la ropa deportiva no debería obligarte a elegir entre comodidad y estilo.
              Por eso diseñamos cada prenda pensando en cómo se siente: el ajuste, la caída, la tela
              y el movimiento.
            </p>
            <p>
              Trabajamos con paletas cálidas y neutras —porcelana, crema, rosa empolvado, taupe y
              chocolate— para que tus prendas se combinen entre sí y te acompañen más allá del
              entrenamiento.
            </p>
            <p>
              Producimos en cantidades pequeñas y cuidamos cada detalle, desde la elección de la tela
              hasta la atención que recibes cuando nos escribes.
            </p>
          </div>
        </div>
      </section>

      <section className="container py-16 md:py-24">
        <div className="grid gap-6 md:grid-cols-3">
          {values.map((value) => (
            <div key={value.title} className="rounded-xl border bg-card p-6 md:p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary">
                <value.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-display text-lg font-medium">{value.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{value.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 text-center">
          <p className="font-display text-2xl md:text-3xl">¿Lista para moverte con Luné?</p>
          <Button asChild size="lg">
            <Link to="/tienda">
              Ver la colección <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
