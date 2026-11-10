import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, Mail, Package, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { getAuthSettings } from "@/lib/auth-settings";
import {
  clearMagicLinkParams,
  completeMagicLink,
  isMagicLink,
  sendMagicLink,
  storedMagicEmail,
} from "@/lib/auth";
import { getMyOrders } from "@/lib/orders";
import { usePagination } from "@/lib/use-pagination";
import { useSeo } from "@/lib/seo";
import { formatCLP } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types/order";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";

function statusBadge(status: OrderStatus) {
  if (status === "aprobada") return <Badge>Aprobada</Badge>;
  if (status === "rechazada")
    return <Badge className="border-destructive/20 bg-destructive/10 text-destructive">Rechazada</Badge>;
  return <Badge variant="secondary">Pendiente</Badge>;
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(date);
}

/** Pedidos de la clienta con sesión iniciada. */
function MyOrders({ email, userId }: { email: string; userId?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getMyOrders(email, userId)
      .then((list) => {
        if (!cancelled) setOrders(list);
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos cargar tus pedidos. Intenta de nuevo.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [email, userId]);

  const pagination = usePagination(orders, { pageSize: 10, resetKey: email });

  if (loading) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Cargando pedidos…</p>;
  }

  if (error) {
    return <p className="py-10 text-center text-sm text-destructive">{error}</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
          <ShoppingBag className="h-5 w-5 text-muted-foreground" />
        </span>
        <p className="font-display text-xl">Aún no tienes pedidos con este correo.</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Cuando compres, el pedido aparecerá aquí con su código y estado.
        </p>
        <Button asChild variant="outline">
          <Link to="/tienda">Ver la colección</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
          {orders.length} pedido{orders.length === 1 ? "" : "s"}
        </p>
      </div>

      <ul className="mt-3 space-y-3">
        {pagination.pageItems.map((order) => (
          <li key={order.id} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-display text-sm font-medium">{order.code}</p>
                <p className="text-[11px] text-muted-foreground">{formatDate(order.createdAt)}</p>
              </div>
              {statusBadge(order.status)}
            </div>

            <ul className="mt-3 space-y-1.5 border-t pt-3 text-xs">
              {order.items.map((item, index) => (
                <li key={`${order.id}-${index}`} className="flex justify-between gap-3">
                  <span className="min-w-0 text-muted-foreground">
                    {item.qty} × {item.name} · {item.size}
                    {item.color ? ` · ${item.color}` : ""}
                  </span>
                  <span className="shrink-0">{formatCLP(item.price * item.qty)}</span>
                </li>
              ))}
            </ul>

            {order.status === "rechazada" && order.rejectionReason && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Motivo: {order.rejectionReason}
              </p>
            )}

            <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-display text-base">{formatCLP(order.subtotal)}</span>
            </div>
          </li>
        ))}
      </ul>

      <Pagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={pagination.total}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
        itemLabel="pedidos"
        className="mt-6"
      />
    </div>
  );
}

export default function Account() {
  const { user, displayName, loading, signOutUser, updateDisplayName } = useAuth();
  const [magicEnabled, setMagicEnabled] = useState(true);
  const [email, setEmail] = useState("");
  const [linkEmail, setLinkEmail] = useState("");
  const [pendingLink, setPendingLink] = useState(false);
  const [sending, setSending] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState("");
  const [savingName, setSavingName] = useState(false);

  useSeo({
    title: "Mi cuenta | LUNÉ Activewear",
    description:
      "Entra con tu correo para ver tus pedidos LUNÉ Activewear: código, estado y detalle.",
    path: "/cuenta",
    noindex: true,
  });

  useEffect(() => {
    let cancelled = false;
    getAuthSettings().then((settings) => {
      if (!cancelled) setMagicEnabled(settings.magicLinkEnabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Enlace mágico recién abierto: se pide confirmar el correo si hace falta.
  useEffect(() => {
    if (!auth || !magicEnabled) return;
    if (!isMagicLink(auth)) return;
    setPendingLink(true);
    setLinkEmail((current) => current || storedMagicEmail());
  }, [magicEnabled]);

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!auth) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Escribe un correo válido.");
      return;
    }
    setSending(true);
    try {
      await sendMagicLink(auth, email.trim());
      setNotice(
        "Si el correo es válido, recibirás un enlace para entrar. Revisa también la carpeta de spam."
      );
      setCooldown(true);
      window.setTimeout(() => setCooldown(false), 60_000);
    } catch {
      setError("No pudimos enviar el enlace. Intenta de nuevo en unos minutos.");
    } finally {
      setSending(false);
    }
  };

  const confirmLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!auth) return;
    if (!/^\S+@\S+\.\S+$/.test(linkEmail.trim())) {
      setError("Escribe el correo con el que pediste el enlace.");
      return;
    }
    setCompleting(true);
    try {
      await completeMagicLink(auth, linkEmail.trim());
      setPendingLink(false);
    } catch {
      setError("El enlace expiró o ya se usó. Pide uno nuevo.");
      setPendingLink(false);
      clearMagicLinkParams();
    } finally {
      setCompleting(false);
    }
  };

  const logout = async () => {
    await signOutUser();
    toast.success("Sesión cerrada.");
  };

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");
    const clean = nameInput.trim().replace(/\s+/g, " ");
    if (clean.length < 2) {
      setNameError("Escribe al menos 2 caracteres.");
      return;
    }
    setSavingName(true);
    try {
      await updateDisplayName(clean);
      toast.success(`¡Bienvenida, ${clean}!`);
    } catch {
      setNameError("No pudimos guardar tu nombre. Intenta de nuevo.");
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="container max-w-3xl py-12 md:py-16">
      <header>
        <p className="text-[10px] uppercase tracking-brand text-muted-foreground md:text-[11px]">
          LUNÉ Activewear
        </p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight md:text-5xl">
          Mi cuenta
        </h1>
        {!loading && (
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {user ? (
              displayName ? (
                <>
                  Bienvenida,{" "}
                  <span className="font-medium text-foreground">{displayName}</span>. Aquí
                  puedes revisar tus pedidos, su estado y su detalle.
                </>
              ) : (
                "Cuéntanos cómo quieres que te llamemos para empezar."
              )
            ) : (
              "Entra con tu correo para ver tus pedidos, su estado y su detalle."
            )}
          </p>
        )}
      </header>

      {!isFirebaseConfigured ? (
        <p className="mt-10 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          La cuenta no está disponible en este momento.
        </p>
      ) : loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Cargando…</p>
      ) : user && !pendingLink ? (
        <div className="mt-8 space-y-6">
          {!displayName && (
            <Card className="border-primary/25 bg-secondary/30">
              <CardHeader>
                <CardTitle className="text-xl">¿Cómo quieres que te llamemos?</CardTitle>
                <CardDescription>
                  Así te saludamos en tu cuenta. Solo necesitamos un nombre.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={saveName} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Tu nombre</Label>
                    <Input
                      id="display-name"
                      value={nameInput}
                      onChange={(event) => setNameInput(event.target.value)}
                      placeholder="Ej: Camila"
                      autoComplete="given-name"
                      maxLength={60}
                      required
                    />
                  </div>
                  {nameError && <p className="text-sm text-destructive">{nameError}</p>}
                  <Button className="w-full" disabled={savingName}>
                    {savingName ? "Guardando…" : "Guardar y continuar"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
                    Sesión iniciada
                  </p>
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => void logout()}>
                <LogOut className="h-3.5 w-3.5" /> Salir
              </Button>
            </CardContent>
          </Card>

          {displayName ? (
            <section>
              <h2 className="flex items-center gap-2 font-display text-xl">
                <Package className="h-4 w-4" /> Mis pedidos
              </h2>
              <div className="mt-3">
                {user.email ? <MyOrders email={user.email} userId={user.uid} /> : null}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-xl">
              {pendingLink ? "Confirma tu correo" : "Entra con tu correo"}
            </CardTitle>
            <CardDescription>
              {pendingLink
                ? "Estás a un paso: confirma el correo con el que pediste el enlace."
                : "Te enviamos un enlace de un solo uso, sin contraseñas."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingLink ? (
              <form onSubmit={confirmLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="link-email">Correo</Label>
                  <Input
                    id="link-email"
                    type="email"
                    value={linkEmail}
                    onChange={(event) => setLinkEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button className="w-full" disabled={completing}>
                  {completing ? "Entrando…" : "Entrar"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingLink(false);
                    setError("");
                    clearMagicLinkParams();
                  }}
                  className="w-full text-center text-[10px] uppercase tracking-wider2 text-muted-foreground underline-offset-4 hover:underline"
                >
                  Pedir un enlace nuevo
                </button>
              </form>
            ) : magicEnabled ? (
              <form onSubmit={sendLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="account-email">Correo</Label>
                  <Input
                    id="account-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="tucorreo@ejemplo.cl"
                    autoComplete="email"
                    required
                  />
                </div>
                {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button className="w-full" disabled={sending || cooldown}>
                  {sending ? "Enviando…" : cooldown ? "Espera un minuto para reenviar" : "Enviar enlace"}
                </Button>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Usaremos este correo solo para identificarte y mostrarte tus pedidos. El
                  enlace caduca en 1 hora.
                </p>
              </form>
            ) : (
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>El acceso con enlace está desactivado por ahora.</p>
                <p>
                  Si necesitas revisar un pedido, escríbenos por WhatsApp y te ayudamos.
                </p>
                <Button asChild variant="outline">
                  <Link to="/#contacto">Ir a contacto</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
