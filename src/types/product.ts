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
  /** Código SKU generado automáticamente al crear el producto. No cambia al editar. */
  sku?: string;
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
  /**
   * Color asociado a cada foto, por URL (`url → nombre del color`).
   * Si una URL no aparece, la foto se considera sin color y se usa como
   * respaldo para cualquier color (compatibilidad con productos antiguos).
   */
  imageColors?: Record<string, string>;
  featured?: boolean;
  isNew?: boolean;
  /**
   * Si es `false` el producto es un borrador: no aparece en la tienda, ni en la
   * búsqueda, ni en el sitemap, y su ficha responde 404. Solo lo ve el admin.
   * Ausente o `true` = publicado (compatibilidad con el catálogo existente).
   */
  published?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
