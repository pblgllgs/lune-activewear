export const DEFAULT_WHATSAPP_NUMBER = "56957592973";

/** Normaliza un número para wa.me: deja solo dígitos. */
export function normalizeWhatsAppNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  // Si viene como 9xxxxxxxx (móvil chileno sin código país), antepone 56.
  if (digits.length === 9 && digits.startsWith("9")) return `56${digits}`;
  // Si viene con 0 inicial (ej. 09...), quita el 0.
  if (digits.startsWith("0")) return normalizeWhatsAppNumber(digits.slice(1));
  return digits;
}

/** Formato legible (+56 9 5759 2973) para números chilenos; si no, +<dígitos>. */
export function formatWhatsAppDisplay(number: string): string {
  const digits = normalizeWhatsAppNumber(number);
  if (!digits) return "";
  if (digits.startsWith("56") && digits.length === 11) {
    const rest = digits.slice(2); // 9xxxxxxxx
    return `+56 ${rest[0]} ${rest.slice(1, 5)} ${rest.slice(5)}`;
  }
  if (digits.startsWith("56") && digits.length > 2) {
    return `+56 ${digits.slice(2)}`;
  }
  return `+${digits}`;
}

type ContactState = {
  whatsappNumber: string;
  whatsappDisplay: string;
};

let state: ContactState = {
  whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
  whatsappDisplay: formatWhatsAppDisplay(DEFAULT_WHATSAPP_NUMBER),
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getContactConfig(): ContactState {
  return state;
}

export function getWhatsAppNumber(): string {
  return state.whatsappNumber;
}

export function getWhatsAppDisplay(): string {
  return state.whatsappDisplay;
}

export function getWhatsAppUrl(): string {
  return `https://wa.me/${state.whatsappNumber || DEFAULT_WHATSAPP_NUMBER}`;
}

export function whatsappLink(text: string, number = state.whatsappNumber): string {
  const target = normalizeWhatsAppNumber(number) || DEFAULT_WHATSAPP_NUMBER;
  return `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
}

export function setWhatsAppNumber(value: string): void {
  const normalized = normalizeWhatsAppNumber(value) || DEFAULT_WHATSAPP_NUMBER;
  const display = formatWhatsAppDisplay(normalized) || formatWhatsAppDisplay(DEFAULT_WHATSAPP_NUMBER);
  if (state.whatsappNumber === normalized && state.whatsappDisplay === display) return;
  state = { whatsappNumber: normalized, whatsappDisplay: display };
  emit();
}

export function subscribeContact(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}