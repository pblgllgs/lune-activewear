import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import {
  createPurchase,
  deletePurchase,
  subscribePurchases,
  updatePurchase,
} from "@/lib/supplier-purchases";
import { formatCLP } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import type { Product } from "@/types/product";
import type { Supplier } from "@/types/supplier";
import type { SupplierPurchase } from "@/types/supplier-purchase";

type FormItem = {
  productId: string;
  productName: string;
  quantity: string;
  unitCost: string;
};

type FormState = {
  date: string;
  notes: string;
  items: FormItem[];
};

function todayIso(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function formatDate(value: string): string {
  if (!value) return "Sin fecha";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function itemTotal(item: FormItem): number {
  const quantity = Number(item.quantity);
  const unitCost = Number(item.unitCost);
  if (!Number.isFinite(quantity) || !Number.isFinite(unitCost)) return 0;
  return Math.max(0, quantity) * Math.max(0, unitCost);
}

export function SupplierPurchases({
  supplier,
  products,
}: {
  supplier: Supplier;
  products: Product[];
}) {
  const [purchases, setPurchases] = useState<SupplierPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    date: todayIso(),
    notes: "",
    items: [],
  });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribePurchases(supplier.id, (next) => {
      setPurchases(next);
      setLoading(false);
    });
    return unsubscribe;
  }, [supplier.id]);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const defaultProductId = useMemo(() => {
    const own = supplier.productIds.find((id) => productById.has(id));
    return own ?? products[0]?.id ?? "";
  }, [supplier.productIds, productById, products]);

  const totalSpent = useMemo(
    () => purchases.reduce((sum, purchase) => sum + purchase.total, 0),
    [purchases]
  );

  const newItem = (productId = defaultProductId): FormItem => ({
    productId,
    productName: productById.get(productId)?.name ?? "",
    quantity: "1",
    unitCost: "",
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ date: todayIso(), notes: "", items: [newItem()] });
    setFormOpen(true);
  };

  const openEdit = (purchase: SupplierPurchase) => {
    setEditingId(purchase.id);
    setForm({
      date: purchase.date || todayIso(),
      notes: purchase.notes ?? "",
      items:
        purchase.items.length > 0
          ? purchase.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: String(item.quantity),
              unitCost: String(item.unitCost),
            }))
          : [newItem()],
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
  };

  const updateItem = (index: number, patch: Partial<FormItem>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }));
  };

  const addItem = () => {
    setForm((current) => ({ ...current, items: [...current.items, newItem()] }));
  };

  const removeItem = (index: number) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const formTotal = form.items.reduce((sum, item) => sum + itemTotal(item), 0);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.date) {
      toast.error("Indica la fecha de la compra.");
      return;
    }
    const items = form.items
      .filter((item) => item.productId && Number(item.quantity) > 0)
      .map((item) => ({
        productId: item.productId,
        productName:
          productById.get(item.productId)?.name || item.productName || item.productId,
        quantity: Math.max(1, Math.floor(Number(item.quantity) || 0)),
        unitCost: Math.max(0, Math.round(Number(item.unitCost) || 0)),
      }));

    if (items.length === 0) {
      toast.error("Agrega al menos un producto con cantidad mayor a 0.");
      return;
    }

    setSaving(true);
    try {
      const input = {
        supplierId: supplier.id,
        date: form.date,
        items,
        notes: form.notes,
      };
      if (editingId) {
        await updatePurchase(supplier.id, editingId, input);
        toast.success("Compra actualizada.");
      } else {
        await createPurchase(input);
        toast.success("Compra registrada.");
      }
      closeForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la compra.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (purchase: SupplierPurchase) => {
    const result = await Swal.fire({
      title: "¿Eliminar compra?",
      text: `Se eliminará la compra del ${formatDate(purchase.date)} por ${formatCLP(
        purchase.total
      )}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#49372D",
    });
    if (!result.isConfirmed) return;
    setBusyId(purchase.id);
    try {
      await deletePurchase(supplier.id, purchase.id);
      if (editingId === purchase.id) closeForm();
      toast.success("Compra eliminada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la compra.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-5 border-t pt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-brand text-muted-foreground">
            Compras registradas
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {purchases.length === 0
              ? "Aún no hay compras registradas con este proveedor."
              : `${purchases.length} ${
                  purchases.length === 1 ? "compra" : "compras"
                } · ${formatCLP(totalSpent)} en total`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={openCreate}
          disabled={formOpen || products.length === 0}
        >
          <Plus className="h-3.5 w-3.5" /> Registrar compra
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={save}
          className="mt-3 space-y-4 rounded-lg border bg-card p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-base font-medium">
                {editingId ? "Editar compra" : "Nueva compra"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Registra productos, cantidades y costos de esta compra.
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={closeForm} title="Cerrar">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-[200px_1fr] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor={`purchase-date-${supplier.id}`}>Fecha</Label>
              <Input
                id={`purchase-date-${supplier.id}`}
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`purchase-notes-${supplier.id}`}>Notas (opcional)</Label>
              <Textarea
                id={`purchase-notes-${supplier.id}`}
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder="Número de factura, condiciones de pago, observaciones…"
                rows={2}
                maxLength={1000}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="hidden gap-2 text-[10px] uppercase tracking-wider2 text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_80px_130px_110px_36px]">
              <span>Producto</span>
              <span>Cantidad</span>
              <span>Costo unit. (CLP)</span>
              <span className="text-right">Subtotal</span>
              <span />
            </div>

            {form.items.map((item, index) => {
              const missingProduct =
                item.productId && !productById.has(item.productId) ? item : null;
              return (
                <div
                  key={`${item.productId}-${index}`}
                  className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_80px_130px_110px_36px] sm:items-center"
                >
                  <div className="space-y-1 sm:space-y-0">
                    <Label className="text-[10px] text-muted-foreground sm:hidden">Producto</Label>
                    <Select
                      value={item.productId}
                      onValueChange={(value) =>
                        updateItem(index, {
                          productId: value,
                          productName: productById.get(value)?.name ?? "",
                        })
                      }
                    >
                      <SelectTrigger aria-label={`Producto de la línea ${index + 1}`}>
                        <SelectValue placeholder="Elegir producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                            {product.sku ? ` · ${product.sku}` : ""}
                          </SelectItem>
                        ))}
                        {missingProduct && (
                          <SelectItem value={missingProduct.productId}>
                            {missingProduct.productName || missingProduct.productId} (no disponible)
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:space-y-0">
                    <Label className="text-[10px] text-muted-foreground sm:hidden">
                      Cantidad
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={99999}
                      step={1}
                      value={item.quantity}
                      onChange={(event) => updateItem(index, { quantity: event.target.value })}
                      aria-label={`Cantidad de la línea ${index + 1}`}
                      required
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-0">
                    <Label className="text-[10px] text-muted-foreground sm:hidden">
                      Costo unit. (CLP)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={99999999}
                      step={1}
                      value={item.unitCost}
                      onChange={(event) => updateItem(index, { unitCost: event.target.value })}
                      placeholder="0"
                      aria-label={`Costo unitario de la línea ${index + 1}`}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <Label className="text-[10px] text-muted-foreground sm:hidden">
                      Subtotal
                    </Label>
                    <span className="text-sm font-medium tabular-nums">
                      {formatCLP(itemTotal(item))}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Quitar línea"
                    onClick={() => removeItem(index)}
                    disabled={form.items.length === 1}
                    className="justify-self-end"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3.5 w-3.5" /> Agregar producto
              </Button>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
                  Total compra
                </p>
                <p className="font-display text-2xl font-medium">{formatCLP(formTotal)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Registrar compra"}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="mt-3 text-sm text-muted-foreground">Cargando compras…</p>
      ) : purchases.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-lg border border-dashed bg-card/60 p-6 text-center text-sm text-muted-foreground">
          <ShoppingCart className="h-6 w-6" />
          <p>Sin compras registradas todavía.</p>
          {products.length > 0 && (
            <Button variant="outline" size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Registrar la primera
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {purchases.map((purchase) => (
            <div key={purchase.id} className="rounded-lg border bg-card p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{formatDate(purchase.date)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {purchase.items.length}{" "}
                    {purchase.items.length === 1 ? "producto" : "productos"} ·{" "}
                    {formatCLP(purchase.total)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Editar compra"
                    onClick={() => openEdit(purchase)}
                    disabled={busyId === purchase.id}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Eliminar compra"
                    onClick={() => void remove(purchase)}
                    disabled={busyId === purchase.id}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="mt-2 space-y-1">
                {purchase.items.map((item, index) => (
                  <div
                    key={`${purchase.id}-${item.productId}-${index}`}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="min-w-0 truncate">
                      {item.productName}
                      <span className="text-muted-foreground">
                        {" "}
                        · {item.quantity} × {formatCLP(item.unitCost)}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatCLP(item.quantity * item.unitCost)}
                    </span>
                  </div>
                ))}
              </div>

              {purchase.notes && (
                <p className="mt-2 whitespace-pre-line text-[11px] leading-relaxed text-muted-foreground">
                  {purchase.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
