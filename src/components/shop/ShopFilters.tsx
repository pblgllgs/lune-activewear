import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { Product } from "@/types/product";
import { SIZE_OPTIONS } from "@/lib/sizes";

/** Tramos de precio de la tienda. `max` es inclusivo. */
export const PRICE_RANGES = [
  { id: "hasta-15", label: "Hasta $15.000", min: 0, max: 14999 },
  { id: "15-18", label: "$15.000 – $18.000", min: 15000, max: 17999 },
  { id: "desde-18", label: "$18.000 o más", min: 18000, max: Number.POSITIVE_INFINITY },
];

interface ShopFiltersProps {
  products: Product[];
  selectedSizes: string[];
  selectedColors: string[];
  priceRange: string;
  resultCount: number;
  onToggleSize: (size: string) => void;
  onToggleColor: (color: string) => void;
  onChangePrice: (id: string) => void;
  onClear: () => void;
}

interface FilterGroupsProps
  extends Omit<ShopFiltersProps, "products" | "resultCount" | "onClear"> {
  sizes: string[];
  colors: { name: string; hex: string }[];
}

const chipClass = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-wider2 transition ${
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-primary/15 bg-card text-foreground hover:border-primary/40"
  }`;

function FilterGroups({
  sizes,
  colors,
  selectedSizes,
  selectedColors,
  priceRange,
  onToggleSize,
  onToggleColor,
  onChangePrice,
}: FilterGroupsProps) {
  return (
    <div className="space-y-6">
      {sizes.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">Talla</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizes.map((size) => {
              const active = selectedSizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => onToggleSize(size)}
                  aria-pressed={active}
                  className={chipClass(active)}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {colors.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">Color</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {colors.map((color) => {
              const active = selectedColors.includes(color.name);
              return (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => onToggleColor(color.name)}
                  aria-pressed={active}
                  className={chipClass(active)}
                >
                  <span
                    className="h-3 w-3 rounded-full border border-primary/20"
                    style={{ backgroundColor: color.hex }}
                  />
                  {color.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">Precio</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRICE_RANGES.map((range) => {
            const active = priceRange === range.id;
            return (
              <button
                key={range.id}
                type="button"
                onClick={() => onChangePrice(range.id)}
                aria-pressed={active}
                className={chipClass(active)}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/**
 * Filtros de la tienda: barra lateral fija en desktop y drawer lateral en móvil.
 */
export function ShopFilters({
  products,
  selectedSizes,
  selectedColors,
  priceRange,
  resultCount,
  onToggleSize,
  onToggleColor,
  onChangePrice,
  onClear,
}: ShopFiltersProps) {
  const [open, setOpen] = useState(false);

  const { sizes, colors } = useMemo(() => {
    const sizeSet = new Set<string>();
    const colorMap = new Map<string, string>();
    products.forEach((product) => {
      product.sizes.forEach((size) => sizeSet.add(size));
      product.colors.forEach((color) => {
        if (color.name && !colorMap.has(color.name)) colorMap.set(color.name, color.hex);
      });
    });

    const sortedSizes = [...sizeSet].sort((a, b) => {
      const ia = SIZE_OPTIONS.indexOf(a);
      const ib = SIZE_OPTIONS.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    return {
      sizes: sortedSizes,
      colors: [...colorMap.entries()].map(([name, hex]) => ({ name, hex })),
    };
  }, [products]);

  const activeCount =
    selectedSizes.length + selectedColors.length + (priceRange ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const groupsProps = {
    sizes,
    colors,
    selectedSizes,
    selectedColors,
    priceRange,
    onToggleSize,
    onToggleColor,
    onChangePrice,
  };

  return (
    <>
      {/* Botón en móvil */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card px-4 py-2 text-[10px] uppercase tracking-wider2 transition hover:border-primary/40 lg:hidden"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filtros
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[9px] text-primary-foreground">
            {activeCount}
          </span>
        )}
      </button>

      {/* Barra lateral en desktop */}
      <aside className="hidden lg:block">
        <div className="sticky top-6">
          <div className="flex items-center justify-between gap-3 border-b pb-3">
            <p className="text-[10px] uppercase tracking-wider2">Filtros</p>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider2 text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
              >
                <X className="h-3 w-3" />
                Limpiar
              </button>
            )}
          </div>
          <div className="mt-4">
            <FilterGroups {...groupsProps} />
          </div>
        </div>
      </aside>

      {/* Drawer en móvil */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filtros">
          <button
            type="button"
            aria-label="Cerrar filtros"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
          />
          <div className="absolute right-0 top-0 flex h-full w-[min(20rem,88vw)] flex-col bg-background shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <p className="text-[11px] uppercase tracking-wider2">
                Filtros
                {activeCount > 0 && (
                  <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[9px] text-primary/70">
                    {activeCount}
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar filtros"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/15 transition hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <FilterGroups {...groupsProps} />
            </div>

            <div className="space-y-2 border-t p-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-md bg-primary px-5 py-2.5 text-[11px] uppercase tracking-wider2 text-primary-foreground"
              >
                Ver {resultCount} producto{resultCount === 1 ? "" : "s"}
              </button>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={onClear}
                  className="w-full rounded-md border border-primary/15 px-5 py-2.5 text-[11px] uppercase tracking-wider2 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
