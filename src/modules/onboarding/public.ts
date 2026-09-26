/**
 * Superficie pública del slice `onboarding` (architecture §3.3 regla 5).
 *
 * Consumidores: `dashboard`, que pinta la configuración pendiente en su isla
 * «Lo próximo» (`useOnboardingResume`, autosuficiente: el slice decide si se
 * muestra, qué pasos quedan y a dónde lleva; no expone el store), y
 * `companies`, que edita el tipo de negocio en Mi empresa con el mismo
 * catálogo que eligió el alta.
 */
export {
  useOnboardingResume,
  type OnboardingResume,
  type OnboardingResumeStep,
} from "./ui/hooks/use-onboarding-resume";
export {
  ONBOARDING_STEPS,
  type OnboardingProgressDTO,
  type OnboardingStep,
  type StepStatus,
} from "./domain/onboarding-progress";
export { NICHES, nicheByCode, type Niche } from "./domain/niches";
