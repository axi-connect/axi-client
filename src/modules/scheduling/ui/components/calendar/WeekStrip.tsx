"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/core/lib/utils";
import type { AppointmentSegment } from "@/modules/scheduling/domain/appointment";
import { dayNumber } from "@/modules/scheduling/domain/time-grid";
import { fmtDayLong, weekDays, type DayKey } from "@/core/lib/business-time";

const LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

/**
 * Tira de la semana del celular (lienzo F1): siete días con su número y hasta
 * tres puntos por las citas del día. El elegido va en tinta; las flechas saltan
 * de semana. Por encima de la vista Día, que es la del celular.
 */
export function WeekStrip({
  anchor,
  todayKey,
  segmentsByDay,
  onSelectDay,
  onStepWeek,
}: {
  anchor: DayKey;
  todayKey: DayKey;
  segmentsByDay: Map<DayKey, AppointmentSegment[]>;
  onSelectDay: (day: DayKey) => void;
  onStepWeek: (delta: 1 | -1) => void;
}) {
  const days = weekDays(anchor);
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Semana anterior"
        onClick={() => onStepWeek(-1)}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ChevronLeft aria-hidden className="size-4" />
      </button>
      <div role="group" aria-label="Días de la semana" className="grid min-w-0 flex-1 grid-cols-7">
        {days.map((day, index) => {
          const count = (segmentsByDay.get(day) ?? []).filter(
            ({ appointment }) => appointment.status !== "cancelled",
          ).length;
          const selected = day === anchor;
          const isToday = day === todayKey;
          return (
            <button
              key={day}
              type="button"
              aria-pressed={selected}
              aria-current={isToday ? "date" : undefined}
              aria-label={`${fmtDayLong(day)}, ${count === 1 ? "1 cita" : `${count} citas`}`}
              onClick={() => onSelectDay(day)}
              className="flex min-h-14 flex-col items-center gap-1 rounded-2xl py-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="text-xs text-muted-foreground">{LETTERS[index]}</span>
              <span
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-full font-heading text-base font-bold tabular-nums",
                  selected
                    ? "bg-foreground text-background"
                    : isToday
                      ? "ring-[1.5px] ring-foreground ring-inset"
                      : "text-foreground",
                )}
              >
                {dayNumber(day)}
              </span>
              <span aria-hidden className="flex h-1 gap-0.5">
                {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                  <span key={i} className="size-1 rounded-full bg-foreground/70" />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="Semana siguiente"
        onClick={() => onStepWeek(1)}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ChevronRight aria-hidden className="size-4" />
      </button>
    </div>
  );
}
