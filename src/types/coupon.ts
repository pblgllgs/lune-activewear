/** Tipos de descuento disponibles para los cupones. */
export type CouponType = "percent" | "fixed";

export interface Coupon {
  id: string;
  /** Código normalizado en mayúsculas (ej. `LUNE10`). */
  code: string;
  type: CouponType;
  /** Porcentaje (1–100) o monto fijo en pesos, según `type`. */
  value: number;
  active: boolean;
  /** Compra mínima (subtotal) para que el cupón aplique. */
  minPurchase?: number;
  /** Último día de vigencia en formato `YYYY-MM-DD`. */
  expiresAt?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CouponInput {
  code: string;
  type: CouponType;
  value: number;
  active: boolean;
  minPurchase?: number;
  expiresAt?: string;
  description?: string;
}

/** Estadísticas de uso de un cupón, calculadas desde las órdenes. */
export interface CouponUsage {
  uses: number;
  discountTotal: number;
  salesTotal: number;
  lastUsedAt?: string;
}
