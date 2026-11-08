import type { Product, SizeGuideRow } from "@/types/product";

/**
 * Medidas del cuerpo en centímetros para la guía de tallas. Son los valores por
 * defecto de todos los productos; cada producto puede sobrescribirlos desde
 * Admin → Producto → Guía de tallas.
 */
export const DEFAULT_SIZE_GUIDE: SizeGuideRow[] = [
  { size: "XS", bustMin: 80, bustMax: 84, waistMin: 60, waistMax: 64, hipMin: 86, hipMax: 90 },
  { size: "S", bustMin: 85, bustMax: 89, waistMin: 65, waistMax: 69, hipMin: 91, hipMax: 95 },
  { size: "M", bustMin: 90, bustMax: 94, waistMin: 70, waistMax: 74, hipMin: 96, hipMax: 100 },
  { size: "L", bustMin: 95, bustMax: 99, waistMin: 75, waistMax: 79, hipMin: 101, hipMax: 105 },
  { size: "XL", bustMin: 100, bustMax: 104, waistMin: 80, waistMax: 84, hipMin: 106, hipMax: 110 },
  { size: "XXL", bustMin: 105, bustMax: 109, waistMin: 85, waistMax: 89, hipMin: 111, hipMax: 115 },
];

export function defaultSizeGuide(): SizeGuideRow[] {
  return DEFAULT_SIZE_GUIDE.map((row) => ({ ...row }));
}

/** Convierte a entero en cm, sin negativos. */
const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value === "string") {
    const match = value.replace(",", ".").match(/\d+(?:\.\d+)?/);
    if (match) return Math.max(0, Math.round(Number(match[0])));
  }
  return 0;
};

/**
 * Lee un rango de medidas. Acepta el formato nuevo (`min`/`max` numéricos) y el
 * antiguo (`"80 – 84"`, `82`), para no perder guías ya guardadas.
 */
const toRange = (min: unknown, max: unknown, legacy: unknown): [number, number] => {
  if (min !== undefined || max !== undefined) {
    return [toNumber(min), toNumber(max)];
  }
  if (typeof legacy === "string") {
    const numbers = legacy.replace(/,/g, ".").match(/\d+(?:\.\d+)?/g);
    if (numbers?.length) {
      const from = Math.max(0, Math.round(Number(numbers[0])));
      const to = numbers.length > 1 ? Math.max(0, Math.round(Number(numbers[1]))) : from;
      return [from, to];
    }
    return [0, 0];
  }
  const value = toNumber(legacy);
  return [value, value];
};

/** Valida y limpia la guía guardada en Firestore. */
export function normalizeSizeGuide(value: unknown): SizeGuideRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const size = typeof record.size === "string" ? record.size.trim() : "";
    if (!size) return [];
    const [bustMin, bustMax] = toRange(record.bustMin, record.bustMax, record.bust);
    const [waistMin, waistMax] = toRange(record.waistMin, record.waistMax, record.waist);
    const [hipMin, hipMax] = toRange(record.hipMin, record.hipMax, record.hip);
    return [{ size, bustMin, bustMax, waistMin, waistMax, hipMin, hipMax }];
  });
}

/**
 * Devuelve la guía del producto completando las tallas estándar que falten con
 * los valores por defecto. Así los productos antiguos siguen mostrando la guía.
 */
export function resolveSizeGuide(product: Pick<Product, "sizeGuide">): SizeGuideRow[] {
  const stored = normalizeSizeGuide(product.sizeGuide);
  if (!stored.length) return defaultSizeGuide();
  const bySize = new Map(stored.map((row) => [row.size, row]));
  return DEFAULT_SIZE_GUIDE.map((row) => bySize.get(row.size) ?? { ...row });
}

/** Muestra un rango en cm: "80 – 84", "82" o "—" si está vacío. */
export function formatRange(min: number, max: number): string {
  if (min > 0 && max > 0) return min === max ? String(min) : `${min} – ${max}`;
  if (min > 0) return String(min);
  if (max > 0) return String(max);
  return "—";
}
