import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { useContact } from "@/lib/use-contact";
import { isFirebaseConfigured } from "@/lib/firebase";
import { createOrder } from "@/lib/orders";
import { formatCLP } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageWithFallback } from "@/components/shop/ImageWithFallback";

type CustomerForm = {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  notes: string;
};

function emptyCustomer(): CustomerForm {
  return { name: "", phone: "", email: "", address: "", city: "", notes: "" };
}

export function CartDrawer() {
  const { items, count, subtotal, isOpen, closeCart, removeItem, setQty, clear } = useCart();
  const { user } = useAuth();
  const { whatsappLink } = useContact();
  const [coupon, setCoupon] = useState("");
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [customer, setCustomer] = useState<CustomerForm>(emptyCustomer);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Si la clienta tiene sesión, su correo ya viene escrito.
  useEffect(() => {
    if (!isOpen || !user?.email) return;
    setCustomer((current) =>
      current.email ? current : { ...current, email: user.email ?? "" }
    );
  }, [isOpen, user?.email]);

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

  useEffect(() => {
    if (!isOpen) setStep("cart");
  }, [isOpen]);

  useEffect(() => {
    if (items.length === 0) setStep("cart");
  }, [items.length]);

  if (!isOpen) return null;

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  const update = (field: keyof CustomerForm, value: string) => {
    setCustomer((current) => ({ ...current, [field]: value }));
    if (error) setError("");
  };

  const validate = (): string => {
    if (customer.name.trim().length < 2) return "Escribe tu nombre completo.";
    if (customer.phone.replace(/\D/g, "").length < 8) return "Escribe un teléfono de contacto válido.";
    if (!/^\S+@\S+\.\S+$/.test(customer.email.trim()))
      return "Escribe un correo válido: ahí verás tu pedido.";
    if (customer.address.trim().length < 4) return "Escribe tu dirección de envío.";
    if (customer.city.trim().length < 2) return "Indica tu comuna o ciudad.";
    return "";
  };

  const buildMessage = (code?: string): string => {
    const lines = [
      code ? `🛍️ Nueva orden ${code}` : "Hola LUNÉ! Quiero hacer un pedido:",
      "",
      ...items.map(
        (item, index) =>
          `${index + 1}. ${item.name} — Talla ${item.size} · ${item.color} × ${item.qty} — ${formatCLP(item.price * item.qty)}`
      ),
      "",
      `Subtotal: ${formatCLP(subtotal)}`,
      ...(coupon.trim() ? [`Cupón: ${coupon.trim()}`, "(validar descuento, por favor)"] : []),
      "",
      `Clienta: ${customer.name.trim()}`,
      `Teléfono: ${customer.phone.trim()}`,
      ...(customer.email.trim() ? [`Email: ${customer.email.trim()}`] : []),
      `Dirección: ${customer.address.trim()}`,
      `Comuna / Ciudad: ${customer.city.trim()}`,
      ...(customer.notes.trim() ? ["", `Notas: ${customer.notes.trim()}`] : []),
      "",
      code
        ? "La orden quedó registrada y está pendiente de aprobación en el panel."
        : "Pedido enviado por WhatsApp (sin registro en el panel).",
    ];
    return lines.join("\n");
  };

  const submitOrder = async () => {
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    setError("");
    setSubmitting(true);
    // Se abre una pestaña vacía de inmediato para que el navegador no bloquee el
    // enlace después del await.
    const win = window.open("", "_blank");

    try {
      let code: string | undefined;

      if (isFirebaseConfigured) {
        const order = await createOrder({
          customer: {
            name: customer.name.trim(),
            phone: customer.phone.trim(),
            email: customer.email.trim() || undefined,
            address: customer.address.trim(),
            city: customer.city.trim(),
          },
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            image: item.image || undefined,
            size: item.size,
            color: item.color,
            qty: item.qty,
            price: item.price,
          })),
          subtotal,
          coupon: coupon.trim() || undefined,
          notes: customer.notes.trim() || undefined,
          userId: user?.uid,
        });
        code = order.code;
      }

      const link = whatsappLink(buildMessage(code));
      if (win && !win.closed) {
        win.opener = null;
        win.location.href = link;
      } else {
        const fallback = window.open(link, "_blank");
        if (!fallback) window.location.href = link;
      }

      clear();
      setCustomer(emptyCustomer());
      setCoupon("");
      setStep("cart");
      closeCart();
      toast.success(
        code
          ? `Orden ${code} registrada. Está pendiente de aprobación.`
          : "Pedido enviado por WhatsApp."
      );
    } catch (err) {
      if (win && !win.closed) win.close();
      setError(err instanceof Error ? err.message : "No se pudo registrar la orden.");
    } finally {
      setSubmitting(false);
    }
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
            <h2 className="font-display text-lg">
              {step === "checkout" ? "Datos del pedido" : `Tu carrito (${count})`}
            </h2>
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
        ) : step === "cart" ? (
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
              <div className="mt-4">
                <label
                  htmlFor="coupon"
                  className="text-[10px] uppercase tracking-wider2 text-muted-foreground"
                >
                  Código de descuento (opcional)
                </label>
                <Input
                  id="coupon"
                  value={coupon}
                  onChange={(event) =>
                    setCoupon(
                      event.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9-]/g, "")
                        .slice(0, 20)
                    )
                  }
                  placeholder="Ej: LUNE10"
                  autoComplete="off"
                  className="mt-1 h-10 uppercase placeholder:normal-case"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  El descuento se valida al confirmar el pedido por WhatsApp.
                </p>
              </div>
              <Button className="mt-4 w-full" onClick={() => setStep("checkout")}>
                Continuar con el pedido
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
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="rounded-lg border bg-secondary/40 p-3">
                <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
                  Resumen ({count} {count === 1 ? "prenda" : "prendas"})
                </p>
                <ul className="mt-2 space-y-1.5">
                  {items.map((item) => (
                    <li key={item.key} className="flex justify-between gap-3 text-xs">
                      <span className="min-w-0 truncate text-muted-foreground">
                        {item.qty} × {item.name} · {item.size} · {item.color}
                      </span>
                      <span className="shrink-0 font-medium">{formatCLP(item.price * item.qty)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex justify-between border-t pt-2 text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-display text-base">{formatCLP(subtotal)}</span>
                </div>
                {coupon.trim() && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Cupón <span className="font-medium text-foreground">{coupon.trim()}</span> (se valida
                    por WhatsApp).
                  </p>
                )}
              </div>

              <div className="mt-5 grid gap-3">
                <div>
                  <Label htmlFor="customer-name">Nombre completo *</Label>
                  <Input
                    id="customer-name"
                    value={customer.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder="Ej: Camila Rojas"
                    autoComplete="name"
                    className="mt-1 h-10"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="customer-phone">Teléfono *</Label>
                    <Input
                      id="customer-phone"
                      value={customer.phone}
                      onChange={(event) => update("phone", event.target.value)}
                      placeholder="+56 9 1234 5678"
                      inputMode="tel"
                      autoComplete="tel"
                      className="mt-1 h-10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer-email">Email *</Label>
                    <Input
                      id="customer-email"
                      type="email"
                      value={customer.email}
                      onChange={(event) => update("email", event.target.value)}
                      placeholder="tucorreo@ejemplo.cl"
                      autoComplete="email"
                      className="mt-1 h-10"
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Con este correo podrás ver el pedido en «Mi cuenta».
                    </p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="customer-address">Dirección de envío *</Label>
                  <Input
                    id="customer-address"
                    value={customer.address}
                    onChange={(event) => update("address", event.target.value)}
                    placeholder="Calle, número, depto. / casa"
                    autoComplete="street-address"
                    className="mt-1 h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="customer-city">Comuna / Ciudad *</Label>
                  <Input
                    id="customer-city"
                    value={customer.city}
                    onChange={(event) => update("city", event.target.value)}
                    placeholder="Ej: Chillán"
                    autoComplete="address-level2"
                    className="mt-1 h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="customer-notes">Notas (opcional)</Label>
                  <Textarea
                    id="customer-notes"
                    value={customer.notes}
                    onChange={(event) => update("notes", event.target.value)}
                    placeholder="Referencias de entrega, horario, etc."
                    rows={2}
                    className="mt-1"
                  />
                </div>
                {error && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {error}
                  </p>
                )}
                {!isFirebaseConfigured && (
                  <p className="text-[11px] text-muted-foreground">
                    El registro en el panel no está disponible: el pedido se enviará solo por WhatsApp.
                  </p>
                )}
              </div>
            </div>

            <div className="border-t bg-card px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total del pedido</span>
                <span className="font-display text-xl">{formatCLP(subtotal)}</span>
              </div>
              <Button
                variant="whatsapp"
                className="mt-3 w-full"
                onClick={() => void submitOrder()}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Registrando orden…
                  </>
                ) : (
                  "Enviar pedido por WhatsApp"
                )}
              </Button>
              <button
                type="button"
                onClick={() => setStep("cart")}
                disabled={submitting}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 text-[11px] uppercase tracking-wider2 text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
              >
                <ArrowLeft className="h-3 w-3" /> Volver al carrito
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
