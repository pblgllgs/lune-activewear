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
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import {
  deleteOrder,
  setOrderStatus,
  subscribeOrders,
  updateOrder,
} from "@/lib/orders";
import { auth } from "@/lib/firebase";
import { formatCLP } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Order, OrderCustomer, OrderItem, OrderStatus } from "@/types/order";

type Filter = "todas" | OrderStatus;

type EditForm = {
  customer: OrderCustomer;
  coupon: string;
  notes: string;
  items: OrderItem[];
};

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
  if (status === "aprobada") return "Aprobada";
  if (status === "rechazada") return "Rechazada";
  return "Pendiente";
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const className =
    status === "aprobada"
      ? "border-emerald-600/20 bg-emerald-600/10 text-emerald-700"
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

function formSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

export function OrdersManager() {
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
    const approved = orders.filter((order) => order.status === "aprobada");
    const rejected = orders.filter((order) => order.status === "rechazada");
    return {
      pending: pending.length,
      pendingUnits: pending.reduce((sum, order) => sum + itemCount(order), 0),
      approved: approved.length,
      approvedTotal: approved.reduce((sum, order) => sum + order.subtotal, 0),
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

  const adminEmail = auth?.currentUser?.email ?? "admin";

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
    const restoring = order.stockApplied && nextStatus !== "aprobada";
    const deducting = nextStatus === "aprobada" && !order.stockApplied;
    const title =
      nextStatus === "aprobada"
        ? `¿Aprobar la orden ${order.code}?`
        : nextStatus === "rechazada"
          ? `¿Rechazar la orden ${order.code}?`
          : `¿Volver a pendiente la orden ${order.code}?`;
    const html = deducting
      ? `Se descontarán <b>${units} ${units === 1 ? "unidad" : "unidades"}</b> del stock de los productos de la orden.`
      : restoring
        ? `Se devolverán <b>${units} ${units === 1 ? "unidad" : "unidades"}</b> al stock de los productos de la orden.`
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
      const message =
        nextStatus === "aprobada"
          ? `Orden ${order.code} aprobada y stock descontado.`
          : nextStatus === "rechazada"
            ? `Orden ${order.code} rechazada${restoring ? " y stock devuelto" : ""}.`
            : `Orden ${order.code} devuelta a pendiente${restoring ? " y stock devuelto" : ""}.`;
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
              Órdenes pendientes · {stats.pendingUnits}{" "}
              {stats.pendingUnits === 1 ? "unidad" : "unidades"}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-3xl">
              {stats.approved}
              <PackageCheck className="h-5 w-5 text-emerald-600" />
            </CardTitle>
            <CardDescription>Órdenes aprobadas</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{formatCLP(stats.approvedTotal)}</CardTitle>
            <CardDescription>Ventas aprobadas (subtotal)</CardDescription>
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

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Historial de órdenes</CardTitle>
              <CardDescription>
                Cada pedido enviado desde el carrito queda registrado. Puedes editar los datos,
                cambiar el estado y eliminar la orden. Al aprobar se descuenta el stock; al volver
                a pendiente, rechazar o eliminar una orden aprobada, el stock se devuelve.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReloadKey((key) => key + 1)}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
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
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="aprobada">Aprobadas</SelectItem>
                <SelectItem value="rechazada">Rechazadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando órdenes…</p>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <ClipboardList className="h-6 w-6" />
              <p>
                {orders.length === 0
                  ? "Todavía no hay órdenes registradas."
                  : "No hay órdenes que coincidan con la búsqueda."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((order) => {
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
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDateTime(order.createdAt)} · {order.customer.name || "Sin nombre"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-lg">{formatCLP(order.subtotal)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {units} {units === 1 ? "unidad" : "unidades"} · {order.items.length}{" "}
                          {order.items.length === 1 ? "ítem" : "ítems"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-3 text-xs text-muted-foreground">
                      {order.customer.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {order.customer.phone}
                        </span>
                      )}
                      {order.customer.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {order.customer.city}
                        </span>
                      )}
                      {order.customer.address && <span>{order.customer.address}</span>}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isOpen ? null : order.id)}
                        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider2 text-muted-foreground transition hover:text-foreground"
                        aria-expanded={isOpen}
                      >
                        {isOpen ? (
                          <>
                            Ocultar detalle <ChevronUp className="h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            Ver detalle <ChevronDown className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={order.status}
                          onValueChange={(value) => void changeStatus(order, value as OrderStatus)}
                          disabled={busy || saving}
                        >
                          <SelectTrigger
                            className="h-9 w-36"
                            aria-label={`Cambiar estado de ${order.code}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="aprobada">Aprobada</SelectItem>
                            <SelectItem value="rechazada">Rechazada</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(order)}
                          disabled={busy || saving}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => void removeOrder(order)}
                          disabled={busy || saving}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Eliminar
                        </Button>
                      </div>
                    </div>

                    {isOpen && !isEditing && (
                      <div className="space-y-4 border-t bg-secondary/20 p-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
                            Productos
                          </p>
                          <ul className="mt-2 divide-y rounded-md border bg-card">
                            {order.items.map((item, index) => (
                              <li
                                key={`${order.id}-${item.productId}-${item.size}-${item.color}-${index}`}
                                className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{item.name}</p>
                                  <p className="text-muted-foreground">
                                    Talla {item.size || "—"} · {item.color || "—"}
                                  </p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="font-medium">
                                    {item.qty} × {formatCLP(item.price)}
                                  </p>
                                  <p className="text-muted-foreground">
                                    {formatCLP(item.qty * item.price)}
                                  </p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="grid gap-3 text-xs sm:grid-cols-2">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
                              Clienta
                            </p>
                            <p className="mt-1 font-medium">{order.customer.name || "Sin nombre"}</p>
                            {order.customer.phone && <p>{order.customer.phone}</p>}
                            {order.customer.email && <p>{order.customer.email}</p>}
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
                              Envío
                            </p>
                            <p className="mt-1">{order.customer.address || "Sin dirección"}</p>
                            <p>{order.customer.city}</p>
                          </div>
                        </div>

                        {(order.coupon || order.notes) && (
                          <div className="space-y-1 text-xs">
                            {order.coupon && (
                              <p>
                                <span className="text-muted-foreground">Cupón: </span>
                                {order.coupon}
                              </p>
                            )}
                            {order.notes && (
                              <p>
                                <span className="text-muted-foreground">Notas: </span>
                                {order.notes}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="space-y-1 border-t pt-3 text-[11px] text-muted-foreground">
                          <p>Subtotal: {formatCLP(order.subtotal)}</p>
                          {order.status === "aprobada" && (
                            <p>
                              Aprobada {formatDateTime(order.approvedAt)}
                              {order.approvedBy ? ` por ${order.approvedBy}` : ""} · Stock descontado:{" "}
                              {order.stockApplied ? "sí" : "no"}
                            </p>
                          )}
                          {order.status === "rechazada" && (
                            <>
                              <p>
                                Rechazada {formatDateTime(order.rejectedAt)}
                                {order.rejectedBy ? ` por ${order.rejectedBy}` : ""}
                              </p>
                              {order.rejectionReason && <p>Motivo: {order.rejectionReason}</p>}
                            </>
                          )}
                          {order.status === "pendiente" && (
                            <p>Al aprobar se descuenta el stock de cada producto y talla.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {isEditing && editForm && (
                      <div className="space-y-4 border-t bg-secondary/20 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-display text-sm font-medium">
                            Editar orden {order.code}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {order.status === "pendiente"
                              ? "Puedes editar los datos y los productos."
                              : "Solo datos de contacto, cupón y notas. Cambia el estado a pendiente para editar productos."}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label htmlFor={`edit-name-${order.id}`}>Nombre completo</Label>
                            <Input
                              id={`edit-name-${order.id}`}
                              value={editForm.customer.name}
                              onChange={(event) => updateCustomer("name", event.target.value)}
                              className="mt-1 h-10"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-phone-${order.id}`}>Teléfono</Label>
                            <Input
                              id={`edit-phone-${order.id}`}
                              value={editForm.customer.phone}
                              onChange={(event) => updateCustomer("phone", event.target.value)}
                              className="mt-1 h-10"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-email-${order.id}`}>Email</Label>
                            <Input
                              id={`edit-email-${order.id}`}
                              type="email"
                              value={editForm.customer.email ?? ""}
                              onChange={(event) => updateCustomer("email", event.target.value)}
                              className="mt-1 h-10"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-city-${order.id}`}>Comuna / Ciudad</Label>
                            <Input
                              id={`edit-city-${order.id}`}
                              value={editForm.customer.city}
                              onChange={(event) => updateCustomer("city", event.target.value)}
                              className="mt-1 h-10"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label htmlFor={`edit-address-${order.id}`}>Dirección de envío</Label>
                            <Input
                              id={`edit-address-${order.id}`}
                              value={editForm.customer.address}
                              onChange={(event) => updateCustomer("address", event.target.value)}
                              className="mt-1 h-10"
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label htmlFor={`edit-coupon-${order.id}`}>Cupón</Label>
                            <Input
                              id={`edit-coupon-${order.id}`}
                              value={editForm.coupon}
                              onChange={(event) =>
                                setEditForm((current) =>
                                  current ? { ...current, coupon: event.target.value } : current
                                )
                              }
                              className="mt-1 h-10 uppercase placeholder:normal-case"
                              placeholder="Sin cupón"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-notes-${order.id}`}>Notas</Label>
                            <Textarea
                              id={`edit-notes-${order.id}`}
                              value={editForm.notes}
                              onChange={(event) =>
                                setEditForm((current) =>
                                  current ? { ...current, notes: event.target.value } : current
                                )
                              }
                              rows={2}
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
                            Productos
                          </p>
                          {order.status === "pendiente" ? (
                            <div className="mt-2 space-y-2">
                              {editForm.items.map((item, index) => (
                                <div
                                  key={`${item.productId}-${index}`}
                                  className="rounded-md border bg-card p-3"
                                >
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <div>
                                      <Label
                                        htmlFor={`edit-item-name-${order.id}-${index}`}
                                        className="text-[10px]"
                                      >
                                        Producto
                                      </Label>
                                      <Input
                                        id={`edit-item-name-${order.id}-${index}`}
                                        value={item.name}
                                        onChange={(event) =>
                                          updateItem(index, { name: event.target.value })
                                        }
                                        className="mt-1 h-9"
                                      />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                      <div>
                                        <Label
                                          htmlFor={`edit-item-size-${order.id}-${index}`}
                                          className="text-[10px]"
                                        >
                                          Talla
                                        </Label>
                                        <Input
                                          id={`edit-item-size-${order.id}-${index}`}
                                          value={item.size}
                                          onChange={(event) =>
                                            updateItem(index, { size: event.target.value })
                                          }
                                          className="mt-1 h-9"
                                        />
                                      </div>
                                      <div>
                                        <Label
                                          htmlFor={`edit-item-color-${order.id}-${index}`}
                                          className="text-[10px]"
                                        >
                                          Color
                                        </Label>
                                        <Input
                                          id={`edit-item-color-${order.id}-${index}`}
                                          value={item.color}
                                          onChange={(event) =>
                                            updateItem(index, { color: event.target.value })
                                          }
                                          className="mt-1 h-9"
                                        />
                                      </div>
                                      <div>
                                        <Label
                                          htmlFor={`edit-item-qty-${order.id}-${index}`}
                                          className="text-[10px]"
                                        >
                                          Cant.
                                        </Label>
                                        <Input
                                          id={`edit-item-qty-${order.id}-${index}`}
                                          type="number"
                                          min={1}
                                          value={item.qty}
                                          onChange={(event) =>
                                            updateItem(index, {
                                              qty: Math.max(
                                                1,
                                                Math.floor(Number(event.target.value) || 1)
                                              ),
                                            })
                                          }
                                          className="mt-1 h-9"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                                    <div className="w-32">
                                      <Label
                                        htmlFor={`edit-item-price-${order.id}-${index}`}
                                        className="text-[10px]"
                                      >
                                        Precio unitario
                                      </Label>
                                      <Input
                                        id={`edit-item-price-${order.id}-${index}`}
                                        type="number"
                                        min={0}
                                        value={item.price}
                                        onChange={(event) =>
                                          updateItem(index, {
                                            price: Math.max(
                                              0,
                                              Math.round(Number(event.target.value) || 0)
                                            ),
                                          })
                                        }
                                        className="mt-1 h-9"
                                      />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Subtotal:{" "}
                                      <span className="font-medium text-foreground">
                                        {formatCLP(item.price * item.qty)}
                                      </span>
                                    </p>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive"
                                      onClick={() => removeEditItem(index)}
                                      disabled={editForm.items.length <= 1}
                                    >
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
                                  <li
                                    key={`${order.id}-${item.productId}-${index}`}
                                    className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate font-medium">{item.name}</p>
                                      <p className="text-muted-foreground">
                                        Talla {item.size || "—"} · {item.color || "—"}
                                      </p>
                                    </div>
                                    <p className="shrink-0 font-medium">
                                      {item.qty} × {formatCLP(item.price)}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Para modificar los productos, cambia el estado a pendiente. Si la
                                orden estaba aprobada, el stock se devuelve al hacerlo.
                              </p>
                            </>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                          <p className="text-sm">
                            Subtotal:{" "}
                            <span className="font-display text-lg">
                              {formatCLP(formSubtotal(editForm.items))}
                            </span>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={cancelEdit}
                              disabled={saving}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              onClick={() => void saveEdit(order)}
                              disabled={saving}
                            >
                              {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                              {saving ? "Guardando…" : "Guardar cambios"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
