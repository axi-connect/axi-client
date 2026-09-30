"use client";

import type { AppointmentSegment } from "@/modules/scheduling/domain/appointment";
import { dayHeadingSummary } from "@/modules/scheduling/domain/day-summary";
import { fmtDayLong, type DayKey } from "@/core/lib/business-time";

/**
 * Título del día del celular (lienzo F1): «Hoy, miércoles 30» y lo que hay:
 * «5 citas · 3 por confirmar». Fuera de hoy ofrece volver.
 */
export function DayHeading({
  day,
  todayKey,
  segments,
  onToday,
}: {
  day: DayKey;
  todayKey: DayKey;
  segments: AppointmentSegment[];
  onToday: () => void;
}) {
  const weekday = fmtDayLong(day).split(",")[0];
  const number = Number(day.slice(8, 10));
  const label = day === todayKey ? `Hoy, ${weekday} ${number}` : `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${number}`;
  return (
    <div className="flex items-baseline justify-between gap-3 px-2">
      <h2 className="min-w-0 truncate font-heading text-lg font-bold">{label}</h2>
      <div className="flex shrink-0 items-baseline gap-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          {dayHeadingSummary(segments.map((s) => s.appointment))}
        </span>
        {day !== todayKey && (
          <button
            type="button"
            onClick={onToday}
            className="rounded-full text-xs font-medium underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Ir a hoy
          </button>
        )}
      </div>
    </div>
  );
}
