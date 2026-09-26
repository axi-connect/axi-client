"use client";

import { useEffect } from "react";

import {
  ONBOARDING_PATH,
  ONBOARDING_STEPS,
  firstOpenStep,
  pendingCount,
  shouldShowResumeBanner,
  stepStatus,
  type OnboardingStep,
  type StepStatus,
} from "@/modules/onboarding/domain/onboarding-progress";
import { useOnboardingStore } from "@/modules/onboarding/infrastructure/stores/onboarding.store";

export interface OnboardingResumeStep {
  code: OnboardingStep;
  label: string;
  status: StepStatus;
}

export type OnboardingResume =
  /** Aún no se sabe: quien lo pinta espera (no muestra una cosa y luego otra). */
  | { state: "loading" }
  /** Terminado, oculto por el usuario o sin progreso legible: no se muestra nada. */
  | { state: "hidden" }
  | {
      state: "pending";
      /** Pasos que faltan (un paso omitido cuenta como cerrado). */
      pending: number;
      steps: OnboardingResumeStep[];
      /** El primer paso abierto, al que lleva «Continuar». */
      next: OnboardingResumeStep | null;
      href: string;
      /** Oculta la invitación y lo persiste en el servidor (optimista). */
      dismiss: () => void;
    };

/**
 * La invitación a terminar la configuración, como DATO: el Panel la pinta en
 * su isla «Lo próximo» (el primer día, lo más accionable es esto). El slice
 * decide si se muestra, qué pasos quedan y a dónde lleva; el consumidor solo
 * dibuja (el puerto aplica la regla, no la presta).
 *
 * Autosuficiente: carga el progreso una vez desde el store compartido. Si no
 * carga —backend sin el módulo, red— queda oculta: un error que no es del
 * Panel no se pinta en el Panel.
 */
export function useOnboardingResume(): OnboardingResume {
  const status = useOnboardingStore((state) => state.status);
  const progress = useOnboardingStore((state) => state.progress);
  const load = useOnboardingStore((state) => state.load);
  const dismissBanner = useOnboardingStore((state) => state.dismissBanner);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === "idle" || status === "loading") return { state: "loading" };
  if (status !== "ready" || !progress || !shouldShowResumeBanner(progress)) return { state: "hidden" };

  const steps = ONBOARDING_STEPS.map((step) => ({ code: step.code, label: step.label, status: stepStatus(progress, step.code) }));
  const nextCode = firstOpenStep(progress);
  return {
    state: "pending",
    pending: pendingCount(progress),
    steps,
    next: steps.find((step) => step.code === nextCode) ?? null,
    href: nextCode ? `${ONBOARDING_PATH}?step=${nextCode}` : ONBOARDING_PATH,
    dismiss: () => void dismissBanner(),
  };
}
