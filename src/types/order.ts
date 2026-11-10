export type OrderStatus = "pendiente" | "aprobada" | "rechazada";

export interface OrderItem {
  productId: string;
  name: string;
  image?: string;
  size: string;
  color: string;
  qty: number;
  price: number;
}

export interface OrderCustomer {
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
}

export interface Order {
  id: string;
  code: string;
  status: OrderStatus;
  customer: OrderCustomer;
  /** Correo normalizado (minúsculas) para que la clienta encuentre sus pedidos. */
  customerEmail?: string;
  /** UID de Firebase si la compra se hizo con sesión iniciada. */
  userId?: string;
  items: OrderItem[];
  subtotal: number;
  coupon?: string;
  notes?: string;
  /** `true` cuando un admin aprobó la orden y se descontó el stock. */
  stockApplied: boolean;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
}

export interface CreateOrderInput {
  customer: OrderCustomer;
  items: OrderItem[];
  subtotal: number;
  coupon?: string;
  notes?: string;
  /** UID de la clienta si tiene sesión; ausente en compras de invitada. */
  userId?: string;
}

export interface UpdateOrderInput {
  customer: OrderCustomer;
  /** Solo se aplica cuando la orden está pendiente. */
  items?: OrderItem[];
  coupon?: string;
  notes?: string;
}
