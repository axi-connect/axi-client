/**
 * Superficie pública del slice `onboarding` (architecture §3.3 regla 5).
 *
 * Consumidor: `dashboard`, que monta el banner de configuración pendiente. El
 * banner es autosuficiente (trae su propio progreso) y no expone el store.
 */
export { OnboardingResumeBanner } from "./ui/components/OnboardingResumeBanner";
export {
  ONBOARDING_STEPS,
  type OnboardingProgressDTO,
  type OnboardingStep,
  type StepStatus,
} from "./domain/onboarding-progress";
