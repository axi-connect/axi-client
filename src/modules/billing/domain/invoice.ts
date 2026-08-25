import type { Schemas } from "@/core/api/types";
import type { StatusMap } from "@/shared/components/features/status-badge/types";

/**
 * La factura de la licencia, en TypeScript puro.
 *
 * Los DTO se derivan del contrato generado: escribirlos a mano crea una segunda
 * fuente de verdad que se desincroniza en silencio.
 */
export type InvoiceDTO = Schemas["InvoiceListDto"]["data"][number];
export type InvoiceDetailDTO = Schemas["InvoiceDetailDto"];
export type InvoiceLineDTO = InvoiceDetailDTO["lines"][number];
export type InvoiceStatus = InvoiceDTO["status"];
export type InvoiceLinkDTO = Schemas["InvoiceLinkDto"];

/**
 * Máquina de estados de la factura. Una vez emitida no se edita ni se borra:
 * se anula y se emite otra.
 *
 *         emisión
 *            │
 *            ▼
 *      ┌─> open ──pago parcial──> partially_paid ──resto──> paid
 *      │     │                          │
 *      │     └────pago completo─────────┴──────────────────> paid
 *    draft   │
 *  (interno) ├──anulada desde plataforma──────────────────> void
 *            └──incobrable (manual)───────────────────────> uncollectible
 */
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Borrador",
  open: "Pendiente",
  partially_paid: "Pago parcial",
  paid: "Pagada",
  void: "Anulada",
  uncollectible: "Incobrable",
};

/**
 * `draft` no debería llegar nunca al cliente —solo existe dentro de la
 * transacción de emisión—, pero se mapea igualmente: un estado sin entrada
 * caería a `neutral` con el valor crudo, y preferimos la etiqueta en español.
 */
export const INVOICE_STATUS_MAP: StatusMap = {
  draft: { label: INVOICE_STATUS_LABELS.draft, tone: "neutral" },
  open: { label: INVOICE_STATUS_LABELS.open, tone: "warning" },
  partially_paid: { label: INVOICE_STATUS_LABELS.partially_paid, tone: "warning" },
  paid: { label: INVOICE_STATUS_LABELS.paid, tone: "success" },
  void: { label: INVOICE_STATUS_LABELS.void, tone: "neutral" },
  uncollectible: { label: INVOICE_STATUS_LABELS.uncollectible, tone: "neutral" },
};

export const LINE_KIND_LABELS: Record<string, string> = {
  subscription: "Suscripción",
  overage: "Excedente",
  adjustment: "Ajuste",
  credit: "Nota de crédito",
};

/** Una línea `credit` resta del total: se pinta con signo, no como un cargo más. */
export function isCreditLine(line: Pick<InvoiceLineDTO, "kind">): boolean {
  return line.kind === "credit";
}

/**
 * ¿Se puede pagar? Queda saldo Y el estado lo admite.
 *
 * Las dos condiciones son necesarias y ninguna se deduce de la otra: una
 * factura `partially_paid` con retención ya registrada tiene saldo cero y **no**
 * es pagable, y una `void` con saldo tampoco lo es. Deducirlo solo del estado es
 * el error clásico de este dominio.
 */
export function isPayable(
  invoice: Pick<InvoiceDTO, "status" | "outstanding_cents">,
): boolean {
  if (invoice.outstanding_cents <= 0) return false;
  return invoice.status === "open" || invoice.status === "partially_paid";
}

/**
 * ¿Hay retención practicada? Decide si el detalle pinta su línea propia.
 *
 * Se muestra siempre que exista, nunca se esconde: es la parte que explica por
 * qué el cliente giró menos que el total sin estar en deuda.
 */
export function hasWithholding(invoice: Pick<InvoiceDTO, "withholding_cents">): boolean {
  return invoice.withholding_cents > 0;
}

/** ¿Venció y sigue con saldo? Para teñir la fila de la lista. */
export function isOverdue(
  invoice: Pick<InvoiceDTO, "status" | "outstanding_cents" | "due_at">,
  now: Date = new Date(),
): boolean {
  if (!isPayable(invoice) || invoice.due_at === null) return false;
  return new Date(invoice.due_at).getTime() < now.getTime();
}
