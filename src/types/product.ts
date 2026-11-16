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
  /**
   * Stock por variante (color → talla → unidades).
   * Es la fuente principal de inventario. Si falta una combinación, se considera sin límite.
   */
  stockByVariant?: Record<string, Record<string, number>>;
  /**
   * @deprecated Stock por talla (legado, compartido entre colores).
   * Se mantiene por compatibilidad; al normalizar se convierte a `stockByVariant`.
   */
  stockBySize?: Record<string, number>;
  colors: ProductColor[];
  images: string[];
  /**
   * Color asociado a cada foto, por URL (`url → nombre del color`).
   * Si una URL no aparece, la foto se considera sin color y se usa como
   * respaldo para cualquier color (compatibilidad con productos antiguos).
   */
  imageColors?: Record<string, string>;
  /**
   * Fotos del giro de 180° (frente y espalda) por color, con las mismas claves
   * que `imageColors`. La ficha las muestra como última diapositiva del
   * carrusel. La clave `"*"` aplica a cualquier color.
   */
  spinByColor?: Record<string, { front: string; back: string }>;
  /**
   * Si es `false`, el giro de 180° no se muestra aunque tenga sus dos fotos
   * guardadas (permite ocultarlo sin volver a subirlas). Ausente o `true` =
   * visible cuando `spinByColor` tiene frente y espalda.
   */
  spinEnabled?: boolean;
  featured?: boolean;
  isNew?: boolean;
  /**
   * Si es `false` el producto es un borrador: no aparece en la tienda, ni en la
   * búsqueda, ni en el sitemap, y su ficha responde 404. Solo lo ve el admin.
   * Ausente o `true` = publicado (compatibilidad con el catálogo existente).
   */
  published?: boolean;
  /**
   * Si es `false` el producto está desactivado: no se muestra en la tienda y no
   * puede estar publicado. Ausente o `true` = activo (compatibilidad con el
   * catálogo existente).
   */
  active?: boolean;
  /**
   * Producto de prueba: se gestiona desde el admin, pero no cuenta en las
   * métricas del catálogo (dashboard, inventario ni contador del menú).
   */
  isTest?: boolean;
  /** Promedio de las reseñas aprobadas (0 si aún no hay). */
  ratingAvg?: number;
  /** Cantidad de reseñas aprobadas con calificación. */
  ratingCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
