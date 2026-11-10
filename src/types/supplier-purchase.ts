export interface SupplierPurchase {
  id: string;
  supplierId: string;
  /** Fecha de la compra en formato ISO `YYYY-MM-DD`. */
  date: string;
  /** Nombres de los productos comprados (sin cantidades ni costos). */
  productNames: string[];
  /** URL pública del documento adjunto (factura o boleta). */
  documentUrl?: string;
  /** Nombre original del archivo adjunto. */
  documentName?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierPurchaseInput {
  supplierId: string;
  date: string;
  productNames: string[];
  documentUrl?: string;
  documentName?: string;
  notes?: string;
}
