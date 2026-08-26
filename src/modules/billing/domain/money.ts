import { formatMoney } from "@/core/lib/format";

/**
 * Dinero del slice. Se re-exporta el helper transversal en vez de escribir otro
 * (patrón de `orders/domain/order.ts`): el panel entero tiene que formatear los
 * pesos igual, y una segunda implementación acabaría divergiendo en los
 * decimales.
 */
export { formatMoney };

/**
 * La estimación del próximo cobro, o la ausencia del dato.
 *
 * `null` y `0` son cosas distintas y la diferencia importa: cero es «no vas a
 * pagar nada», y `null` es «no lo sabemos» (el tenant no tiene ciclo abierto o
 * su plan no tiene tarifa vigente). Pintar «$ 0» ante un `null` le promete al
 * cliente una factura gratis que no va a recibir.
 */
export function estimateLabel(cents: number | null, currency = "COP"): string {
  return cents === null ? "Sin estimación disponible" : formatMoney(cents, currency);
}

/** ¿Hay estimación? Para decidir el tamaño tipográfico de la cifra. */
export function hasEstimate(cents: number | null): boolean {
  return cents !== null;
}
