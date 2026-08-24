import { create } from "zustand";

import { HttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import type {
  CmoBriefingReadyEvent,
  CmoProposalCreatedEvent,
  CmoProposalDecidedEvent,
  CmoTurnCompletedEvent,
  CmoTurnDeltaEvent,
  CmoTurnFailedEvent,
  CmoTurnStartedEvent,
  CmoTurnStepEvent,
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
  getProposal,
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

/** Una herramienta de Axel, mientras corre o ya terminada. */
export interface LiveStep {
  name: string;
  label: string;
  done: boolean;
  ms: number | null;
  productive: boolean | null;
}

/**
 * El turno que está ocurriendo AHORA.
 *
 * Existe porque no hay de dónde releerlo: un turno a medio escribir no está en
 * ningún endpoint. Tres reglas gobiernan su ciclo de vida:
 *
 * 1. **La verdad final es el POST.** Cuando responde, su cuerpo reemplaza el
 *    texto acumulado; los deltas solo existen para que el dueño vea avance.
 * 2. **El orden se comprueba, no se supone.** `seq` descarta lo repetido y lo
 *    que llegue tarde; Socket.IO conserva el orden por conexión, pero un evento
 *    duplicado por una reconexión pintaría texto dos veces.
 * 3. **El texto es por iteración.** Al ver una vuelta mayor se descarta lo
 *    anterior: era el preámbulo de una llamada a herramienta, no la respuesta.
 */
export interface LiveTurn {
  turn_id: string;
  /** Vuelta del loop a la que pertenece el texto acumulado. */
  iteration: number;
  text: string;
  steps: LiveStep[];
  /** Último `seq` aceptado: la puerta contra duplicados y desorden. */
  seq: number;
}

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
  /** El turno en curso, contado en vivo. `null` cuando no hay ninguno. */
  live: LiveTurn | null;
  /** Propuestas nuevas llegadas por WS que el usuario aún no ha visto. */
  unseen: number;
  /**
   * Propuestas del hilo que ya NO están en el tablero, por id.
   *
   * El tablero solo lista lo que falta decidir, así que al aprobar o descartar
   * una propuesta desaparecía de la conversación y el mensaje de Axel se quedaba
   * sin rastro de lo que había armado. Aquí se guardan las decididas para poder
   * seguir pintándolas CON su estado, y se resuelven una a una por id — también
   * al recargar un hilo viejo, donde la propuesta ya venía decidida.
   *
   * `null` significa «se preguntó y ya no está» (venció y se purgó, o falló la
   * consulta): la marca evita volver a pedirla en cada render.
   */
  settled: Record<string, ProposalDTO | null>;

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
  /** Resuelve una propuesta del hilo que el tablero ya no lista. Idempotente. */
  resolveSettled: (proposalId: string) => Promise<void>;
  onBriefingReady: (event: CmoBriefingReadyEvent) => void;
  onProposalCreated: (event: CmoProposalCreatedEvent) => void;
  onProposalDecided: (event: CmoProposalDecidedEvent) => void;
  onTurnStarted: (event: CmoTurnStartedEvent) => void;
  onTurnStep: (event: CmoTurnStepEvent) => void;
  onTurnDelta: (event: CmoTurnDeltaEvent) => void;
  onTurnCompleted: (event: CmoTurnCompletedEvent) => void;
  onTurnFailed: (event: CmoTurnFailedEvent) => void;
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

/** Ids de propuesta decidida que se están pidiendo ahora mismo. */
const inFlight = new Set<string>();

/**
 * Cuánto se espera el POST del turno, DERIVADO del presupuesto del servidor.
 *
 * No es un timeout de red al uso: el servidor corta el turno por su cuenta, así
 * que si pasa su presupuesto más el margen, el problema está en el camino. Sin
 * esto un POST colgado deja el chat pensando indefinidamente, que es peor que un
 * error.
 *
 * El número LO DICE EL SERVIDOR (`turn_timeout_ms` en `GET /cmo/settings`).
 * Cuando era una constante de aquí, subir `CMO_TURN_TIMEOUT_MS` hacía que el
 * navegador diera por fallido un turno que seguía vivo, y nada ataba los dos
 * valores. El respaldo cubre el caso de que los ajustes no hayan cargado.
 */
const TURN_MARGIN_MS = 10_000;
const TURN_BUDGET_FALLBACK_MS = 100_000;

function turnBudgetMs(state: CmoState): number {
  const fromServer = state.settings.data?.turn_timeout_ms;
  return fromServer === undefined ? TURN_BUDGET_FALLBACK_MS : fromServer + TURN_MARGIN_MS;
}

/**
 * Un turno que se abandona por tiempo no es un fallo del análisis.
 *
 * El aborto llega como `DOMException`, que no es `HttpError` pero SÍ es `Error`,
 * así que `errorMessage` caía a su `message` y la burbuja mostraba «The operation
 * timed out.» en inglés, con un botón de reintentar al lado que cuesta otro
 * análisis. Y muy probablemente el turno terminó en el servidor: si el socket
 * está vivo, su respuesta aparece sola.
 */
function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

const TIMEOUT_MESSAGE =
  "Axel tardó más de lo normal y dejamos de esperar. Si alcanzó a terminar, su respuesta aparece sola: no hace falta repetir la pregunta.";

export const useCmoStore = create<CmoState>((set, get) => ({
  settings: idle(),
  briefing: idle(),
  proposals: idle(),
  thread: { id: null, messages: [], thinking: false },
  blocker: null,
  live: null,
  unseen: 0,
  settled: {},

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
    /* El id del turno lo propone el CLIENTE: los eventos en vivo empiezan a
       llegar en el primer segundo y el POST puede tardar noventa, así que sin
       proponerlo no habría con qué atarlos — y dos pestañas del mismo dueño no
       podrían distinguir de quién es cada turno. */
    const turnId = crypto.randomUUID();
    set((state) => ({
      thread: {
        ...state.thread,
        messages: [...state.thread.messages, optimistic],
        thinking: true,
      },
      blocker: null,
      live: { turn_id: turnId, iteration: 0, text: "", steps: [], seq: 0 },
    }));

    /* Presupuesto explícito. El servidor corta el turno a los 90 s; si a los 100
       no ha respondido, el problema está en el camino (un proxy inverso que
       cerró la conexión) y seguir esperando deja el chat pensando para siempre.
       La respuesta no se pierde: `cmo.turn_completed` la trae ya persistida. */
    const budget = AbortSignal.timeout(turnBudgetMs(get()));

    try {
      const reply = await sendMessage(
        {
          message: trimmed,
          thread_id: get().thread.id ?? undefined,
          client_turn_id: turnId,
        },
        budget,
      );
      /* Reconciliación, y siempre a favor del POST.
         Si el cierre por WS llegó primero (`live` ya es null), el mensaje está
         en el hilo pero con lo que traía el evento: el cuerpo y la propuesta,
         sin la traza de herramientas, que solo viene aquí. Se COMPLETA en su
         sitio en vez de añadir otro — insertarlo dos veces era el riesgo real
         de tener dos caminos hacia el mismo mensaje. */
      const closedByWs = get().live === null;
      set((state) => {
        const messages = state.thread.messages.map((item) =>
          item.id === optimistic.id ? { ...item, pending: false } : item,
        );
        const answer: UiMessage = {
          id: nextLocalId(),
          role: "axel",
          body: reply.reply,
          created_at: new Date().toISOString(),
          tool_calls: reply.tool_calls,
          // La propuesta que Axel armó EN este turno viaja en la respuesta,
          // así que la tarjeta se pinta pegada a su mensaje sin esperar una
          // recarga. Al recargar sale del transcript por el mismo campo.
          proposal_id: reply.proposal_id,
        };
        const last = messages.at(-1);
        return {
          thread: {
            id: reply.thread_id,
            thinking: false,
            messages:
              closedByWs && last?.role === "axel"
                ? messages.map((item, at) =>
                    at === messages.length - 1
                      ? {
                          ...item,
                          body: reply.reply,
                          tool_calls: reply.tool_calls,
                          proposal_id: reply.proposal_id,
                        }
                      : item,
                  )
                : [...messages, answer],
          },
          // El texto en vivo cumplió su función: la verdad es este cuerpo.
          live: null,
        };
      });
      // Una respuesta puede haber creado una propuesta: se recarga el tablero
      // en vez de esperar el WS, que puede no llegar si el socket está caído.
      // La tarjeta del hilo necesita la propuesta COMPLETA (titular, cifra,
      // vencimiento) y el POST solo trae su id.
      void get().reloadProposals();
    } catch (error) {
      /* Rescate: si el turno ya cerró por WS, la respuesta está persistida y
         `onTurnCompleted` la insertó. Que el POST fallara después de eso —una
         conexión cortada, el presupuesto vencido— no es un fallo del análisis, y
         marcarlo como error invitaría a reintentar y a pagar otro. */
      if (get().live === null && get().thread.messages.at(-1)?.role === "axel") {
        set((state) => ({
          thread: {
            ...state.thread,
            thinking: false,
            messages: state.thread.messages.map((item) =>
              item.id === optimistic.id ? { ...item, pending: false } : item,
            ),
          },
        }));
        return;
      }
      const blocker = blockerFor(error);
      set((state) => ({
        blocker,
        live: null,
        thread: {
          ...state.thread,
          thinking: false,
          messages: state.thread.messages.map((item) =>
            item.id === optimistic.id
              ? {
                  ...item,
                  pending: false,
                  failed: isTimeout(error) ? TIMEOUT_MESSAGE : errorMessage(error),
                }
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

  /**
   * Trae una propuesta que el tablero ya no lista, para que la conversación no
   * pierda lo que Axel armó cuando el dueño la decide.
   *
   * Dedupe en dos capas: la marca en `settled` (incluido el `null` de «ya no
   * está») corta las repeticiones entre renders, y el conjunto de peticiones en
   * vuelo corta las simultáneas — el efecto que la llama se dispara por cada
   * cambio del hilo y dos mensajes de la misma propuesta la pedirían dos veces.
   */
  resolveSettled: async (proposalId: string) => {
    const state = get();
    if (proposalId in state.settled) return;
    if ((state.proposals.data ?? []).some((item) => item.id === proposalId)) return;
    if (inFlight.has(proposalId)) return;
    inFlight.add(proposalId);
    try {
      const proposal = await getProposal(proposalId);
      set((current) => ({ settled: { ...current.settled, [proposalId]: proposal } }));
    } catch {
      // Una propuesta que no se puede traer no es un error de la pantalla: el
      // hilo se lee igual. Se marca para no volver a pedirla en cada render.
      set((current) => ({ settled: { ...current.settled, [proposalId]: null } }));
    } finally {
      inFlight.delete(proposalId);
    }
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

  /* ------------------------------------------------------------ turno en vivo
     Los cinco handlers comparten una puerta: `accept`. Ignora lo que no sea del
     turno que esta pestaña abrió, y lo que llegue con `seq` repetido o menor —
     sin eso, una reconexión que reentregue eventos pintaría el texto dos veces.

     Los turnos de OTRAS pestañas del mismo dueño se ignoran a propósito. La
     tentación es pintarlos («que se vea en todas»), pero los eventos no llevan
     la pregunta: se vería la respuesta de Axel colgando de la nada. La otra
     pestaña ya lo está mostrando, y esta se pone al día al recargar. */

  onTurnStarted: (event) => {
    // Confirmación de que el servidor aceptó el turno y el socket está vivo. No
    // crea estado: el turno lo abre `ask`, que es quien conoce la pregunta.
    if (get().live?.turn_id !== event.turn_id) return;
    set((state) => ({ thread: { ...state.thread, thinking: true } }));
  },

  onTurnStep: (event) => {
    const live = accept(get(), event);
    if (live === null) return;
    // El mismo paso llega dos veces: al arrancar y al terminar. La segunda
    // COMPLETA la primera en su sitio, no añade una fila nueva.
    const index = live.steps.findIndex((step) => step.name === event.name && !step.done);
    const step: LiveStep = {
      name: event.name,
      label: event.label,
      done: event.state === "done",
      ms: event.ms,
      productive: event.productive,
    };
    const steps =
      index === -1
        ? [...live.steps, step]
        : live.steps.map((item, at) => (at === index ? step : item));
    /* El texto acumulado se DESCARTA al llegar un paso.
       Todo lo que el modelo escribe antes de llamar a una herramienta es un
       preámbulo («Voy a revisar tu embudo…»), no la respuesta. Conservarlo tenía
       una consecuencia que solo se ve en un turno real: la vista da prioridad al
       texto sobre los pasos, así que esa frase se quedaba fija con el cursor
       parpadeando y los pasos desaparecían durante TODA la fase de lecturas —los
       30 a 90 segundos que son casi el turno entero—. El cursor, además,
       afirmaba que estaba escribiendo cuando no lo estaba. */
    set({ live: { ...live, seq: event.seq, steps, text: "" } });
  },

  onTurnDelta: (event) => {
    const live = accept(get(), event);
    if (live === null) return;
    // Iteración nueva: lo anterior era el preámbulo de una llamada a
    // herramienta, no la respuesta. Se descarta en vez de concatenarse.
    const fresh = event.iteration !== live.iteration;
    set({
      live: {
        ...live,
        seq: event.seq,
        iteration: event.iteration,
        text: fresh ? event.text : live.text + event.text,
      },
    });
  },

  onTurnCompleted: (event) => {
    const live = accept(get(), event);
    if (live === null) return;
    const state = get();
    // Ya está en el hilo (lo insertó el POST de esta pestaña): solo hay que
    // apagar el estado en vivo.
    const already = state.thread.messages.some((item) => item.id === event.message_id);
    set({
      live: null,
      thread: {
        ...state.thread,
        thinking: false,
        messages: already
          ? state.thread.messages
          : [
              ...state.thread.messages,
              {
                id: event.message_id,
                role: "axel" as const,
                body: event.body,
                created_at: new Date().toISOString(),
                tool_calls: null,
                proposal_id: event.proposal_id,
              },
            ],
      },
    });
    if (event.proposal_id !== null) void get().reloadProposals();
  },

  onTurnFailed: (event) => {
    const live = accept(get(), event);
    if (live === null) return;
    set({
      live: null,
      blocker:
        event.code === "cmo/disabled"
          ? "disabled"
          : event.code === "cmo/quota_exhausted"
            ? "quota"
            : get().blocker,
      thread: { ...get().thread, thinking: false },
    });
  },
}));

/**
 * La puerta de los eventos en vivo: devuelve el turno al que aplicar el evento,
 * o `null` si hay que ignorarlo.
 *
 * Rechaza lo que no es del turno abierto por esta pestaña y lo que llega
 * desordenado o repetido. Socket.IO conserva el orden por conexión, pero una
 * reconexión puede reentregar: sin el `seq` el texto se duplicaría.
 */
function accept(state: CmoState, event: { turn_id: string; seq: number }): LiveTurn | null {
  const live = state.live;
  if (live === null || live.turn_id !== event.turn_id) return null;
  if (event.seq <= live.seq) return null;
  return live;
}

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
