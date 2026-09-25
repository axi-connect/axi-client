"use client";

import { Check, Handshake, Newspaper, Package, Phone, Video } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { formatWeekdayDate } from "@/modules/welcome-kit/domain/formatters";
import {
  TRIAL_JOURNEY_DAYS,
  type JourneyMilestoneKind,
  type TrialJourney,
} from "../../../../../domain/trial-journey";

const MILESTONE_ICON: Record<JourneyMilestoneKind, typeof Phone> = {
  delivery: Package,
  digest: Newspaper,
  call: Phone,
  meeting: Video,
  decide: Handshake,
};

/**
 * Los 8 días de la prueba (del 0 al 7) en una línea: lo recorrido en tinta
 * hasta «hoy», cada hito en su día y el marcador hueco de hoy. En el celular la
 * fila scrollea dentro de sí misma (DESIGN-SYSTEM §9.3): el body nunca.
 */
export function TrialJourneyStrip({
  journey,
  startsAt,
  endsAt,
  timeZone,
}: {
  journey: TrialJourney;
  startsAt: string;
  endsAt: string;
  timeZone: string;
}) {
  const today = journey.todayIndex;
  const reached = journey.finished ? TRIAL_JOURNEY_DAYS - 1 : (today ?? -1);
  // La tinta llega al centro del día de hoy: de la columna 0 a la `reached`.
  const progress = reached <= 0 ? 0 : reached / (TRIAL_JOURNEY_DAYS - 1);

  return (
    <section
      aria-labelledby="trial-journey-title"
      className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 md:flex-row md:items-center md:gap-6"
    >
      <div className="shrink-0 space-y-1 md:w-44">
        <h2 id="trial-journey-title" className="font-sans text-xs font-normal text-muted-foreground">
          Recorrido de la prueba
        </h2>
        <p className="font-heading text-lg font-bold whitespace-nowrap tabular-nums">
          {formatWeekdayDate(startsAt, timeZone)} → {formatWeekdayDate(endsAt, timeZone)}
        </p>
        <p className="text-xs text-muted-foreground">
          {journey.finished ? "La prueba terminó" : today === null ? "Aún no empieza" : `Hoy es el día ${today} de 7`}
        </p>
      </div>

      <div className="-mx-1 min-w-0 flex-1 overflow-x-auto px-1 pb-1">
        <ol className="relative grid min-w-[680px] grid-cols-8" aria-label="Días de la prueba">
          {/* Riel y tramo recorrido, del centro del día 0 al centro del día 7. */}
          <span aria-hidden="true" className="absolute top-5 right-[6.25%] left-[6.25%] h-0.5 rounded-full bg-border" />
          <span
            aria-hidden="true"
            className="absolute top-5 left-[6.25%] h-0.5 rounded-full bg-foreground transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `calc(87.5% * ${progress})` }}
          />
          {journey.days.map((day) => {
            const first = day.milestones[0] ?? null;
            const Icon = first ? MILESTONE_ICON[first.kind] : null;
            const isToday = day.state === "today";
            return (
              <li
                key={day.index}
                aria-current={isToday ? "date" : undefined}
                className="relative flex min-w-0 flex-col items-center gap-1.5 px-1 text-center"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full",
                    day.state === "done" && "bg-foreground text-background",
                    isToday && "border-2 border-brand bg-card ring-4 ring-brand/15",
                    day.state === "upcoming" && (Icon ? "border border-border bg-card text-muted-foreground" : ""),
                  )}
                >
                  {day.state === "done" ? (
                    <Check className="size-4" strokeWidth={2.5} />
                  ) : isToday ? (
                    <span className="size-2.5 rounded-full bg-brand" />
                  ) : Icon ? (
                    <Icon className="size-4" />
                  ) : (
                    <span className="size-2 rounded-full bg-border" />
                  )}
                </span>
                <span className={cn("text-xs whitespace-nowrap", first || isToday ? "font-semibold" : "text-muted-foreground")}>
                  {isToday ? `Hoy · día ${day.index}` : `Día ${day.index}`}
                </span>
                {/* Tipo arriba y hora debajo: dos hitos en días seguidos no se montan (A1). */}
                <span className="flex min-h-8 w-full flex-col items-center gap-1">
                  {day.milestones.map((milestone) => (
                    <span key={milestone.kind} className="flex w-full flex-col items-center leading-tight">
                      <span className="max-w-full text-xs break-words text-muted-foreground">{milestone.title}</span>
                      {milestone.detail ? (
                        <span className="max-w-full text-[11px] break-words text-muted-foreground tabular-nums">
                          {milestone.detail}
                        </span>
                      ) : null}
                    </span>
                  ))}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
