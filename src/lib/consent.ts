/**
 * Consentimiento de cookies y datos analíticos.
 *
 * La elección se guarda en `localStorage` (`lune-cookie-consent`) y se puede
 * cambiar en cualquier momento desde "Preferencias de cookies" (pie de página).
 */

export type ConsentValue = "accepted" | "rejected";

export const CONSENT_STORAGE_KEY = "lune-cookie-consent";

/** Evento que abre el aviso de cookies desde el pie de página. */
export const OPEN_PREFERENCES_EVENT = "lune:open-cookie-preferences";

export function readConsent(): ConsentValue | null {
  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch {
    return null;
  }
}

export function writeConsent(value: ConsentValue) {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Pide abrir el aviso de cookies (botón "Preferencias de cookies"). */
export function openCookiePreferences() {
  window.dispatchEvent(new CustomEvent(OPEN_PREFERENCES_EVENT));
}
