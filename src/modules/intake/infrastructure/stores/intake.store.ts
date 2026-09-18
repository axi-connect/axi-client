"use client";

import { create } from "zustand";

import { isHttpError } from "@/core/api/problem";
import type {
  IntakeField,
  IntakeMessage,
  IntakeSessionView,
  IntakeTopicView,
  IntakeTurnResult,
} from "@/modules/intake/domain/intake";
import { intakeService } from "../services/intake-service.adapter";

/**
 * El estado de la entrevista.
 *
 * Una decisión sostiene todo lo demás: **la conversación y la ficha son el
 * mismo estado**, no dos pantallas que se sincronizan. Cada turno devuelve el
 * progreso, cada corrección de la ficha devuelve el progreso, y las dos mitades
 * de la pantalla leen de aquí. Si fueran dos estados, tarde o temprano
 * enseñarían cosas distintas sobre el mismo dato — que es exactamente la clase
 * de fallo que hace que alguien deje de confiar en lo que está rellenando.
 *
 * `pending` (el mensaje optimista) existe porque un turno tarda entre tres y
 * veinte segundos: sin él, quien escribe ve su mensaje desaparecer y la
 * pantalla quieta, y vuelve a escribirlo.
 */

export type UiMessage = IntakeMessage & { pending?: boolean; failed?: boolean };

interface IntakeState {
  token: string | null;
  session: IntakeSessionView | null;
  messages: UiMessage[];
  loading: boolean;
  /** El asistente está pensando: se pinta el «escribiendo…». */
  thinking: boolean;
  /** Error que bloquea la pantalla entera (enlace inválido o caducado). */
  blocked: { code: string; title: string; detail: string } | null;
  /** Error pasajero de un turno: se reintenta sin perder el hilo. */
  turnError: string | null;
  /** Guardando desde la ficha: el control se atenúa sin bloquear nada más. */
  savingField: string | null;

  load: (token: string) => Promise<void>;
  send: (message: string, voice?: boolean) => Promise<void>;
  retry: () => Promise<void>;
  saveField: (field: IntakeField, value: unknown) => Promise<boolean>;
  deferTopic: (code: string) => Promise<void>;
  resumeTopic: (code: string) => Promise<void>;
  patchTopics: (body: { defer?: string[]; resume?: string[] }) => Promise<void>;
  reset: () => void;
}

/** La sesión, ya cerrada en el servidor, tal como debe verse aquí. */
function closedLocally(session: IntakeSessionView | null): IntakeSessionView | null {
  if (session === null || session.status !== "in_progress") return session;
  return { ...session, status: "completed" };
}

/** Enlace inválido o caducado: la pantalla entera cambia, no es un aviso. */
const BLOCKING_CODES = new Set(["intake/link_invalid", "intake/link_expired"]);

/**
 * La sesión se cerró en otra pestaña (o el servidor la cerró) y esta pantalla
 * aún la tenía abierta. No es un fallo de red: es que ya no hay nada que
 * escribir, y la pantalla tiene que pasar a «terminada» en vez de enseñar
 * «No se pudo guardar».
 */
const SESSION_CLOSED = "intake/session_closed";
export const SESSION_CLOSED_NOTICE = "Esta conversación ya terminó; lo que anotamos queda como está.";

function errorCode(error: unknown): string {
  return isHttpError(error) ? error.code : "";
}

function blockedFrom(code: string, detail: string): IntakeState["blocked"] {
  if (code === "intake/link_expired") {
    return {
      code,
      title: "Este enlace ya caducó",
      detail:
        "Pídele uno nuevo a quien te lo envió: seguimos exactamente donde lo dejaste, no se " +
        "pierde nada de lo que ya contaste.",
    };
  }
  return {
    code,
    title: "Este enlace no es válido",
    detail: detail === "" ? "Revisa que lo hayas copiado completo." : detail,
  };
}

export const useIntakeStore = create<IntakeState>((set, get) => ({
  token: null,
  session: null,
  messages: [],
  loading: true,
  thinking: false,
  blocked: null,
  turnError: null,
  savingField: null,

  async load(token) {
    set({ token, loading: true, blocked: null });
    try {
      const session = await intakeService.open(token);
      set({ session, messages: session.messages, loading: false });
    } catch (error) {
      const code = isHttpError(error) ? error.code : "";
      set({
        loading: false,
        blocked: BLOCKING_CODES.has(code)
          ? blockedFrom(code, isHttpError(error) ? error.message : "")
          : blockedFrom("intake/link_invalid", "No pudimos abrir la conversación."),
      });
    }
  },

  async send(message, voice = false) {
    const { token, session, thinking } = get();
    if (token === null || session === null || thinking) return;

    const body = message.trim();
    if (body === "") return;

    // Mensaje optimista: un turno tarda segundos y sin esto la pantalla se
    // queda quieta con el texto desaparecido.
    const optimistic: UiMessage = {
      id: `pending-${String(Date.now())}`,
      role: "client",
      body,
      question: null,
      captured: [],
      voice,
      created_at: new Date().toISOString(),
      pending: true,
    };
    set((state) => ({
      messages: [...state.messages, optimistic],
      thinking: true,
      turnError: null,
    }));

    try {
      const result = await intakeService.message(token, body, voice);

      set((state) => ({
        thinking: false,
        messages: [
          ...state.messages.map((entry) =>
            entry.id === optimistic.id ? { ...entry, pending: false } : entry,
          ),
          {
            id: `assistant-${String(Date.now())}`,
            role: "assistant" as const,
            body: result.reply,
            question: result.question,
            captured: result.captured,
            voice: false,
            created_at: new Date().toISOString(),
          },
        ],
        session:
          state.session === null
            ? null
            : {
                ...state.session,
                progress: result.progress,
                turns_left: result.turns_left,
                status: result.finished ? ("completed" as const) : state.session.status,
                closing: result.closing ?? state.session.closing,
                summary: result.summary ?? state.session.summary,
                // La ficha se pinta desde el turno: el servidor ya devolvió cada
                // valor normalizado con su texto. Antes se volvía a pedir la
                // sesión ENTERA —hilo, ficha, progreso— para quedarse con
                // `topics`, en cada turno productivo, sobre datos móviles.
                topics: applyCaptured(state.session.topics, result.captured_values),
              },
      }));
    } catch (error) {
      const code = errorCode(error);
      if (BLOCKING_CODES.has(code)) {
        set({
          thinking: false,
          blocked: blockedFrom(code, isHttpError(error) ? error.message : ""),
        });
        return;
      }
      if (code === SESSION_CLOSED) {
        set((state) => ({
          thinking: false,
          // El mensaje optimista no se envió: no se deja como si sí.
          messages: state.messages.filter((entry) => entry.id !== optimistic.id),
          turnError: SESSION_CLOSED_NOTICE,
          session: closedLocally(state.session),
        }));
        return;
      }
      set((state) => ({
        thinking: false,
        messages: state.messages.map((entry) =>
          entry.id === optimistic.id ? { ...entry, pending: false, failed: true } : entry,
        ),
        turnError: isHttpError(error)
          ? error.message
          : "No pudimos enviar tu mensaje. Revisa tu conexión y vuelve a intentarlo.",
      }));
    }
  },

  /** Reintenta el último mensaje que falló, sin que haya que reescribirlo. */
  async retry() {
    const failed = [...get().messages].reverse().find((entry) => entry.failed === true);
    if (failed === undefined) return;
    set((state) => ({ messages: state.messages.filter((entry) => entry.id !== failed.id) }));
    await get().send(failed.body, failed.voice);
  },

  /**
   * Guardar un dato desde la ficha. **No consume turno ni gasta IA.**
   *
   * Devuelve un booleano y no lanza: quien lo llama es un control de la ficha
   * que solo necesita saber si cerrarse o quedarse abierto con el error.
   */
  async saveField(field, value) {
    const { token } = get();
    if (token === null) return false;

    set({ savingField: field.code });
    try {
      const result = await intakeService.patchAnswers(token, {
        answers: [{ field_code: field.code, value }],
      });

      set((state) => {
        if (state.session === null) return { savingField: null };
        return {
          savingField: null,
          session: {
            ...state.session,
            progress: result.progress,
            topics: patchTopics(state.session.topics, field.code, value),
          },
        };
      });
      return true;
    } catch (error) {
      set((state) => ({
        savingField: null,
        ...(errorCode(error) === SESSION_CLOSED ? { session: closedLocally(state.session) } : {}),
      }));
      return false;
    }
  },

  async deferTopic(code) {
    await get().patchTopics({ defer: [code] });
  },

  async resumeTopic(code) {
    await get().patchTopics({ resume: [code] });
  },

  /**
   * Aplazar o retomar un tema desde la ficha. No lanza: quien lo llama es un
   * botón que no tiene dónde enseñar un error, y una sesión que se cerró entre
   * medias solo tiene que hacer que la pantalla pase a «terminada».
   */
  async patchTopics(body) {
    const { token } = get();
    if (token === null) return;
    try {
      const result = await intakeService.patchAnswers(token, body);
      set((state) =>
        state.session === null ? state : { session: { ...state.session, progress: result.progress } },
      );
    } catch (error) {
      if (errorCode(error) === SESSION_CLOSED) {
        set((state) => ({ session: closedLocally(state.session) }));
      }
    }
  },

  reset() {
    set({
      token: null,
      session: null,
      messages: [],
      loading: true,
      thinking: false,
      blocked: null,
      turnError: null,
      savingField: null,
    });
  },
}));

/**
 * Refleja en la ficha lo que el turno capturó, con el `display` que calculó el
 * servidor: las dos mitades de la pantalla enseñan exactamente el mismo texto.
 */
function applyCaptured(
  topics: IntakeTopicView[],
  captured: IntakeTurnResult["captured_values"],
): IntakeTopicView[] {
  if (captured.length === 0) return topics;
  const byCode = new Map(captured.map((entry) => [entry.code, entry]));
  return topics.map((topic) => ({
    ...topic,
    fields: topic.fields.map((field) => {
      const hit = byCode.get(field.code);
      if (hit === undefined) return field;
      return {
        ...field,
        value: hit.value,
        display: hit.display,
        // Lo dijo la persona en este turno: deja de ser deducción por confirmar.
        source: "stated" as const,
        needs_confirmation: false,
      };
    }),
  }));
}

/**
 * Refleja en la ficha un dato que se acaba de guardar.
 *
 * Se marca como `stated` y sin confirmación pendiente porque lo acaba de
 * escribir la persona: eso es precisamente lo que significa confirmar una
 * deducción. El `display` se calcula aquí de forma aproximada —el canónico lo
 * produce el backend— y se corrige solo en el siguiente refresco; enseñar el
 * valor viejo mientras tanto sería peor.
 */
function patchTopics(topics: IntakeTopicView[], code: string, value: unknown): IntakeTopicView[] {
  return topics.map((topic) => ({
    ...topic,
    fields: topic.fields.map((field) =>
      field.code === code
        ? {
            ...field,
            value,
            display: displayOf(value),
            source: "stated" as const,
            needs_confirmation: false,
          }
        : field,
    ),
  }));
}

function displayOf(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  if (typeof value === "boolean") return value ? "sí" : "no";
  return String(value);
}
