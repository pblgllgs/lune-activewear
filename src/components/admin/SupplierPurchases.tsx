import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import {
  createPurchase,
  deletePurchase,
  subscribePurchases,
  updatePurchase,
} from "@/lib/supplier-purchases";
import { deleteFromR2, isUploadConfigured, uploadToR2 } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import { usePagination } from "@/lib/use-pagination";
import type { Product } from "@/types/product";
import type { Supplier } from "@/types/supplier";
import type { SupplierPurchase } from "@/types/supplier-purchase";

type FormState = {
  date: string;
  notes: string;
  productNames: string[];
  documentUrl: string;
  documentName: string;
  file: File | null;
  removeDocument: boolean;
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

function emptyForm(): FormState {
  return {
    date: todayIso(),
    notes: "",
    productNames: [],
    documentUrl: "",
    documentName: "",
    file: null,
    removeDocument: false,
  };
}

const MAX_DOCUMENT_SIZE = 15 * 1024 * 1024;

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
  const [form, setForm] = useState<FormState>(emptyForm);
  const [productInput, setProductInput] = useState("");
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

  const supplierProducts = useMemo(
    () =>
      supplier.productIds
        .map((id) => productById.get(id))
        .filter((product): product is Product => Boolean(product)),
    [supplier.productIds, productById]
  );

  const purchasePagination = usePagination(purchases, { pageSize: 5 });

  const addProductName = (value: string) => {
    const name = value.trim();
    if (!name) return;
    setForm((current) => {
      const exists = current.productNames.some(
        (productName) => productName.toLowerCase() === name.toLowerCase()
      );
      return exists
        ? current
        : { ...current, productNames: [...current.productNames, name] };
    });
    setProductInput("");
  };

  const removeProductName = (name: string) => {
    setForm((current) => ({
      ...current,
      productNames: current.productNames.filter((productName) => productName !== name),
    }));
  };

  const toggleSupplierProduct = (product: Product) => {
    const exists = form.productNames.some(
      (name) => name.toLowerCase() === product.name.toLowerCase()
    );
    if (exists) {
      removeProductName(form.productNames.find((name) => name.toLowerCase() === product.name.toLowerCase()) ?? product.name);
    } else {
      addProductName(product.name);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setProductInput("");
    setFormOpen(true);
  };

  const openEdit = (purchase: SupplierPurchase) => {
    setEditingId(purchase.id);
    setForm({
      date: purchase.date || todayIso(),
      notes: purchase.notes ?? "",
      productNames: purchase.productNames,
      documentUrl: purchase.documentUrl ?? "",
      documentName: purchase.documentName ?? "",
      file: null,
      removeDocument: false,
    });
    setProductInput("");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setProductInput("");
    setForm(emptyForm());
  };

  const selectFile = (file: File | null) => {
    if (file && file.size > MAX_DOCUMENT_SIZE) {
      toast.error("El documento supera el máximo de 15 MB.");
      return;
    }
    setForm((current) => ({ ...current, file, removeDocument: false }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.date) {
      toast.error("Indica la fecha de la compra.");
      return;
    }
    if (form.productNames.length === 0) {
      toast.error("Agrega al menos un producto comprado.");
      return;
    }

    let uploadedUrl: string | null = null;
    setSaving(true);
    try {
      let documentUrl = form.removeDocument ? "" : form.documentUrl;
      let documentName = form.removeDocument ? "" : form.documentName;

      if (form.file) {
        if (!isUploadConfigured()) {
          throw new Error(
            "La subida de documentos no está configurada (VITE_R2_WORKER_URL / VITE_UPLOAD_TOKEN)."
          );
        }
        uploadedUrl = await uploadToR2(form.file, `suppliers/${supplier.id}/purchases`);
        documentUrl = uploadedUrl;
        documentName = form.file.name;
      }

      const input = {
        supplierId: supplier.id,
        date: form.date,
        productNames: form.productNames,
        documentUrl,
        documentName,
        notes: form.notes,
      };

      if (editingId) {
        await updatePurchase(supplier.id, editingId, input);
      } else {
        await createPurchase(input);
      }

      // Limpieza best effort del documento anterior si se reemplazó o quitó.
      if (form.documentUrl && form.documentUrl !== documentUrl) {
        void deleteFromR2(form.documentUrl).catch(() => {});
      }

      toast.success(editingId ? "Compra actualizada." : "Compra registrada.");
      closeForm();
    } catch (error) {
      if (uploadedUrl) void deleteFromR2(uploadedUrl).catch(() => {});
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la compra.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (purchase: SupplierPurchase) => {
    const result = await Swal.fire({
      title: "¿Eliminar compra?",
      text: `Se eliminará la compra del ${formatDate(purchase.date)}${
        purchase.documentUrl ? " y su documento adjunto" : ""
      }.`,
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
      if (purchase.documentUrl) void deleteFromR2(purchase.documentUrl).catch(() => {});
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
                  purchases.length === 1 ? "compra registrada" : "compras registradas"
                }`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={openCreate} disabled={formOpen}>
          <Plus className="h-3.5 w-3.5" /> Registrar compra
        </Button>
      </div>

      {formOpen && (
        <form onSubmit={save} className="mt-3 space-y-4 rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-base font-medium">
                {editingId ? "Editar compra" : "Nueva compra"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Agrega los productos comprados y adjunta la factura o boleta.
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={closeForm} title="Cerrar">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-3">
            <div className="space-y-1.5 sm:max-w-xs">
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
            <Label>Productos comprados</Label>
            {form.productNames.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                Agrega al menos un producto.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {form.productNames.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 rounded-full border bg-secondary/60 px-2.5 py-1 text-xs"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => removeProductName(name)}
                      className="text-muted-foreground transition hover:text-destructive"
                      aria-label={`Quitar ${name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Input
                value={productInput}
                onChange={(event) => setProductInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addProductName(productInput);
                  }
                }}
                placeholder="Nombre del producto"
                className="min-w-[12rem] flex-1"
                maxLength={120}
                aria-label="Nombre del producto comprado"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addProductName(productInput)}
                disabled={!productInput.trim()}
              >
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </div>

            {supplierProducts.length > 0 && (
              <div>
                <p className="mt-1 text-[10px] uppercase tracking-wider2 text-muted-foreground">
                  Productos de este proveedor
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {supplierProducts.map((product) => {
                    const added = form.productNames.some(
                      (name) => name.toLowerCase() === product.name.toLowerCase()
                    );
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => toggleSupplierProduct(product)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition ${
                          added
                            ? "border-primary/40 bg-secondary text-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-primary/25 hover:text-foreground"
                        }`}
                      >
                        {added ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        {product.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`purchase-document-${supplier.id}`}>Factura o boleta</Label>

            {form.documentUrl && !form.removeDocument && !form.file && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border bg-secondary/30 px-3 py-2 text-xs">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a
                  href={form.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate underline-offset-2 hover:underline"
                >
                  {form.documentName || "Ver documento adjunto"}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setForm({ ...form, removeDocument: true })}
                >
                  Quitar
                </Button>
              </div>
            )}

            {form.removeDocument && (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800">
                El documento actual se eliminará al guardar.{" "}
                <button
                  type="button"
                  className="underline underline-offset-2"
                  onClick={() => setForm({ ...form, removeDocument: false })}
                >
                  Deshacer
                </button>
              </p>
            )}

            {form.file && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border bg-secondary/30 px-3 py-2 text-xs">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{form.file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Quitar archivo"
                  onClick={() => selectFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {!form.file && (
              <label
                htmlFor={`purchase-document-${supplier.id}`}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
              >
                <UploadCloud className="h-4 w-4" />
                <span>
                  {form.documentUrl && !form.removeDocument
                    ? "Subir un documento nuevo (reemplaza el actual)"
                    : "Subir factura o boleta (PDF o imagen, máx. 15 MB)"}
                </span>
                <input
                  id={`purchase-document-${supplier.id}`}
                  type="file"
                  accept="application/pdf,image/*"
                  className="sr-only"
                  onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
                />
              </label>
            )}

            {!isUploadConfigured() && (
              <p className="text-[11px] text-amber-700">
                La subida de archivos no está configurada; puedes guardar la compra sin documento.
              </p>
            )}
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
          <Button variant="outline" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Registrar la primera
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {purchasePagination.pageItems.map((purchase) => (
            <div key={purchase.id} className="rounded-lg border bg-card p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{formatDate(purchase.date)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {purchase.productNames.length}{" "}
                    {purchase.productNames.length === 1 ? "producto" : "productos"}
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

              <div className="mt-2 flex flex-wrap gap-1.5">
                {purchase.productNames.map((name) => (
                  <span
                    key={name}
                    className="rounded-full border bg-secondary/60 px-2 py-0.5 text-[11px]"
                  >
                    {name}
                  </span>
                ))}
              </div>

              {purchase.documentUrl && (
                <a
                  href={purchase.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {purchase.documentName || "Ver factura o boleta"}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              {purchase.notes && (
                <p className="mt-2 whitespace-pre-line text-[11px] leading-relaxed text-muted-foreground">
                  {purchase.notes}
                </p>
              )}
            </div>
          ))}
          <Pagination
            page={purchasePagination.page}
            pageSize={purchasePagination.pageSize}
            total={purchasePagination.total}
            totalPages={purchasePagination.totalPages}
            onPageChange={purchasePagination.setPage}
            onPageSizeChange={purchasePagination.setPageSize}
            pageSizeOptions={[5, 10, 20]}
            itemLabel="compras"
          />
        </div>
      )}
    </div>
  );
}
