import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  type Auth,
} from "firebase/auth";

/** Correo recordado en este navegador para completar el enlace mágico. */
const EMAIL_KEY = "lune-account-email";

/** Parámetros que Firebase agrega a la URL al volver desde el correo. */
const LINK_PARAMS = ["apiKey", "oobCode", "mode", "lang", "continueUrl"];

/** URL a la que vuelve el enlace: la página de la cuenta. */
export function magicLinkUrl() {
  return `${window.location.origin}/cuenta`;
}

export function rememberMagicEmail(email: string) {
  try {
    window.localStorage.setItem(EMAIL_KEY, email.trim());
  } catch {
    /* navegación privada: el correo se pide al abrir el enlace */
  }
}

export function storedMagicEmail(): string {
  try {
    return window.localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

/** ¿La URL actual es un enlace de acceso enviado por Firebase? */
export function isMagicLink(auth: Auth) {
  return isSignInWithEmailLink(auth, window.location.href);
}

/**
 * Envía el enlace de acceso. Cualquier correo puede pedirlo: el enlace solo
 * permite ver los pedidos asociados a ese correo.
 */
export async function sendMagicLink(auth: Auth, email: string) {
  await sendSignInLinkToEmail(auth, email.trim(), {
    url: magicLinkUrl(),
    handleCodeInApp: true,
  });
  rememberMagicEmail(email);
}

/** Quita el `oobCode` de la barra de direcciones para que no se reutilice. */
export function clearMagicLinkParams() {
  const url = new URL(window.location.href);
  LINK_PARAMS.forEach((key) => url.searchParams.delete(key));
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

/** Completa el acceso con el enlace del correo y limpia la URL. */
export async function completeMagicLink(auth: Auth, email: string) {
  await signInWithEmailLink(auth, email.trim(), window.location.href);
  try {
    window.localStorage.removeItem(EMAIL_KEY);
  } catch {
    /* sin acceso a localStorage */
  }
  clearMagicLinkParams();
}
