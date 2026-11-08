import { useRef } from "react";
import { X } from "lucide-react";
import { DEFAULT_SIZE_GUIDE, formatRange } from "@/lib/size-guide";
import type { SizeGuideRow } from "@/types/product";

interface SizeGuideProps {
  /** Tallas disponibles del producto, para resaltarlas en la tabla. */
  sizes?: string[];
  /** Medidas propias del producto. Si falta, se usan las de por defecto. */
  rows?: SizeGuideRow[];
}

const MEASURES = [
  {
    title: "Busto",
    text: "Alrededor de la parte más prominente, con el centímetro horizontal y sin apretar.",
  },
  {
    title: "Cintura",
    text: "La parte más angosta del torso, a la altura del ombligo.",
  },
  {
    title: "Cadera",
    text: "Alrededor de la parte más ancha de la cadera y los glúteos.",
  },
];

/** Guía de tallas en un modal nativo, con las tallas del producto destacadas. */
export function SizeGuide({ sizes = [], rows }: SizeGuideProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const data = rows?.length ? rows : DEFAULT_SIZE_GUIDE;

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="text-[10px] uppercase tracking-wider2 underline underline-offset-4 hover:text-primary/70"
      >
        Guía de tallas
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="size-guide-title"
        className="fixed inset-0 m-auto h-fit max-h-[90vh] w-[min(92vw,44rem)] overflow-y-auto rounded-2xl border bg-background p-0 text-foreground shadow-xl backdrop:bg-primary/40 backdrop:backdrop-blur-sm"
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-brand text-muted-foreground">
                LUNÉ Activewear
              </p>
              <h2
                id="size-guide-title"
                className="mt-2 font-display text-2xl font-medium tracking-tight md:text-3xl"
              >
                Guía de tallas
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Medidas del cuerpo en centímetros. Si estás entre dos tallas, elige la mayor.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar guía de tallas"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/15 transition hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b text-[10px] uppercase tracking-wider2 text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Talla</th>
                  <th className="py-2 pr-3 font-medium">Busto (cm)</th>
                  <th className="py-2 pr-3 font-medium">Cintura (cm)</th>
                  <th className="py-2 font-medium">Cadera (cm)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => {
                  const available = sizes.includes(row.size);
                  return (
                    <tr
                      key={row.size}
                      className={available ? "bg-accent/70" : "border-b border-primary/5"}
                    >
                      <td className="py-2.5 pr-3 font-medium">
                        {row.size}
                        {available && (
                          <span className="ml-2 rounded-full bg-background/70 px-2 py-0.5 text-[9px] uppercase tracking-wider2 text-primary/60">
                            disponible
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {formatRange(row.bustMin, row.bustMax)}
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {formatRange(row.waistMin, row.waistMax)}
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {formatRange(row.hipMin, row.hipMax)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {MEASURES.map((measure) => (
              <div key={measure.title} className="rounded-lg border border-primary/10 p-3">
                <p className="text-[10px] uppercase tracking-wider2">{measure.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {measure.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg bg-secondary p-4 text-xs leading-relaxed text-primary/70">
            <strong className="font-medium text-primary">Consejo:</strong> para calzas de
            compresión, si prefieres un calce más ajustado elige tu talla habitual; si buscas
            comodidad, sube una talla. Si tienes dudas, escríbenos por WhatsApp y te ayudamos.
          </div>
        </div>
      </dialog>
    </>
  );
}
