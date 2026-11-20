import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { couponDiscount, couponValidity } from "@/lib/coupons";
import type { Coupon } from "@/types/coupon";

export interface CartItem {
  key: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  size: string;
  color: string;
  qty: number;
  /** Unidades disponibles al agregar (para no superar el stock desde el carrito). */
  stock?: number;
}

/** Cupón aplicado al carrito (datos mínimos para recalcular el descuento). */
export type AppliedCoupon = Pick<
  Coupon,
  "code" | "type" | "value" | "active" | "minPurchase" | "expiresAt" | "description"
>;

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  /** Cupón aplicado actualmente (si es válido para el subtotal). */
  appliedCoupon: AppliedCoupon | null;
  /** Descuento calculado sobre el subtotal según el cupón aplicado. */
  couponDiscountAmount: number;
  /** Motivo por el que el cupón no aplica al subtotal actual (vacío si aplica). */
  couponIssue: string;
  /** Total a pagar (subtotal menos descuento válido). */
  total: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "key" | "qty"> & { qty?: number }) => void;
  removeItem: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  applyCoupon: (coupon: AppliedCoupon) => void;
  clearCoupon: () => void;
}

const STORAGE_KEY = "lune-cart";
const COUPON_KEY = "lune-coupon";

const CartContext = createContext<CartContextValue | null>(null);

function itemKey(productId: string, size: string, color: string) {
  return [productId, size, color].join("|");
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(() => {
    try {
      const raw = localStorage.getItem(COUPON_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<AppliedCoupon>;
      if (!parsed || typeof parsed.code !== "string" || !parsed.code) return null;
      return {
        code: parsed.code,
        type: parsed.type === "fixed" ? "fixed" : "percent",
        value: Math.max(0, Math.round(Number(parsed.value) || 0)),
        active: parsed.active !== false,
        ...(typeof parsed.minPurchase === "number" ? { minPurchase: parsed.minPurchase } : {}),
        ...(typeof parsed.expiresAt === "string" && parsed.expiresAt
          ? { expiresAt: parsed.expiresAt }
          : {}),
        ...(typeof parsed.description === "string" && parsed.description
          ? { description: parsed.description }
          : {}),
      };
    } catch {
      return null;
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [items]);

  useEffect(() => {
    try {
      if (appliedCoupon) localStorage.setItem(COUPON_KEY, JSON.stringify(appliedCoupon));
      else localStorage.removeItem(COUPON_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
  }, [appliedCoupon]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback<CartContextValue["addItem"]>((item) => {
    const key = itemKey(item.productId, item.size, item.color);
    const qty = item.qty ?? 1;
    setItems((current) => {
      const existing = current.find((i) => i.key === key);
      if (existing) {
        const max = typeof existing.stock === "number" ? existing.stock : Number.POSITIVE_INFINITY;
        return current.map((i) =>
          i.key === key ? { ...i, qty: Math.min(max, i.qty + qty) } : i
        );
      }
      const max = typeof item.stock === "number" ? item.stock : Number.POSITIVE_INFINITY;
      return [...current, { ...item, key, qty: Math.min(max, qty) }];
    });
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((current) => current.filter((i) => i.key !== key));
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setItems((current) =>
      current
        .map((i) => {
          if (i.key !== key) return i;
          const max = typeof i.stock === "number" ? i.stock : Number.POSITIVE_INFINITY;
          return { ...i, qty: Math.min(max, Math.max(0, qty)) };
        })
        .filter((i) => i.qty > 0)
    );
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setAppliedCoupon(null);
  }, []);

  const applyCoupon = useCallback((coupon: AppliedCoupon) => {
    setAppliedCoupon(coupon);
  }, []);

  const clearCoupon = useCallback(() => {
    setAppliedCoupon(null);
  }, []);

  const count = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.qty, 0), [items]);

  const couponIssue = useMemo(
    () => (appliedCoupon ? couponValidity(appliedCoupon, subtotal) : ""),
    [appliedCoupon, subtotal]
  );
  const couponDiscountAmount = useMemo(
    () => (appliedCoupon && !couponIssue ? couponDiscount(appliedCoupon, subtotal) : 0),
    [appliedCoupon, couponIssue, subtotal]
  );
  const total = useMemo(
    () => Math.max(0, subtotal - couponDiscountAmount),
    [subtotal, couponDiscountAmount]
  );

  const value = useMemo(
    () => ({
      items,
      count,
      subtotal,
      appliedCoupon: couponIssue ? appliedCoupon : appliedCoupon,
      couponDiscountAmount,
      couponIssue,
      total,
      isOpen,
      openCart,
      closeCart,
      addItem,
      removeItem,
      setQty,
      clear,
      applyCoupon,
      clearCoupon,
    }),
    [
      items,
      count,
      subtotal,
      appliedCoupon,
      couponDiscountAmount,
      couponIssue,
      total,
      isOpen,
      openCart,
      closeCart,
      addItem,
      removeItem,
      setQty,
      clear,
      applyCoupon,
      clearCoupon,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
