import { useEffect, useMemo, useState } from "react";
import { BarChart3, ChevronDown, ChevronUp, Download, Package, TrendingUp } from "lucide-react";
import { subscribeOrders } from "@/lib/orders";
import { formatCLP } from "@/lib/utils";
import { usePagination } from "@/lib/use-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import type { Order } from "@/types/order";

function formatDate(value?: string): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function monthKey(value?: string): string {
  if (!value) return "sin-fecha";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "sin-fecha";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  if (key === "sin-fecha") return "Sin fecha";
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleString("es-CL", { month: "long", year: "numeric" });
}

function saleDate(order: Order): string | undefined {
  return order.approvedAt || order.paidAt || order.shippedAt || order.createdAt;
}

export function SalesManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reportMonth, setReportMonth] = useState<string>("");

  useEffect(() => {
    const unsubscribe = subscribeOrders((next) => {
      setOrders(next);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const sales = useMemo(
    () =>
      orders
        .filter((o) => o.status === "aprobada" || o.status === "pagado" || o.status === "enviado")
        .sort((a, b) => (saleDate(b) ?? "").localeCompare(saleDate(a) ?? "")),
    [orders]
  );

  const totalRevenue = useMemo(() => sales.reduce((sum, o) => sum + o.subtotal, 0), [sales]);
  const totalUnits = useMemo(
    () => sales.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.qty, 0), 0),
    [sales]
  );

  const byMonth = useMemo(() => {
    const map = new Map<string, { key: string; total: number; count: number; units: number }>();
    for (const order of sales) {
      const key = monthKey(saleDate(order));
      const entry = map.get(key) ?? { key, total: 0, count: 0, units: 0 };
      entry.total += order.subtotal;
      entry.count += 1;
      entry.units += order.items.reduce((s, i) => s + i.qty, 0);
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [sales]);

  const byProduct = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; qty: number; revenue: number }
    >();
    for (const order of sales) {
      for (const item of order.items) {
        const id = item.productId || item.name;
        const entry = map.get(id) ?? { id, name: item.name || id, qty: 0, revenue: 0 };
        entry.qty += item.qty;
        entry.revenue += item.price * item.qty;
        if (item.name) entry.name = item.name;
        map.set(id, entry);
      }
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);
  }, [sales]);

  const bestSeller = byProduct[0] ?? null;
  const maxMonthTotal = Math.max(1, ...byMonth.map((m) => m.total));
  const maxProductQty = Math.max(1, ...byProduct.map((p) => p.qty));

  useEffect(() => {
    if (!reportMonth && byMonth.length > 0) {
      setReportMonth(byMonth[byMonth.length - 1].key);
    }
  }, [byMonth, reportMonth]);

  const pagination = usePagination(sales, { pageSize: 10 });

  const salesOfMonth = (key: string) => sales.filter((o) => monthKey(saleDate(o)) === key);

  const downloadMonthPdf = async (key: string) => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const monthSales = salesOfMonth(key);
    const doc = new jsPDF();
    const label = monthLabel(key);
    doc.setFontSize(16);
    doc.text(`Reporte de ventas — ${label}`, 14, 18);
    doc.setFontSize(10);
    const monthTotal = monthSales.reduce((s, o) => s + o.subtotal, 0);
    const monthUnits = monthSales.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);
    doc.text(
      `Órdenes: ${monthSales.length}   Unidades: ${monthUnits}   Total: ${formatCLP(monthTotal)}`,
      14,
      26
    );

    autoTable(doc, {
      startY: 32,
      head: [["Fecha", "Código", "Clienta", "Productos", "Unidades", "Total"]],
      body: monthSales.map((o) => [
        formatDate(saleDate(o)),
        o.code,
        o.customer.name || "-",
        o.items.map((i) => `${i.name} (${i.size}/${i.color}) x${i.qty}`).join("; "),
        String(o.items.reduce((s, i) => s + i.qty, 0)),
        formatCLP(o.subtotal),
      ]),
      styles: { fontSize: 8, cellWidth: "wrap" },
      headStyles: { fillColor: [78, 52, 46] },
      columnStyles: { 3: { cellWidth: 70 } },
    });

    doc.save(`ventas-${key}.pdf`);
  };

  const downloadProductPdf = async () => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Reporte de ventas por producto", 14, 18);
    doc.setFontSize(10);
    doc.text(
      `Productos: ${byProduct.length}   Unidades vendidas: ${totalUnits}   Total: ${formatCLP(totalRevenue)}`,
      14,
      26
    );

    autoTable(doc, {
      startY: 32,
      head: [["#", "Producto", "Unidades vendidas", "Ingresos"]],
      body: byProduct.map((p, i) => [String(i + 1), p.name, String(p.qty), formatCLP(p.revenue)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [78, 52, 46] },
    });

    doc.save("ventas-por-producto.pdf");
  };

  if (loading) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Cargando ventas…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">Ingresos (ventas realizadas)</p>
            <p className="mt-1 font-display text-2xl">{formatCLP(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">Ventas</p>
            <p className="mt-1 font-display text-2xl">{sales.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">Unidades vendidas</p>
            <p className="mt-1 font-display text-2xl">{totalUnits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">Más vendido</p>
            <p className="mt-1 truncate text-sm font-medium">{bestSeller ? bestSeller.name : "—"}</p>
            {bestSeller && (
              <p className="text-xs text-muted-foreground">{bestSeller.qty} uds · {formatCLP(bestSeller.revenue)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-4 w-4" /> Ventas por mes
            </CardTitle>
            <CardDescription>Ingresos de ventas realizadas (aprobadas, pagadas o enviadas) por mes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {byMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay ventas realizadas.</p>
            ) : (
              byMonth.map((m) => (
                <div key={m.key} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="capitalize">{monthLabel(m.key)}</span>
                    <span className="font-medium">{formatCLP(m.total)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(4, (m.total / maxMonthTotal) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{m.count} ventas · {m.units} uds</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-4 w-4" /> Productos más vendidos
            </CardTitle>
            <CardDescription>Top productos por unidades vendidas (ventas realizadas).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {byProduct.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay ventas realizadas.</p>
            ) : (
              byProduct.slice(0, 8).map((p, i) => (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate">
                      <span className="mr-2 text-muted-foreground">#{i + 1}</span>
                      {p.name}
                    </span>
                    <span className="shrink-0 font-medium">{p.qty} uds</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.max(4, (p.qty / maxProductQty) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{formatCLP(p.revenue)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Download className="h-4 w-4" /> Reportes en PDF
          </CardTitle>
          <CardDescription>Descarga el detalle de ventas por mes o por producto.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
          <div className="space-y-2">
            <p className="text-xs font-medium">Ventas por mes</p>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={reportMonth} onValueChange={setReportMonth} disabled={byMonth.length === 0}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Elige un mes" />
                </SelectTrigger>
                <SelectContent>
                  {byMonth.map((m) => (
                    <SelectItem key={m.key} value={m.key}>
                      {monthLabel(m.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => reportMonth && downloadMonthPdf(reportMonth)}
                disabled={!reportMonth || byMonth.length === 0}
              >
                <Download className="mr-2 h-4 w-4" /> PDF del mes
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium">Ventas por producto</p>
            <Button variant="outline" onClick={downloadProductPdf} disabled={byProduct.length === 0}>
              <Download className="mr-2 h-4 w-4" /> PDF por producto
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-4 w-4" /> Ventas detalladas
          </CardTitle>
          <CardDescription>Ventas realizadas (aprobadas, pagadas o enviadas), incluidas las manuales.</CardDescription>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aún no hay ventas realizadas. Las ventas aprobadas, pagadas o enviadas aparecerán aquí.
            </p>
          ) : (
            <div className="space-y-3">
              {pagination.pageItems.map((order) => {
                const open = expandedId === order.id;
                const units = order.items.reduce((s, i) => s + i.qty, 0);
                return (
                  <div key={order.id} className="rounded-lg border">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-secondary/30"
                      onClick={() => setExpandedId(open ? null : order.id)}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{order.code}</span>
                          <Badge variant="secondary">{formatCLP(order.subtotal)}</Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {order.customer.name || "Clienta"} · {formatDate(saleDate(order))} · {units} uds
                        </p>
                      </div>
                      {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                    </button>
                    {open && (
                      <div className="border-t px-4 py-3 text-sm">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <p><span className="text-muted-foreground">Correo:</span> {order.customer.email || order.customerEmail || "—"}</p>
                          <p><span className="text-muted-foreground">Teléfono:</span> {order.customer.phone || "—"}</p>
                          <p><span className="text-muted-foreground">Ciudad:</span> {order.customer.city || "—"}</p>
                          <p><span className="text-muted-foreground">Dirección:</span> {order.customer.address || "—"}</p>
                        </div>
                        <div className="mt-3 space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={`${item.productId}-${idx}`} className="flex items-center justify-between gap-2 text-xs">
                              <span className="truncate">
                                {item.name} · {item.size} · {item.color} × {item.qty}
                              </span>
                              <span className="shrink-0 font-medium">{formatCLP(item.price * item.qty)}</span>
                            </div>
                          ))}
                        </div>
                        {order.notes && (
                          <p className="mt-2 text-xs text-muted-foreground">Notas: {order.notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                pageSize={pagination.pageSize}
                onPageChange={pagination.setPage}
                itemLabel="ventas"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
