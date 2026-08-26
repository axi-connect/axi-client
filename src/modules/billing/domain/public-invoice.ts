/**
 * Vista pública de la factura — **tipos escritos A MANO, a propósito**.
 *
 * `PublicBillingController` del backend está marcado `@ApiExcludeController`
 * («no es API de producto, es una página de pago»), así que estos dos endpoints
 * NO aparecen en `openapi.json` y `schema.d.ts` no los tipa. Es la única
 * excepción del slice: todo lo demás se deriva del contrato generado.
 *
 * Consecuencia práctica: si el backend cambia la forma, aquí no salta ningún
 * error de compilación. El test hermano fija la forma esperada para que el
 * cambio se note al menos en la suite.
 *
 *   GET  /api/v1/public/billing/invoices/:invoice_id/:token
 *   POST /api/v1/public/billing/invoices/:invoice_id/:token/checkout
 *
 * Ambos son `@Public` y llevan un throttle estricto de 10 req/min por IP.
 */

export interface PublicInvoiceDTO {
  number: string;
  period_start: string;
  period_end: string;
  due_at: string | null;
  /** ⚠️ Lo que FALTA por pagar, no el total de la factura. */
  amount_cents: number;
  currency: string;
  status: string;
  /**
   * La **única** señal que habilita el botón de pago.
   *
   * Es `true` solo si queda saldo Y el estado lo admite. No se deduce del
   * `status`: una factura `partially_paid` con retención ya registrada tiene
   * saldo cero y no es pagable.
   */
  payable: boolean;
}

/**
 * Sesión de checkout. Es el MISMO DTO que devuelve el panel
 * (`Schemas["CheckoutSessionDto"]`), pero se declara aquí porque el endpoint
 * público no está en el spec y no queremos que la página pública dependa de un
 * tipo que el generador podría dejar de emitir.
 */
export interface PublicCheckoutSessionDTO {
  reference: string;
  amount_in_cents: number;
  currency: string;
  /** Firma de integridad calculada en el SERVIDOR. Jamás en el navegador. */
  signature: string;
  public_key: string;
  /** ⚠️ Siempre `null` hoy: la expiración se omite a propósito al firmar. */
  expiration_time: string | null;
  /** ⚠️ Siempre `null` hoy: la URL de retorno la pone el frontend. */
  redirect_url: string | null;
}

/** Códigos de error propios de la superficie pública (KB §7). */
export const PUBLIC_BILLING_ERRORS = {
  /** 410 — el enlace caducó (7 días por defecto). No es culpa del usuario. */
  linkExpired: "billing/link_expired",
  /** 401 — enlace inválido. Mensaje GENÉRICO: no confirmar si la factura existe. */
  unauthorized: "auth/unauthorized",
  /** 409 — ya está pagada o anulada. Se dice con alivio, no con error. */
  notPayable: "billing/invoice_not_payable",
} as const;
