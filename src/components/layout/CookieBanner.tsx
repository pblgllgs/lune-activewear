import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import {
  OPEN_PREFERENCES_EVENT,
  readConsent,
  writeConsent,
  type ConsentValue,
} from "@/lib/consent";
import { applyConsent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

/**
 * Aviso de cookies.
 *
 * Aparece la primera visita (o cuando se abre "Preferencias de cookies").
 * Las cookies analíticas (Google Analytics) solo se activan si la clienta
 * acepta; el carrito y los favoritos son locales al navegador y funcionan
 * igual con el aviso rechazado.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = readConsent();
    if (consent) {
      void applyConsent(consent);
    } else {
      setVisible(true);
    }

    const onOpen = () => setVisible(true);
    window.addEventListener(OPEN_PREFERENCES_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, onOpen);
  }, []);

  const decide = (value: ConsentValue) => {
    writeConsent(value);
    setVisible(false);
    void applyConsent(value);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-4 bottom-20 z-50 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[22rem]"
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
    >
      <div className="rounded-xl border border-border bg-card p-5 shadow-xl shadow-primary/10">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
            <Cookie className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-base">Usamos cookies</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Guardamos en tu navegador el carrito y los favoritos, y —solo si lo aceptas— cookies
              de Google Analytics para entender cómo se usa la tienda. Puedes rechazarlas o
              cambiarlas cuando quieras.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => decide("accepted")}>
            Aceptar
          </Button>
          <Button size="sm" variant="outline" onClick={() => decide("rejected")}>
            Rechazar
          </Button>
          <Link
            to="/privacidad#cookies"
            className="text-[10px] uppercase tracking-wider2 text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
          >
            Ver política
          </Link>
        </div>
      </div>
    </div>
  );
}
