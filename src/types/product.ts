export interface ProductColor {
  name: string;
  hex: string;
}

/** Fila de la guía de tallas: rango de medidas del cuerpo en cm. */
export interface SizeGuideRow {
  size: string;
  bustMin: number;
  bustMax: number;
  waistMin: number;
  waistMax: number;
  hipMin: number;
  hipMax: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  description: string;
  composition?: string;
  care?: string;
  shipping?: string;
  sizes: string[];
  /** Medidas de la guía de tallas. Si falta, se usan los valores por defecto. */
  sizeGuide?: SizeGuideRow[];
  /** Unidades disponibles por talla. Si falta una talla, se considera sin límite. */
  stockBySize?: Record<string, number>;
  colors: ProductColor[];
  images: string[];
  featured?: boolean;
  isNew?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
