/**
 * SUPERFICIE PÚBLICA del slice `payments` (architecture.md §3.3): los medios
 * de pago del tenant (`/payment-methods`, capacidad `sales`).
 *
 * Consumidores: `orders` (el selector de «Registrar pago» lista los medios) y
 * `companies` (la pestaña «Medios de pago» de Mi empresa embebe la vista, que
 * es autosuficiente).
 */
export {
  PAYMENT_KIND_LABELS,
  maskAccountNumber,
  type PaymentMethodDTO,
  type PaymentMethodKind,
} from "./domain/payment-method";
export { listPaymentMethods } from "./infrastructure/services/payment-methods-service.adapter";
export { PaymentMethodsTab } from "./ui/components/PaymentMethodsTab";
