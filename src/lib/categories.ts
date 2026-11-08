import type { Product } from "@/types/product";

export interface CategoryInfo {
  id: string;
  label: string;
  blurb: string;
  tint: string;
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: "calzas",
    label: "Calzas",
    blurb: "Tiro alto, compresión suave y silueta que acompaña.",
    tint: "bg-accent",
  },
  {
    id: "petos",
    label: "Petos",
    blurb: "Sujeción y comodidad para entrenar sin distracciones.",
    tint: "bg-secondary",
  },
  {
    id: "shorts",
    label: "Shorts",
    blurb: "Libertad de movimiento para tus días más activos.",
    tint: "bg-secondary",
  },
  {
    id: "poleras",
    label: "Poleras",
    blurb: "Capas ligeras para antes y después del gym.",
    tint: "bg-accent",
  },
];

export function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function categoryInfo(id: string) {
  return CATEGORIES.find((c) => c.id === id);
}
