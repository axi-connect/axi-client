import type { CollectionsCallSummary } from "@/modules/calls/public";
import { installmentPending, type PlanDetailDTO } from "./payment-plan";
import { daysUntil, type ReceivableDTO } from "./receivable";

/**
 * «Llamar para cobrar» (plan de modos, F3; mockup aprobado 2026-09-30): lo que
 * el diálogo enseña en «Lo que sabe tu agente», armado desde lo que cada
 * pantalla ya cargó. Las cifras que usa el agente las relee el servidor con
 * `plan_id`; esto es solo lo que ve quien llama.
 */

/** ¿Tiene sentido ofrecer la llamada? Un plan sin saldo o cerrado no se cobra. */
export function canCallToCollect(plan: { status?: string; balance_cents: number }): boolean {
  return plan.balance_cents > 0 && (plan.status === undefined || plan.status === "active");
}

/** Desde la fila de la cartera: todo viene en la fila, sin pedir el plan. */
export function callSummaryFromRow(row: ReceivableDTO): CollectionsCallSummary {
  return {
    plan_id: row.plan_id,
    order_number: row.order_number,
    currency: row.currency,
    balance_cents: row.balance_cents,
    overdue_cents: row.overdue_cents,
    days_overdue: row.days_overdue,
    next_due_at: row.next_due_at,
    promised_at: row.active_promise_at,
  };
}

/** Desde el plan del pedido: lo vencido sale de sus cuotas. */
export function callSummaryFromPlan(plan: PlanDetailDTO, today = new Date()): CollectionsCallSummary {
  const overdue = plan.installments.filter((installment) => installment.status === "overdue");
  const oldest = overdue.reduce<string | null>(
    (min, installment) => (min === null || installment.due_at < min ? installment.due_at : min),
    null,
  );
  const since = daysUntil(oldest, today);
  return {
    plan_id: plan.id,
    order_number: plan.order_number,
    currency: plan.currency,
    balance_cents: plan.balance_cents,
    overdue_cents: overdue.reduce((sum, installment) => sum + installmentPending(installment), 0),
    days_overdue: since === null ? 0 : Math.max(0, -since),
    next_due_at: plan.next_due_at,
    promised_at: plan.active_promise_at,
  };
}
