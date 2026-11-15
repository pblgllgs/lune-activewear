/**
 * Páginas oficiales de rastreo por proveedor de envío.
 *
 * La clave es el texto guardado en `orders.carrier` (el mismo listado que
 * `src/lib/shipping.ts`). Si el proveedor no está aquí —«Otro» con texto libre,
 * «Retiro en Chillán» o un courier nuevo— el correo muestra el nombre sin
 * enlace ni botón, en vez de mandar a una URL inventada.
 *
 * URLs revisadas el 2026-11-15:
 * - Chilexpress: formulario «Estado de envíos» (pide la orden de transporte).
 * - Starken: seguimiento de tu envío.
 * - Correos de Chile: seguimiento de envíos.
 * - Blue Express: su rastreo ahora vive en blue.cl.
 */
const CARRIER_TRACKING_URLS: Record<string, string> = {
  Chilexpress: "https://www.chilexpress.cl/Views/ServicioAlCliente/EstadoEnvios.aspx?cod=11",
  Starken: "https://www.starken.cl/seguimiento-de-tu-envio",
  "Correos de Chile": "https://www.correos.cl/web/guest/seguimiento-de-envios",
  "Blue Express": "https://www.blue.cl/enviar/seguimiento",
};

/** URL de rastreo del proveedor, o `null` si no hay una página verificada. */
export function carrierTrackingUrl(carrier: string | undefined): string | null {
  if (!carrier) return null;
  return CARRIER_TRACKING_URLS[carrier.trim()] ?? null;
}
