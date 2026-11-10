import { useMemo, useState } from "react";
import { Boxes, Download, FileDown, Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import {
  LAST_UNITS_THRESHOLD,
  isLowStock,
  isSoldOut,
  stockColors,
  totalStock,
  variantStock,
} from "@/lib/stock";
import { usePagination } from "@/lib/use-pagination";
import { formatCLP } from "@/lib/utils";
import type { Product } from "@/types/product";

type StatusFilter = "todos" | "publicados" | "borradores" | "agotados" | "bajo";

/** ¿El producto tiene unidades registradas? (ausente = sin información/límite). */
function hasStockInfo(product: Product): boolean {
  return Boolean(
    (product.stockByVariant && Object.keys(product.stockByVariant).length > 0) ||
      (product.stockBySize && Object.keys(product.stockBySize).length > 0)
  );
}

function stockTone(stock: number | null): string {
  if (stock === null) return "border-border bg-background text-muted-foreground";
  if (stock === 0) return "border-destructive/30 bg-destructive/10 text-destructive";
  if (stock <= LAST_UNITS_THRESHOLD) return "border-amber-500/30 bg-amber-500/10 text-amber-700";
  return "border-primary/10 bg-secondary text-foreground";
}

function stockSummary(product: Product): string {
  if (product.sizes.length === 0) return "Sin tallas";
  const colors = stockColors(product);
  return colors
    .map((color) => {
      const parts = product.sizes
        .map((size) => `${size}: ${variantStock(product, size, color) ?? "—"}`)
        .join(" · ");
      return colors.length > 1 ? `${color}: ${parts}` : parts;
    })
    .join(" | ");
}

export function InventoryPanel({
  products,
  onEdit,
}: {
  products: Product[];
  onEdit: (product: Product) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todas");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [pdfBusy, setPdfBusy] = useState(false);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      if (category !== "todas" && product.category !== category) return false;
      if (status === "publicados" && product.published === false) return false;
      if (status === "borradores" && product.published !== false) return false;
      if (status === "agotados" && !isSoldOut(product)) return false;
      if (status === "bajo" && !isLowStock(product)) return false;
      if (!term) return true;
      return [
        product.name,
        product.sku ?? "",
        categoryLabel(product.category),
        ...product.colors.map((color) => color.name),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [products, category, status, query]);

  const pagination = usePagination(filtered, {
    pageSize: 10,
    resetKey: `${category}|${status}|${query}`,
  });

  const totals = useMemo(() => {
    const units = filtered.reduce((sum, product) => sum + totalStock(product), 0);
    const value = filtered.reduce(
      (sum, product) => sum + (product.price || 0) * totalStock(product),
      0
    );
    return {
      units,
      value,
      soldOut: filtered.filter((product) => isSoldOut(product)).length,
      low: filtered.filter((product) => isLowStock(product)).length,
    };
  }, [filtered]);

  const exportCsv = () => {
    const header = [
      "SKU",
      "Producto",
      "Categoría",
      "Estado",
      "Colores",
      "Stock por color y talla",
      "Unidades",
      "Precio",
      "Valor",
    ];
    const rows = filtered.map((product) => [
      product.sku ?? "",
      product.name,
      categoryLabel(product.category),
      product.published === false ? "Borrador" : "Publicado",
      product.colors.map((color) => color.name).join(" / "),
      stockSummary(product),
      hasStockInfo(product) ? totalStock(product) : "",
      product.price,
      hasStockInfo(product) ? product.price * totalStock(product) : "",
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inventario-lune.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    if (filtered.length === 0 || pdfBusy) return;
    setPdfBusy(true);
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      const generatedAt = new Date().toLocaleString("es-CL", {
        dateStyle: "long",
        timeStyle: "short",
      });
      const filterSummary = [
        category === "todas" ? "Todas las categorías" : categoryLabel(category),
        status === "todos"
          ? "Todos los estados"
          : status === "publicados"
            ? "Publicados"
            : status === "borradores"
              ? "Borradores"
              : status === "agotados"
                ? "Agotados"
                : "Bajo stock",
        query.trim() ? `Búsqueda: "${query.trim()}"` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      doc.setProperties({
        title: "Inventario detallado | LUNÉ Activewear",
        subject: "Inventario de productos",
        creator: "LUNÉ Activewear",
      });

      doc.setFillColor(73, 55, 45);
      doc.rect(0, 0, pageWidth, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("LUNÉ ACTIVEWEAR", margin, 9);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Inventario detallado", margin, 15);
      doc.setFontSize(8);
      doc.text(generatedAt, pageWidth - margin, 9, { align: "right" });

      doc.setTextColor(120, 105, 95);
      doc.setFontSize(8);
      doc.text(`Filtros: ${filterSummary}`, margin, 27);

      const metrics = [
        { label: "PRODUCTOS", value: String(filtered.length) },
        { label: "UNIDADES EN STOCK", value: String(totals.units) },
        { label: "VALOR DEL INVENTARIO", value: formatCLP(totals.value) },
        { label: "AGOTADOS / BAJO STOCK", value: `${totals.soldOut} / ${totals.low}` },
      ];
      const boxGap = 4;
      const boxWidth = (pageWidth - margin * 2 - boxGap * (metrics.length - 1)) / metrics.length;
      metrics.forEach((metric, index) => {
        const x = margin + index * (boxWidth + boxGap);
        doc.setFillColor(246, 241, 235);
        doc.roundedRect(x, 31, boxWidth, 15, 2, 2, "F");
        doc.setTextColor(130, 115, 105);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.text(metric.label, x + 3, 36);
        doc.setTextColor(73, 55, 45);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(metric.value, x + 3, 43);
      });

      doc.setTextColor(150, 135, 125);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.text(
        '"-" = sin stock registrado: la tienda lo considera disponible sin límite.',
        margin,
        51
      );

      const body = filtered.map((product) => {
        const registered = hasStockInfo(product);
        const units = totalStock(product);
        const state =
          product.published === false
            ? "Borrador"
            : isSoldOut(product)
              ? "Agotado"
              : isLowStock(product)
                ? "Bajo stock"
                : "Disponible";
        return [
          product.name,
          product.sku ?? "-",
          categoryLabel(product.category),
          state,
          product.colors.map((color) => color.name).join(", ") || "-",
          stockSummary(product),
          registered ? String(units) : "-",
          formatCLP(product.price),
          registered ? formatCLP(product.price * units) : "-",
        ];
      });

      autoTable(doc, {
        startY: 55,
        head: [
          [
            "Producto",
            "SKU",
            "Categoría",
            "Estado",
            "Colores",
            "Stock por color y talla",
            "Unidades",
            "Precio",
            "Valor",
          ],
        ],
        body,
        margin: { left: margin, right: margin, bottom: 16 },
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 7.2,
          cellPadding: 1.8,
          textColor: [60, 50, 45],
          lineColor: [225, 216, 208],
          lineWidth: 0.15,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: {
          fillColor: [73, 55, 45],
          textColor: [255, 255, 255],
          fontSize: 7,
          fontStyle: "bold",
          halign: "left",
        },
        alternateRowStyles: { fillColor: [248, 244, 239] },
        columnStyles: {
          0: { cellWidth: 45, fontStyle: "bold" },
          1: { cellWidth: 24, font: "courier" },
          2: { cellWidth: 18 },
          3: { cellWidth: 18 },
          4: { cellWidth: 30 },
          5: { cellWidth: 62 },
          6: { cellWidth: 14, halign: "right" },
          7: { cellWidth: 20, halign: "right" },
          8: { cellWidth: 20, halign: "right" },
        },
      });

      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(150, 135, 125);
        doc.text("LUNÉ Activewear · Inventario", margin, pageHeight - 7);
        doc.text(`Página ${page} de ${pageCount}`, pageWidth - margin, pageHeight - 7, {
          align: "right",
        });
      }

      doc.save(`inventario-lune-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Inventario exportado en PDF.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el PDF.");
    } finally {
      setPdfBusy(false);
    }
  };

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
          <Boxes className="h-8 w-8" />
          <p>Aún no hay productos para inventariar.</p>
          <p className="max-w-sm text-xs">
            Crea un producto o importa el catálogo de ejemplo para ver aquí sus tallas, unidades y
            valor.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{filtered.length}</CardTitle>
            <CardDescription>Productos en vista</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{totals.units}</CardTitle>
            <CardDescription>Unidades en stock</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{formatCLP(totals.value)}</CardTitle>
            <CardDescription>Valor del inventario</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">
              {totals.soldOut}
              <span className="ml-1 text-base font-normal text-muted-foreground">/ {totals.low}</span>
            </CardTitle>
            <CardDescription>Agotados / bajo stock</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-end sm:justify-between sm:space-y-0">
          <div>
            <CardTitle className="text-lg">Inventario detallado</CardTitle>
            <CardDescription>
              Stock por color y talla, unidades totales y valor de cada producto.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void exportPdf()}
              disabled={filtered.length === 0 || pdfBusy}
            >
              <FileDown className="h-4 w-4" />
              {pdfBusy ? "Generando..." : "Exportar PDF"}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre, SKU o color"
                className="pl-9"
                aria-label="Buscar en el inventario"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger aria-label="Filtrar por categoría">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
              <SelectTrigger aria-label="Filtrar por estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="publicados">Publicados</SelectItem>
                <SelectItem value="borradores">Borradores</SelectItem>
                <SelectItem value="agotados">Agotados</SelectItem>
                <SelectItem value="bajo">Bajo stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No hay productos que coincidan con los filtros.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead className="bg-secondary/60 text-[10px] uppercase tracking-wider2 text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Producto
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Categoría
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Colores
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Stock por color y talla
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Unidades
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Precio
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Valor
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Estado
                    </th>
                    <th scope="col" className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {pagination.pageItems.map((product) => {
                    const registered = hasStockInfo(product);
                    const units = totalStock(product);
                    const colors = stockColors(product);
                    return (
                      <tr key={product.id} className="border-t align-top">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-12 w-10 shrink-0 overflow-hidden rounded-md border bg-secondary">
                              {product.images[0] ? (
                                <img
                                  src={product.images[0]}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[16rem] truncate font-medium">{product.name}</p>
                              <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                                {product.sku ?? "Sin SKU"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {categoryLabel(product.category)}
                        </td>
                        <td className="px-3 py-3">
                          {product.colors.length === 0 ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : (
                            <div className="flex max-w-[10rem] flex-wrap items-center gap-1">
                              {product.colors.slice(0, 6).map((color) => (
                                <span
                                  key={color.name}
                                  title={color.name}
                                  className="h-3.5 w-3.5 rounded-full border border-primary/20"
                                  style={{ backgroundColor: color.hex }}
                                />
                              ))}
                              {product.colors.length > 6 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{product.colors.length - 6}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {product.sizes.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Sin tallas</span>
                          ) : (
                            <div className="max-w-[22rem] space-y-2">
                              {colors.map((colorName) => (
                                <div key={colorName}>
                                  {colors.length > 1 && (
                                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                      {colorName}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap gap-1">
                                    {product.sizes.map((size) => {
                                      const stock = variantStock(product, size, colorName);
                                      return (
                                        <span
                                          key={`${colorName}-${size}`}
                                          className={`rounded-md border px-1.5 py-0.5 text-[11px] tabular-nums ${stockTone(stock)}`}
                                        >
                                          {size} <span className="font-medium">{stock ?? "-"}</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-medium tabular-nums">
                          {registered ? units : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{formatCLP(product.price)}</td>
                        <td className="px-3 py-3 text-right font-medium tabular-nums">
                          {registered ? (
                            formatCLP(product.price * units)
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1">
                            {product.published === false ? (
                              <Badge variant="secondary">Borrador</Badge>
                            ) : (
                              <Badge>Publicado</Badge>
                            )}
                            {isSoldOut(product) ? (
                              <Badge variant="outline" className="border-destructive/30 text-destructive">
                                Agotado
                              </Badge>
                            ) : isLowStock(product) ? (
                              <Badge variant="outline" className="border-amber-500/30 text-amber-700">
                                Bajo stock
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => onEdit(product)}>
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            itemLabel="productos"
          />

          <p className="text-[11px] text-muted-foreground">
            «—» = sin stock registrado: disponible sin límite. «Agotado/Bajo stock» se calculan con
            el total de unidades registradas por color y talla.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
