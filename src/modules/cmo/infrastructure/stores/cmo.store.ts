import { create } from "zustand";

import { HttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import type {
  CmoBriefingReadyEvent,
  CmoProposalCreatedEvent,
  CmoProposalDecidedEvent,
} from "@/core/realtime/events";
import type {
  ApprovalResultDTO,
  BriefingDTO,
  CmoMessageDTO,
  CmoSettingsDTO,
  ProposalDTO,
} from "@/modules/cmo/domain/cmo";
import {
  approveProposal,
  createThread,
  getCmoSettings,
  getLatestBriefing,
  getTranscript,
  listProposals,
  listThreads,
  rejectProposal,
  sendMessage,
} from "@/modules/cmo/infrastructure/services/cmo-service.adapter";

/** Estado de una sección (mismo patrón que analytics/marketing/dashboard). */
export type SectionStatus = "idle" | "loading" | "ready" | "error";

export interface Section<T> {
  status: SectionStatus;
  data: T | null;
  error: string | null;
}

const idle = <T,>(): Section<T> => ({ status: "idle", data: null, error: null });
/** Conserva los datos previos: el refetch atenúa, nunca vacía la pantalla. */
const loading = <T,>(prev: Section<T>): Section<T> => ({
  status: "loading",
  data: prev.data,
  error: null,
});
const ready = <T,>(data: T): Section<T> => ({ status: "ready", data, error: null });
const failed = <T,>(prev: Section<T>, error: string): Section<T> => ({
  status: "error",
  data: prev.data,
  error,
});

/**
 * Mensaje del hilo tal como lo pinta la UI. Añade dos estados que el backend no
 * tiene porque son del cliente: el mensaje propio aún sin respuesta (optimista)
 * y el fallo de envío.
 */
export interface UiMessage {
  id: string;
  role: CmoMessageDTO["role"];
  body: string;
  created_at: string;
  tool_calls: CmoMessageDTO["tool_calls"];
  proposal_id: string | null;
  /** true = escrito localmente, todavía no confirmado por el servidor. */
  pending?: boolean;
  /** Mensaje de error si el turno falló: la burbuja lo muestra con reintento. */
  failed?: string;
}

/**
 * Por qué Axel no está disponible. Se distinguen porque la salida del usuario
 * es distinta en cada caso y una pantalla que las mezcle no ayuda a nadie:
 * `disabled` se arregla en un interruptor, `quota` esperando el próximo ciclo.
 */
export type CmoBlocker = "disabled" | "quota" | null;

interface CmoState {
  settings: Section<CmoSettingsDTO>;
  briefing: Section<BriefingDTO | null>;
  proposals: Section<ProposalDTO[]>;
  thread: {
    id: string | null;
    messages: UiMessage[];
    /** true mientras Axel piensa: NO hay streaming, así que es un estado largo. */
    thinking: boolean;
  };
  blocker: CmoBlocker;
  /** Propuestas nuevas llegadas por WS que el usuario aún no ha visto. */
  unseen: number;

  load: () => Promise<void>;
  reloadProposals: () => Promise<void>;
  ask: (message: string) => Promise<void>;
  retryLast: () => Promise<void>;
  newThread: () => Promise<void>;
  approve: (proposalId: string) => Promise<ApprovalResultDTO>;
  reject: (
    proposalId: string,
    reason: string | undefined,
    saveAsDirective: boolean,
  ) => Promise<{ directive_created: boolean }>;
  markSeen: () => void;
  onBriefingReady: (event: CmoBriefingReadyEvent) => void;
  onProposalCreated: (event: CmoProposalCreatedEvent) => void;
  onProposalDecided: (event: CmoProposalDecidedEvent) => void;
}

/** Codes del backend que significan "Axel no está disponible", no "falló". */
function blockerFor(error: unknown): CmoBlocker {
  if (!(error instanceof HttpError)) return null;
  if (error.code === "cmo/disabled") return "disabled";
  if (error.code === "cmo/quota_exhausted" || error.code === "usage/limit_exceeded") {
    return "quota";
  }
  return null;
}

let localId = 0;
const nextLocalId = (): string => `local-${String((localId += 1))}`;

export const useCmoStore = create<CmoState>((set, get) => ({
  settings: idle(),
  briefing: idle(),
  proposals: idle(),
  thread: { id: null, messages: [], thinking: false },
  blocker: null,
  unseen: 0,

  /**
   * Carga inicial de la pantalla. Las tres peticiones van en paralelo y **cada
   * una falla por su cuenta**: si el briefing revienta, el tablero de propuestas
   * y el chat siguen funcionando. Un `Promise.all` dejaría la pantalla entera en
   * blanco por un error en la parte menos importante.
   */
  load: async () => {
    set((state) => ({
      settings: loading(state.settings),
      briefing: loading(state.briefing),
      proposals: loading(state.proposals),
    }));

    await Promise.all([
      getCmoSettings()
        .then((data) => {
          set({ settings: ready(data) });
        })
        .catch((error: unknown) => {
          set((state) => ({ settings: failed(state.settings, errorMessage(error)) }));
        }),
      getLatestBriefing()
        .then((data) => {
          set({ briefing: ready(data) });
        })
        .catch((error: unknown) => {
          set((state) => ({ briefing: failed(state.briefing, errorMessage(error)) }));
        }),
      listProposals()
        .then((data) => {
          set({ proposals: ready(data) });
        })
        .catch((error: unknown) => {
          set((state) => ({ proposals: failed(state.proposals, errorMessage(error)) }));
        }),
      // El hilo más reciente, si existe: la conversación continúa donde quedó.
      listThreads()
        .then(async (threads) => {
          const current = threads[0];
          if (current === undefined) return;
          const transcript = await getTranscript(current.id);
          set({
            thread: {
              id: current.id,
              messages: transcript.map(toUiMessage),
              thinking: false,
            },
          });
        })
        .catch(() => {
          // Sin hilo previo se arranca en blanco: no es un error que reportar.
        }),
    ]);
  },

  reloadProposals: async () => {
    try {
      set({ proposals: ready(await listProposals()) });
    } catch (error) {
      set((state) => ({ proposals: failed(state.proposals, errorMessage(error)) }));
    }
  },

  /**
   * Un turno de conversación.
   *
   * El mensaje propio se pinta ANTES de la respuesta (optimista) porque el turno
   * tarda decenas de segundos: sin eso, el usuario escribe, no ve nada y vuelve
   * a escribir. Y el fallo se marca EN la burbuja en vez de perder el texto —
   * volver a teclear una pregunta larga porque la red falló es la peor forma de
   * perder a alguien.
   */
  ask: async (message: string) => {
    const trimmed = message.trim();
    if (trimmed === "" || get().thread.thinking) return;

    const optimistic: UiMessage = {
      id: nextLocalId(),
      role: "owner",
      body: trimmed,
      created_at: new Date().toISOString(),
      tool_calls: null,
      proposal_id: null,
      pending: true,
    };
    set((state) => ({
      thread: {
        ...state.thread,
        messages: [...state.thread.messages, optimistic],
        thinking: true,
      },
      blocker: null,
    }));

    try {
      const reply = await sendMessage({
        message: trimmed,
        thread_id: get().thread.id ?? undefined,
      });
      set((state) => ({
        thread: {
          id: reply.thread_id,
          thinking: false,
          messages: [
            ...state.thread.messages.map((item) =>
              item.id === optimistic.id ? { ...item, pending: false } : item,
            ),
            {
              id: nextLocalId(),
              role: "axel" as const,
              body: reply.reply,
              created_at: new Date().toISOString(),
              tool_calls: reply.tool_calls,
              // La propuesta que Axel armó EN este turno viaja en la respuesta,
              // así que la tarjeta se pinta pegada a su mensaje sin esperar una
              // recarga. Al recargar sale del transcript por el mismo campo.
              proposal_id: reply.proposal_id,
            },
          ],
        },
      }));
      // Una respuesta puede haber creado una propuesta: se recarga el tablero
      // en vez de esperar el WS, que puede no llegar si el socket está caído.
      // La tarjeta del hilo necesita la propuesta COMPLETA (titular, cifra,
      // vencimiento) y el POST solo trae su id.
      void get().reloadProposals();
    } catch (error) {
      const blocker = blockerFor(error);
      set((state) => ({
        blocker,
        thread: {
          ...state.thread,
          thinking: false,
          messages: state.thread.messages.map((item) =>
            item.id === optimistic.id
              ? { ...item, pending: false, failed: errorMessage(error) }
              : item,
          ),
        },
      }));
    }
  },

  /** Reintenta el último mensaje propio que falló, sin reescribirlo. */
  retryLast: async () => {
    const failedMessage = [...get().thread.messages]
      .reverse()
      .find((item) => item.role === "owner" && item.failed !== undefined);
    if (failedMessage === undefined) return;
    set((state) => ({
      thread: {
        ...state.thread,
        messages: state.thread.messages.filter((item) => item.id !== failedMessage.id),
      },
    }));
    await get().ask(failedMessage.body);
  },

  newThread: async () => {
    try {
      const thread = await createThread();
      set({ thread: { id: thread.id, messages: [], thinking: false }, blocker: null });
    } catch (error) {
      set({ blocker: blockerFor(error) });
    }
  },

  approve: async (proposalId: string) => {
    const result = await approveProposal(proposalId);
    await get().reloadProposals();
    return result;
  },

  reject: async (proposalId, reason, saveAsDirective) => {
    const result = await rejectProposal(proposalId, {
      reason,
      save_as_directive: saveAsDirective,
    });
    await get().reloadProposals();
    return result;
  },

  markSeen: () => {
    set({ unseen: 0 });
  },

  onBriefingReady: () => {
    // El evento NO trae el briefing completo (el WS avisa, no sincroniza): se
    // recarga desde el servidor, que es la única fuente de verdad.
    void getLatestBriefing()
      .then((data) => {
        set({ briefing: ready(data) });
      })
      .catch(() => {
        // El briefing viejo sigue en pantalla: mejor que un hueco.
      });
    void get().reloadProposals();
  },

  onProposalCreated: () => {
    set((state) => ({ unseen: state.unseen + 1 }));
    void get().reloadProposals();
  },

  /**
   * Otra pestaña (u otra persona) decidió una propuesta. Se quita de la lista
   * de pendientes al instante: es lo que evita que dos administradores aprueben
   * la misma campaña mirando dos pantallas.
   */
  onProposalDecided: (event) => {
    set((state) => ({
      proposals:
        state.proposals.data === null
          ? state.proposals
          : ready(state.proposals.data.filter((item) => item.id !== event.proposal_id)),
    }));
  },
}));

function toUiMessage(message: CmoMessageDTO): UiMessage {
  return {
    id: message.id,
    role: message.role,
    body: message.body,
    created_at: message.created_at,
    tool_calls: message.tool_calls,
    proposal_id: message.proposal_id,
  };
}
