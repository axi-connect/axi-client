"use client";

import { CornerDownRight, Pencil } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { CmoQuestionDTO } from "@/modules/cmo/domain/cmo";

/**
 * La pregunta con opciones que Axel deja al cerrar un turno.
 *
 * Antes pedía la decisión dentro del párrafo y el dueño tenía que redactar la
 * respuesta. En un chat donde cada turno tarda decenas de segundos y consume un
 * análisis, escribir una frase para decir «el primero» es fricción pura.
 *
 * El lenguaje visual es el de `inbox/ui/components/interactive/InteractiveMessage`
 * —sub-bloque con `border-t`, cejilla en mayúsculas, filas de opción— y la
 * diferencia con él es deliberada: **allí las opciones son `<div>` y aquí son
 * `<button>`**. En el inbox el operador ve lo que se le ofreció a un cliente y
 * tocar por él mandaría una respuesta que el cliente no dio; aquí el dueño ES
 * quien responde.
 *
 * Tres decisiones que no se ven en el código:
 *
 * 1. **Solo la última pregunta del hilo está viva** (`live`). Las anteriores se
 *    pintan inertes. No hace falta ninguna columna ni casar el texto de la
 *    respuesta con la opción tocada: la posición en el hilo ya lo dice, y con
 *    varias vivas el dueño podría responder a una pregunta de hace diez
 *    mensajes cuya conversación ya cambió de rumbo.
 * 2. **Un clic envía.** Lo que se manda es el `label` tal cual, así que el
 *    mensaje que aparece en el hilo es exactamente lo que eligió. El turno
 *    cuesta lo mismo que si lo hubiera escrito: el clic no añade costo, quita
 *    tecleo.
 * 3. **«Otra cosa…» no envía**, enfoca el compositor. Es la vía de escape
 *    cuando ninguna opción sirve, y mandar un «otra cosa» literal a Axel no le
 *    diría nada.
 */
export function AxelQuestion({
  question,
  live,
  busy,
  onPick,
  onWriteInstead,
}: {
  question: CmoQuestionDTO;
  /** false = es una pregunta vieja del hilo: se lee, no se toca. */
  live: boolean;
  /** true mientras Axel trabaja: nada se puede responder todavía. */
  busy: boolean;
  onPick: (label: string) => void;
  onWriteInstead: () => void;
}) {
  const interactive = live && !busy;

  return (
    <div className="mt-1 border-t border-border/60 px-4 pt-3 pb-3.5">
      <p
        className={cn(
          "mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase",
          live ? "text-accent-violet" : "text-muted-foreground/60",
        )}
      >
        <CornerDownRight className="size-3 flex-none" aria-hidden="true" />
        {live ? "Elige una" : "Ya respondida"}
      </p>

      <p className="mb-2.5 text-[13.5px] leading-snug font-semibold text-foreground">
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
                "flex w-full flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-all",
                interactive
                  ? "border-accent-violet/25 bg-accent-violet/5 hover:-translate-y-px hover:border-accent-violet/50 hover:bg-accent-violet/10 hover:shadow-float"
                  : "border-border bg-secondary/40",
                // `disabled:opacity` a secas atenuaría también el texto de una
                // pregunta vieja hasta hacerla ilegible, y esa sigue siendo
                // parte del hilo: se lee para entender qué se decidió.
                !interactive && "cursor-default",
              )}
            >
              <span
                className={cn(
                  "text-[13px] font-medium",
                  interactive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {option.label}
              </span>
              {option.hint === null ? null : (
                <span className="text-[11px] leading-snug text-muted-foreground/80">
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
          Otra cosa…
        </button>
      ) : null}
    </div>
  );
}
