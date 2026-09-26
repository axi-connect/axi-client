/**
 * SUPERFICIE PÚBLICA del slice `collections` (architecture.md §3.3): planes de
 * pago, cartera y recordatorios.
 *
 * Consumidores:
 * - `orders`: el rail del pedido monta el plan de pagos y, en «Registrar pago»,
 *   la cuota que toca y cómo se repartiría el abono.
 * - `companies`: Mi empresa › Funciones lee los ajustes para decir si el plan
 *   y la cobranza están configurados.
 */
export {
  allocationPreview,
  installmentPending,
  nextInstallment,
  planInstallmentLabel,
  type InstallmentDTO,
  type PlanDetailDTO,
} from "./domain/payment-plan";
export { type CollectionsSettingsDTO } from "./domain/reminder";
export { getCollectionsPolicy } from "./infrastructure/services/collections-service.adapter";
export { AllocationPreview } from "./ui/components/AllocationPreview";
export { PaymentPlanBlock } from "./ui/components/PaymentPlanBlock";
