import type { Schemas } from "@/core/api/types";

/**
 * Contratos del slice payments: los medios de pago que el tenant configura y
 * que la IA comparte al cobrar (`/payment-methods`, capacidad `sales`). No es
 * la facturación de axi al tenant (eso es `modules/billing`).
 */
export type PaymentMethodDTO = Schemas["PaymentMethodDto"];
export type CreatePaymentMethodDTO = Schemas["CreatePaymentMethodDto"];
export type UpdatePaymentMethodDTO = Schemas["UpdatePaymentMethodDto"];
export type PaymentMethodsListDTO = Schemas["PaymentMethodsListDto"];
export type PaymentMethodKind = PaymentMethodDTO["kind"];

/** Orden del selector: primero lo más habitual en Colombia. */
export const PAYMENT_METHOD_KINDS: readonly PaymentMethodKind[] = [
  "nequi",
  "daviplata",
  "bancolombia",
  "cash",
  "pos",
  "payment_link",
  "other",
];

export const PAYMENT_KIND_LABELS: Record<PaymentMethodKind, string> = {
  nequi: "Nequi",
  daviplata: "Daviplata",
  bancolombia: "Bancolombia",
  cash: "Efectivo",
  pos: "Datáfono",
  payment_link: "Enlace de pago",
  other: "Otro",
};

/** Efectivo y datáfono no tienen número de cuenta que compartir. */
export function kindHasAccount(kind: PaymentMethodKind): boolean {
  return kind !== "cash" && kind !== "pos";
}

/** «Número» para cuentas y billeteras; «Enlace» para un link de pago. */
export function accountFieldLabel(kind: PaymentMethodKind): string {
  return kind === "payment_link" ? "Enlace" : "Número";
}

/** Últimos 4 caracteres a la vista; el resto enmascarado. Un enlace se muestra entero. */
export function maskAccountNumber(value: string | null, kind: PaymentMethodKind): string | null {
  if (value === null || value.length === 0) return null;
  if (kind === "payment_link") return value;
  const digits = value.replace(/\s+/g, "");
  return digits.length <= 4 ? digits : `•••• ${digits.slice(-4)}`;
}

export const PAYMENT_ERROR_CODES = {
  labelTaken: "payments/label_taken",
  notFound: "payments/method_not_found",
} as const;
