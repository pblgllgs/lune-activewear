import type { Product } from "@/types/product";
import { categoryLabel } from "@/lib/categories";

/** Normaliza texto para comparar sin acentos ni mayúsculas. */
export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Comprueba si un producto coincide con la búsqueda. Busca en nombre,
 * categoría, colores y tallas; todos los términos deben aparecer.
 */
export function matchesQuery(product: Product, query: string) {
  const normalized = normalizeText(query);
  if (!normalized) return true;

  const haystack = normalizeText(
    [
      product.name,
      categoryLabel(product.category),
      ...product.colors.map((color) => color.name),
      ...product.sizes,
    ].join(" ")
  );

  return normalized.split(" ").every((term) => haystack.includes(term));
}
