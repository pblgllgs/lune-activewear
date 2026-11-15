/**
 * Proveedores de envío que se ofrecen al registrar el seguimiento de una orden.
 *
 * El valor se guarda tal cual en `orders/{id}.carrier`, así que la lista se puede
 * ampliar sin migrar datos: cualquier texto que no esté aquí se muestra igual.
 */
export const SHIPPING_CARRIERS = [
  "Chilexpress",
  "Starken",
  "Correos de Chile",
  "Blue Express",
  "Vía Cargo",
  "Retiro en Chillán",
] as const;

export type ShippingCarrier = (typeof SHIPPING_CARRIERS)[number];

/** `true` si el proveedor está en la lista conocida (para el selector). */
export function isKnownCarrier(value: string | undefined): boolean {
  return Boolean(value) && (SHIPPING_CARRIERS as readonly string[]).includes(value as string);
}
