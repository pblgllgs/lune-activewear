import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Ajustes de acceso, en `settings/auth` (lectura pública, escritura admin). */
export interface AuthSettings {
  /** Si está activo, `/cuenta` ofrece el enlace mágico por correo. */
  magicLinkEnabled: boolean;
}

const DEFAULT_SETTINGS: AuthSettings = { magicLinkEnabled: true };

function authDoc() {
  if (!db) throw new Error("Firebase no está configurado.");
  return doc(db, "settings", "auth");
}

/**
 * Lee los ajustes de acceso. Si el documento no existe o falla la lectura se
 * asume el enlace mágico activo, que es el valor por defecto.
 */
export async function getAuthSettings(): Promise<AuthSettings> {
  if (!db) return DEFAULT_SETTINGS;
  try {
    const snap = await getDoc(authDoc());
    return { magicLinkEnabled: snap.data()?.magicLinkEnabled !== false };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveMagicLinkEnabled(enabled: boolean): Promise<void> {
  await setDoc(
    authDoc(),
    { magicLinkEnabled: enabled, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}
