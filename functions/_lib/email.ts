/**
 * Envío de correos transaccionales con Brevo (o Resend como alternativa).
 *
 * La API key vive solo en las variables de entorno de Cloudflare Pages. Nunca
 * debe exponerse en el cliente (`VITE_*`).
 *
 * Variables:
 * - `EMAIL_PROVIDER`: `brevo` (por defecto) o `resend`.
 * - `BREVO_API_KEY` / `RESEND_API_KEY`.
 * - `MAIL_FROM`: remitente verificado en el proveedor.
 * - `MAIL_FROM_NAME`: nombre visible (por defecto «LUNÉ Activewear»).
 * - `MAIL_REPLY_TO`: respuesta (opcional).
 * - `EMAIL_DRY_RUN=1`: no envía, solo devuelve un id simulado.
 */

type Env = Record<string, string | undefined>;

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  tags?: string[];
}

export interface EmailResult {
  id: string;
  provider: string;
}

export function sender(env: Env): { address: string; name: string } {
  return {
    address: (env.MAIL_FROM || "no-reply@lune-activewear.pages.dev").trim(),
    name: (env.MAIL_FROM_NAME || "LUNÉ Activewear").trim(),
  };
}

export function emailProvider(env: Env): "brevo" | "resend" {
  return (env.EMAIL_PROVIDER || "brevo").trim().toLowerCase() === "resend" ? "resend" : "brevo";
}

export function isEmailConfigured(env: Env): boolean {
  if (env.EMAIL_DRY_RUN === "1" || env.EMAIL_DRY_RUN === "true") return true;
  return emailProvider(env) === "resend"
    ? Boolean(env.RESEND_API_KEY)
    : Boolean(env.BREVO_API_KEY);
}

export async function sendEmail(env: Env, message: EmailMessage): Promise<EmailResult> {
  if (env.EMAIL_DRY_RUN === "1" || env.EMAIL_DRY_RUN === "true") {
    return { id: `dry-run-${Date.now()}`, provider: "dry-run" };
  }

  if (!isEmailConfigured(env)) {
    throw new Error("El correo no está configurado en el servidor.");
  }

  return emailProvider(env) === "resend"
    ? sendWithResend(env, message)
    : sendWithBrevo(env, message);
}

async function sendWithBrevo(env: Env, message: EmailMessage): Promise<EmailResult> {
  const from = sender(env);
  const replyTo = message.replyTo || env.MAIL_REPLY_TO;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": env.BREVO_API_KEY ?? "",
    },
    body: JSON.stringify({
      sender: { email: from.address, name: from.name },
      to: [{ email: message.to }],
      subject: message.subject,
      htmlContent: message.html,
      textContent: message.text,
      ...(replyTo ? { replyTo: { email: replyTo } } : {}),
      ...(message.tags?.length ? { tags: message.tags } : {}),
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Brevo respondió ${response.status}: ${raw.slice(0, 300)}`);
  }
  const data = raw ? (JSON.parse(raw) as { messageId?: string }) : {};
  return { id: data.messageId || `brevo-${Date.now()}`, provider: "brevo" };
}

async function sendWithResend(env: Env, message: EmailMessage): Promise<EmailResult> {
  const from = sender(env);
  const replyTo = message.replyTo || env.MAIL_REPLY_TO;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY ?? ""}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: `${from.name} <${from.address}>`,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(message.tags?.length
        ? { tags: message.tags.map((value) => ({ name: "tipo", value })) }
        : {}),
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Resend respondió ${response.status}: ${raw.slice(0, 300)}`);
  }
  const data = raw ? (JSON.parse(raw) as { id?: string }) : {};
  return { id: data.id || `resend-${Date.now()}`, provider: "resend" };
}
