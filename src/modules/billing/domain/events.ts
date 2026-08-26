/**
 * CustomEvents del DOM del slice, con la convención `familia:acción:estado`
 * (architecture §9).
 *
 * Existen porque el store del resumen no le sirve a la lista de facturas: la
 * lista tiene su propia paginación y su propio estado. En vez de acoplar los dos
 * o de meter la lista en el store, el hook de tiempo real despacha una señal y
 * quien la escuche recarga lo suyo.
 */

/** Se emitió una factura o se aplicó un pago: quien liste facturas debe recargar. */
export const BILLING_INVOICE_CHANGED = "billing:invoice:changed";
