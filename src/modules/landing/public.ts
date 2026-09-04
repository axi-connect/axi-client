/**
 * Superficie pública del slice `landing` (architecture §3.3 regla 5).
 *
 * Nació con su primer consumidor externo, `onboarding`: el registro
 * autoservicio necesita la oferta comercial (paquetes, módulos, precios y sus
 * helpers) para preseleccionar y resumir lo elegido, y la landing es la única
 * dueña de ese copy y de esas cifras. Todo lo exportado es dato puro o un mapa
 * de iconos: ningún componente con estado.
 */
export {
  BILLING_PERIODS,
  DEFAULT_VOLUME_ID,
  FOUNDERS,
  MODULES,
  MODULES_SECTION,
  MODULE_IDS,
  PRICING,
  PRICING_VOLUMES,
  annualTotalCop,
  formatCop,
  founderCop,
  foundersOfferOpen,
  foundersRemaining,
  offerByCode,
  planById,
  planListCop,
  planMonthlyCop,
  pricingPackages,
  publishableModules,
  volumeById,
  type BillingPeriodId,
  type ModuleId,
  type ModuleOffer,
  type OfferCode,
  type PlanGroup,
  type PricingPlan,
  type VolumeId,
} from "@/modules/landing/ui/content/landing.content";

export { MODULE_ICONS } from "@/modules/landing/ui/components/ModuleCard";
