"use client";

import { memo } from "react";

import { cn } from "@/core/lib/utils";
import type { IntakeProgress } from "@/modules/intake/domain/intake";

/**
 * Lo que cierra la píldora de Alba: una cápsula por tema y el tema de ahora en
 * palabras («Entregas · 3 de 6»). Es el mismo progreso de la ficha, en la
 * isla: quien conversa sabe en qué va sin abrir nada. Un tema aplazado no
 * cuenta (como en `SetupProgress`).
 */
export const AlbaIslandStatus = memo(function AlbaIslandStatus({ progress }: { progress: IntakeProgress }) {
  const counted = progress.topics.filter((topic) => !topic.deferred);
  const done = counted.filter((topic) => topic.status === "done").length;
  const current =
    progress.topics.find((topic) => topic.status === "in_progress") ??
    progress.topics.find((topic) => topic.code === progress.next_topic) ??
    null;

  return (
    <span className="flex items-center gap-2.5 text-[12px]">
      {/* Las cápsulas acompañan; lo que se lee es el texto (rec. 10: el color no
          puede ser lo único). Pospuesto es un anillo hueco, no el gris de «sin
          empezar». */}
      <span className="flex gap-[3px]" aria-hidden="true">
        {progress.topics.map((topic) => (
          <i
            key={topic.code}
            className={cn(
              "block h-1 w-3 rounded-full",
              topic.status === "done" && "bg-foreground",
              topic.status === "in_progress" && "bg-accent-violet",
              topic.status === "pending" && "bg-foreground/20",
              topic.status === "deferred" && "ring-1 ring-foreground/45 ring-inset",
            )}
          />
        ))}
      </span>
      <span className="sr-only">{statusWords(progress)}</span>
      {/* Puede partirse en dos líneas: el nombre del tema se lee entero (rec. 12). */}
      <span className="min-w-0" aria-hidden="true">
        {current === null ? null : <b className="font-semibold">{current.title}</b>}
        <span className="assistant-island__muted whitespace-nowrap tabular-nums">
          {current === null ? "" : " · "}
          {done} de {counted.length}
        </span>
      </span>
    </span>
  );
});

/** El estado de los temas, en palabras, para quien no ve las cápsulas. */
function statusWords(progress: IntakeProgress): string {
  const by = (status: string) => progress.topics.filter((topic) => topic.status === status).length;
  const current =
    progress.topics.find((topic) => topic.status === "in_progress") ??
    progress.topics.find((topic) => topic.code === progress.next_topic) ??
    null;
  return [
    current === null ? null : `Ahora: ${current.title}.`,
    `${String(by("done"))} de ${String(progress.topics.filter((topic) => !topic.deferred).length)} temas confirmados`,
    by("deferred") > 0 ? `${String(by("deferred"))} pospuesto${by("deferred") === 1 ? "" : "s"}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(", ");
}
