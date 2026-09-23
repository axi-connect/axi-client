import { create } from "zustand";

import { API_ERROR_CODES, HttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import type {
  CommercialApprovalResultDTO,
  CommercialGoalDTO,
  CommercialPaceDTO,
  CommercialPlanDTO,
  CommercialProposalDTO,
  GoalInputDTO,
  GoalResponseDTO,
  RejectCommercialProposalResultDTO,
} from "@/modules/commercial/domain/commercial";
import { approvedThisPeriod } from "@/modules/commercial/domain/proposals";
import {
  approveProposal as approveProposalApi,
  getGoal,
  getPace,
  getPlan,
  listProposals,
  previewPlan as previewPlanApi,
  putGoal,
  rejectProposal as rejectProposalApi,
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
  /** «Axi propone»: pendientes primero y, detrás, las aprobadas del mes (con «Ver qué quedó»). */
  proposals: Section<CommercialProposalDTO[]>;
  /**
   * Lo que dejó cada aprobación de esta sesión, por id: aprobar desde la lista
   * abre el detalle y el detalle pinta aquí el resultado (el servidor no lo
   * vuelve a dar: aprobar es de una sola vez).
   */
  approvals: Record<string, CommercialApprovalResultDTO>;
  /** Lo decidido en esta sesión (aprobada o rechazada), para no resucitar filas con una carga vieja. */
  decisions: Record<string, ProposalDecision>;
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
  /** Pendientes + aprobadas del mes, en paralelo. Un fallo deja la sección en error sin tumbar la ruta. */
  loadProposals: () => Promise<void>;
  /**
   * Aprueba (una sola vez: el segundo clic es 409). Lanza al llamador, que
   * pinta el error; al salir bien guarda el resultado, marca la fila aprobada y
   * recarga plan y ritmo (el lote puede mover la ruta).
   */
  approveProposal: (id: string) => Promise<CommercialApprovalResultDTO>;
  /** Rechaza con motivo. Lanza al llamador; la fila sale de la lista de pendientes. */
  rejectProposal: (id: string, reason: string | undefined) => Promise<RejectCommercialProposalResultDTO>;
}

type ProposalDecision = Pick<CommercialProposalDTO, "status" | "decided_at">;

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
  const seq = { goal: 0, plan: 0, pace: 0, proposals: 0 };
  /**
   * Una carga de la lista que salió ANTES del clic trae la fila aún
   * pendiente; al llegar se le aplica lo decidido en esta sesión en vez de
   * descartarla (descartarla dejaría la sección cargando para siempre).
   */
  function applyDecisions(rows: readonly CommercialProposalDTO[]): CommercialProposalDTO[] {
    const { decisions } = get();
    return rows
      .filter((row) => decisions[row.id]?.status !== "rejected")
      .map((row) => {
        const decision = decisions[row.id];
        return decision === undefined ? row : { ...row, ...decision };
      });
  }
  let previewController: AbortController | null = null;

  async function loadPaceAndPlan(): Promise<void> {
    const planSeq = (seq.plan += 1);
    const paceSeq = (seq.pace += 1);
    set((state) => ({ plan: loading(state.plan), pace: loading(state.pace) }));
    await Promise.all([
      getPlan()
        .then((data) => {
          // `null` = el periodo no tiene plan (200): la sección queda lista y vacía.
          if (seq.plan === planSeq) set({ plan: data === null ? { status: "ready", data: null, error: null } : ready(data) });
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
    proposals: idle(),
    approvals: {},
    decisions: {},
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

    loadProposals: async () => {
      const mine = (seq.proposals += 1);
      set((state) => ({ proposals: loading(state.proposals) }));
      try {
        const [pending, approved] = await Promise.all([listProposals("pending"), listProposals("approved")]);
        if (seq.proposals !== mine) return;
        const periodStart = get().goal.data?.goal?.period_start ?? null;
        const rows = applyDecisions(pending);
        const seen = new Set(rows.map((row) => row.id));
        const settled = approvedThisPeriod(applyDecisions(approved), periodStart).filter((row) => !seen.has(row.id));
        set({ proposals: ready([...rows, ...settled]) });
      } catch (error: unknown) {
        if (seq.proposals !== mine) return;
        set((state) => ({ proposals: failed(state.proposals, errorMessage(error)) }));
      }
    },

    approveProposal: async (id) => {
      const result = await approveProposalApi(id);
      const decidedAt = new Date().toISOString();
      set((state) => ({
        decisions: { ...state.decisions, [id]: { status: "approved", decided_at: decidedAt } },
        approvals: { ...state.approvals, [id]: result },
        proposals: patchProposal(state.proposals, id, { status: "approved", decided_at: decidedAt }),
      }));
      void get().reloadPace();
      return result;
    },

    rejectProposal: async (id, reason) => {
      const result = await rejectProposalApi(id, reason === undefined ? {} : { reason });
      set((state) => ({
        decisions: { ...state.decisions, [id]: { status: "rejected", decided_at: new Date().toISOString() } },
        proposals:
          state.proposals.data === null
            ? state.proposals
            : { ...state.proposals, data: state.proposals.data.filter((proposal) => proposal.id !== id) },
      }));
      return result;
    },
  };
});

function patchProposal(
  section: Section<CommercialProposalDTO[]>,
  id: string,
  patch: Partial<CommercialProposalDTO>,
): Section<CommercialProposalDTO[]> {
  if (section.data === null) return section;
  return { ...section, data: section.data.map((proposal) => (proposal.id === id ? { ...proposal, ...patch } : proposal)) };
}

/** Solo para tests. */
export function resetCommercialStore(): void {
  useCommercialStore.getState().cancelPreview();
  useCommercialStore.setState({
    goal: idle(),
    plan: idle(),
    pace: idle(),
    preview: idle(),
    proposals: idle(),
    approvals: {},
    decisions: {},
    blocker: null,
    saving: false,
  });
}
