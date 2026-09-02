import { create } from "zustand";

import { errorMessage } from "@/core/lib/error-messages";
import {
  completeOnboarding,
  getOnboardingProgress,
  updateOnboardingProgress,
} from "@/modules/onboarding/infrastructure/services/onboarding-service.adapter";
import type {
  OnboardingProgressDTO,
  OnboardingStep,
  UpdateOnboardingProgressDTO,
} from "@/modules/onboarding/domain/onboarding-progress";

export type OnboardingStatus = "idle" | "loading" | "ready" | "error";

interface OnboardingState {
  status: OnboardingStatus;
  progress: OnboardingProgressDTO | null;
  error: string | null;
  saving: boolean;

  /** Carga el progreso una vez; `force` vuelve a pedirlo. */
  load: (force?: boolean) => Promise<void>;
  update: (patch: UpdateOnboardingProgressDTO) => Promise<OnboardingProgressDTO>;
  markDone: (step: OnboardingStep, data?: Record<string, unknown>, extra?: UpdateOnboardingProgressDTO) => Promise<void>;
  skip: (step: OnboardingStep) => Promise<void>;
  complete: () => Promise<void>;
  dismissBanner: () => Promise<void>;
}

/** Una sola petición en vuelo aunque lo pidan el shell y el banner a la vez. */
let inflight: Promise<void> | null = null;

/**
 * Estado del onboarding compartido entre `/onboarding` y el banner del
 * dashboard (§9: sobrevive a la navegación entre vistas → Zustand). El servidor
 * es la verdad; aquí se guarda su último eco y se reescribe con cada respuesta.
 */
export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  status: "idle",
  progress: null,
  error: null,
  saving: false,

  load: async (force = false) => {
    if (!force && (get().status === "ready" || inflight)) return inflight ?? undefined;
    set({ status: "loading", error: null });
    inflight = getOnboardingProgress()
      .then((progress) => set({ status: "ready", progress, error: null }))
      .catch((err: unknown) => set({ status: "error", error: errorMessage(err, "No pudimos cargar tu progreso") }))
      .finally(() => {
        inflight = null;
      });
    return inflight;
  },

  update: async (patch) => {
    set({ saving: true });
    try {
      const progress = await updateOnboardingProgress(patch);
      set({ progress, status: "ready" });
      return progress;
    } finally {
      set({ saving: false });
    }
  },

  markDone: async (step, data, extra) => {
    await get().update({ ...extra, steps: { [step]: { status: "done", ...(data ? { data } : {}) } } });
  },

  skip: async (step) => {
    await get().update({ steps: { [step]: { status: "skipped" } } });
  },

  complete: async () => {
    set({ saving: true });
    try {
      const progress = await completeOnboarding();
      set({ progress, status: "ready" });
    } finally {
      set({ saving: false });
    }
  },

  dismissBanner: async () => {
    const current = get().progress;
    if (!current) return;
    // Optimista: el banner desaparece ya; si el PUT falla, vuelve.
    set({ progress: { ...current, banner_dismissed_at: new Date().toISOString() } });
    try {
      await get().update({ banner_dismissed_at: new Date().toISOString() });
    } catch {
      set({ progress: current });
    }
  },
}));

/** Solo para tests: vuelve al estado inicial y suelta la petición en vuelo. */
export function resetOnboardingStore(): void {
  inflight = null;
  useOnboardingStore.setState({ status: "idle", progress: null, error: null, saving: false });
}
