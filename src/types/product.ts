export interface ProductColor {
  name: string;
  hex: string;
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
  /** Unidades disponibles por talla. Si falta una talla, se considera sin límite. */
  stockBySize?: Record<string, number>;
  colors: ProductColor[];
  images: string[];
  featured?: boolean;
  isNew?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
