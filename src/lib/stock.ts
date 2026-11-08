import type { Product } from "@/types/product";

/**
 * Stock por talla.
 *
 * `null` significa que el producto no tiene información de stock para esa talla
 * (productos antiguos o demo): se considera disponible sin límite.
 */
export function sizeStock(product: Product, size: string): number | null {
  const value = product.stockBySize?.[size];
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : null;
}

export function isSizeSoldOut(product: Product, size: string): boolean {
  return sizeStock(product, size) === 0;
}

/** Suma de unidades registradas (ignora tallas sin información). */
export function totalStock(product: Product): number {
  return Object.values(product.stockBySize ?? {}).reduce(
    (sum, value) => sum + (Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0),
    0
  );
}

/** Solo está agotado si todas sus tallas tienen stock 0 registrado. */
export function isSoldOut(product: Product): boolean {
  if (product.sizes.length === 0) return false;
  return product.sizes.every((size) => sizeStock(product, size) === 0);
}

/** Primera talla con stock (o la primera de la lista si todas están agotadas). */
export function firstAvailableSize(product: Product): string {
  return product.sizes.find((size) => sizeStock(product, size) !== 0) ?? product.sizes[0] ?? "Único";
}
