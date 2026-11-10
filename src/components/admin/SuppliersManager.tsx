import { useEffect, useMemo, useState } from "react";
import { Check, Mail, Package, Pencil, Phone, Plus, Search, Trash2, Truck, X } from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import {
  createSupplier,
  deleteSupplier,
  subscribeSuppliers,
  updateSupplier,
} from "@/lib/suppliers";
import { categoryLabel } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Product } from "@/types/product";
import type { Supplier } from "@/types/supplier";

type FormState = {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  notes: string;
  productIds: string[];
};

const EMPTY_FORM: FormState = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  notes: "",
  productIds: [],
};

function toForm(supplier: Supplier): FormState {
  return {
    name: supplier.name,
    contactName: supplier.contactName ?? "",
    phone: supplier.phone ?? "",
    email: supplier.email ?? "",
    notes: supplier.notes ?? "",
    productIds: supplier.productIds,
  };
}

export function SuppliersManager({ products }: { products: Product[] }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeSuppliers((next) => {
      setSuppliers(next);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      [product.name, product.sku ?? "", categoryLabel(product.category)]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [products, query]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setQuery("");
    setFormOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setForm(toForm(supplier));
    setQuery("");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setQuery("");
  };

  const toggleProduct = (productId: string) => {
    setForm((current) => ({
      ...current,
      productIds: current.productIds.includes(productId)
        ? current.productIds.filter((id) => id !== productId)
        : [...current.productIds, productId],
    }));
  };

  const toggleAllFiltered = () => {
    const visibleIds = filteredProducts.map((product) => product.id);
    const allSelected = visibleIds.every((id) => form.productIds.includes(id));
    setForm((current) => ({
      ...current,
      productIds: allSelected
        ? current.productIds.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current.productIds, ...visibleIds])],
    }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("El nombre del proveedor es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      const input = { ...form, name: form.name.trim() };
      if (editingId) {
        await updateSupplier(editingId, input);
        toast.success("Proveedor actualizado.");
      } else {
        await createSupplier(input);
        toast.success("Proveedor creado.");
      }
      closeForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el proveedor.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (supplier: Supplier) => {
    const result = await Swal.fire({
      title: "¿Eliminar proveedor?",
      text: `Se eliminará "${supplier.name}". Los productos no se eliminan, solo dejan de estar asociados.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#49372D",
    });
    if (!result.isConfirmed) return;
    setBusyId(supplier.id);
    try {
      await deleteSupplier(supplier.id);
      toast.success("Proveedor eliminado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el proveedor.");
    } finally {
      setBusyId(null);
    }
  };

  const formTitle = editingId ? "Editar proveedor" : "Nuevo proveedor";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-end sm:justify-between sm:space-y-0">
          <div>
            <CardTitle className="text-lg">Proveedores</CardTitle>
            <CardDescription>
              Registra a quién le compras y asocia los productos que te provee cada uno.
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreate} disabled={formOpen}>
            <Plus className="h-4 w-4" /> Nuevo proveedor
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando proveedores…</p>
          ) : suppliers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
              <Truck className="h-8 w-8" />
              <p>Aún no tienes proveedores registrados.</p>
              <p className="max-w-sm text-xs">
                Crea el primero y marca los productos que te provee para saber a quién recurrir
                cuando necesites reponer stock.
              </p>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> Crear proveedor
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {suppliers.map((supplier) => {
                const assigned = supplier.productIds
                  .map((id) => productById.get(id))
                  .filter((product): product is Product => Boolean(product));
                const missing = supplier.productIds.length - assigned.length;
                return (
                  <div
                    key={supplier.id}
                    className="rounded-lg border p-4 transition hover:border-primary/25"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-lg font-medium">{supplier.name}</p>
                          <Badge variant="outline">
                            <Package className="h-3 w-3" /> {assigned.length}{" "}
                            {assigned.length === 1 ? "producto" : "productos"}
                          </Badge>
                          {missing > 0 && (
                            <Badge variant="accent" className="text-amber-800">
                              {missing} sin catálogo
                            </Badge>
                          )}
                        </div>
                        {(supplier.contactName || supplier.phone || supplier.email) && (
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {supplier.contactName && <span>{supplier.contactName}</span>}
                            {supplier.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {supplier.phone}
                              </span>
                            )}
                            {supplier.email && (
                              <a
                                href={`mailto:${supplier.email}`}
                                className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                              >
                                <Mail className="h-3 w-3" /> {supplier.email}
                              </a>
                            )}
                          </div>
                        )}
                        {supplier.notes && (
                          <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                            {supplier.notes}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {assigned.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              Sin productos asociados.
                            </span>
                          ) : (
                            assigned.map((product) => (
                              <span
                                key={product.id}
                                className="inline-flex items-center gap-1 rounded-full border bg-secondary/60 px-2 py-0.5 text-[11px]"
                              >
                                {product.name}
                                {product.sku && (
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {product.sku}
                                  </span>
                                )}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Editar proveedor"
                          onClick={() => openEdit(supplier)}
                          disabled={busyId === supplier.id}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Eliminar proveedor"
                          onClick={() => void remove(supplier)}
                          disabled={busyId === supplier.id}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {formOpen && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">{formTitle}</CardTitle>
                <CardDescription>
                  Datos de contacto y productos que este proveedor te entrega.
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={closeForm} title="Cerrar">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="supplier-name">Nombre *</Label>
                  <Input
                    id="supplier-name"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    placeholder="Ej: Textiles Andinos"
                    required
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="supplier-contact">Contacto</Label>
                  <Input
                    id="supplier-contact"
                    value={form.contactName}
                    onChange={(event) => setForm({ ...form, contactName: event.target.value })}
                    placeholder="Nombre de la persona"
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="supplier-phone">Teléfono</Label>
                  <Input
                    id="supplier-phone"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    placeholder="+56 9 1234 5678"
                    maxLength={40}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="supplier-email">Email</Label>
                  <Input
                    id="supplier-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    placeholder="ventas@proveedor.cl"
                    maxLength={160}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="supplier-notes">Notas</Label>
                  <Textarea
                    id="supplier-notes"
                    value={form.notes}
                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                    placeholder="Condiciones de compra, plazos de entrega, mínimos…"
                    rows={3}
                    maxLength={2000}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <Label>Productos que provee</Label>
                    <p className="text-[11px] text-muted-foreground">
                      {form.productIds.length === 0
                        ? "Ningún producto seleccionado."
                        : `${form.productIds.length} ${
                            form.productIds.length === 1 ? "producto seleccionado" : "productos seleccionados"
                          }.`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleAllFiltered}
                    disabled={filteredProducts.length === 0}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {filteredProducts.every((product) => form.productIds.includes(product.id))
                      ? "Quitar visibles"
                      : "Seleccionar visibles"}
                  </Button>
                </div>

                {products.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Aún no hay productos en el catálogo. Crea productos para poder asociarlos.
                  </p>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar producto por nombre, SKU o categoría"
                        className="pl-9"
                        aria-label="Buscar producto para asociar"
                      />
                    </div>

                    {filteredProducts.length === 0 ? (
                      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No hay productos que coincidan con la búsqueda.
                      </p>
                    ) : (
                      <div className="grid max-h-80 gap-2 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2">
                        {filteredProducts.map((product) => {
                          const checked = form.productIds.includes(product.id);
                          return (
                            <label
                              key={product.id}
                              className={`flex cursor-pointer items-center gap-3 rounded-md border p-2 transition ${
                                checked
                                  ? "border-primary/40 bg-secondary/70"
                                  : "border-transparent hover:bg-secondary/40"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleProduct(product.id)}
                                className="h-4 w-4 shrink-0 accent-primary"
                              />
                              <div className="h-10 w-8 shrink-0 overflow-hidden rounded border bg-secondary">
                                {product.images[0] ? (
                                  <img
                                    src={product.images[0]}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                ) : null}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{product.name}</p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {categoryLabel(product.category)}
                                  {product.sku ? ` · ${product.sku}` : ""}
                                  {product.published === false ? " · Borrador" : ""}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear proveedor"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
