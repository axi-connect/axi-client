/**
 * SUPERFICIE PÚBLICA del slice `payments` (architecture.md §3.3): los medios
 * de pago del tenant (`/payment-methods`, capacidad `sales`).
 *
 * Consumidores: `orders` (el selector de «Registrar pago» lista los medios) y
 * el hub Pagos de Ventas (`/settings/payments`), que monta las pestañas —todas
 * autosuficientes— y las filtra por función del tenant.
 */
export {
  PAYMENT_KIND_LABELS,
  maskAccountNumber,
  type PaymentMethodDTO,
  type PaymentMethodKind,
} from "./domain/payment-method";
export { listPaymentMethods } from "./infrastructure/services/payment-methods-service.adapter";
export { PaymentMethodsTab } from "./ui/components/PaymentMethodsTab";
export {
  FX_SOURCE_LABELS,
  MAX_SPREAD_BPS,
  formatRate,
  fxNotice,
  manualRateActive,
  percentToSpread,
  spreadToPercent,
  type EffectiveFxRateDTO,
  type FxSettingsDTO,
  type LatestFxRateDTO,
} from "./domain/fx-settings";
export { getLatestFxRate } from "./infrastructure/services/fx-service.adapter";
export {
  useIndicativeQuote,
  type IndicativeQuote,
} from "./infrastructure/hooks/use-indicative-quote";
export { FxSettingsTab } from "./ui/components/FxSettingsTab";
export {
  PAYMENTS_FX_PATH,
  PAYMENTS_HUB_BASE,
  PaymentsHubNav,
  paymentsHubTabs,
} from "./ui/components/PaymentsHubNav";
