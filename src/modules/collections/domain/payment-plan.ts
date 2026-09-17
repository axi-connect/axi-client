/**
 * Contratos del slice collections (F4 del programa Cobros). Wire snake_case
 * 1:1 con axi-server; la fuente es `schema.d.ts`, generado del OpenAPI.
 */
import type { Schemas } from "@/core/api/types";

export type PlanDetailDTO = Schemas["PlanDetailDto"];
export type InstallmentDTO = PlanDetailDTO["installments"][number];
export type InstallmentStatus = InstallmentDTO["status"];
export type InstallmentKind = InstallmentDTO["kind"];
export type CollectionsPolicyDTO = Schemas["CollectionsPolicyDto"];
export type PlanPreviewDTO = Schemas["PlanPreviewDto"];

export const INSTALLMENT_KIND_LABELS: Record<InstallmentKind, string> = {
  deposit: "Anticipo",
  installment: "Cuota",
  balance: "Saldo final",
};

/**
 * El color de cada estado de cuota. `overdue` es el único destructivo: la mora
 * es el hecho que hay que perseguir, y darle el mismo peso a «pendiente» haría
 * que un plan sano pareciera un problema.
 */
export const INSTALLMENT_STATUS_TONE: Record<
  InstallmentStatus,
  "neutral" | "info" | "success" | "warning" | "destructive"
> = {
  pending: "neutral",
  partially_paid: "info",
  paid: "success",
  overdue: "destructive",
  waived: "neutral",
};

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  pending: "Pendiente",
  partially_paid: "Abonada",
  paid: "Pagada",
  overdue: "Vencida",
  waived: "Anulada",
};

/** «Anticipo · 30 %», «Cuota 2 de 4», «Saldo final». */
export function installmentLabel(
  installment: Pick<InstallmentDTO, "kind" | "seq">,
  total: number,
): string {
  if (installment.kind === "deposit") return INSTALLMENT_KIND_LABELS.deposit;
  if (installment.kind === "balance") return INSTALLMENT_KIND_LABELS.balance;
  return `Cuota ${String(installment.seq)} de ${String(total)}`;
}

/**
 * Progreso del plan, medido contra el TOTAL DEL PEDIDO y no contra la suma de
 * las cuotas: son la misma cifra por construcción, pero si algún día dejan de
 * serlo, la que manda es la del pedido.
 */
export function planProgress(plan: Pick<PlanDetailDTO, "total_cents" | "paid_cents">): number {
  if (plan.total_cents <= 0) return plan.paid_cents > 0 ? 100 : 0;
  return Math.min(100, Math.round((plan.paid_cents / plan.total_cents) * 100));
}

/** La primera cuota sin cubrir: la que el operador va a nombrar al cobrar. */
export function nextInstallment(plan: Pick<PlanDetailDTO, "installments">): InstallmentDTO | null {
  return (
    plan.installments.find(
      (installment) => installment.status !== "paid" && installment.status !== "waived",
    ) ?? null
  );
}

/**
 * Lo que falta por cubrir de una cuota. Se usa para proponer el importe al
 * registrar un abono, que es la diferencia entre teclear una cifra y confirmar
 * la que toca.
 */
export function installmentPending(installment: Pick<InstallmentDTO, "amount_cents" | "paid_cents">): number {
  return Math.max(0, installment.amount_cents - installment.paid_cents);
}
