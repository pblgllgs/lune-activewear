export interface SupplierPurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
}

export interface SupplierPurchase {
  id: string;
  supplierId: string;
  /** Fecha de la compra en formato ISO `YYYY-MM-DD`. */
  date: string;
  items: SupplierPurchaseItem[];
  /** Costo total calculado: Σ cantidad × costo unitario. */
  total: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierPurchaseInput {
  supplierId: string;
  date: string;
  items: SupplierPurchaseItem[];
  notes?: string;
}
