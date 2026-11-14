import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageCircle, Wrench } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isAdminEmail } from "@/lib/admin";
import { useContact } from "@/lib/use-contact";
import { subscribeMaintenanceMode } from "@/lib/site-content";
import { useSeo } from "@/lib/seo";

/** Pantalla pública que reemplaza la tienda mientras el modo mantenimiento está activo. */
function MaintenanceScreen() {
  const { whatsappLink } = useContact();
  const { pathname } = useLocation();

  useSeo({
    title: "Sitio en mantenimiento | LUNÉ Activewear",
    description: "Estamos trabajando en la tienda. Volvemos pronto.",
    path: pathname,
    noindex: true,
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 text-center">
      <span className="pl-[0.35em] font-display text-2xl font-semibold tracking-[0.35em]">
        LUNÉ
      </span>
      <span className="mt-1 text-[9px] uppercase tracking-[0.45em] text-muted-foreground">
        Activewear
      </span>

      <span className="mt-10 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
        <Wrench className="h-6 w-6 text-muted-foreground" />
      </span>

      <h1 className="mt-6 max-w-md font-display text-3xl font-medium tracking-tight md:text-4xl">
        Estamos en mantenimiento
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Estamos afinando los últimos detalles de la tienda para que tu experiencia sea aún
        mejor. Volvemos muy pronto.
      </p>

      <a
        href={whatsappLink("Hola LUNÉ, quiero consultar por la tienda.")}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex items-center gap-2 rounded-full border border-primary/20 px-5 py-2.5 text-[11px] uppercase tracking-wider2 text-foreground transition hover:border-primary/50"
      >
        <MessageCircle className="h-4 w-4" />
        Escríbenos por WhatsApp
      </a>

      <Link
        to="/admin"
        className="mt-12 text-[10px] uppercase tracking-wider2 text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
      >
        Acceso administrador
      </Link>
    </div>
  );
}

/**
 * Bloquea la web pública cuando el modo mantenimiento está activo.
 *
 * Se permite siempre:
 * - `/admin`, para que el administrador pueda entrar y desactivarlo.
 * - Cualquier ruta si la sesión activa pertenece a un administrador.
 *
 * El modo se escucha en tiempo real, así que al activarlo o desactivarlo desde
 * el panel el cambio se refleja sin recargar la página.
 */
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const [maintenance, setMaintenance] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(
    () =>
      subscribeMaintenanceMode((enabled) => {
        setMaintenance(enabled);
        setReady(true);
      }),
    []
  );

  // Si la tienda está abierta no hace falta esperar la sesión: se muestra de
  // inmediato. Si está en mantenimiento se espera la sesión para no bloquear a
  // un administrador que todavía se está autenticando.
  if (!ready) return <GateLoading />;
  if (!maintenance) return <>{children}</>;
  if (loading) return <GateLoading />;

  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isAdminPath || isAdminEmail(user?.email)) return <>{children}</>;

  return <MaintenanceScreen />;
}

function GateLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <span className="pl-[0.35em] font-display text-xl font-semibold tracking-[0.35em]">
        LUNÉ
      </span>
      <span className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
        Cargando…
      </span>
    </div>
  );
}
