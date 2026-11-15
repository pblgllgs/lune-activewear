import {
  DEFAULT_WHATSAPP_NUMBER,
  formatWhatsAppDisplay,
  getWhatsAppNumber,
  getWhatsAppUrl,
  whatsappLink as buildWhatsAppLink,
} from "@/lib/contact";

export const EMAIL = "lune.ventas@gmail.com";
export const LOCATION = "Chillán, Chile";
export const INSTAGRAM = "https://www.instagram.com/luneactivewear.cl";

/**
 * Datos del vendedor para las páginas legales (términos y condiciones).
 * `rut` queda vacío a propósito: se completa cuando esté disponible y la línea
 * simplemente no se muestra mientras tanto.
 */
export const BUSINESS = {
  name: "LUNÉ Activewear",
  rut: "",
  address: "Chillán, Región de Ñuble, Chile",
};

export const FREE_SHIPPING_THRESHOLD = 50000;

// Compatibilidad: valores por defecto; para valores dinámicos usar useContact/contact.
export const WHATSAPP_NUMBER = DEFAULT_WHATSAPP_NUMBER;
export const WHATSAPP_DISPLAY = formatWhatsAppDisplay(DEFAULT_WHATSAPP_NUMBER);

export const SOCIAL = {
  instagram: INSTAGRAM,
  get whatsapp() {
    return getWhatsAppUrl() || `https://wa.me/${getWhatsAppNumber()}`;
  },
};

export function whatsappLink(text: string) {
  return buildWhatsAppLink(text);
}
