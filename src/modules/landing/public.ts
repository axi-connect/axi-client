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
  FOUNDERS,
  MODULES,
  MODULES_SECTION,
  MODULE_IDS,
  PRICING,
  SBS_TIERS,
  formatCop,
  founderCop,
  foundersRemaining,
  offerByCode,
  publishableModules,
  sbsTier,
  type ModuleId,
  type ModuleOffer,
  type OfferCode,
  type PricingPlan,
} from "@/modules/landing/ui/content/landing.content";

export { MODULE_ICONS } from "@/modules/landing/ui/components/ModuleCard";
