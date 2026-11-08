import { Plus } from "lucide-react";

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQS: FaqItem[] = [
  {
    question: "¿Hacen envíos a todo Chile?",
    answer:
      "Sí. Despachamos a todo Chile en 2 a 5 días hábiles. El envío es gratis en compras sobre $50.000 y también puedes coordinar retiro en Chillán.",
  },
  {
    question: "¿Cómo sé qué talla elegir?",
    answer:
      "Cada ficha muestra las tallas disponibles y las unidades que quedan. Si tienes dudas, escríbenos por WhatsApp y te asesoramos con medidas y calce antes de comprar.",
  },
  {
    question: "¿Puedo cambiar o devolver una prenda?",
    answer:
      "Puedes solicitar un cambio dentro de 15 días con la prenda sin uso y en su estado original. Escríbenos por WhatsApp para coordinar el cambio o la devolución.",
  },
  {
    question: "¿Cómo compro en LUNÉ?",
    answer:
      "Elige tus prendas, agrégalas al carrito y finaliza el pedido por WhatsApp. Coordinamos el pago, el envío o el retiro en Chillán de forma directa y personalizada. No hay pasarela de pago online.",
  },
  {
    question: "¿Dónde están ubicados?",
    answer:
      "Estamos en Chillán, Región de Ñuble, Chile. Enviamos a todo el país y coordinamos retiros en Chillán con cita previa por WhatsApp.",
  },
];

export function FaqSection() {
  return (
    <section id="preguntas" className="scroll-mt-24 py-16 md:py-24">
      <div className="container grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
        <div>
          <p className="text-[10px] uppercase tracking-brand text-muted-foreground md:text-[11px]">
            Preguntas frecuentes
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight md:text-4xl">
            Resolvemos tus dudas
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground md:text-base">
            Envíos, tallas, cambios y compra por WhatsApp. Si te queda algo pendiente, escríbenos y
            te respondemos personalmente.
          </p>
        </div>

        <div className="divide-y border-y">
          {FAQS.map((item) => (
            <details key={item.question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left">
                <h3 className="font-display text-base font-medium md:text-lg">{item.question}</h3>
                <Plus className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-45" />
              </summary>
              <p className="max-w-2xl pb-5 text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
