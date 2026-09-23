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
}

function blockerFor(error: unknown): CommercialBlocker {
  if (error instanceof HttpError && error.code === API_ERROR_CODES.capabilityNotGranted) return "no_plan";
  return null;
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export const useCommercialStore = create<CommercialState>((set, get) => {
  /**
   * Número de secuencia por sección: cada petición captura el suyo y solo
   * escribe si sigue siendo el último. Dos `load()` solapados (el Panel y la
   * ruta, o guardar la meta y montar la vista) ya no dejan en pantalla la
   * respuesta que llegó tarde. Viven en el closure del store, no a nivel de
   * módulo: un valor global sobreviviría a HMR y a los resets entre tests.
   */
  const seq = { goal: 0, plan: 0, pace: 0 };
  let previewController: AbortController | null = null;

  async function loadPaceAndPlan(): Promise<void> {
    const planSeq = (seq.plan += 1);
    const paceSeq = (seq.pace += 1);
    set((state) => ({ plan: loading(state.plan), pace: loading(state.pace) }));
    await Promise.all([
      getPlan()
        .then((data) => {
          if (seq.plan === planSeq) set({ plan: ready(data) });
        })
        .catch((error: unknown) => {
          if (seq.plan === planSeq) set((state) => ({ plan: failed(state.plan, errorMessage(error)) }));
        }),
      getPace("day")
        .then((data) => {
          if (seq.pace === paceSeq) set({ pace: ready(data) });
        })
        .catch((error: unknown) => {
          if (seq.pace === paceSeq) set((state) => ({ pace: failed(state.pace, errorMessage(error)) }));
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
      const goalSeq = (seq.goal += 1);
      set((state) => ({ goal: loading(state.goal), blocker: null }));
      let response: GoalResponseDTO;
      try {
        response = await getGoal();
      } catch (error: unknown) {
        if (seq.goal !== goalSeq) return;
        const blocker = blockerFor(error);
        set((state) => ({
          blocker,
          goal: blocker === null ? failed(state.goal, errorMessage(error)) : { status: "ready", data: null, error: null },
        }));
        return;
      }
      if (seq.goal !== goalSeq) return;
      set({ goal: ready(response) });
      if (response.goal === null) {
        // Sin meta no hay plan ni ritmo: pedirlos sería recibir dos 404.
        seq.plan += 1;
        seq.pace += 1;
        set({ plan: idle(), pace: idle() });
        return;
      }
      await loadPaceAndPlan();
    },

    reloadPace: async () => {
      if (get().goal.data?.goal == null) return;
      await loadPaceAndPlan();
    },

    saveGoal: async (input) => {
      set({ saving: true });
      try {
        const goal = await putGoal(input);
        // La semilla no se inventa: si no se había cargado, queda `null`.
        seq.goal += 1;
        set((state) => ({ goal: ready({ goal, seed: state.goal.data?.seed ?? null }) }));
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
  };
});

/** Solo para tests. */
export function resetCommercialStore(): void {
  useCommercialStore.getState().cancelPreview();
  useCommercialStore.setState({ goal: idle(), plan: idle(), pace: idle(), preview: idle(), blocker: null, saving: false });
}
