export type OrderStatus = "pendiente" | "aprobada" | "rechazada" | "pagado" | "enviado";

/** Estados que representan una venta confirmada (stock descontado cuando aplica). */
export const SALE_STATUSES: readonly OrderStatus[] = ["aprobada", "pagado", "enviado"];

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
  /** `true` cuando la venta se confirmó y se descontó el stock. */
  stockApplied: boolean;
  /** Origen de la orden: compra web o registro manual del admin (WhatsApp, etc.). */
  source?: "web" | "manual";
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  paidAt?: string;
  paidBy?: string;
  shippedAt?: string;
  shippedBy?: string;
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

export interface CreateManualOrderInput {
  customer: OrderCustomer;
  items: OrderItem[];
  subtotal?: number;
  coupon?: string;
  notes?: string;
  status: OrderStatus;
  /** Correo del admin que registra la orden. */
  adminEmail: string;
}

export interface UpdateOrderInput {
  customer: OrderCustomer;
  /** Solo se aplica cuando la orden está pendiente. */
  items?: OrderItem[];
  coupon?: string;
  notes?: string;
}
