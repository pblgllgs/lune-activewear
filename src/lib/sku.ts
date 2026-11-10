import { CATEGORIES } from "@/lib/categories";

/** Código corto por categoría para el SKU. */
const CATEGORY_CODES: Record<string, string> = {
  calzas: "CAL",
  petos: "PET",
  shorts: "SHO",
  poleras: "POL",
};

/** Alfabeto sin caracteres ambiguos (sin 0/O ni 1/I). */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 4;

function categoryCode(category: string): string {
  const known = CATEGORY_CODES[category];
  if (known) return known;
  const fallback = category.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase();
  return fallback || CATEGORIES[0].id.slice(0, 3).toUpperCase();
}

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

/**
 * Genera un SKU legible y estable: `LUN-<CAT>-<4 caracteres>` (p. ej. `LUN-CAL-7K2F`).
 * Se calcula una sola vez al crear el producto y luego se guarda en `products.sku`.
 * `taken` evita repetir un SKU ya usado en el catálogo.
 */
export function generateSku(category: string, taken: Iterable<string> = []): string {
  const used = new Set(Array.from(taken, (sku) => sku.trim().toUpperCase()));
  const prefix = `LUN-${categoryCode(category)}-`;
  for (let attempt = 0; attempt < 50; attempt++) {
    const sku = prefix + randomCode();
    if (!used.has(sku)) return sku;
  }
  // Salida improbable: usa la hora para garantizar unicidad.
  return prefix + Date.now().toString(36).slice(-4).toUpperCase();
}
