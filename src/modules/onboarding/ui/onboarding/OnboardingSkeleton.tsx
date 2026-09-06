import { ONBOARDING_STEPS } from "@/modules/onboarding/domain/onboarding-progress";
import { FlowSkeleton } from "@/modules/onboarding/ui/flow/FlowSkeleton";

/** Esqueleto de `/onboarding` (también lo usa `loading.tsx`): la pregunta y su control sobre el suelo, con el hueco de la ruta. */
export function OnboardingSkeleton() {
  return <FlowSkeleton steps={ONBOARDING_STEPS.length + 1} label="Cargando tu configuración" />;
}
