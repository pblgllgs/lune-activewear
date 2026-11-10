export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  /** IDs de los productos que provee. */
  productIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierInput {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  productIds: string[];
}
