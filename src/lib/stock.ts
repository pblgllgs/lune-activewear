import type { Product } from "@/types/product";

/**
 * Stock por variante (color + talla).
 *
 * `null` significa que no hay información registrada para esa variante
 * (productos antiguos o sin control de stock): se considera disponible sin límite.
 *
 * Compatibilidad: si el producto solo tiene `stockBySize` (legado), ese valor se
 * toma como stock de la talla para cualquier color.
 */

function cleanNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : null;
}

function colorKey(color?: string): string {
  const key = (color ?? "").trim();
  return key || "Único";
}

/** Nombres de color efectivos del producto (al menos uno). */
export function stockColors(product: Product): string[] {
  const names = (product.colors ?? [])
    .map((c) => c.name?.trim())
    .filter((name): name is string => Boolean(name));
  if (names.length > 0) return names;
  const variantColors = Object.keys(product.stockByVariant ?? {}).filter(Boolean);
  return variantColors.length > 0 ? variantColors : ["Único"];
}

/** Stock de una variante color+talla. `null` = sin límite/no registrado. */
export function variantStock(product: Product, size: string, color?: string): number | null {
  const c = colorKey(color);
  const variant = cleanNumber(product.stockByVariant?.[c]?.[size]);
  if (variant !== null) return variant;
  // Legado: stock por talla compartido entre colores.
  return cleanNumber(product.stockBySize?.[size]);
}

export function isVariantSoldOut(product: Product, size: string, color?: string): boolean {
  return variantStock(product, size, color) === 0;
}

/**
 * Stock disponible para una talla considerando el color seleccionado.
 * Si no se indica color, usa el primer color efectivo (útil para agregados simples).
 */
export function sizeStock(product: Product, size: string, color?: string): number | null {
  const resolved = color ?? stockColors(product)[0];
  return variantStock(product, size, resolved);
}

export function isSizeSoldOut(product: Product, size: string, color?: string): boolean {
  return sizeStock(product, size, color) === 0;
}

/** ¿Queda stock de esta talla en algún color? */
export function hasSizeAvailable(product: Product, size: string): boolean {
  return stockColors(product).some((color) => variantStock(product, size, color) !== 0);
}

/** Suma de unidades registradas en todas las variantes (ignora sin información). */
export function totalStock(product: Product): number {
  let sum = 0;
  const colors = stockColors(product);
  for (const color of colors) {
    for (const size of product.sizes ?? []) {
      const value = variantStock(product, size, color);
      if (value !== null) sum += value;
    }
  }
  // Si no hay tallas definidas, intenta sumar lo que haya en el mapa.
  if ((product.sizes ?? []).length === 0) {
    for (const bySize of Object.values(product.stockByVariant ?? {})) {
      for (const value of Object.values(bySize ?? {})) {
        const n = cleanNumber(value);
        if (n !== null) sum += n;
      }
    }
    if (sum === 0) {
      for (const value of Object.values(product.stockBySize ?? {})) {
        const n = cleanNumber(value);
        if (n !== null) sum += n;
      }
    }
  }
  return sum;
}

/** Agotado solo si todas las combinaciones color+talla registradas están en 0. */
export function isSoldOut(product: Product): boolean {
  const sizes = product.sizes ?? [];
  if (sizes.length === 0) return false;
  const colors = stockColors(product);
  return sizes.every((size) => colors.every((color) => variantStock(product, size, color) === 0));
}

/** Umbral de stock bajo para mostrar "Últimas unidades". */
export const LOW_STOCK_THRESHOLD = 5;
/** Desde este stock hacia abajo se usa el aviso de "Últimas N unidades". */
export const LAST_UNITS_THRESHOLD = 3;

/** Quedan pocas unidades en total (sin contar variantes sin información). */
export function isLowStock(product: Product): boolean {
  const total = totalStock(product);
  return total > 0 && total <= LOW_STOCK_THRESHOLD;
}

/** ¿El color tiene alguna talla disponible? */
export function isColorSoldOut(product: Product, color: string): boolean {
  const sizes = product.sizes ?? [];
  if (sizes.length === 0) return false;
  return sizes.every((size) => variantStock(product, size, color) === 0);
}

/** Primera talla con stock para el color dado (o la primera de la lista). */
export function firstAvailableSize(product: Product, color?: string): string {
  const sizes = product.sizes ?? [];
  const c = color ?? stockColors(product)[0];
  return sizes.find((size) => variantStock(product, size, c) !== 0) ?? sizes[0] ?? "Único";
}

/** Primer color con alguna disponibilidad (o el primero). */
export function firstAvailableColor(product: Product): string {
  const colors = stockColors(product);
  return colors.find((color) => !isColorSoldOut(product, color)) ?? colors[0] ?? "Único";
}
