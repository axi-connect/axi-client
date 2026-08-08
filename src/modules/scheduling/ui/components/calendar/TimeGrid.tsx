"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/core/lib/utils";
import type { CompanySchedule } from "@/modules/companies/public";
import type { AppointmentSegment } from "@/modules/scheduling/domain/appointment";
import {
  fmtDayShort,
  minutesIntoDay,
  weekdayOfKey,
  type DayKey,
} from "@/modules/scheduling/domain/business-time";
import { layoutDayEvents } from "@/modules/scheduling/domain/event-layout";
import { AppointmentBlock } from "./AppointmentBlock";

/** Escala vertical de la grilla horaria: 48 px por hora (0.8 px/min). */
const HOUR_PX = 48;
const MINUTE_PX = HOUR_PX / 60;
const GUTTER_PX = 56;
/** Scroll inicial por defecto cuando no hay horario ni citas tempranas. */
const DEFAULT_SCROLL_HOUR = 8;

function hhmmToMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Complemento (tramos cerrados) de las franjas abiertas dentro de [0, 1440]. */
function closedIntervals(
  open: Array<{ startMin: number; endMin: number }>,
): Array<{ startMin: number; endMin: number }> {
  const sorted = [...open].sort((a, b) => a.startMin - b.startMin);
  const closed: Array<{ startMin: number; endMin: number }> = [];
  let cursor = 0;
  for (const range of sorted) {
    if (range.startMin > cursor) closed.push({ startMin: cursor, endMin: range.startMin });
    cursor = Math.max(cursor, range.endMin);
  }
  if (cursor < 1440) closed.push({ startMin: cursor, endMin: 1440 });
  return closed;
}

function hourLabel(hour: number): string {
  if (hour === 0) return "12 a. m.";
  if (hour < 12) return `${hour} a. m.`;
  if (hour === 12) return "12 p. m.";
  return `${hour - 12} p. m.`;
}

/** Línea coral de "ahora" (solo en la columna del día actual). */
function NowIndicator({ topPx }: { topPx: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-[4] h-0.5 bg-brand before:absolute before:-left-1 before:-top-[3px] before:size-2 before:rounded-full before:bg-brand"
      style={{ top: topPx }}
    />
  );
}

/**
 * Grilla horaria compartida por las vistas Semana (7 columnas) y Día (1).
 * Pinta 24 h por columna: las citas off-grid (fuera del horario) también
 * existen y deben verse. Los tramos fuera del horario de atención van
 * sombreados; el layout de solapes lo resuelve `layoutDayEvents`.
 */
export function TimeGrid({
  days,
  timezone,
  todayKey,
  schedules,
  segmentsByDay,
  contactNames,
  onOpen,
}: {
  days: DayKey[];
  timezone: string;
  todayKey: DayKey;
  schedules: CompanySchedule[];
  segmentsByDay: Map<DayKey, AppointmentSegment[]>;
  contactNames: Record<string, string>;
  onOpen: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // "Ahora" en pared del negocio, refrescado cada minuto.
  const [nowMin, setNowMin] = useState(() => minutesIntoDay(new Date().toISOString(), timezone));
  useEffect(() => {
    const tick = () => setNowMin(minutesIntoDay(new Date().toISOString(), timezone));
    tick();
    const interval = window.setInterval(tick, 60_000);
    return () => window.clearInterval(interval);
  }, [timezone]);

  const closedByWeekday = useMemo(() => {
    const byWeekday = new Map<number, Array<{ startMin: number; endMin: number }>>();
    for (let weekday = 0; weekday < 7; weekday++) {
      const open = schedules
        .filter((s) => s.weekday === weekday)
        .map((s) => ({ startMin: hhmmToMin(s.opens_at), endMin: hhmmToMin(s.closes_at) }));
      byWeekday.set(weekday, closedIntervals(open));
    }
    return byWeekday;
  }, [schedules]);

  const layoutByDay = useMemo(() => {
    const result = new Map<DayKey, Map<string, { column: number; columns: number }>>();
    for (const day of days) {
      const segments = segmentsByDay.get(day) ?? [];
      const boxes = layoutDayEvents(
        segments.map(({ appointment, segment }) => ({
          id: appointment.id,
          startMin: segment.startMin,
          endMin: segment.endMin,
        })),
      );
      result.set(day, new Map(boxes.map((b) => [b.id, { column: b.column, columns: b.columns }])));
    }
    return result;
  }, [days, segmentsByDay]);

  // Scroll inicial: primera franja abierta o primera cita, con margen de 1 h.
  useEffect(() => {
    const el = scrollRef.current;
    if (el === null) return;
    let firstMin = DEFAULT_SCROLL_HOUR * 60;
    const opens = schedules.map((s) => hhmmToMin(s.opens_at));
    if (opens.length > 0) firstMin = Math.min(firstMin, ...opens);
    for (const day of days) {
      for (const { segment } of segmentsByDay.get(day) ?? []) {
        firstMin = Math.min(firstMin, segment.startMin);
      }
    }
    el.scrollTop = Math.max(0, (firstMin - 60) * MINUTE_PX);
    // Solo al montar / cambiar de rango: no perseguir el scroll del usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.join(",")]);

  const columnsTemplate = { gridTemplateColumns: `${GUTTER_PX}px repeat(${days.length}, minmax(0, 1fr))` };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
      {/* Cabecera de días */}
      <div className="grid shrink-0 border-b border-border bg-secondary/50" style={columnsTemplate}>
        <div aria-hidden />
        {days.map((day) => {
          const isToday = day === todayKey;
          return (
            <div key={day} className="border-l border-border px-2 py-1.5 text-xs">
              <span
                className={cn(
                  "font-medium capitalize",
                  isToday ? "text-brand" : "text-muted-foreground",
                )}
              >
                {fmtDayShort(day)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Cuerpo scrolleable (el único scroll del área) */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid" style={columnsTemplate}>
          {/* Gutter de horas */}
          <div aria-hidden className="relative" style={{ height: 24 * HOUR_PX }}>
            {Array.from({ length: 23 }, (_, i) => i + 1).map((hour) => (
              <span
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums"
                style={{ top: hour * HOUR_PX }}
              >
                {hourLabel(hour)}
              </span>
            ))}
          </div>

          {days.map((day) => {
            const closed = closedByWeekday.get(weekdayOfKey(day)) ?? [];
            const segments = segmentsByDay.get(day) ?? [];
            const layout = layoutByDay.get(day);
            return (
              <div
                key={day}
                className="relative border-l border-border"
                style={{ height: 24 * HOUR_PX }}
              >
                {/* Tramos fuera del horario de atención */}
                {closed.map((interval) => (
                  <div
                    key={`${interval.startMin}-${interval.endMin}`}
                    aria-hidden
                    className="absolute inset-x-0 bg-muted/60"
                    style={{
                      top: interval.startMin * MINUTE_PX,
                      height: (interval.endMin - interval.startMin) * MINUTE_PX,
                    }}
                  />
                ))}
                {/* Líneas de hora */}
                {Array.from({ length: 23 }, (_, i) => i + 1).map((hour) => (
                  <div
                    key={hour}
                    aria-hidden
                    className="absolute inset-x-0 h-px bg-border/60"
                    style={{ top: hour * HOUR_PX }}
                  />
                ))}
                {/* Citas */}
                {segments.map(({ appointment, segment }) => {
                  const box = layout?.get(appointment.id);
                  if (box === undefined) return null;
                  return (
                    <AppointmentBlock
                      key={`${appointment.id}-${segment.startMin}`}
                      appointment={appointment}
                      contactName={contactNames[appointment.contact_id] ?? "Contacto"}
                      timezone={timezone}
                      top={segment.startMin * MINUTE_PX}
                      height={(segment.endMin - segment.startMin) * MINUTE_PX}
                      column={box.column}
                      columns={box.columns}
                      continues={{ before: segment.continuesBefore, after: segment.continuesAfter }}
                      onOpen={onOpen}
                    />
                  );
                })}
                {day === todayKey && <NowIndicator topPx={nowMin * MINUTE_PX} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
