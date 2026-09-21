"use client";

import { ChevronRight, CornerDownRight } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { AssistantQuestionData, AssistantQuestionLabels } from "../types";

const DEFAULT_LABELS: AssistantQuestionLabels = {
  live: "Elige una",
  answered: "Pregunta anterior",
  writeInstead: "Otra cosa…",
};

interface AssistantQuestionProps {
  question: AssistantQuestionData;
  /** false = es una pregunta vieja del hilo: se lee, no se toca. */
  live: boolean;
  /** true mientras el asistente trabaja: nada se puede responder todavía. */
  busy: boolean;
  onPick: (label: string) => void;
  onWriteInstead: () => void;
  /** Textos propios de cada asistente; por defecto los de Axel. */
  labels?: Partial<AssistantQuestionLabels>;
}

/**
 * La pregunta con opciones que el asistente deja al cerrar un turno.
 *
 * Pedir la decisión dentro del párrafo obligaba a redactar la respuesta. En un
 * chat donde cada turno tarda decenas de segundos y consume un análisis,
 * escribir una frase para decir «el primero» es fricción pura.
 *
 * Las opciones son una **lista agrupada** (el lenguaje de Ajustes de iOS):
 * filas con hairline, chevron y pista en segunda línea. Y son `<button>`, no
 * `<div>` como en `inbox/ui/components/interactive/InteractiveMessage`: allí el
 * operador ve lo que se le ofreció a un cliente y tocar por él mandaría una
 * respuesta que el cliente no dio; aquí quien lee ES quien responde.
 *
 * Tres decisiones que no se ven en el código:
 *
 * 1. **Solo la última pregunta del hilo está viva** (`live`). Las anteriores se
 *    pintan inertes: la posición en el hilo ya lo dice, y con varias vivas se
 *    podría contestar a una pregunta de hace diez mensajes cuya conversación
 *    ya cambió de rumbo.
 * 2. **Un toque envía el `label` tal cual**, así que el mensaje que aparece en
 *    el hilo es exactamente lo que se eligió.
 * 3. **La salida («Otra cosa…», «Prefiero contarlo yo») no envía**: enfoca el
 *    compositor. Mandar ese literal al asistente no le diría nada.
 */
export function AssistantQuestion({
  question,
  live,
  busy,
  onPick,
  onWriteInstead,
  labels,
}: AssistantQuestionProps) {
  const text = { ...DEFAULT_LABELS, ...labels };
  const interactive = live && !busy;

  return (
    <div className="mt-1 border-t border-foreground/8 bg-foreground/[0.02] px-4 pt-3 pb-3.5">
      <p
        className={cn(
          "mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase",
          live ? "text-accent-violet" : "text-muted-foreground/70",
        )}
      >
        <CornerDownRight className="size-3 flex-none" aria-hidden="true" />
        {live ? text.live : text.answered}
      </p>

      <p className="mb-2.5 text-[15px] leading-snug font-semibold text-foreground">{question.question}</p>

      <ul className="grouped-list ring-1 ring-foreground/[0.07]">
        {question.options.map((option) => (
          <li key={option.label} className="grouped-row">
            <button
              type="button"
              onClick={() => {
                onPick(option.label);
              }}
              disabled={!interactive}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                interactive
                  ? "text-foreground hover:bg-foreground/[0.04] active:bg-foreground/[0.08]"
                  : // `disabled:opacity` a secas atenuaría también el texto de una
                    // pregunta vieja hasta hacerla ilegible, y esa sigue siendo
                    // parte del hilo: se lee para entender qué se decidió.
                    "cursor-default text-muted-foreground",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] leading-snug font-medium">{option.label}</span>
                {option.hint === null ? null : (
                  <span className="block text-[12px] leading-snug text-muted-foreground">{option.hint}</span>
                )}
              </span>
              {interactive ? (
                <ChevronRight className="size-4 flex-none text-foreground/35" aria-hidden="true" />
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {question.allow_free_text && interactive ? (
        <button
          type="button"
          onClick={onWriteInstead}
          className="mt-2.5 inline-flex items-center text-[13px] font-semibold text-brand transition-colors hover:text-brand-2"
        >
          {text.writeInstead}
        </button>
      ) : null}
    </div>
  );
}
