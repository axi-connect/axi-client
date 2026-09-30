/**
 * «Llamar para cobrar» (plan de modos, F3): lo que Cobros sabe del plan y el
 * diálogo enseña en «Lo que sabe tu agente». Es solo para la pantalla: las
 * cifras que el agente usa las arma el SERVIDOR con `plan_id` al lanzar.
 */
export interface CollectionsCallSummary {
  plan_id: string;
  order_number: number | null;
  currency: string;
  balance_cents: number;
  /** Lo vencido y sin pagar; 0 si va al día. */
  overdue_cents: number;
  days_overdue: number;
  /** `YYYY-MM-DD` del próximo vencimiento, si queda alguno. */
  next_due_at: string | null;
  /** `YYYY-MM-DD` de la promesa viva, si ya prometió pagar. */
  promised_at: string | null;
}

/** «el pedido #1042» o «este pedido» cuando aún no tiene número. */
export function orderRef(summary: Pick<CollectionsCallSummary, "order_number">): string {
  return summary.order_number === null ? "este pedido" : `el pedido #${String(summary.order_number)}`;
}

/** «Saldo del pedido #1042» (el artículo se contrae: nunca «de el»). */
export function balanceLabel(summary: Pick<CollectionsCallSummary, "order_number">): string {
  return summary.order_number === null ? "Saldo de este pedido" : `Saldo del pedido #${String(summary.order_number)}`;
}
