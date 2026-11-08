import { app } from "@/lib/firebase";
import type { Analytics } from "firebase/analytics";
import type { ConsentValue } from "@/lib/consent";

/**
 * Analítica (Google Analytics 4 vía Firebase).
 *
 * La instancia se crea **solo después** de que la clienta acepta las cookies:
 * mientras no exista consentimiento no se carga el SDK de Analytics ni se
 * escriben cookies de medición.
 */

let analytics: Analytics | null = null;
let initPromise: Promise<Analytics | null> | null = null;

async function getAnalyticsInstance(): Promise<Analytics | null> {
  if (analytics) return analytics;
  if (!app) return null;

  if (!initPromise) {
    initPromise = (async () => {
      try {
        const { getAnalytics, isSupported } = await import("firebase/analytics");
        if (!(await isSupported())) return null;
        analytics = getAnalytics(app);
        return analytics;
      } catch (error) {
        console.warn("No se pudo iniciar la analítica.", error);
        return null;
      }
    })();
  }

  return initPromise;
}

/** Activa la medición (consentimiento aceptado). */
export async function enableAnalytics() {
  const instance = await getAnalyticsInstance();
  if (!instance) return;
  const { setAnalyticsCollectionEnabled } = await import("firebase/analytics");
  setAnalyticsCollectionEnabled(instance, true);
}

/** Detiene la medición (consentimiento rechazado). */
export async function disableAnalytics() {
  if (!analytics) return;
  const { setAnalyticsCollectionEnabled } = await import("firebase/analytics");
  setAnalyticsCollectionEnabled(analytics, false);
}

/** Borra las cookies de medición de Google Analytics del navegador. */
export function clearAnalyticsCookies() {
  if (typeof document === "undefined") return;
  document.cookie.split(";").forEach((entry) => {
    const name = entry.split("=")[0].trim();
    if (!name.startsWith("_ga")) return;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
}

/** Aplica la decisión de la clienta sobre cookies analíticas. */
export async function applyConsent(consent: ConsentValue | null) {
  if (consent === "accepted") {
    await enableAnalytics();
    return;
  }
  await disableAnalytics();
  clearAnalyticsCookies();
}
