import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { Product } from "@/types/product";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import { SIZE_OPTIONS } from "@/lib/sizes";
import { hasSizeAvailable, isColorSoldOut } from "@/lib/stock";

/** Tramo de precio de la tienda. `max` es inclusivo. */
export const PRICE_RANGES = [
  { id: "hasta-15", label: "Hasta $15.000", min: 0, max: 14999 },
  { id: "15-18", label: "$15.000 – $18.000", min: 15000, max: 17999 },
  { id: "desde-18", label: "$18.000 o más", min: 18000, max: Number.POSITIVE_INFINITY },
];

/**
 * Color seleccionado en los filtros. `category` vacía significa una selección
 * antigua (o global) que aplica a todas las categorías.
 */
export interface SelectedColor {
  category: string;
  name: string;
}

interface ShopFiltersProps {
  products: Product[];
  /** Categoría activa (`todas` = sin filtro): define qué colores se muestran. */
  activeCategory: string;
  selectedSizes: string[];
  selectedColors: SelectedColor[];
  priceRange: string;
  resultCount: number;
  onToggleSize: (size: string) => void;
  onToggleColor: (category: string, color: string) => void;
  onChangePrice: (id: string) => void;
  onClear: () => void;
}

interface ColorGroup {
  id: string;
  label: string;
  colors: { name: string; hex: string; available: boolean }[];
}

interface FilterGroupsProps
  extends Omit<
    ShopFiltersProps,
    "products" | "activeCategory" | "resultCount" | "onClear"
  > {
  sizes: { name: string; available: boolean }[];
  colorGroups: ColorGroup[];
}

const chipClass = (active: boolean, disabled = false) =>
  `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-wider2 transition ${
    disabled
      ? "cursor-not-allowed border-dashed border-primary/15 bg-card text-muted-foreground/50"
      : active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-primary/15 bg-card text-foreground hover:border-primary/40"
  }`;

function FilterGroups({
  sizes,
  colorGroups,
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
            {sizes.map(({ name, available }) => {
              const active = selectedSizes.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onToggleSize(name)}
                  aria-pressed={active}
                  disabled={!available}
                  title={available ? undefined : "Sin stock"}
                  className={chipClass(active, !available)}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {colorGroups.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">Color</p>
          <div className="mt-2 space-y-3">
            {colorGroups.map((group) => (
              <div key={group.id}>
                {colorGroups.length > 1 && (
                  <p className="mb-1.5 text-[9px] uppercase tracking-wider2 text-muted-foreground/80">
                    {group.label}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {group.colors.map((color) => {
                    const active = selectedColors.some(
                      (selection) =>
                        selection.name === color.name &&
                        (selection.category === "" || selection.category === group.id)
                    );
                    return (
                      <button
                        key={`${group.id}-${color.name}`}
                        type="button"
                        onClick={() => onToggleColor(group.id, color.name)}
                        aria-pressed={active}
                        disabled={!color.available}
                        title={color.available ? undefined : "Sin stock"}
                        className={chipClass(active, !color.available)}
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
              </div>
            ))}
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
  activeCategory,
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

  const { sizes, colorGroups } = useMemo(() => {
    // La disponibilidad se calcula solo con las prendas de la categoría activa:
    // una talla o color sin stock en esa categoría se muestra deshabilitado.
    const scope =
      activeCategory === "todas"
        ? products
        : products.filter((product) => product.category === activeCategory);

    const sizeSet = new Set<string>();
    const availableSizeSet = new Set<string>();
    const byCategory = new Map<string, Map<string, { hex: string; available: boolean }>>();

    scope.forEach((product) => {
      product.sizes.forEach((size) => {
        sizeSet.add(size);
        if (hasSizeAvailable(product, size)) availableSizeSet.add(size);
      });
      if (!byCategory.has(product.category)) byCategory.set(product.category, new Map());
      const colorMap = byCategory.get(product.category)!;
      product.colors.forEach((color) => {
        if (!color.name) return;
        const available = !isColorSoldOut(product, color.name);
        const current = colorMap.get(color.name);
        if (!current) colorMap.set(color.name, { hex: color.hex, available });
        else if (available) current.available = true;
      });
    });

    const sortedSizes = [...sizeSet]
      .sort((a, b) => {
        const ia = SIZE_OPTIONS.indexOf(a);
        const ib = SIZE_OPTIONS.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .map((name) => ({ name, available: availableSizeSet.has(name) }));

    // Orden de las categorías del sitio; cualquier categoría desconocida va al final.
    const knownIds = CATEGORIES.map((category) => category.id);
    const ids =
      activeCategory === "todas"
        ? [...byCategory.keys()].sort((a, b) => {
            const ia = knownIds.indexOf(a);
            const ib = knownIds.indexOf(b);
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
          })
        : [activeCategory];

    const groups = ids
      .map((id) => ({
        id,
        label: categoryLabel(id),
        colors: [...(byCategory.get(id)?.entries() ?? [])].map(([name, value]) => ({
          name,
          hex: value.hex,
          available: value.available,
        })),
      }))
      .filter((group) => group.colors.length > 0);

    return { sizes: sortedSizes, colorGroups: groups };
  }, [products, activeCategory]);

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
    colorGroups,
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
