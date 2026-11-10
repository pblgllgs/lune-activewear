import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { approveOrder, rejectOrder, subscribeOrders } from "@/lib/orders";
import { auth } from "@/lib/firebase";
import { formatCLP } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Order, OrderStatus } from "@/types/order";

type Filter = "todas" | OrderStatus;

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

export function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("todas");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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

  const approve = async (order: Order) => {
    const units = itemCount(order);
    const result = await Swal.fire({
      title: `¿Aprobar la orden ${order.code}?`,
      html: `Se descontarán <b>${units} ${units === 1 ? "unidad" : "unidades"}</b> del stock de los productos de la orden.<br/>Esta acción no se puede deshacer.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, aprobar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#49372D",
    });
    if (!result.isConfirmed) return;

    setBusyId(order.id);
    try {
      await approveOrder(order.id, adminEmail);
      toast.success(`Orden ${order.code} aprobada y stock descontado.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo aprobar la orden.");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (order: Order) => {
    const result = await Swal.fire({
      title: `¿Rechazar la orden ${order.code}?`,
      input: "textarea",
      inputLabel: "Motivo (opcional)",
      inputPlaceholder: "Ej: sin stock, datos incompletos, pago no confirmado…",
      showCancelButton: true,
      confirmButtonText: "Sí, rechazar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#49372D",
    });
    if (!result.isConfirmed) return;

    setBusyId(order.id);
    try {
      await rejectOrder(order.id, typeof result.value === "string" ? result.value : "", adminEmail);
      toast.success(`Orden ${order.code} rechazada.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo rechazar la orden.");
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
                Cada pedido enviado desde el carrito queda registrado. Al aprobarlo se descuenta el
                stock y el resumen llega por WhatsApp al admin.
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

                      {order.status === "pendiente" && (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => void approve(order)} disabled={busy}>
                            <Check className="h-3.5 w-3.5" />
                            {busy ? "Procesando…" : "Aprobar y descontar stock"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void reject(order)}
                            disabled={busy}
                          >
                            <X className="h-3.5 w-3.5" /> Rechazar
                          </Button>
                        </div>
                      )}
                    </div>

                    {isOpen && (
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
