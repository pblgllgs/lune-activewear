import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ImageOff,
  Mail,
  Package,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import {
  createSupplier,
  deleteSupplier,
  subscribeSuppliers,
  updateSupplier,
} from "@/lib/suppliers";
import { categoryLabel } from "@/lib/categories";
import { isLowStock, isSoldOut, stockColors, totalStock, variantStock } from "@/lib/stock";
import { formatCLP } from "@/lib/utils";
import { SupplierPurchases } from "@/components/admin/SupplierPurchases";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import { usePagination } from "@/lib/use-pagination";
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

/** ¿El producto tiene unidades registradas? (null/ausente = sin información). */
function hasStockInfo(product: Product): boolean {
  return Boolean(
    (product.stockByVariant && Object.keys(product.stockByVariant).length > 0) ||
      (product.stockBySize && Object.keys(product.stockBySize).length > 0)
  );
}

function stockChipTone(stock: number | null): string {
  if (stock === null) return "border-border bg-background text-muted-foreground";
  if (stock === 0) return "border-destructive/30 bg-destructive/10 text-destructive";
  if (stock <= 3) return "border-amber-500/30 bg-amber-500/10 text-amber-700";
  return "border-emerald-600/30 bg-emerald-500/10 text-emerald-700";
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const supplierPagination = usePagination(suppliers, { pageSize: 10 });
  const selectorPagination = usePagination(filteredProducts, {
    pageSize: 12,
    resetKey: query,
  });

  const expandedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === expandedId) ?? null,
    [suppliers, expandedId]
  );
  const expandedPagination = usePagination(expandedSupplier?.productIds ?? [], {
    pageSize: 6,
    resetKey: expandedId,
  });

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

  const toggleExpanded = (supplierId: string) => {
    setExpandedId((current) => (current === supplierId ? null : supplierId));
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
              {supplierPagination.pageItems.map((supplier) => {
                const assigned = supplier.productIds
                  .map((id) => productById.get(id))
                  .filter((product): product is Product => Boolean(product));
                const missing = supplier.productIds.length - assigned.length;
                const expanded = expandedId === supplier.id;
                return (
                  <div
                    key={supplier.id}
                    className={`overflow-hidden rounded-lg border transition ${
                      expanded ? "border-primary/30 shadow-sm" : "hover:border-primary/25"
                    }`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={expanded}
                      aria-controls={`supplier-products-${supplier.id}`}
                      onClick={() => toggleExpanded(supplier.id)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          toggleExpanded(supplier.id);
                        }
                      }}
                      className="flex cursor-pointer flex-wrap items-start justify-between gap-3 p-4 transition hover:bg-secondary/20"
                    >
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
                                onClick={(event) => event.stopPropagation()}
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
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {assigned.length === 0
                            ? "Sin productos asociados · clic para ver el detalle"
                            : `${assigned.length} ${
                                assigned.length === 1 ? "producto asociado" : "productos asociados"
                              } · clic para ver el detalle`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <ChevronDown
                          className={`mr-1 h-4 w-4 text-muted-foreground transition-transform ${
                            expanded ? "rotate-180" : ""
                          }`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Editar proveedor"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEdit(supplier);
                          }}
                          disabled={busyId === supplier.id}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Eliminar proveedor"
                          onClick={(event) => {
                            event.stopPropagation();
                            void remove(supplier);
                          }}
                          disabled={busyId === supplier.id}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {expanded && (
                      <div
                        id={`supplier-products-${supplier.id}`}
                        className="border-t bg-secondary/20 p-4"
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[10px] uppercase tracking-brand text-muted-foreground">
                            Productos que provee
                          </p>
                          <Button variant="outline" size="sm" onClick={() => openEdit(supplier)}>
                            <Pencil className="h-3.5 w-3.5" /> Asociar productos
                          </Button>
                        </div>

                        {supplier.productIds.length === 0 ? (
                          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-card/60 p-6 text-center text-sm text-muted-foreground">
                            <Package className="h-6 w-6" />
                            <p>Este proveedor aún no tiene productos asociados.</p>
                            <Button variant="outline" size="sm" onClick={() => openEdit(supplier)}>
                              <Plus className="h-3.5 w-3.5" /> Asociar el primero
                            </Button>
                          </div>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {expandedPagination.pageItems.map((productId) => {
                              const product = productById.get(productId);
                              if (!product) {
                                return (
                                  <div
                                    key={productId}
                                    className="flex gap-3 rounded-lg border border-dashed bg-card/60 p-3"
                                  >
                                    <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-md border bg-secondary text-muted-foreground">
                                      <ImageOff className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium">Producto no disponible</p>
                                      <p className="mt-0.5 break-all text-[11px] text-muted-foreground">
                                        ID: {productId}
                                      </p>
                                      <p className="mt-1 text-[11px] text-muted-foreground">
                                        Ya no existe en el catálogo.
                                      </p>
                                    </div>
                                  </div>
                                );
                              }

                              const registered = hasStockInfo(product);
                              const units = totalStock(product);
                              return (
                                <div
                                  key={product.id}
                                  className="flex gap-3 rounded-lg border bg-card p-3"
                                >
                                  <div className="h-20 w-16 shrink-0 overflow-hidden rounded-md border bg-secondary">
                                    {product.images[0] ? (
                                      <img
                                        src={product.images[0]}
                                        alt={product.name}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                        <ImageOff className="h-5 w-5" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-start gap-1.5">
                                      <p className="truncate text-sm font-medium" title={product.name}>
                                        {product.name}
                                      </p>
                                      {product.published === false && (
                                        <Badge variant="outline" className="text-[9px]">
                                          Borrador
                                        </Badge>
                                      )}
                                      {isSoldOut(product) && (
                                        <Badge variant="secondary" className="text-[9px]">
                                          Agotado
                                        </Badge>
                                      )}
                                      {!isSoldOut(product) && isLowStock(product) && (
                                        <Badge
                                          variant="accent"
                                          className="text-[9px] text-amber-800"
                                        >
                                          Bajo stock
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                                      {product.sku ?? "Sin SKU"}
                                    </p>
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                      {categoryLabel(product.category)} · {formatCLP(product.price)}
                                    </p>
                                    {product.colors.length > 0 && (
                                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                        {product.colors.map((color) => (
                                          <span
                                            key={color.name}
                                            title={color.name}
                                            className="h-3 w-3 rounded-full border border-primary/20"
                                            style={{ backgroundColor: color.hex }}
                                          />
                                        ))}
                                      </div>
                                    )}
                                    <div className="mt-1.5 space-y-1.5">
                                      {product.sizes.length === 0 ? (
                                        <span className="text-[10px] text-muted-foreground">
                                          Sin tallas
                                        </span>
                                      ) : (
                                        stockColors(product).map((colorName) => {
                                          const colors = stockColors(product);
                                          return (
                                            <div key={colorName}>
                                              {colors.length > 1 && (
                                                <p className="mb-0.5 text-[10px] font-medium text-muted-foreground">
                                                  {colorName}
                                                </p>
                                              )}
                                              <div className="flex flex-wrap gap-1">
                                                {product.sizes.map((size) => {
                                                  const stock = variantStock(product, size, colorName);
                                                  return (
                                                    <span
                                                      key={`${colorName}-${size}`}
                                                      className={`rounded border px-1 py-0.5 text-[10px] tabular-nums ${stockChipTone(stock)}`}
                                                    >
                                                      {size}{" "}
                                                      <span className="font-medium">{stock ?? "—"}</span>
                                                    </span>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                    <p className="mt-1 text-[10px] text-muted-foreground">
                                      {registered
                                        ? `${units} ${
                                            units === 1 ? "unidad registrada" : "unidades registradas"
                                          }`
                                        : "Sin stock registrado"}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <Pagination
                          page={expandedPagination.page}
                          pageSize={expandedPagination.pageSize}
                          total={expandedPagination.total}
                          totalPages={expandedPagination.totalPages}
                          onPageChange={expandedPagination.setPage}
                          onPageSizeChange={expandedPagination.setPageSize}
                          pageSizeOptions={[6, 12, 24]}
                          itemLabel="productos"
                          className="mt-3"
                        />
                        <SupplierPurchases supplier={supplier} products={products} />
                      </div>
                    )}
                  </div>
                );
              })}
              <Pagination
                page={supplierPagination.page}
                pageSize={supplierPagination.pageSize}
                total={supplierPagination.total}
                totalPages={supplierPagination.totalPages}
                onPageChange={supplierPagination.setPage}
                onPageSizeChange={supplierPagination.setPageSize}
                itemLabel="proveedores"
                className="pt-1"
              />
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
                        {selectorPagination.pageItems.map((product) => {
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
                    <Pagination
                      page={selectorPagination.page}
                      pageSize={selectorPagination.pageSize}
                      total={selectorPagination.total}
                      totalPages={selectorPagination.totalPages}
                      onPageChange={selectorPagination.setPage}
                      onPageSizeChange={selectorPagination.setPageSize}
                      pageSizeOptions={[12, 24, 48]}
                      itemLabel="productos"
                      className="mt-2"
                    />
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
