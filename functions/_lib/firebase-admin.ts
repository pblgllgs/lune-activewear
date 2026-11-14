/**
 * Acceso a Firestore desde las Pages Functions con una service account.
 *
 * Las Functions no pueden usar el SDK de Firebase Admin (pesado y no compatible
 * con Workers), así que se firma un JWT RS256 con Web Crypto, se cambia por un
 * access token de Google y se llama a la API REST de Firestore. Ese token
 * omite las reglas de seguridad, por eso solo se usa en el servidor.
 *
 * Variables de entorno (secretos de Cloudflare Pages):
 * - `FIREBASE_SERVICE_ACCOUNT`: JSON completo de la service account, o
 * - `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` (+ `FIREBASE_PROJECT_ID`).
 */

type Env = Record<string, string | undefined>;

export type FsValue = Record<string, unknown>;
export type FsFields = Record<string, unknown>;
export type FsDocument = Record<string, unknown>;

interface Credentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function credentials(env: Env): Credentials | null {
  const projectId = (env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || "").trim();
  const raw = env.FIREBASE_SERVICE_ACCOUNT;

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (parsed.client_email && parsed.private_key) {
        return {
          projectId: projectId || parsed.project_id || "",
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch {
      // Si el JSON está mal formado se intenta con las variables sueltas.
    }
  }

  const clientEmail = (env.FIREBASE_CLIENT_EMAIL || "").trim();
  const privateKey = env.FIREBASE_PRIVATE_KEY;
  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    };
  }

  return null;
}

export function isFirestoreConfigured(env: Env): boolean {
  return credentials(env) !== null;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlFromText(value: string): string {
  return base64Url(new TextEncoder().encode(value));
}

function pemToBytes(pem: string): ArrayBuffer {
  const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function accessToken(env: Env): Promise<string> {
  const creds = credentials(env);
  if (!creds) throw new Error("Firestore no está configurado en el servidor.");

  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.token;

  const header = base64UrlFromText(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64UrlFromText(
    JSON.stringify({
      iss: creds.clientEmail,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const unsigned = `${header}.${claim}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(creds.privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    throw new Error(`No se pudo autenticar con Google (${response.status}).`);
  }
  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Google no devolvió un access token.");

  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600),
  };
  return cachedToken.token;
}

/* ----------------------------- Valores Firestore ---------------------------- */

export function toFsValue(value: unknown): FsValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => toFsValue(item)) } };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(([key, item]) => [
            key,
            toFsValue(item),
          ])
        ),
      },
    };
  }
  return { stringValue: String(value) };
}

export function fromFsValue(value: unknown): unknown {
  if (!value || typeof value !== "object") return undefined;
  const data = value as Record<string, unknown>;
  if ("nullValue" in data) return null;
  if ("stringValue" in data) return data.stringValue;
  if ("booleanValue" in data) return data.booleanValue;
  if ("integerValue" in data) return Number(data.integerValue);
  if ("doubleValue" in data) return Number(data.doubleValue);
  if ("timestampValue" in data) return data.timestampValue;
  if ("arrayValue" in data) {
    const values = (data.arrayValue as { values?: unknown[] })?.values ?? [];
    return values.map((item) => fromFsValue(item));
  }
  if ("mapValue" in data) {
    const fields = (data.mapValue as { fields?: Record<string, unknown> })?.fields ?? {};
    return fromFsFields(fields);
  }
  return undefined;
}

export function fromFsFields(fields: Record<string, unknown> | undefined): FsDocument {
  const out: FsDocument = {};
  for (const [key, value] of Object.entries(fields ?? {})) {
    out[key] = fromFsValue(value);
  }
  return out;
}

/* ------------------------------- Operaciones -------------------------------- */

function documentUrl(env: Env, path: string): string {
  const creds = credentials(env);
  if (!creds) throw new Error("Firestore no está configurado en el servidor.");
  const clean = path.replace(/^\/+/, "");
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    creds.projectId
  )}/databases/(default)/documents/${clean}`;
}

export async function getDocument(env: Env, path: string): Promise<FsDocument | null> {
  const token = await accessToken(env);
  const response = await fetch(documentUrl(env, path), {
    headers: { authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Firestore respondió ${response.status} al leer ${path}.`);
  }
  const data = (await response.json()) as { fields?: Record<string, unknown> };
  return fromFsFields(data.fields);
}

export async function patchDocument(
  env: Env,
  path: string,
  fields: Record<string, unknown>
): Promise<void> {
  const token = await accessToken(env);
  const mask = Object.keys(fields)
    .map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`)
    .join("&");
  const body = JSON.stringify({
    fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, toFsValue(value)])),
  });
  const response = await fetch(`${documentUrl(env, path)}?${mask}`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`Firestore respondió ${response.status} al actualizar ${path}.`);
  }
}

export async function listDocuments(
  env: Env,
  collectionPath: string,
  pageSize = 300
): Promise<Array<{ id: string; data: FsDocument }>> {
  const token = await accessToken(env);
  const results: Array<{ id: string; data: FsDocument }> = [];
  let pageToken = "";

  for (let page = 0; page < 5; page += 1) {
    const params = new URLSearchParams({ pageSize: String(pageSize) });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await fetch(`${documentUrl(env, collectionPath)}?${params.toString()}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (response.status === 404) return results;
    if (!response.ok) {
      throw new Error(`Firestore respondió ${response.status} al listar ${collectionPath}.`);
    }
    const data = (await response.json()) as {
      documents?: Array<{ name?: string; fields?: Record<string, unknown> }>;
      nextPageToken?: string;
    };
    for (const document of data.documents ?? []) {
      results.push({
        id: String(document.name ?? "").split("/").pop() ?? "",
        data: fromFsFields(document.fields),
      });
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return results;
}
