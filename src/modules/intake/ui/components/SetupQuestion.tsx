"use client";

import { ChevronRight, Sparkles } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { IntakeQuestion } from "@/modules/intake/domain/intake";

/**
 * La pregunta con opciones que el asistente deja al cerrar un turno.
 *
 * **Es una lista agrupada, como Ajustes.** Tarjeta blanca con filas separadas
 * por un hairline que entra desde la izquierda, título y pista, chevron a la
 * derecha, tinte al pulsar. Es la forma que la gente ya sabe tocar en un móvil,
 * y aquí eso decide si la entrevista termina: la evidencia sobre formularios
 * conversacionales es consistente en que la fricción de teclear es donde se
 * pierde a la gente. Tocar es gratis; escribir cuesta.
 *
 * Tres decisiones que no se ven en el código:
 *
 * 1. **Solo la ÚLTIMA pregunta del hilo está viva** (`live`). Las anteriores se
 *    pintan inertes: sin hover, sin chevron, texto atenuado. No hace falta
 *    ninguna columna ni casar textos — la posición en el hilo ya lo dice.
 * 2. **Un toque envía**, y lo que se manda es el `label` tal cual, así que el
 *    mensaje que aparece en el hilo es exactamente lo que eligió.
 * 3. **«Prefiero contarlo yo» no envía**, enfoca el compositor. Va en coral —el
 *    color de acción— porque es una acción, no un matiz.
 */
export function SetupQuestion({
  question,
  live,
  busy,
  onPick,
  onWriteInstead,
}: {
  question: IntakeQuestion;
  live: boolean;
  busy: boolean;
  onPick: (label: string) => void;
  onWriteInstead: () => void;
}) {
  const interactive = live && !busy;

  return (
    <div className={cn("w-full max-w-[82%]", live && "intake-rise [animation-delay:80ms]")}>
      <p
        className={cn(
          "mb-2 flex items-center gap-1.5 px-4 text-[12px] font-medium tracking-[0.04em] uppercase",
          live ? "text-muted-foreground" : "text-muted-foreground/50",
        )}
      >
        <Sparkles
          className={cn("size-3 flex-none", live ? "text-accent-violet" : "text-muted-foreground/40")}
          aria-hidden="true"
        />
        {live ? "Elige una" : "Ya respondida"}
      </p>

      <p className="mb-2.5 px-4 text-[15px] leading-snug font-semibold tracking-[-0.005em] text-foreground">
        {question.question}
      </p>

      <ul className="intake-card overflow-hidden">
        {question.options.map((option) => (
          <li key={option.label} className="intake-row">
            <button
              type="button"
              onClick={() => {
                onPick(option.label);
              }}
              disabled={!interactive}
              className={cn(
                "flex w-full items-center gap-3.5 py-3.5 pr-4 pl-[18px] text-left transition-colors duration-150",
                interactive
                  ? "hover:bg-[var(--intake-card-2)] active:bg-[var(--intake-fill)]"
                  : "cursor-default",
              )}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span
                  className={cn(
                    "text-[15px] font-medium tracking-[-0.005em]",
                    interactive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {option.label}
                </span>
                {option.hint === null ? null : (
                  <span className="text-[12.5px] leading-snug text-muted-foreground">
                    {option.hint}
                  </span>
                )}
              </span>
              {interactive ? (
                <ChevronRight className="size-4 flex-none text-muted-foreground/50" aria-hidden="true" />
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {question.allow_free_text && interactive ? (
        <button
          type="button"
          onClick={onWriteInstead}
          className="mt-2.5 px-4 text-[13px] font-medium text-brand transition-opacity active:opacity-60"
        >
          Prefiero contarlo yo
        </button>
      ) : null}
    </div>
  );
}
