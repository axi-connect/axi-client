import { Bot, Clock, MessageCircle, Package, Sparkles, Store, type LucideIcon } from "lucide-react";

import {
  ONBOARDING_STEPS,
  isOnboardingComplete,
  stepIndex,
  stepStatus,
  type OnboardingProgressDTO,
  type OnboardingStep,
} from "@/modules/onboarding/domain/onboarding-progress";
import type { FlowStop } from "@/modules/onboarding/ui/flow/FlowRoute";

/** Icono de cada parada. Diccionario cerrado: Tailwind y el bundle lo exigen. */
export const ONBOARDING_STEP_ICONS: Record<OnboardingStep, LucideIcon> = {
  niche: Store,
  business_hours: Clock,
  catalog: Package,
  agents: Bot,
  whatsapp: MessageCircle,
};

/** La sexta parada: la pantalla final. No es un paso del progreso; es el destino de la ruta. */
export const DONE_STOP = { code: "done", label: "Listo", icon: Sparkles } as const;

/**
 * Las paradas de la ruta a partir del progreso del servidor: el estado de
 * cada paso (hecho, omitido, pendiente) decide si la parada se puede volver a
 * visitar y cómo se dibuja. Es un mapeador de UI: el dominio no sabe de iconos.
 */
export function routeStops(progress: OnboardingProgressDTO): FlowStop[] {
  return [
    ...ONBOARDING_STEPS.map((step) => ({
      code: step.code,
      label: step.label,
      icon: ONBOARDING_STEP_ICONS[step.code],
      status: stepStatus(progress, step.code),
    })),
    { ...DONE_STOP, status: isOnboardingComplete(progress) ? ("done" as const) : ("pending" as const) },
  ];
}

/** Índice de la parada activa: el paso actual o, en la pantalla final, la parada «Listo». */
export function routeIndex(current: OnboardingStep | null): number {
  return current === null ? ONBOARDING_STEPS.length : stepIndex(current);
}
