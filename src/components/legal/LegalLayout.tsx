import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export interface LegalSection {
  id: string;
  label: string;
}

/** Sección con título y ancla para las páginas legales. */
export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-border/70 pt-8 first:border-t-0 first:pt-0">
      <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base">
        {children}
      </div>
    </section>
  );
}

/** Tabla simple para datos legales (envíos, plazos, derechos). */
export function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-left text-xs md:text-sm">
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                scope="col"
                className="border-b border-border py-2 pr-4 text-[10px] uppercase tracking-wider2 text-muted-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="align-top">
              {row.map((cell, index) => (
                <td
                  key={`${rowIndex}-${index}`}
                  className="border-b border-border/60 py-3 pr-4 text-muted-foreground"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Estructura común de las páginas legales: índice lateral, contenido y pie.
 * El índice se oculta en móvil para no empujar el texto hacia abajo.
 */
export function LegalLayout({
  eyebrow = "Legal",
  title,
  updated,
  navLabel,
  sections,
  intro,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  updated: string;
  navLabel: string;
  sections: LegalSection[];
  intro?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { hash } = useLocation();

  // La página se carga de forma diferida: el ancla (#cookies, #retracto…) se
  // busca a mano para que el salto funcione al llegar desde otra ruta.
  useEffect(() => {
    if (!hash) return;
    const id = hash.replace("#", "");
    const target = document.getElementById(id);
    if (!target) return;
    const timer = window.setTimeout(
      () => target.scrollIntoView({ behavior: "smooth", block: "start" }),
      80
    );
    return () => window.clearTimeout(timer);
  }, [hash]);

  return (
    <div className="container py-12 md:py-16">
      <div className="grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-16">
        {/* Índice */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-[10px] uppercase tracking-brand text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-xs text-muted-foreground">Última actualización: {updated}</p>

          <nav aria-label={navLabel} className="mt-6 hidden lg:block">
            <ul className="space-y-2 text-xs text-muted-foreground">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="transition hover:text-foreground hover:underline underline-offset-4"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Contenido */}
        <article className="max-w-3xl space-y-8">
          {intro ? (
            <div className="rounded-xl border bg-secondary/40 p-5 md:p-6">{intro}</div>
          ) : null}

          {children}

          {footer ? <div className="rounded-xl bg-secondary/60 p-5 md:p-6">{footer}</div> : null}
        </article>
      </div>
    </div>
  );
}
