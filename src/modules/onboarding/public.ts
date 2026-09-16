/**
 * Superficie pública del slice `onboarding` (architecture §3.3 regla 5).
 *
 * Consumidores: `dashboard`, que monta el banner de configuración pendiente (el
 * banner es autosuficiente y no expone el store), y `companies`, que edita el
 * tipo de negocio en Mi empresa con el mismo catálogo que eligió el alta.
 */
export { OnboardingResumeBanner } from "./ui/components/OnboardingResumeBanner";
export {
  ONBOARDING_STEPS,
  type OnboardingProgressDTO,
  type OnboardingStep,
  type StepStatus,
} from "./domain/onboarding-progress";
export { NICHES, nicheByCode, type Niche } from "./domain/niches";
