import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import {
  BadgePercent,
  Calendar,
  Pencil,
  Plus,
  Power,
  Save,
  Search,
  TicketPercent,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { db } from "@/lib/firebase";
import {
  couponValidity,
  createCoupon,
  deleteCoupon,
  normalizeCouponCode,
  setCouponActive,
  subscribeCoupons,
  updateCoupon,
} from "@/lib/coupons";
import { normalizeOrder } from "@/lib/orders";
import { formatCLP } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePagination } from "@/lib/use-pagination";
import type { Coupon, CouponType, CouponUsage } from "@/types/coupon";
import type { Order } from "@/types/order";

type FormState = {
  code: string;
  type: CouponType;
  value: string;
  active: boolean;
  minPurchase: string;
  expiresAt: string;
  description: string;
};

const EMPTY_FORM: FormState = {
  code: "",
  type: "percent",
  value: "",
  active: true,
  minPurchase: "",
  expiresAt: "",
  description: "",
};

function toForm(coupon: Coupon): FormState {
  return {
    code: coupon.code,
    type: coupon.type,
    value: String(coupon.value),
    active: coupon.active,
    minPurchase: coupon.minPurchase ? String(coupon.minPurchase) : "",
    expiresAt: coupon.expiresAt ?? "",
    description: coupon.description ?? "",
  };
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function couponLabel(coupon: Pick<Coupon, "type" | "value">): string {
  return coupon.type === "percent" ? `${coupon.value}%` : formatCLP(coupon.value);
}

function isExpired(coupon: Coupon): boolean {
  if (!coupon.expiresAt) return false;
  const end = new Date(`${coupon.expiresAt}T23:59:59`);
  return Number.isFinite(end.getTime()) && end.getTime() < Date.now();
}

export function CouponsManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeCoupons((next) => {
      setCoupons(next);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!db) {
      setOrders([]);
      return;
    }
    const unsubscribe = onSnapshot(
      collection(db, "orders"),
      (snap) => {
        setOrders(snap.docs.map((doc) => normalizeOrder(doc.id, doc.data())));
      },
      () => setOrders([])
    );
    return unsubscribe;
  }, []);

  const usageByCode = useMemo(() => {
    const map = new Map<string, CouponUsage>();
    for (const order of orders) {
      const code = normalizeCouponCode(order.coupon ?? "");
      if (!code || order.status === "rechazada") continue;

      const discount =
        typeof order.discount === "number" && order.discount > 0
          ? Math.min(order.subtotal, Math.max(0, Math.round(order.discount)))
          : 0;
      const total = Math.max(0, order.subtotal - discount);
      const current = map.get(code) ?? { uses: 0, discountTotal: 0, salesTotal: 0 };
      const next: CouponUsage = {
        uses: current.uses + 1,
        discountTotal: current.discountTotal + discount,
        salesTotal: current.salesTotal + total,
      };
      const usedAt = order.createdAt;
      if (usedAt && (!current.lastUsedAt || usedAt > current.lastUsedAt)) {
        next.lastUsedAt = usedAt;
      } else if (current.lastUsedAt) {
        next.lastUsedAt = current.lastUsedAt;
      }
      map.set(code, next);
    }
    return map;
  }, [orders]);

  const totals = useMemo(() => {
    let discountTotal = 0;
    let uses = 0;
    for (const usage of usageByCode.values()) {
      discountTotal += usage.discountTotal;
      uses += usage.uses;
    }
    return { discountTotal, uses, coupons: coupons.length };
  }, [usageByCode, coupons.length]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return coupons;
    return coupons.filter((coupon) =>
      [coupon.code, coupon.description ?? "", couponLabel(coupon)]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [coupons, query]);

  const pagination = usePagination(filtered, { pageSize: 10, resetKey: query });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setForm(toForm(coupon));
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const input = {
      code: form.code,
      type: form.type,
      value: Math.max(0, Math.round(Number(form.value) || 0)),
      active: form.active,
      minPurchase: form.minPurchase ? Math.max(0, Math.round(Number(form.minPurchase) || 0)) : undefined,
      expiresAt: form.expiresAt || undefined,
      description: form.description.trim() || undefined,
    };

    if (normalizeCouponCode(input.code).length < 3) {
      toast.error("El código debe tener al menos 3 caracteres.");
      return;
    }
    if (input.type === "percent" && (input.value <= 0 || input.value > 100)) {
      toast.error("El porcentaje debe estar entre 1 y 100.");
      return;
    }
    if (input.type === "fixed" && input.value <= 0) {
      toast.error("El monto del descuento debe ser mayor que cero.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateCoupon(editingId, input);
        toast.success("Cupón actualizado.");
      } else {
        await createCoupon(input);
        toast.success("Cupón creado.");
      }
      closeForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el cupón.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    setBusyId(coupon.id);
    try {
      await setCouponActive(coupon.id, !coupon.active);
      toast.success(coupon.active ? "Cupón desactivado." : "Cupón activado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el cupón.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (coupon: Coupon) => {
    const usage = usageByCode.get(coupon.code);
    const result = await Swal.fire({
      title: "¿Eliminar cupón?",
      text:
        usage && usage.uses > 0
          ? `«${coupon.code}» tiene ${usage.uses} uso(s) registrado(s). Se eliminará el cupón, pero las órdenes conservarán su historial.`
          : `Se eliminará el cupón «${coupon.code}».`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#8f3f38",
    });
    if (!result.isConfirmed) return;

    setBusyId(coupon.id);
    try {
      await deleteCoupon(coupon.id);
      toast.success("Cupón eliminado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el cupón.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cupones registrados</CardDescription>
            <CardTitle className="text-2xl">{totals.coupons}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Usos registrados</CardDescription>
            <CardTitle className="text-2xl">{totals.uses}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Pedidos con cupón (excluye rechazados).
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Descuentos generados</CardDescription>
            <CardTitle className="text-2xl">{formatCLP(totals.discountTotal)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Monto total descontado para cuadrar ventas.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TicketPercent className="h-5 w-5" /> Cupones de descuento
            </CardTitle>
            <CardDescription className="mt-1">
              Registra códigos que las clientas pueden aplicar en la ficha del producto y en el carrito.
              Aquí ves cuántos usos y cuánto descuento generó cada cupón para cuadrar las ventas.
            </CardDescription>
          </div>
          <Button onClick={formOpen ? closeForm : openCreate} variant={formOpen ? "outline" : "default"}>
            {formOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {formOpen ? "Cerrar" : "Nuevo cupón"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {formOpen && (
            <form onSubmit={save} className="space-y-4 rounded-lg border bg-secondary/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-base font-medium">
                  {editingId ? "Editar cupón" : "Nuevo cupón"}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label htmlFor="coupon-code">Código *</Label>
                  <Input
                    id="coupon-code"
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, code: normalizeCouponCode(e.target.value) }))
                    }
                    placeholder="Ej: LUNE10"
                    className="mt-1 h-10 uppercase placeholder:normal-case"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label>Tipo de descuento *</Label>
                  <Select
                    value={form.type}
                    onValueChange={(value) => setForm((f) => ({ ...f, type: value as CouponType }))}
                  >
                    <SelectTrigger className="mt-1 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Porcentaje (%)</SelectItem>
                      <SelectItem value="fixed">Monto fijo (CLP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="coupon-value">
                    {form.type === "percent" ? "Porcentaje *" : "Monto (CLP) *"}
                  </Label>
                  <Input
                    id="coupon-value"
                    type="number"
                    min={1}
                    max={form.type === "percent" ? 100 : undefined}
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                    className="mt-1 h-10"
                    placeholder={form.type === "percent" ? "10" : "5000"}
                  />
                </div>
                <div>
                  <Label htmlFor="coupon-min">Compra mínima (CLP)</Label>
                  <Input
                    id="coupon-min"
                    type="number"
                    min={0}
                    value={form.minPurchase}
                    onChange={(e) => setForm((f) => ({ ...f, minPurchase: e.target.value }))}
                    className="mt-1 h-10"
                    placeholder="Sin mínimo"
                  />
                </div>
                <div>
                  <Label htmlFor="coupon-exp">Vence el</Label>
                  <Input
                    id="coupon-exp"
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    className="mt-1 h-10"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex cursor-pointer items-center gap-3 text-sm">
                    <Switch
                      checked={form.active}
                      onCheckedChange={(checked) => setForm((f) => ({ ...f, active: checked }))}
                    />
                    <span>{form.active ? "Cupón activo" : "Cupón inactivo"}</span>
                  </label>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <Label htmlFor="coupon-desc">Descripción (interna)</Label>
                  <Textarea
                    id="coupon-desc"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="mt-1"
                    placeholder="Ej: Campaña lanzamiento, válido para clientas nuevas"
                  />
                </div>
              </div>

              {form.value && (
                <p className="text-xs text-muted-foreground">
                  Vista previa:{" "}
                  <span className="font-medium text-foreground">
                    {form.type === "percent" ? `${form.value}% de descuento` : `${formatCLP(Number(form.value) || 0)} de descuento`}
                  </span>
                  {form.minPurchase ? ` · compra mínima ${formatCLP(Number(form.minPurchase) || 0)}` : ""}
                  {form.expiresAt ? ` · vence ${formatDate(form.expiresAt)}` : ""}.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" onClick={closeForm} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Save className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}
                  {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear cupón"}
                </Button>
              </div>
            </form>
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por código o descripción…"
              className="h-10 pl-9"
            />
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando cupones…</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <TicketPercent className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                {coupons.length === 0
                  ? "Aún no hay cupones registrados."
                  : "No hay cupones que coincidan con la búsqueda."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pagination.pageItems.map((coupon) => {
                const usage = usageByCode.get(coupon.code) ?? { uses: 0, discountTotal: 0, salesTotal: 0 };
                const expired = isExpired(coupon);
                const problem = couponValidity(coupon, Number.MAX_SAFE_INTEGER);
                const status = !coupon.active ? "inactivo" : expired ? "vencido" : "activo";
                const busy = busyId === coupon.id;

                return (
                  <div key={coupon.id} className="rounded-lg border bg-card p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-lg font-medium tracking-wide">{coupon.code}</p>
                          <Badge
                            variant={status === "activo" ? "default" : "secondary"}
                            className={
                              status === "vencido"
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                                : status === "inactivo"
                                  ? "text-muted-foreground"
                                  : ""
                            }
                          >
                            {status === "activo" ? "Activo" : status === "vencido" ? "Vencido" : "Inactivo"}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <BadgePercent className="h-3 w-3" />
                            {coupon.type === "percent" ? `${coupon.value}%` : formatCLP(coupon.value)}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {coupon.minPurchase ? (
                            <span>Compra mínima: {formatCLP(coupon.minPurchase)}</span>
                          ) : (
                            <span>Sin compra mínima</span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {coupon.expiresAt ? `Vence ${formatDate(coupon.expiresAt)}` : "Sin vencimiento"}
                          </span>
                        </div>
                        {coupon.description && (
                          <p className="text-xs text-muted-foreground">{coupon.description}</p>
                        )}
                        {status === "activo" && problem && problem !== "Este cupón no está activo." && (
                          <p className="text-xs text-amber-700">{problem}</p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void toggleActive(coupon)}
                          disabled={busy}
                          title={coupon.active ? "Desactivar" : "Activar"}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {coupon.active ? "Desactivar" : "Activar"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(coupon)}
                          disabled={busy}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void remove(coupon)}
                          disabled={busy}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Eliminar
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 rounded-md border bg-secondary/30 p-3 sm:grid-cols-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
                          Usos (pedidos)
                        </p>
                        <p className="mt-1 font-display text-xl">{usage.uses}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {usage.lastUsedAt ? `Último: ${formatDateTime(usage.lastUsedAt)}` : "Sin usos aún"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
                          Descuento generado
                        </p>
                        <p className="mt-1 font-display text-xl">{formatCLP(usage.discountTotal)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Suma de descuentos aplicados.
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
                          Ventas asociadas
                        </p>
                        <p className="mt-1 font-display text-xl">{formatCLP(usage.salesTotal)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Total cobrado (subtotal − descuento).
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              <Pagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                totalPages={pagination.totalPages}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
                itemLabel="cupones"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
