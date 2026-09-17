"use client";

import { CornerDownRight, Pencil } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { IntakeQuestion } from "@/modules/intake/domain/intake";

/**
 * La pregunta con opciones que el asistente deja al cerrar un turno.
 *
 * **Aquí las opciones son botones de verdad, y eso decide si la entrevista
 * termina.** Quien contesta está en un móvil, posiblemente entre dos cosas, y
 * la evidencia sobre formatos conversacionales es consistente: la fricción de
 * teclear es donde se pierde a la gente. Tocar es gratis; escribir cuesta.
 *
 * Tres decisiones que no se ven en el código:
 *
 * 1. **Solo la ÚLTIMA pregunta del hilo está viva** (`live`). Las anteriores se
 *    pintan inertes. No hace falta ninguna columna ni casar el texto de la
 *    respuesta con la opción tocada: la posición en el hilo ya lo dice.
 * 2. **Un toque envía**, y lo que se manda es el `label` tal cual — así que el
 *    mensaje que aparece en el hilo es exactamente lo que eligió.
 * 3. **«Prefiero contarlo yo» no envía**, enfoca el compositor. Es la vía de
 *    escape cuando ninguna opción sirve.
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
    <div className="mt-2.5 border-t border-border/60 pt-3">
      <p
        className={cn(
          "mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase",
          live ? "text-accent-violet" : "text-muted-foreground/60",
        )}
      >
        <CornerDownRight className="size-3 flex-none" aria-hidden="true" />
        {live ? "Toca una" : "Ya respondida"}
      </p>

      <p className="mb-2.5 text-[14px] leading-snug font-semibold text-foreground">
        {question.question}
      </p>

      <ul className="flex flex-col gap-1.5">
        {question.options.map((option) => (
          <li key={option.label}>
            <button
              type="button"
              onClick={() => {
                onPick(option.label);
              }}
              disabled={!interactive}
              className={cn(
                "flex w-full flex-col items-start gap-0.5 rounded-md border px-3.5 py-2.5 text-left transition-all",
                interactive
                  ? "border-accent-violet/25 bg-accent-violet/5 hover:-translate-y-px hover:border-accent-violet/50 hover:bg-accent-violet/10 hover:shadow-float active:translate-y-0"
                  : "border-border bg-secondary/40",
                // `disabled:opacity` a secas atenuaría también el texto de una
                // pregunta vieja hasta hacerla ilegible, y esa sigue siendo
                // parte del hilo: se lee para entender qué se decidió.
                !interactive && "cursor-default",
              )}
            >
              <span
                className={cn(
                  "text-[13.5px] font-medium",
                  interactive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {option.label}
              </span>
              {option.hint === null ? null : (
                <span className="text-[11.5px] leading-snug text-muted-foreground/80">
                  {option.hint}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {question.allow_free_text && interactive ? (
        <button
          type="button"
          onClick={onWriteInstead}
          className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          <Pencil className="size-3 flex-none" aria-hidden="true" />
          Prefiero contarlo yo
        </button>
      ) : null}
    </div>
  );
}
