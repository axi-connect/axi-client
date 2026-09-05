/**
 * Superficie pública del slice `landing` (architecture §3.3 regla 5).
 *
 * Nació con su primer consumidor externo, `onboarding`: el registro
 * autoservicio necesita la oferta comercial (paquetes, módulos y su copy) para
 * preseleccionar y resumir lo elegido. Las CIFRAS ya no viven en el content:
 * llegan del catálogo público y se resuelven con el dominio `public-catalog`,
 * que también se exporta desde aquí. Todo lo exportado es dato puro o un mapa
 * de iconos: ningún componente con estado.
 */
export {
  ANNUAL_PAID_MONTHS,
  BILLING_PERIODS,
  FOUNDERS,
  MODULES,
  MODULES_SECTION,
  MODULE_IDS,
  MONTHS_PER_YEAR,
  PRICING,
  formatCop,
  foundersDiscountBadge,
  foundersHeadline,
  offerByCode,
  planById,
  pricingPackages,
  type BillingPeriodId,
  type ModuleId,
  type ModuleOffer,
  type OfferCode,
  type PlanGroup,
  type PricingPlan,
} from "@/modules/landing/ui/content/landing.content";

export {
  MAX_VOLUME_ID,
  annualTotalCop,
  catalogFromApi,
  discountLabel,
  discountedCop,
  hasVolumeAxis,
  isVolumeId,
  modulePriceCop,
  planListCop,
  planMonthlyCop,
  promotionAppliesTo,
  promotionLastDay,
  promotionOpen,
  promotionRemaining,
  volumeById,
  type CatalogPromotion,
  type CatalogVolume,
  type PublicCatalog,
} from "@/modules/landing/domain/public-catalog";

export { MODULE_ICONS } from "@/modules/landing/ui/components/ModuleCard";
