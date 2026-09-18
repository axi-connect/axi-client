"use client";

import { Check, Clock3 } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { progressLabel, type IntakeProgress } from "@/modules/intake/domain/intake";

/**
 * El progreso de la entrevista.
 *
 * **Por tema y en palabras, no en campos y en porcentaje.** «12 de 37 campos»
 * es una auditoría y desanima; «vamos por la mitad» es un recorrido y anima.
 * Quien contesta no está midiendo su rendimiento: le está haciendo un favor a
 * su propio negocio entre dos cosas, y lo que necesita saber es que queda poco.
 *
 * Las cápsulas son la otra mitad de la misma idea. Fijar la expectativa por
 * delante —cuántos temas hay y cuáles quedan— es la mitigación documentada del
 * formato «una pregunta a la vez», que sin panorama se siente más largo de lo
 * que es. Finas (4px) y con aire entre ellas: es un indicador, no una barra de
 * carga.
 *
 * Un tema aplazado se pinta gris y **no cuenta**: aplazar es una respuesta
 * válida, y si siguiera contando la barra nunca llegaría al final.
 */
export function SetupProgress({
  progress,
  className,
}: {
  progress: IntakeProgress;
  className?: string;
}) {
  const counted = progress.topics.filter((topic) => !topic.deferred);
  const done = counted.filter((topic) => topic.status === "done").length;

  return (
    <div className={cn("flex flex-col gap-[7px]", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-semibold tracking-[-0.005em] text-foreground">
          {progressLabel(progress)}
        </p>
        <p className="text-[12px] text-muted-foreground tabular-nums">
          {done} de {counted.length} temas
        </p>
      </div>

      <ol className="flex items-center gap-[5px]" aria-label="Avance de la conversación">
        {progress.topics.map((topic) => (
          <li
            key={topic.code}
            className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/[0.06]"
            title={`${topic.title}${topic.deferred ? " · lo dejaron para después" : ""}`}
          >
            <span
              className={cn(
                "block h-full rounded-full transition-[width,background-color] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
                topic.status === "done" && "w-full bg-brand-gradient",
                topic.status === "in_progress" && "w-1/2 bg-accent-violet/80",
                topic.status === "deferred" && "w-full bg-muted-foreground/30",
                topic.status === "pending" && "w-0",
              )}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * El detalle tema a tema, con la salida de «lo vemos luego» a la vista.
 *
 * Es una lista agrupada más de la ficha: mismo radio, mismos hairlines. Que
 * aplazar sea un botón visible y no algo que haya que pedir hablando es
 * deliberado — es el permiso explícito para no saber algo. En onboarding B2B
 * la mayor parte del tiempo perdido no es complejidad real, son pasos en los
 * que alguien se queda trabado sin una salida clara.
 */
export function SetupTopicList({
  progress,
  onDefer,
  onResume,
  readOnly = false,
  className,
}: {
  progress: IntakeProgress;
  onDefer: (code: string) => void;
  onResume: (code: string) => void;
  /** Sesión terminada: ya no hay nada que aplazar ni retomar. */
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <ul className={cn("grouped-list shadow-float", className)}>
      {progress.topics.map((topic) => (
        <li key={topic.code} className="grouped-row flex items-center gap-3 py-2.5 pr-3.5 pl-4">
          <span
            className={cn(
              "flex size-[22px] flex-none items-center justify-center rounded-full",
              topic.status === "done" && "bg-success text-white",
              topic.status === "deferred" && "bg-foreground/[0.06] text-muted-foreground/60",
              topic.status === "in_progress" && "bg-accent-violet/12 text-accent-violet",
              topic.status === "pending" && "bg-foreground/[0.06] text-muted-foreground/50",
            )}
          >
            {topic.status === "done" ? (
              <Check className="size-3 [stroke-width:3]" aria-hidden="true" />
            ) : topic.status === "deferred" ? (
              <Clock3 className="size-3" aria-hidden="true" />
            ) : (
              <span className="size-1.5 rounded-full bg-current" />
            )}
          </span>

          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[15px] tracking-[-0.005em]",
              topic.status === "deferred" ? "text-muted-foreground/60" : "text-foreground",
            )}
          >
            {topic.title}
          </span>

          {readOnly ? null : topic.status === "deferred" ? (
            <button
              type="button"
              onClick={() => {
                onResume(topic.code);
              }}
              className="flex-none text-[13px] font-medium text-brand transition-opacity active:opacity-60"
            >
              Retomar
            </button>
          ) : topic.status === "done" ? null : (
            <button
              type="button"
              onClick={() => {
                onDefer(topic.code);
              }}
              className="flex-none text-[13px] font-medium text-brand transition-opacity active:opacity-60"
            >
              Luego
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
