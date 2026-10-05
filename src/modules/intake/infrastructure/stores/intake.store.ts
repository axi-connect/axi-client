"use client";

import { create } from "zustand";

import { isHttpError } from "@/core/api/problem";
import type {
  IntakeField,
  IntakeMessage,
  IntakeSessionView,
  IntakeSkipReason,
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

/** Cómo resolvió la persona una tarjeta de revisión en esta visita. */
export type ReviewOutcome = "confirmed" | "corrected" | "later";

export interface ReviewResolved {
  code: string;
  label: string;
  display: string | null;
  outcome: ReviewOutcome;
}

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

  /* --- La revisión de lo encontrado (island-live F3; informe, rec. 1–3) --- */
  /** Cuánto había por revisar al abrir: el denominador de «3 de 11 revisados». */
  reviewTotal: number;
  /** Lo que la persona dejó «para después» en las tarjetas. Va a la revisión final. */
  reviewLater: string[];
  /** «Revisar el resto después»: las tarjetas se apartan hasta la revisión final. */
  reviewDeferred: boolean;
  /** Las tarjetas resueltas en esta visita, para pintar su «✓ Confirmado». */
  reviewResolved: ReviewResolved[];
  /** La revisión final (antes de «Enviar a revisión») está abierta. */
  finalReviewOpen: boolean;
  /** Enviando a revisión: el botón se atenúa. */
  finishing: boolean;
  /** No se pudo enviar: se dice junto al botón y se puede reintentar. */
  finishError: string | null;

  load: (token: string) => Promise<void>;
  send: (message: string, voice?: boolean) => Promise<void>;
  retry: () => Promise<void>;
  saveField: (field: IntakeField, value: unknown) => Promise<boolean>;
  /** Saltar un dato desde la ficha, con motivo. Sin turno, sin IA. */
  skipField: (field: IntakeField, reason: IntakeSkipReason) => Promise<boolean>;
  /** Reabrir un dato saltado («sí aplica»): vuelve a estar por preguntar. */
  unskipField: (field: IntakeField) => Promise<boolean>;
  deferTopic: (code: string) => Promise<void>;
  resumeTopic: (code: string) => Promise<void>;
  patchTopics: (body: { defer?: string[]; resume?: string[] }) => Promise<void>;
  /** «Así es»: lo encontrado pasa a confirmado tal cual. Sin turno, sin IA. */
  confirmField: (field: IntakeField) => Promise<boolean>;
  /** Corregir desde la tarjeta de revisión: guarda y la tarjeta dice «Corregido». */
  correctField: (field: IntakeField, value: unknown) => Promise<boolean>;
  /** «Después»: la tarjeta pasa a la siguiente; el dato sigue pendiente y espera en la revisión final. */
  laterField: (field: IntakeField) => void;
  /** «Revisar el resto después»: aparta todas las tarjetas que quedan. */
  deferReview: () => void;
  openFinalReview: () => void;
  closeFinalReview: () => void;
  /** «Enviar a revisión»: cierra sin modelo; la pantalla pasa a «Listo». */
  finish: () => Promise<void>;
  /** La persona pidió «Escuchar». Solo se cuenta; nunca falla hacia arriba. */
  listened: () => void;
  reset: () => void;
}

/**
 * Lo apartado se recuerda en ESTE navegador (`localStorage`), no solo en la
 * pestaña: quien dice «Después» a cinco datos y vuelve mañana por el enlace no
 * puede encontrárselos delante otra vez (informe, «conservar las decisiones
 * anteriores»; auditoría F3, C2). Se guarda también cuánto había por revisar,
 * para que «3 de 11» no vuelva a «0 de 8» al recargar (C4).
 */
const laterKey = (token: string): string => `intake.later.${token}`;

interface RememberedReview {
  later: string[];
  deferred: boolean;
  total: number;
}

function readLater(token: string): RememberedReview {
  try {
    const raw = window.localStorage.getItem(laterKey(token));
    if (raw === null) return { later: [], deferred: false, total: 0 };
    const parsed = JSON.parse(raw) as { later?: unknown; deferred?: unknown; total?: unknown };
    return {
      later: Array.isArray(parsed.later) ? parsed.later.filter((code): code is string => typeof code === "string") : [],
      deferred: parsed.deferred === true,
      total: typeof parsed.total === "number" && Number.isFinite(parsed.total) ? Math.max(0, parsed.total) : 0,
    };
  } catch {
    return { later: [], deferred: false, total: 0 };
  }
}

function writeLater(token: string | null, later: string[], deferred: boolean, total: number): void {
  if (token === null) return;
  try {
    window.localStorage.setItem(laterKey(token), JSON.stringify({ later, deferred, total }));
  } catch {
    // Sin almacenamiento la revisión funciona igual; solo no se recuerda al volver.
  }
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
  reviewTotal: 0,
  reviewLater: [],
  reviewDeferred: false,
  reviewResolved: [],
  finalReviewOpen: false,
  finishing: false,
  finishError: null,

  async load(token) {
    set({ token, loading: true, blocked: null });
    try {
      const session = await intakeService.open(token);
      const remembered = readLater(token);
      const reviewTotal = Math.max(remembered.total, session.progress.pending_review);
      writeLater(token, remembered.later, remembered.deferred, reviewTotal);
      set({
        session,
        messages: session.messages,
        loading: false,
        reviewTotal,
        reviewLater: remembered.later,
        reviewDeferred: remembered.deferred,
        reviewResolved: [],
      });
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

    // Escribir aparta las tarjetas de revisión: la persona eligió conversar, y
    // la isla tiene que seguir lo que está haciendo, no una tarjeta que dejó
    // atrás. Lo apartado espera en la revisión final (auditoría F3, C1).
    if (!get().reviewDeferred && session.progress.pending_review > 0) get().deferReview();

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
                topics: applyTurn(state.session.topics, result),
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
            topics: patchField(state.session.topics, field.code, {
              value,
              display: displayOf(value),
              // Lo acaba de escribir la persona: deja de ser deducción por
              // confirmar, y deja de estar saltado (un código está en una
              // cosa o en la otra).
              source: "stated",
              needs_confirmation: false,
              skipped: null,
            }),
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

  async skipField(field, reason) {
    const { token } = get();
    if (token === null) return false;
    set({ savingField: field.code });
    try {
      const result = await intakeService.patchAnswers(token, {
        skip: [{ field_code: field.code, reason }],
      });
      set((state) => {
        if (state.session === null) return { savingField: null };
        return {
          savingField: null,
          session: {
            ...state.session,
            progress: result.progress,
            topics: patchField(state.session.topics, field.code, {
              value: null,
              display: null,
              source: null,
              needs_confirmation: false,
              skipped: { reason, source: "ficha", note: null },
            }),
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

  async unskipField(field) {
    const { token } = get();
    if (token === null) return false;
    set({ savingField: field.code });
    try {
      const result = await intakeService.patchAnswers(token, { unskip: [field.code] });
      set((state) => {
        if (state.session === null) return { savingField: null };
        return {
          savingField: null,
          session: {
            ...state.session,
            progress: result.progress,
            topics: patchField(state.session.topics, field.code, { skipped: null }),
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

  async confirmField(field) {
    const { token } = get();
    if (token === null) return false;
    set({ savingField: field.code });
    try {
      const result = await intakeService.patchAnswers(token, { confirm: [field.code] });
      set((state) => {
        if (state.session === null) return { savingField: null };
        return {
          savingField: null,
          reviewResolved: resolve(state.reviewResolved, field, field.display, "confirmed"),
          reviewLater: state.reviewLater.filter((code) => code !== field.code),
          session: {
            ...state.session,
            progress: result.progress,
            topics: patchField(state.session.topics, field.code, {
              source: "stated",
              needs_confirmation: false,
            }),
          },
        };
      });
      writeLater(token, get().reviewLater, get().reviewDeferred, get().reviewTotal);
      return true;
    } catch (error) {
      set((state) => ({
        savingField: null,
        ...(errorCode(error) === SESSION_CLOSED ? { session: closedLocally(state.session) } : {}),
      }));
      return false;
    }
  },

  async correctField(field, value) {
    const ok = await get().saveField(field, value);
    if (!ok) return false;
    set((state) => ({
      reviewResolved: resolve(state.reviewResolved, field, displayOf(value), "corrected"),
      reviewLater: state.reviewLater.filter((code) => code !== field.code),
    }));
    writeLater(get().token, get().reviewLater, get().reviewDeferred, get().reviewTotal);
    return true;
  },

  laterField(field) {
    set((state) => ({
      reviewLater: state.reviewLater.includes(field.code) ? state.reviewLater : [...state.reviewLater, field.code],
      reviewResolved: resolve(state.reviewResolved, field, field.display, "later"),
    }));
    writeLater(get().token, get().reviewLater, get().reviewDeferred, get().reviewTotal);
  },

  deferReview() {
    set({ reviewDeferred: true });
    writeLater(get().token, get().reviewLater, true, get().reviewTotal);
  },

  openFinalReview() {
    set({ finalReviewOpen: true, finishError: null });
  },

  closeFinalReview() {
    set({ finalReviewOpen: false, finishError: null });
  },

  async finish() {
    const { token, finishing } = get();
    if (token === null || finishing) return;
    set({ finishing: true, finishError: null });
    try {
      const session = await intakeService.finish(token);
      set({ session, messages: session.messages, finishing: false, finalReviewOpen: false });
    } catch (error) {
      if (errorCode(error) === SESSION_CLOSED) {
        set((state) => ({ finishing: false, finalReviewOpen: false, session: closedLocally(state.session) }));
        return;
      }
      set({
        finishing: false,
        finishError: isHttpError(error)
          ? error.message
          : "No pudimos enviarlo. Revisa tu conexión y vuelve a intentarlo.",
      });
    }
  },

  listened() {
    const { token } = get();
    if (token === null) return;
    intakeService.listened(token).catch(() => {
      // Un contador: si falla, la persona no tiene nada que hacer con eso.
    });
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
      reviewTotal: 0,
      reviewLater: [],
      reviewDeferred: false,
      reviewResolved: [],
      finalReviewOpen: false,
      finishing: false,
      finishError: null,
    });
  },
}));

/**
 * Refleja en la ficha lo que el turno hizo: lo capturado con el `display` que
 * calculó el servidor (las dos mitades de la pantalla enseñan el mismo texto),
 * lo saltado con su motivo, y lo que dejó de tener valor (una propuesta que la
 * persona rechazó).
 */
function applyTurn(topics: IntakeTopicView[], result: IntakeTurnResult): IntakeTopicView[] {
  if (
    result.captured_values.length === 0 &&
    result.skipped_now.length === 0 &&
    result.removed.length === 0 &&
    result.reopened.length === 0
  ) {
    return topics;
  }
  const captured = new Map(result.captured_values.map((entry) => [entry.code, entry]));
  const skipped = new Map(result.skipped_now.map((entry) => [entry.code, entry]));
  const removed = new Set(result.removed);
  const reopened = new Set(result.reopened);
  return topics.map((topic) => ({
    ...topic,
    fields: topic.fields.map((field) => {
      const hit = captured.get(field.code);
      if (hit !== undefined) {
        // Lo dijo la persona ⇒ `stated`, cerrado. Lo que el tipo de negocio
        // acaba de PROPONER llega como `proposed` y sigue pidiendo revisión.
        const source = hit.source ?? "stated";
        return {
          ...field,
          value: hit.value,
          display: hit.display,
          source,
          needs_confirmation: source === "derived" || source === "proposed",
          skipped: null,
        };
      }
      if (reopened.has(field.code)) return { ...field, skipped: null };
      const skip = skipped.get(field.code);
      if (skip !== undefined) {
        return {
          ...field,
          value: null,
          display: null,
          source: null,
          needs_confirmation: false,
          skipped: { reason: skip.reason, source: skip.source, note: null },
        };
      }
      if (removed.has(field.code)) {
        return { ...field, value: null, display: null, source: null, needs_confirmation: false };
      }
      return field;
    }),
  }));
}

/**
 * Refleja en la ficha un cambio hecho desde ella. El `display` se calcula aquí
 * de forma aproximada —el canónico lo produce el backend— y se corrige solo en
 * el siguiente refresco; enseñar el valor viejo mientras tanto sería peor.
 */
function patchField(
  topics: IntakeTopicView[],
  code: string,
  patch: Partial<IntakeField>,
): IntakeTopicView[] {
  return topics.map((topic) => ({
    ...topic,
    fields: topic.fields.map((field) => (field.code === code ? { ...field, ...patch } : field)),
  }));
}

/** Anota (o reescribe) cómo se resolvió una tarjeta, en el orden en que se resolvió. */
function resolve(
  list: ReviewResolved[],
  field: IntakeField,
  display: string | null,
  outcome: ReviewOutcome,
): ReviewResolved[] {
  return [...list.filter((entry) => entry.code !== field.code), { code: field.code, label: field.label, display, outcome }];
}

function displayOf(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  if (typeof value === "boolean") return value ? "sí" : "no";
  return String(value);
}
