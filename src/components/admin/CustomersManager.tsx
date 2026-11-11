import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Mail, MapPin, Phone, Search, ShoppingBag, Users } from "lucide-react";
import { subscribeOrders } from "@/lib/orders";
import { usePagination } from "@/lib/use-pagination";
import { formatCLP } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import type { Order, OrderCustomer } from "@/types/order";

type CustomerRecord = {
  key: string;
  customer: OrderCustomer;
  email: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt?: string;
  orderCodes: string[];
};

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

function buildCustomers(orders: Order[]): CustomerRecord[] {
  const map = new Map<string, CustomerRecord>();
  for (const order of orders) {
    const c = order.customer;
    const email = (order.customerEmail || c.email || "").trim().toLowerCase();
    const phone = (c.phone || "").replace(/\s+/g, "").trim();
    const name = (c.name || "").trim().toLowerCase();
    const key = email || (phone ? `${phone}|${name}` : name ? `name:${name}` : `order:${order.id}`);
    if (!key) continue;
    const existing = map.get(key);
    const spent = order.subtotal || 0;
    if (!existing) {
      map.set(key, {
        key,
        customer: {
          name: c.name || "",
          phone: c.phone || "",
          email: c.email,
          address: c.address || "",
          city: c.city || "",
        },
        email: email || c.email || "",
        ordersCount: 1,
        totalSpent: spent,
        lastOrderAt: order.createdAt,
        orderCodes: [order.code].filter(Boolean),
      });
    } else {
      existing.ordersCount += 1;
      existing.totalSpent += spent;
      if (!existing.lastOrderAt || (order.createdAt && order.createdAt > existing.lastOrderAt)) {
        existing.lastOrderAt = order.createdAt;
        existing.customer = {
          name: c.name || existing.customer.name,
          phone: c.phone || existing.customer.phone,
          email: c.email || existing.customer.email,
          address: c.address || existing.customer.address,
          city: c.city || existing.customer.city,
        };
        if (email) existing.email = email;
      }
      if (order.code && !existing.orderCodes.includes(order.code)) existing.orderCodes.push(order.code);
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? "")
  );
}

export function CustomersManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const customers = useMemo(() => buildCustomers(orders), [orders]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((c) =>
      [c.customer.name, c.customer.phone, c.email, c.customer.address, c.customer.city, ...c.orderCodes]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [customers, query]);

  const pagination = usePagination(filtered, { pageSize: 10, resetKey: query });

  const stats = useMemo(() => {
    const total = customers.length;
    const repeat = customers.filter((c) => c.ordersCount > 1).length;
    const revenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    return { total, repeat, revenue };
  }, [customers]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-3xl">
              {stats.total}
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Clientes registrados</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-3xl">
              {stats.repeat}
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Clientes recurrentes</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{formatCLP(stats.revenue)}</CardTitle>
            <CardDescription>Total en pedidos</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes</CardTitle>
          <CardDescription>
            Directorio construido a partir de los datos de las órdenes (web y manuales). Usa esta
            información para contactar clientas o autocompletar pedidos manuales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, correo, teléfono, dirección o código de orden…"
              className="h-10 pl-9"
              aria-label="Buscar clientes"
            />
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando clientes…</p>
          ) : filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              {customers.length === 0
                ? "Aún no hay clientes registrados (se crean al recibir órdenes)."
                : "No hay clientes que coincidan con la búsqueda."}
            </p>
          ) : (
            <div className="space-y-3">
              {pagination.pageItems.map((c) => {
                const isOpen = expanded === c.key;
                return (
                  <div key={c.key} className="rounded-lg border bg-card">
                    <button
                      type="button"
                      className="flex w-full flex-wrap items-start justify-between gap-3 p-4 text-left transition hover:bg-secondary/20"
                      onClick={() => setExpanded(isOpen ? null : c.key)}
                      aria-expanded={isOpen}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-base font-medium">{c.customer.name || "Sin nombre"}</p>
                          {c.ordersCount > 1 && <Badge variant="secondary">Recurrente</Badge>}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {c.customer.phone && (
                            <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {c.customer.phone}</span>
                          )}
                          {(c.email || c.customer.email) && (
                            <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email || c.customer.email}</span>
                          )}
                          {(c.customer.city || c.customer.address) && (
                            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {[c.customer.address, c.customer.city].filter(Boolean).join(", ")}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <p className="text-sm font-medium">{c.ordersCount} {c.ordersCount === 1 ? "pedido" : "pedidos"}</p>
                          <p className="text-xs text-muted-foreground">Último: {formatDate(c.lastOrderAt)}</p>
                          <p className="text-xs font-medium">{formatCLP(c.totalSpent)}</p>
                        </div>
                        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="border-t px-4 py-3 text-sm">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <p><span className="text-muted-foreground">Nombre:</span> {c.customer.name || "—"}</p>
                          <p><span className="text-muted-foreground">Teléfono:</span> {c.customer.phone || "—"}</p>
                          <p><span className="text-muted-foreground">Correo:</span> {c.email || c.customer.email || "—"}</p>
                          <p><span className="text-muted-foreground">Ciudad:</span> {c.customer.city || "—"}</p>
                          <p className="sm:col-span-2"><span className="text-muted-foreground">Dirección:</span> {c.customer.address || "—"}</p>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Órdenes: {c.orderCodes.slice(0, 12).join(", ")}{c.orderCodes.length > 12 ? ` (+${c.orderCodes.length - 12})` : ""}
                        </p>
                      </div>
                    )}
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
                itemLabel="clientes"
                className="pt-1"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
