"use client";

import { useEffect, useMemo, useRef } from "react";
import { Check, Clock3, Keyboard, PenLine } from "lucide-react";

import type { IntakeField, IntakeProgress, IntakeQuestion, IntakeSessionView } from "@/modules/intake/domain/intake";
import {
  useIslandQueue,
  VOICE_PROBLEM_COPY,
  type AssistantIslandQuestion,
  type RecorderProblem,
} from "@/shared/components/features/assistant";

/** Copy de la tarjeta, repetido en la isla: la isla dice lo mismo que la tarjeta que tapa. */
interface ReviewCopy {
  line: (field: IntakeField) => string;
  origin: (field: IntakeField) => string;
}

interface AlbaIslandInput {
  /**
   * Hay una entrevista en curso a la vista. Mientras carga (o ya cerró) la isla
   * no avisa de nada: si no, el primer progreso real se leería como «todos los
   * temas se acaban de cerrar».
   */
  active: boolean;
  session: IntakeSessionView;
  /** La pregunta viva del hilo (la del último mensaje que pregunta), o `null`. */
  liveQuestion: { id: string; body: string; question: IntakeQuestion } | null;
  /** La tarjeta de revisión viva, si la hay: manda sobre la pregunta del chat. */
  reviewField: IntakeField | null;
  /** La burbuja viva (pregunta o tarjeta) está a la vista: entonces la isla no la repite (D1). */
  liveVisible: boolean;
  thinking: boolean;
  listening: boolean;
  voiceProblem: RecorderProblem | null;
  review: ReviewCopy;
  onPick: (label: string) => void;
  onWrite: () => void;
  onConfirm: (field: IntakeField) => void;
  onLater: (field: IntakeField) => void;
  /** Lleva la tarjeta a la vista (para corregir allí, con su editor). */
  onShowLive: () => void;
  onOpenFinalReview: () => void;
}

/**
 * La isla de Alba: qué despliega y cuándo (plan island_live_plan.md, F3).
 *
 * - **La pregunta viva** sube a la isla solo cuando su burbuja no está a la
 *   vista: al subir en el hilo o con la ficha abierta en el móvil (decisión D1
 *   del dueño). Si la tarjeta de revisión está viva, es ELLA la que sube.
 * - **Avisos**: al volver («Seguimos donde quedaste»), al cerrar un tema, cuando
 *   ya está lo esencial (con «Revisar»), y cuando el micrófono no está.
 *
 * Todo pasa por la cola del kit: nunca dos cosas a la vez, y un solo timer.
 */
export function useAlbaIsland(input: AlbaIslandInput) {
  const {
    active,
    session,
    liveQuestion,
    reviewField,
    liveVisible,
    thinking,
    listening,
    voiceProblem,
    review,
    onPick,
    onWrite,
    onConfirm,
    onLater,
    onShowLive,
    onOpenFinalReview,
  } = input;

  const question = useMemo<AssistantIslandQuestion | null>(() => {
    if (liveVisible || thinking) return null;
    if (reviewField !== null) {
      const line = review.line(reviewField);
      return {
        kind: "question",
        id: `review-${reviewField.code}`,
        eyebrow: "te pregunta",
        title: line,
        datum: { label: reviewField.label, value: reviewField.display ?? "", origin: review.origin(reviewField) },
        speech: `${line} ${reviewField.label}: ${reviewField.display ?? ""}.`,
        actions: [
          { id: "ok", label: "Así es", icon: Check, onSelect: () => { onConfirm(reviewField); } },
          { id: "edit", label: "Corregir", icon: PenLine, onSelect: onShowLive },
          { id: "later", label: "Después", icon: Clock3, onSelect: () => { onLater(reviewField); } },
        ],
      };
    }
    if (liveQuestion === null) return null;
    const { question: asked } = liveQuestion;
    return {
      kind: "question",
      id: `question-${liveQuestion.id}`,
      eyebrow: "te pregunta",
      title: asked.question,
      speech: asked.question,
      actions: [
        ...asked.options.map((option, index) => ({
          id: `option-${String(index)}`,
          label: option.label,
          onSelect: () => {
            onPick(option.label);
          },
        })),
        ...(asked.allow_free_text ? [{ id: "write", label: "Escribir", icon: Keyboard, onSelect: onWrite }] : []),
      ],
    };
  }, [liveVisible, thinking, reviewField, liveQuestion, review, onConfirm, onLater, onShowLive, onPick, onWrite]);

  const queue = useIslandQueue({ question, paused: thinking || listening });
  const { push, dismiss } = queue;

  /* Las salidas de los avisos se leen por ref: un callback nuevo no puede
     volver a empujar (ni a descartar) un aviso. */
  const actions = useRef({ onWrite, onOpenFinalReview });
  useEffect(() => {
    actions.current = { onWrite, onOpenFinalReview };
  });

  /* «Seguimos donde quedaste»: una vez por apertura, sin gastar un turno. */
  const resumed = useRef(false);
  useEffect(() => {
    if (!active || resumed.current || session.resume === null) return;
    resumed.current = true;
    const missing = session.resume.missing_topics.length;
    const pending = session.resume.pending_review;
    push({
      kind: "notice",
      id: "resume",
      glow: "ai",
      title: "Seguimos donde quedaste",
      body: [
        missing === 0 ? null : missing === 1 ? "Falta 1 tema" : `Faltan ${String(missing)} temas`,
        pending === 0 ? null : pending === 1 ? "1 dato por revisar" : `${String(pending)} datos por revisar`,
      ]
        .filter((part): part is string => part !== null)
        .join(" y "),
      action: {
        id: "continue",
        label: "Continuar",
        onSelect: () => {
          dismiss("resume");
          actions.current.onWrite();
        },
      },
    });
  }, [active, session.resume, push, dismiss]);

  /* Un tema que se cierra: el aviso corto que se va solo. */
  const doneBefore = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!active) {
      doneBefore.current = null;
      return;
    }
    const done = doneTopics(session.progress);
    const before = doneBefore.current;
    doneBefore.current = done;
    if (before === null) return;
    const counted = session.progress.topics.filter((topic) => !topic.deferred).length;
    for (const topic of session.progress.topics) {
      if (!done.has(topic.code) || before.has(topic.code)) continue;
      push({
        kind: "notice",
        id: `topic-${topic.code}`,
        glow: "success",
        title: "Tema listo",
        body: `${topic.title} · ${String(done.size)} de ${String(counted)}`,
      });
    }
  }, [active, session.progress, push]);

  /* Ya está lo esencial: la revisión final se ofrece con su botón (rec. 15). */
  const essentialShown = useRef(false);
  const essentialComplete = session.progress.essential.complete;
  useEffect(() => {
    if (!active || !essentialComplete || essentialShown.current) return;
    essentialShown.current = true;
    push({
      kind: "notice",
      id: "essential",
      glow: "ai",
      title: "Ya está lo esencial",
      body: "Revisa lo anotado y envíalo cuando quieras",
      action: {
        id: "review",
        label: "Revisar",
        onSelect: () => {
          dismiss("essential");
          actions.current.onOpenFinalReview();
        },
      },
    });
  }, [active, essentialComplete, push, dismiss]);

  /* El micrófono: el motivo y la salida, en la isla (el compositor no lo repite). */
  useEffect(() => {
    if (!active || voiceProblem === null) {
      dismiss("mic");
      return;
    }
    const copy = VOICE_PROBLEM_COPY[voiceProblem];
    push({
      kind: "notice",
      id: "mic",
      glow: "warning",
      title: copy.title,
      body: copy.body,
      action: {
        id: "write",
        label: "Escribir",
        onSelect: () => {
          dismiss("mic");
          actions.current.onWrite();
        },
      },
    });
  }, [active, voiceProblem, push, dismiss]);

  return queue;
}

function doneTopics(progress: IntakeProgress): Set<string> {
  return new Set(progress.topics.filter((topic) => topic.status === "done" && !topic.deferred).map((topic) => topic.code));
}
