export const WHATSAPP_NUMBER = "56900000000";
export const WHATSAPP_DISPLAY = "+56 9 0000 0000";
export const EMAIL = "hola@luneactivewear.cl";
export const LOCATION = "Chillán, Chile";
export const INSTAGRAM = "https://instagram.com/lune.activewear";

export const FREE_SHIPPING_THRESHOLD = 50000;

export const SOCIAL = {
  instagram: INSTAGRAM,
  whatsapp: `https://wa.me/${WHATSAPP_NUMBER}`,
};

export function whatsappLink(text: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
