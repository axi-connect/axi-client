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
 * Los segmentos son la otra mitad de la misma idea. Fijar la expectativa por
 * delante —cuántos temas hay y cuáles quedan— es la mitigación documentada del
 * formato «una pregunta a la vez», que sin panorama se siente más largo de lo
 * que es.
 *
 * Un tema aplazado se pinta distinto y **no cuenta**: aplazar es una respuesta
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
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12px] font-semibold text-foreground">{progressLabel(progress)}</p>
        <p className="text-[11px] text-muted-foreground/80">
          {done} de {counted.length} temas
        </p>
      </div>

      <ol className="flex items-center gap-1" aria-label="Avance de la conversación">
        {progress.topics.map((topic) => (
          <li
            key={topic.code}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
            title={`${topic.title}${topic.deferred ? " · lo dejaron para después" : ""}`}
          >
            <span
              className={cn(
                "block h-full rounded-full transition-[width,background-color] duration-500",
                topic.status === "done" && "w-full bg-brand-gradient",
                topic.status === "in_progress" && "w-1/2 bg-accent-violet/60",
                topic.status === "deferred" && "w-full bg-border",
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
 * Que aplazar sea un botón visible y no algo que haya que pedir hablando es
 * deliberado: es el permiso explícito para no saber algo. En onboarding B2B la
 * mayor parte del tiempo perdido no es complejidad real, son pasos en los que
 * alguien se queda trabado sin una salida clara.
 */
export function SetupTopicList({
  progress,
  onDefer,
  onResume,
  className,
}: {
  progress: IntakeProgress;
  onDefer: (code: string) => void;
  onResume: (code: string) => void;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-col", className)}>
      {progress.topics.map((topic) => (
        <li
          key={topic.code}
          className="flex items-center gap-2.5 border-b border-border-soft py-2 last:border-b-0"
        >
          <span
            className={cn(
              "flex size-5 flex-none items-center justify-center rounded-full",
              topic.status === "done" && "bg-success/12 text-success",
              topic.status === "deferred" && "bg-secondary text-muted-foreground",
              topic.status === "in_progress" && "bg-accent-violet/12 text-accent-violet",
              topic.status === "pending" && "bg-secondary text-muted-foreground/60",
            )}
          >
            {topic.status === "done" ? (
              <Check className="size-3" aria-hidden="true" />
            ) : topic.status === "deferred" ? (
              <Clock3 className="size-3" aria-hidden="true" />
            ) : (
              <span className="size-1.5 rounded-full bg-current" />
            )}
          </span>

          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[12.5px]",
              topic.status === "deferred" ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {topic.title}
          </span>

          {topic.status === "deferred" ? (
            <button
              type="button"
              onClick={() => {
                onResume(topic.code);
              }}
              className="flex-none text-[11px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              Retomar
            </button>
          ) : topic.status === "done" ? null : (
            <button
              type="button"
              onClick={() => {
                onDefer(topic.code);
              }}
              className="flex-none text-[11px] text-muted-foreground/70 underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              Luego
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
