import { create } from "zustand";

import { API_ERROR_CODES, HttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import type {
  CommercialGoalDTO,
  CommercialPaceDTO,
  CommercialPlanDTO,
  GoalInputDTO,
  GoalResponseDTO,
} from "@/modules/commercial/domain/commercial";
import {
  getGoal,
  getPace,
  getPlan,
  previewPlan as previewPlanApi,
  putGoal,
  recompute as recomputeApi,
} from "@/modules/commercial/infrastructure/services/commercial-service.adapter";

/** Estado de una sección (mismo patrón que cmo/analytics/dashboard). */
export type SectionStatus = "idle" | "loading" | "ready" | "error";

export interface Section<T> {
  status: SectionStatus;
  data: T | null;
  error: string | null;
}

const idle = <T,>(): Section<T> => ({ status: "idle", data: null, error: null });
/** Conserva los datos previos: el refetch atenúa, nunca vacía la pantalla. */
const loading = <T,>(prev: Section<T>): Section<T> => ({ status: "loading", data: prev.data, error: null });
const ready = <T,>(data: T): Section<T> => ({ status: "ready", data, error: null });
const failed = <T,>(prev: Section<T>, error: string): Section<T> => ({ status: "error", data: prev.data, error });

/**
 * Por qué no hay pantalla. `no_plan` = el plan del tenant no incluye la
 * capacidad `crm` (403 `entitlements/capability_not_granted`): no es un fallo,
 * es una venta pendiente, y se pinta como tal (`CommercialBlockedState`).
 */
export type CommercialBlocker = "no_plan" | null;

interface CommercialState {
  goal: Section<GoalResponseDTO>;
  plan: Section<CommercialPlanDTO>;
  pace: Section<CommercialPaceDTO>;
  /** «Lo que implica» del editor de meta: la vista previa de la cifra tecleada. */
  preview: Section<CommercialPlanDTO>;
  blocker: CommercialBlocker;
  saving: boolean;

  /** Carga la meta y, si la hay, el plan y el ritmo en paralelo (cada uno falla por su cuenta). */
  load: () => Promise<void>;
  /** Solo plan y ritmo, para después de un cambio o un evento. */
  reloadPace: () => Promise<void>;
  /** Fija la meta. Lanza el error al llamador (el formulario lo pinta) y recarga plan y ritmo. */
  saveGoal: (input: GoalInputDTO) => Promise<CommercialGoalDTO>;
  /** Vista previa con aborto: la petición anterior se cancela al llegar la siguiente cifra. */
  previewPlan: (input: GoalInputDTO) => Promise<void>;
  cancelPreview: () => void;
  /** Recalcular a mano. `false` si el servidor pidió esperar (429). */
  recompute: () => Promise<boolean>;
}

function blockerFor(error: unknown): CommercialBlocker {
  if (error instanceof HttpError && error.code === API_ERROR_CODES.capabilityNotGranted) return "no_plan";
  return null;
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export const useCommercialStore = create<CommercialState>((set, get) => {
  /** El controlador de la vista previa en curso. Vive en el closure del store,
   *  no a nivel de módulo: un valor global sobreviviría a HMR y a los resets
   *  entre tests. */
  let previewController: AbortController | null = null;

  async function loadPaceAndPlan(): Promise<void> {
    set((state) => ({ plan: loading(state.plan), pace: loading(state.pace) }));
    await Promise.all([
      getPlan()
        .then((data) => {
          set({ plan: ready(data) });
        })
        .catch((error: unknown) => {
          set((state) => ({ plan: failed(state.plan, errorMessage(error)) }));
        }),
      getPace("day")
        .then((data) => {
          set({ pace: ready(data) });
        })
        .catch((error: unknown) => {
          set((state) => ({ pace: failed(state.pace, errorMessage(error)) }));
        }),
    ]);
  }

  return {
    goal: idle(),
    plan: idle(),
    pace: idle(),
    preview: idle(),
    blocker: null,
    saving: false,

    load: async () => {
      set((state) => ({ goal: loading(state.goal), blocker: null }));
      let response: GoalResponseDTO;
      try {
        response = await getGoal();
      } catch (error: unknown) {
        const blocker = blockerFor(error);
        set((state) => ({
          blocker,
          goal: blocker === null ? failed(state.goal, errorMessage(error)) : { status: "ready", data: null, error: null },
        }));
        return;
      }
      set({ goal: ready(response) });
      if (response.goal === null) {
        // Sin meta no hay plan ni ritmo: pedirlos sería recibir dos 404.
        set({ plan: idle(), pace: idle() });
        return;
      }
      await loadPaceAndPlan();
    },

    reloadPace: async () => {
      if (get().goal.data?.goal === null) return;
      await loadPaceAndPlan();
    },

    saveGoal: async (input) => {
      set({ saving: true });
      try {
        const goal = await putGoal(input);
        set((state) => ({
          goal: ready({
            goal,
            seed: state.goal.data?.seed ?? {
              last_month_revenue_cents: null,
              last_month_sales: null,
              last_month_avg_ticket_cents: null,
              suggested_target_cents: null,
              source: "benchmark",
              niche_label: null,
            },
          }),
        }));
        void loadPaceAndPlan();
        return goal;
      } finally {
        set({ saving: false });
      }
    },

    previewPlan: async (input) => {
      previewController?.abort();
      const controller = new AbortController();
      previewController = controller;
      set((state) => ({ preview: loading(state.preview) }));
      try {
        const data = await previewPlanApi(input, controller.signal);
        if (previewController !== controller) return;
        set({ preview: ready(data) });
      } catch (error: unknown) {
        if (isAbort(error) || previewController !== controller) return;
        set((state) => ({ preview: failed(state.preview, errorMessage(error)) }));
      }
    },

    cancelPreview: () => {
      previewController?.abort();
      previewController = null;
      set({ preview: idle() });
    },

    recompute: async () => {
      try {
        const result = await recomputeApi();
        return result.queued;
      } catch (error: unknown) {
        if (error instanceof HttpError && error.status === 429) return false;
        throw error;
      }
    },
  };
});

/** Solo para tests. */
export function resetCommercialStore(): void {
  useCommercialStore.getState().cancelPreview();
  useCommercialStore.setState({
    goal: idle(),
    plan: idle(),
    pace: idle(),
    preview: idle(),
    blocker: null,
    saving: false,
  });
}
