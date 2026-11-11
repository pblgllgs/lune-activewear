import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Loader2,
  MapPin,
  PackageCheck,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import {
  createManualOrder,
  deleteOrder,
  setOrderStatus,
  subscribeOrders,
  updateOrder,
} from "@/lib/orders";
import { auth } from "@/lib/firebase";
import { stockColors, variantStock } from "@/lib/stock";
import { usePagination } from "@/lib/use-pagination";
import { formatCLP } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Order, OrderCustomer, OrderItem, OrderStatus } from "@/types/order";
import type { Product } from "@/types/product";

type Filter = "todas" | OrderStatus;

type EditForm = {
  customer: OrderCustomer;
  coupon: string;
  notes: string;
  items: OrderItem[];
};

type ManualItem = {
  productId: string;
  name: string;
  image: string;
  color: string;
  size: string;
  qty: number;
  price: number;
};

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "pagado", label: "Pagado" },
  { value: "enviado", label: "Enviado" },
  { value: "aprobada", label: "Aprobada" },
  { value: "rechazada", label: "Rechazada" },
];

function isSale(status: OrderStatus): boolean {
  return status === "aprobada" || status === "pagado" || status === "enviado";
}

function formatDateTime(value?: string): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: OrderStatus): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? "Pendiente";
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const className =
    status === "aprobada" || status === "pagado"
      ? "border-emerald-600/20 bg-emerald-600/10 text-emerald-700"
      : status === "enviado"
        ? "border-sky-600/20 bg-sky-600/10 text-sky-700"
        : status === "rechazada"
          ? "border-destructive/20 bg-destructive/10 text-destructive"
          : "border-amber-600/20 bg-amber-500/10 text-amber-700";
  return (
    <Badge variant="outline" className={className}>
      {statusLabel(status)}
    </Badge>
  );
}

function itemCount(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.qty, 0);
}

function formSubtotal(items: OrderItem[] | ManualItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function emptyManualItem(): ManualItem {
  return {
    productId: "",
    name: "",
    image: "",
    color: "",
    size: "",
    qty: 1,
    price: 0,
  };
}

export function OrdersManager({ products = [] }: { products?: Product[] }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("todas");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  // Registro manual
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualStatus, setManualStatus] = useState<OrderStatus>("pagado");
  const [manualCustomer, setManualCustomer] = useState<OrderCustomer>({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
  });
  const [manualCoupon, setManualCoupon] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualItems, setManualItems] = useState<ManualItem[]>([emptyManualItem()]);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeOrders((next) => {
      setOrders(next);
      setLoading(false);
    });
    return unsubscribe;
  }, [reloadKey]);

  const stats = useMemo(() => {
    const pending = orders.filter((order) => order.status === "pendiente");
    const sales = orders.filter((order) => isSale(order.status));
    const rejected = orders.filter((order) => order.status === "rechazada");
    return {
      pending: pending.length,
      pendingUnits: pending.reduce((sum, order) => sum + itemCount(order), 0),
      sales: sales.length,
      salesTotal: sales.reduce((sum, order) => sum + order.subtotal, 0),
      rejected: rejected.length,
    };
  }, [orders]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (filter !== "todas" && order.status !== filter) return false;
      if (!term) return true;
      return [order.code, order.customer.name, order.customer.phone, order.customer.city, order.customer.address]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [orders, filter, query]);

  const orderPagination = usePagination(visible, {
    pageSize: 10,
    resetKey: `${filter}|${query}`,
  });

  const adminEmail = auth?.currentUser?.email ?? "admin";
  const catalog = useMemo(
    () => products.filter((p) => p.published !== false).sort((a, b) => a.name.localeCompare(b.name, "es")),
    [products]
  );

  const startEdit = (order: Order) => {
    setEditingId(order.id);
    setExpandedId(order.id);
    setEditForm({
      customer: { ...order.customer },
      coupon: order.coupon ?? "",
      notes: order.notes ?? "",
      items: order.items.map((item) => ({ ...item })),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const updateCustomer = (field: keyof OrderCustomer, value: string) => {
    setEditForm((current) =>
      current ? { ...current, customer: { ...current.customer, [field]: value } } : current
    );
  };

  const updateItem = (index: number, patch: Partial<OrderItem>) => {
    setEditForm((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item, itemIndex) =>
              itemIndex === index ? { ...item, ...patch } : item
            ),
          }
        : current
    );
  };

  const removeEditItem = (index: number) => {
    setEditForm((current) =>
      current ? { ...current, items: current.items.filter((_, i) => i !== index) } : current
    );
  };

  const validateEdit = (order: Order): string => {
    if (!editForm) return "No hay datos para guardar.";
    if (editForm.customer.name.trim().length < 2) return "Escribe el nombre de la clienta.";
    if (editForm.customer.phone.replace(/\D/g, "").length < 8) return "Escribe un teléfono válido.";
    if (editForm.customer.address.trim().length < 4) return "Escribe la dirección de envío.";
    if (editForm.customer.city.trim().length < 2) return "Indica la comuna o ciudad.";
    if (order.status === "pendiente") {
      if (editForm.items.length === 0) return "La orden debe tener al menos un producto.";
      for (const item of editForm.items) {
        if (!item.name.trim()) return "Cada producto necesita un nombre.";
        if (!item.size.trim()) return "Cada producto necesita una talla.";
        if (!item.color.trim()) return "Cada producto necesita un color.";
        if (item.qty < 1) return "La cantidad debe ser al menos 1.";
        if (item.price < 0) return "El precio no puede ser negativo.";
      }
    }
    return "";
  };

  const saveEdit = async (order: Order) => {
    if (!editForm) return;
    const validation = validateEdit(order);
    if (validation) {
      toast.error(validation);
      return;
    }

    setSaving(true);
    try {
      await updateOrder(order.id, {
        customer: {
          name: editForm.customer.name.trim(),
          phone: editForm.customer.phone.trim(),
          email: editForm.customer.email?.trim() || undefined,
          address: editForm.customer.address.trim(),
          city: editForm.customer.city.trim(),
        },
        coupon: editForm.coupon,
        notes: editForm.notes,
        items: order.status === "pendiente" ? editForm.items : undefined,
      });
      toast.success(`Orden ${order.code} actualizada.`);
      cancelEdit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la orden.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (order: Order, nextStatus: OrderStatus) => {
    if (nextStatus === order.status) return;

    const units = itemCount(order);
    const nextSale = isSale(nextStatus);
    const currentSale = isSale(order.status);
    const deducting = nextSale && !order.stockApplied;
    const restoring = order.stockApplied && !nextSale;
    const title = `¿Cambiar la orden ${order.code} a ${statusLabel(nextStatus)}?`;
    const html = deducting
      ? `Se descontarán <b>${units} ${units === 1 ? "unidad" : "unidades"}</b> del stock de los productos de la orden.`
      : restoring
        ? `Se devolverán <b>${units} ${units === 1 ? "unidad" : "unidades"}</b> al stock de los productos de la orden.`
        : nextSale && currentSale
          ? `La orden seguirá como venta confirmada; el stock ya está descontado.`
          : `La orden quedará en estado <b>${statusLabel(nextStatus)}</b>.`;

    const result =
      nextStatus === "rechazada"
        ? await Swal.fire({
            title,
            html,
            input: "textarea",
            inputLabel: "Motivo (opcional)",
            inputPlaceholder: "Ej: sin stock, datos incompletos, pago no confirmado…",
            showCancelButton: true,
            confirmButtonText: "Sí, rechazar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#49372D",
          })
        : await Swal.fire({
            title,
            html,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, cambiar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#49372D",
          });
    if (!result.isConfirmed) return;

    setBusyId(order.id);
    try {
      await setOrderStatus(
        order.id,
        nextStatus,
        adminEmail,
        typeof result.value === "string" ? result.value : ""
      );
      const message = deducting
        ? `Orden ${order.code} marcada como ${statusLabel(nextStatus)} y stock descontado.`
        : restoring
          ? `Orden ${order.code} marcada como ${statusLabel(nextStatus)} y stock devuelto.`
          : `Orden ${order.code} actualizada a ${statusLabel(nextStatus)}.`;
      toast.success(message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar el estado.");
    } finally {
      setBusyId(null);
    }
  };

  const removeOrder = async (order: Order) => {
    const result = await Swal.fire({
      title: `¿Eliminar la orden ${order.code}?`,
      html: order.stockApplied
        ? "Se eliminará el registro y se devolverá al stock lo descontado.<br/>Esta acción no se puede deshacer."
        : "Se eliminará el registro de la orden.<br/>Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#49372D",
    });
    if (!result.isConfirmed) return;

    setBusyId(order.id);
    try {
      await deleteOrder(order.id);
      if (editingId === order.id) cancelEdit();
      toast.success(`Orden ${order.code} eliminada${order.stockApplied ? " y stock devuelto" : ""}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la orden.");
    } finally {
      setBusyId(null);
    }
  };

  // --------- Manual order form ---------
  const resetManual = () => {
    setManualStatus("pagado");
    setManualCustomer({ name: "", phone: "", email: "", address: "", city: "" });
    setManualCoupon("");
    setManualNotes("");
    setManualItems([emptyManualItem()]);
  };

  const updateManualCustomer = (field: keyof OrderCustomer, value: string) => {
    setManualCustomer((c) => ({ ...c, [field]: value }));
  };

  const updateManualItem = (index: number, patch: Partial<ManualItem>) => {
    setManualItems((items) => items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const selectManualProduct = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      updateManualItem(index, { productId: "", name: "", image: "", color: "", size: "", price: 0 });
      return;
    }
    const colors = stockColors(product);
    const color = colors[0] ?? "Único";
    const size = product.sizes[0] ?? "Único";
    updateManualItem(index, {
      productId: product.id,
      name: product.name,
      image: product.images[0] ?? "",
      color,
      size,
      qty: 1,
      price: product.price,
    });
  };

  const addManualItem = () => setManualItems((items) => [...items, emptyManualItem()]);
  const removeManualItem = (index: number) =>
    setManualItems((items) => (items.length <= 1 ? items : items.filter((_, i) => i !== index)));

  const saveManual = async () => {
    if (manualCustomer.name.trim().length < 2) return toast.error("Escribe el nombre de la clienta.");
    if (manualCustomer.phone.replace(/\D/g, "").length < 8) return toast.error("Escribe un teléfono válido.");
    if (manualCustomer.address.trim().length < 4) return toast.error("Escribe la dirección de envío.");
    if (manualCustomer.city.trim().length < 2) return toast.error("Indica la comuna o ciudad.");

    const items: OrderItem[] = manualItems.map((it) => ({
      productId: it.productId.trim(),
      name: it.name.trim(),
      image: it.image.trim() || undefined,
      size: it.size.trim(),
      color: it.color.trim(),
      qty: Math.max(1, Math.floor(it.qty || 1)),
      price: Math.max(0, Math.round(it.price || 0)),
    }));
    if (items.length === 0) return toast.error("Agrega al menos un producto.");
    for (const item of items) {
      if (!item.name) return toast.error("Cada producto necesita un nombre.");
      if (!item.size) return toast.error("Cada producto necesita una talla.");
      if (!item.color) return toast.error("Cada producto necesita un color.");
    }

    setManualSaving(true);
    try {
      const order = await createManualOrder({
        customer: {
          name: manualCustomer.name.trim(),
          phone: manualCustomer.phone.trim(),
          email: manualCustomer.email?.trim() || undefined,
          address: manualCustomer.address.trim(),
          city: manualCustomer.city.trim(),
        },
        items,
        subtotal: formSubtotal(items),
        coupon: manualCoupon.trim() || undefined,
        notes: manualNotes.trim() || undefined,
        status: manualStatus,
        adminEmail,
      });
      toast.success(
        isSale(order.status)
          ? `Pedido ${order.code} registrado (${statusLabel(order.status)}) y stock descontado.`
          : `Pedido ${order.code} registrado como pendiente.`
      );
      resetManual();
      setManualOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el pedido.");
    } finally {
      setManualSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-3xl">
              {stats.pending}
              <Clock className="h-5 w-5 text-amber-600" />
            </CardTitle>
            <CardDescription>
              Órdenes pendientes · {stats.pendingUnits} {stats.pendingUnits === 1 ? "unidad" : "unidades"}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-3xl">
              {stats.sales}
              <PackageCheck className="h-5 w-5 text-emerald-600" />
            </CardTitle>
            <CardDescription>Ventas realizadas (aprobada/pagado/enviado)</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{formatCLP(stats.salesTotal)}</CardTitle>
            <CardDescription>Total ventas realizadas</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-3xl">
              {stats.rejected}
              <X className="h-5 w-5 text-destructive" />
            </CardTitle>
            <CardDescription>Órdenes rechazadas</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {manualOpen ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Registrar pedido manual</CardTitle>
                <CardDescription>
                  Registra ventas cerradas por WhatsApp u otros medios. Si el estado es pagado, enviado o
                  aprobado, se validará y descontará el stock al guardar.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setManualOpen(false)}>
                <X className="h-4 w-4" /> Cerrar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label htmlFor="m-name">Nombre completo *</Label>
                <Input id="m-name" value={manualCustomer.name} onChange={(e) => updateManualCustomer("name", e.target.value)} className="mt-1 h-10" />
              </div>
              <div>
                <Label htmlFor="m-phone">Teléfono *</Label>
                <Input id="m-phone" value={manualCustomer.phone} onChange={(e) => updateManualCustomer("phone", e.target.value)} className="mt-1 h-10" />
              </div>
              <div>
                <Label htmlFor="m-email">Correo</Label>
                <Input id="m-email" type="email" value={manualCustomer.email ?? ""} onChange={(e) => updateManualCustomer("email", e.target.value)} className="mt-1 h-10" />
              </div>
              <div className="lg:col-span-2">
                <Label htmlFor="m-address">Dirección *</Label>
                <Input id="m-address" value={manualCustomer.address} onChange={(e) => updateManualCustomer("address", e.target.value)} className="mt-1 h-10" />
              </div>
              <div>
                <Label htmlFor="m-city">Comuna / Ciudad *</Label>
                <Input id="m-city" value={manualCustomer.city} onChange={(e) => updateManualCustomer("city", e.target.value)} className="mt-1 h-10" />
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={manualStatus} onValueChange={(v) => setManualStatus(v as OrderStatus)}>
                  <SelectTrigger className="mt-1 h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="pagado">Pagado</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {isSale(manualStatus) ? "Se descontará stock al guardar." : "No descuenta stock."}
                </p>
              </div>
              <div>
                <Label htmlFor="m-coupon">Cupón</Label>
                <Input id="m-coupon" value={manualCoupon} onChange={(e) => setManualCoupon(e.target.value)} className="mt-1 h-10 uppercase placeholder:normal-case" />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <Label htmlFor="m-notes">Notas (canal, referencia, etc.)</Label>
                <Textarea id="m-notes" value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} rows={2} className="mt-1" placeholder="Ej: Venta por WhatsApp, transferencia confirmada" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">Productos</p>
                <Button type="button" variant="outline" size="sm" onClick={addManualItem}>
                  <Plus className="h-3.5 w-3.5" /> Agregar ítem
                </Button>
              </div>
              <div className="mt-2 space-y-3">
                {manualItems.map((item, index) => {
                  const product = products.find((p) => p.id === item.productId);
                  const colors = product ? stockColors(product) : [];
                  const sizes = product?.sizes ?? [];
                  const stockInfo =
                    product && item.color && item.size ? variantStock(product, item.size, item.color) : null;
                  return (
                    <div key={index} className="rounded-md border bg-card p-3">
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                        <div className="lg:col-span-2">
                          <Label className="text-[10px]">Producto del catálogo</Label>
                          <Select value={item.productId || "__none__"} onValueChange={(v) => selectManualProduct(index, v === "__none__" ? "" : v)}>
                            <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Selecciona un producto" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Producto personalizado</SelectItem>
                              {catalog.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="lg:col-span-2">
                          <Label className="text-[10px]">Nombre</Label>
                          <Input value={item.name} onChange={(e) => updateManualItem(index, { name: e.target.value })} className="mt-1 h-9" placeholder="Nombre del producto" />
                        </div>
                        <div>
                          <Label className="text-[10px]">Color</Label>
                          {colors.length > 0 ? (
                            <Select value={item.color || colors[0]} onValueChange={(v) => updateManualItem(index, { color: v })}>
                              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {colors.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input value={item.color} onChange={(e) => updateManualItem(index, { color: e.target.value })} className="mt-1 h-9" placeholder="Color" />
                          )}
                        </div>
                        <div>
                          <Label className="text-[10px]">Talla</Label>
                          {sizes.length > 0 ? (
                            <Select value={item.size || sizes[0]} onValueChange={(v) => updateManualItem(index, { size: v })}>
                              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {sizes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input value={item.size} onChange={(e) => updateManualItem(index, { size: e.target.value })} className="mt-1 h-9" placeholder="Talla" />
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          <div className="w-24">
                            <Label className="text-[10px]">Cantidad</Label>
                            <Input type="number" min={1} value={item.qty} onChange={(e) => updateManualItem(index, { qty: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} className="mt-1 h-9" />
                          </div>
                          <div className="w-32">
                            <Label className="text-[10px]">Precio unitario</Label>
                            <Input type="number" min={0} value={item.price} onChange={(e) => updateManualItem(index, { price: Math.max(0, Math.round(Number(e.target.value) || 0)) })} className="mt-1 h-9" />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {stockInfo !== null && (
                            <span className={`text-[11px] ${stockInfo === 0 ? "text-destructive" : "text-muted-foreground"}`}>
                              Stock variante: {stockInfo}
                            </span>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Subtotal: <span className="font-medium text-foreground">{formatCLP(item.price * item.qty)}</span>
                          </p>
                          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeManualItem(index)} disabled={manualItems.length <= 1}>
                            <Trash2 className="h-3.5 w-3.5" /> Quitar
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <p className="text-sm">
                Subtotal: <span className="font-display text-lg">{formatCLP(formSubtotal(manualItems))}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => { resetManual(); setManualOpen(false); }} disabled={manualSaving}>Cancelar</Button>
                <Button onClick={() => void saveManual()} disabled={manualSaving}>
                  {manualSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {manualSaving ? "Guardando…" : "Registrar pedido"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Historial de órdenes</CardTitle>
              <CardDescription>
                Pedidos del carrito y ventas registradas manualmente. Al confirmar una venta (aprobada,
                pagada o enviada) se descuenta el stock; al volver a pendiente o rechazar, el stock se devuelve.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
              </Button>
              <Button type="button" size="sm" onClick={() => setManualOpen(true)} disabled={manualOpen}>
                <Plus className="h-3.5 w-3.5" /> Nuevo pedido manual
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por código, clienta, teléfono o comuna…"
                className="h-10 pl-9"
                aria-label="Buscar órdenes"
              />
            </div>
            <Select value={filter} onValueChange={(value) => setFilter(value as Filter)}>
              <SelectTrigger className="h-10 w-full sm:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label === "Aprobada" ? "Aprobadas" : s.label === "Pendiente" ? "Pendientes" : s.label === "Rechazada" ? "Rechazadas" : s.label === "Pagado" ? "Pagadas" : "Enviadas"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando órdenes…</p>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <ClipboardList className="h-6 w-6" />
              <p>{orders.length === 0 ? "Todavía no hay órdenes registradas." : "No hay órdenes que coincidan con la búsqueda."}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orderPagination.pageItems.map((order) => {
                const isOpen = expandedId === order.id;
                const isEditing = editingId === order.id;
                const busy = busyId === order.id;
                const units = itemCount(order);
                return (
                  <div key={order.id} className="rounded-lg border bg-card">
                    <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-base font-medium">{order.code}</p>
                          <StatusBadge status={order.status} />
                          {order.source === "manual" && <Badge variant="secondary">Manual</Badge>}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDateTime(order.createdAt)} · {order.customer.name || "Sin nombre"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-lg">{formatCLP(order.subtotal)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {units} {units === 1 ? "unidad" : "unidades"} · {order.items.length} {order.items.length === 1 ? "ítem" : "ítems"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-3 text-xs text-muted-foreground">
                      {order.customer.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {order.customer.phone}</span>}
                      {order.customer.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {order.customer.city}</span>}
                      {order.customer.address && <span>{order.customer.address}</span>}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isOpen ? null : order.id)}
                        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider2 text-muted-foreground transition hover:text-foreground"
                        aria-expanded={isOpen}
                      >
                        {isOpen ? <>Ocultar detalle <ChevronUp className="h-3.5 w-3.5" /></> : <>Ver detalle <ChevronDown className="h-3.5 w-3.5" /></>}
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
                        <Select value={order.status} onValueChange={(value) => void changeStatus(order, value as OrderStatus)} disabled={busy || saving}>
                          <SelectTrigger className="h-9 w-36" aria-label={`Cambiar estado de ${order.code}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" onClick={() => startEdit(order)} disabled={busy || saving}>
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive hover:border-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => void removeOrder(order)} disabled={busy || saving}>
                          <Trash2 className="h-3.5 w-3.5" /> Eliminar
                        </Button>
                      </div>
                    </div>

                    {isOpen && !isEditing && (
                      <div className="space-y-4 border-t bg-secondary/20 p-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">Productos</p>
                          <ul className="mt-2 divide-y rounded-md border bg-card">
                            {order.items.map((item, index) => (
                              <li key={`${order.id}-${item.productId}-${item.size}-${item.color}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{item.name}</p>
                                  <p className="text-muted-foreground">Talla {item.size || "—"} · {item.color || "—"}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="font-medium">{item.qty} × {formatCLP(item.price)}</p>
                                  <p className="text-muted-foreground">{formatCLP(item.qty * item.price)}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="grid gap-3 text-xs sm:grid-cols-2">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">Clienta</p>
                            <p className="mt-1 font-medium">{order.customer.name || "Sin nombre"}</p>
                            {order.customer.phone && <p>{order.customer.phone}</p>}
                            {order.customer.email && <p>{order.customer.email}</p>}
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">Envío</p>
                            <p className="mt-1">{order.customer.address || "Sin dirección"}</p>
                            <p>{order.customer.city}</p>
                          </div>
                        </div>

                        {(order.coupon || order.notes) && (
                          <div className="space-y-1 text-xs">
                            {order.coupon && <p><span className="text-muted-foreground">Cupón: </span>{order.coupon}</p>}
                            {order.notes && <p><span className="text-muted-foreground">Notas: </span>{order.notes}</p>}
                          </div>
                        )}

                        <div className="space-y-1 border-t pt-3 text-[11px] text-muted-foreground">
                          <p>Subtotal: {formatCLP(order.subtotal)}</p>
                          <p>Origen: {order.source === "manual" ? "Manual (registrada en admin)" : "Web (carrito)"}</p>
                          {order.status === "aprobada" && <p>Aprobada {formatDateTime(order.approvedAt)}{order.approvedBy ? ` por ${order.approvedBy}` : ""} · Stock descontado: {order.stockApplied ? "sí" : "no"}</p>}
                          {order.status === "pagado" && <p>Pagada {formatDateTime(order.paidAt)}{order.paidBy ? ` por ${order.paidBy}` : ""} · Stock descontado: {order.stockApplied ? "sí" : "no"}</p>}
                          {order.status === "enviado" && <p><Truck className="mr-1 inline h-3 w-3" />Enviada {formatDateTime(order.shippedAt)}{order.shippedBy ? ` por ${order.shippedBy}` : ""}{order.paidAt ? ` · Pagada ${formatDateTime(order.paidAt)}` : ""} · Stock descontado: {order.stockApplied ? "sí" : "no"}</p>}
                          {order.status === "rechazada" && (
                            <>
                              <p>Rechazada {formatDateTime(order.rejectedAt)}{order.rejectedBy ? ` por ${order.rejectedBy}` : ""}</p>
                              {order.rejectionReason && <p>Motivo: {order.rejectionReason}</p>}
                            </>
                          )}
                          {order.status === "pendiente" && <p>Al confirmar la venta (pagado/enviado/aprobada) se descuenta el stock.</p>}
                        </div>
                      </div>
                    )}

                    {isEditing && editForm && (
                      <div className="space-y-4 border-t bg-secondary/20 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-display text-sm font-medium">Editar orden {order.code}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {order.status === "pendiente"
                              ? "Puedes editar los datos y los productos."
                              : "Solo datos de contacto, cupón y notas. Cambia el estado a pendiente para editar productos (se devolverá el stock si estaba aplicado)."}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label htmlFor={`edit-name-${order.id}`}>Nombre completo</Label>
                            <Input id={`edit-name-${order.id}`} value={editForm.customer.name} onChange={(event) => updateCustomer("name", event.target.value)} className="mt-1 h-10" />
                          </div>
                          <div>
                            <Label htmlFor={`edit-phone-${order.id}`}>Teléfono</Label>
                            <Input id={`edit-phone-${order.id}`} value={editForm.customer.phone} onChange={(event) => updateCustomer("phone", event.target.value)} className="mt-1 h-10" />
                          </div>
                          <div>
                            <Label htmlFor={`edit-email-${order.id}`}>Email</Label>
                            <Input id={`edit-email-${order.id}`} type="email" value={editForm.customer.email ?? ""} onChange={(event) => updateCustomer("email", event.target.value)} className="mt-1 h-10" />
                          </div>
                          <div>
                            <Label htmlFor={`edit-city-${order.id}`}>Comuna / Ciudad</Label>
                            <Input id={`edit-city-${order.id}`} value={editForm.customer.city} onChange={(event) => updateCustomer("city", event.target.value)} className="mt-1 h-10" />
                          </div>
                          <div className="sm:col-span-2">
                            <Label htmlFor={`edit-address-${order.id}`}>Dirección de envío</Label>
                            <Input id={`edit-address-${order.id}`} value={editForm.customer.address} onChange={(event) => updateCustomer("address", event.target.value)} className="mt-1 h-10" />
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label htmlFor={`edit-coupon-${order.id}`}>Cupón</Label>
                            <Input id={`edit-coupon-${order.id}`} value={editForm.coupon} onChange={(event) => setEditForm((c) => c ? { ...c, coupon: event.target.value } : c)} className="mt-1 h-10 uppercase placeholder:normal-case" placeholder="Sin cupón" />
                          </div>
                          <div>
                            <Label htmlFor={`edit-notes-${order.id}`}>Notas</Label>
                            <Textarea id={`edit-notes-${order.id}`} value={editForm.notes} onChange={(event) => setEditForm((c) => c ? { ...c, notes: event.target.value } : c)} rows={2} className="mt-1" />
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">Productos</p>
                          {order.status === "pendiente" ? (
                            <div className="mt-2 space-y-2">
                              {editForm.items.map((item, index) => (
                                <div key={`${item.productId}-${index}`} className="rounded-md border bg-card p-3">
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <div>
                                      <Label htmlFor={`edit-item-name-${order.id}-${index}`} className="text-[10px]">Producto</Label>
                                      <Input id={`edit-item-name-${order.id}-${index}`} value={item.name} onChange={(event) => updateItem(index, { name: event.target.value })} className="mt-1 h-9" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                      <div>
                                        <Label htmlFor={`edit-item-size-${order.id}-${index}`} className="text-[10px]">Talla</Label>
                                        <Input id={`edit-item-size-${order.id}-${index}`} value={item.size} onChange={(event) => updateItem(index, { size: event.target.value })} className="mt-1 h-9" />
                                      </div>
                                      <div>
                                        <Label htmlFor={`edit-item-color-${order.id}-${index}`} className="text-[10px]">Color</Label>
                                        <Input id={`edit-item-color-${order.id}-${index}`} value={item.color} onChange={(event) => updateItem(index, { color: event.target.value })} className="mt-1 h-9" />
                                      </div>
                                      <div>
                                        <Label htmlFor={`edit-item-qty-${order.id}-${index}`} className="text-[10px]">Cant.</Label>
                                        <Input id={`edit-item-qty-${order.id}-${index}`} type="number" min={1} value={item.qty} onChange={(event) => updateItem(index, { qty: Math.max(1, Math.floor(Number(event.target.value) || 1)) })} className="mt-1 h-9" />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                                    <div className="w-32">
                                      <Label htmlFor={`edit-item-price-${order.id}-${index}`} className="text-[10px]">Precio unitario</Label>
                                      <Input id={`edit-item-price-${order.id}-${index}`} type="number" min={0} value={item.price} onChange={(event) => updateItem(index, { price: Math.max(0, Math.round(Number(event.target.value) || 0)) })} className="mt-1 h-9" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Subtotal: <span className="font-medium text-foreground">{formatCLP(item.price * item.qty)}</span></p>
                                    <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeEditItem(index)} disabled={editForm.items.length <= 1}>
                                      <Trash2 className="h-3.5 w-3.5" /> Quitar
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <>
                              <ul className="mt-2 divide-y rounded-md border bg-card">
                                {editForm.items.map((item, index) => (
                                  <li key={`${order.id}-${item.productId}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                                    <div className="min-w-0">
                                      <p className="truncate font-medium">{item.name}</p>
                                      <p className="text-muted-foreground">Talla {item.size || "—"} · {item.color || "—"}</p>
                                    </div>
                                    <p className="shrink-0 font-medium">{item.qty} × {formatCLP(item.price)}</p>
                                  </li>
                                ))}
                              </ul>
                              <p className="mt-1 text-[11px] text-muted-foreground">Para modificar los productos, cambia el estado a pendiente. Si la orden tenía stock descontado, se devolverá al hacerlo.</p>
                            </>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                          <p className="text-sm">Subtotal: <span className="font-display text-lg">{formatCLP(formSubtotal(editForm.items))}</span></p>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="ghost" onClick={cancelEdit} disabled={saving}>Cancelar</Button>
                            <Button type="button" onClick={() => void saveEdit(order)} disabled={saving}>
                              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              {saving ? "Guardando…" : "Guardar cambios"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <Pagination
                page={orderPagination.page}
                pageSize={orderPagination.pageSize}
                total={orderPagination.total}
                totalPages={orderPagination.totalPages}
                onPageChange={orderPagination.setPage}
                onPageSizeChange={orderPagination.setPageSize}
                itemLabel="órdenes"
                className="pt-1"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
