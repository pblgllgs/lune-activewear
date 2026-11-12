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
