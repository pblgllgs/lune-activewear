import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { FREE_SHIPPING_THRESHOLD, whatsappLink } from "@/lib/constants";
import { formatCLP } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/shop/ImageWithFallback";

export function CartDrawer() {
  const { items, count, subtotal, isOpen, closeCart, removeItem, setQty } = useCart();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  const checkout = () => {
    const lines = [
      "Hola Luné! Quiero hacer un pedido:",
      "",
      ...items.map(
        (i, index) =>
          `${index + 1}. ${i.name} — Talla ${i.size} · ${i.color} × ${i.qty} — ${formatCLP(i.price * i.qty)}`
      ),
      "",
      `Subtotal: ${formatCLP(subtotal)}`,
      "",
      "Nombre:",
      "Dirección de envío:",
      "Comuna / Ciudad:",
    ];
    window.open(whatsappLink(lines.join("\n")), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Carrito de compras">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default bg-primary/40 backdrop-blur-sm"
        onClick={closeCart}
        aria-label="Cerrar carrito"
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            <h2 className="font-display text-lg">Tu carrito ({count})</h2>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-secondary"
            aria-label="Cerrar carrito"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <ShoppingBag className="h-7 w-7 text-muted-foreground" />
            </span>
            <div>
              <p className="font-display text-xl">Tu carrito está vacío</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Encuentra tu próxima prenda favorita en la colección.
              </p>
            </div>
            <Button asChild onClick={closeCart}>
              <Link to="/tienda">Ver la colección</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b px-5 py-3">
              {remaining > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Te faltan <span className="font-medium text-foreground">{formatCLP(remaining)}</span> para
                  el envío gratis.
                </p>
              ) : (
                <p className="text-xs font-medium text-primary">¡Tienes envío gratis! 🎉</p>
              )}
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="divide-y">
                {items.map((item) => (
                  <li key={item.key} className="flex gap-3 py-4">
                    <Link to={`/producto/${item.productId}`} onClick={closeCart} className="shrink-0">
                      <ImageWithFallback
                        src={item.image}
                        alt={item.name}
                        className="h-24 w-20 rounded-md object-cover"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm font-medium">{item.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Talla {item.size} · {item.color}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          className="text-muted-foreground transition hover:text-destructive"
                          aria-label={`Quitar ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-md border">
                          <button
                            type="button"
                            onClick={() => setQty(item.key, item.qty - 1)}
                            className="flex h-8 w-8 items-center justify-center transition hover:bg-secondary"
                            aria-label="Restar unidad"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-7 text-center text-xs">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => setQty(item.key, item.qty + 1)}
                            disabled={typeof item.stock === "number" && item.qty >= item.stock}
                            className="flex h-8 w-8 items-center justify-center transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Sumar unidad"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-sm font-medium">{formatCLP(item.price * item.qty)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t bg-card px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-display text-xl">{formatCLP(subtotal)}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Envío calculado al confirmar el pedido por WhatsApp.
              </p>
              <Button className="mt-4 w-full" onClick={checkout}>
                Finalizar compra por WhatsApp
              </Button>
              <button
                type="button"
                onClick={closeCart}
                className="mt-3 w-full text-center text-[11px] uppercase tracking-wider2 text-muted-foreground underline-offset-4 hover:underline"
              >
                Seguir comprando
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
