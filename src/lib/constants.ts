export const WHATSAPP_NUMBER = "56957592973";
export const WHATSAPP_DISPLAY = "+56 9 5759 2973";
export const EMAIL = "lune.ventas@gmail.com";
export const LOCATION = "Chillán, Chile";
export const INSTAGRAM = "https://www.instagram.com/luneactivewear.cl";

export const FREE_SHIPPING_THRESHOLD = 50000;

export const SOCIAL = {
  instagram: INSTAGRAM,
  whatsapp: `https://wa.me/${WHATSAPP_NUMBER}`,
};

export function whatsappLink(text: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
