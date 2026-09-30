"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import type { CompanySchedule } from "@/modules/companies/public";
import {
  showsInTimeGrid,
  type AppointmentSegment,
  type AppointmentStatus,
} from "@/modules/scheduling/domain/appointment";
import {
  closedIntervals,
  dayNumber,
  hhmmToMinutes,
  slotAtOffset,
  timezoneOffsetLabel,
  weekdayShort,
} from "@/modules/scheduling/domain/time-grid";
import {
  minutesIntoDay,
  weekdayOfKey,
  type DayKey,
} from "@/core/lib/business-time";
import { layoutDayEvents } from "@/modules/scheduling/domain/event-layout";
import { AppointmentBlock } from "./AppointmentBlock";

/** Escala vertical (lienzo F1): 64 px por hora, para que 45 min quepan en dos líneas. */
const HOUR_PX = 64;
const MINUTE_PX = HOUR_PX / 60;
const GUTTER_PX = 60;
/** Scroll inicial por defecto cuando no hay horario ni citas tempranas. */
const DEFAULT_SCROLL_HOUR = 8;
const QUIET =
  "bg-[repeating-linear-gradient(135deg,var(--color-muted)_0_6px,transparent_6px_12px)]";

function hourLabel(hour: number): string {
  if (hour === 0) return "12 a. m.";
  if (hour < 12) return `${hour} a. m.`;
  if (hour === 12) return "12 p. m.";
  return `${hour - 12} p. m.`;
}

function hhmm(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Línea de «ahora» en tinta: el coral queda solo para las acciones. */
function NowIndicator({ topPx }: { topPx: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -left-px right-0 z-[4] border-t-2 border-foreground before:absolute before:-top-1.5 before:-left-1.5 before:size-2.5 before:rounded-full before:bg-foreground"
      style={{ top: topPx }}
    />
  );
}

/**
 * Grilla horaria compartida por las vistas Semana (7 columnas) y Día (1).
 * Pinta 24 h por columna: las citas fuera del horario también existen y deben
 * verse. Lo que cae fuera del horario de atención va rayado; los solapes los
 * resuelve `layoutDayEvents`. Con `onCreateAt`, tocar un hueco libre y futuro
 * abre «Nueva cita» con esa media hora puesta (el teclado usa «Nueva cita»).
 */
export function TimeGrid({
  days,
  timezone,
  todayKey,
  schedules,
  segmentsByDay,
  statusFilter,
  contactNames,
  serviceNames,
  onOpen,
  onCreateAt,
  onCreate,
  compact = false,
}: {
  days: DayKey[];
  timezone: string;
  todayKey: DayKey;
  schedules: CompanySchedule[];
  segmentsByDay: Map<DayKey, AppointmentSegment[]>;
  statusFilter: AppointmentStatus | "all";
  contactNames: Record<string, string>;
  /** Solo la vista Día muestra el servicio en el bloque. */
  serviceNames?: Record<string, string>;
  onOpen: (id: string) => void;
  /** `null` sin `scheduling:manage`: la rejilla no crea citas. */
  onCreateAt: ((day: DayKey, minutes: number) => void) | null;
  /** «Nueva cita» del aviso de día libre; `null` sin permiso. */
  onCreate?: (() => void) | null;
  /** Celular: sin cabecera de días (la hace la tira de la semana). */
  compact?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const [columnWidth, setColumnWidth] = useState<number | null>(null);
  const [hover, setHover] = useState<{ day: DayKey; minutes: number } | null>(null);

  // "Ahora" en pared del negocio, refrescado cada minuto.
  const [nowMin, setNowMin] = useState(() => minutesIntoDay(new Date().toISOString(), timezone));
  useEffect(() => {
    const tick = () => setNowMin(minutesIntoDay(new Date().toISOString(), timezone));
    tick();
    const interval = window.setInterval(tick, 60_000);
    return () => window.clearInterval(interval);
  }, [timezone]);

  // Ancho de columna: decide si el bloque cabe con el destello de Axi.
  useEffect(() => {
    const el = columnsRef.current;
    if (el === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setColumnWidth((entry.contentRect.width - GUTTER_PX) / days.length);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [days.length]);

  const closedByWeekday = useMemo(() => {
    const byWeekday = new Map<number, Array<{ startMin: number; endMin: number }>>();
    for (let weekday = 0; weekday < 7; weekday++) {
      const open = schedules
        .filter((s) => s.weekday === weekday)
        .map((s) => ({ startMin: hhmmToMinutes(s.opens_at), endMin: hhmmToMinutes(s.closes_at) }));
      byWeekday.set(weekday, closedIntervals(open));
    }
    return byWeekday;
  }, [schedules]);

  const visibleByDay = useMemo(() => {
    const result = new Map<DayKey, AppointmentSegment[]>();
    for (const day of days) {
      result.set(
        day,
        (segmentsByDay.get(day) ?? []).filter(({ appointment }) =>
          showsInTimeGrid(appointment.status, statusFilter),
        ),
      );
    }
    return result;
  }, [days, segmentsByDay, statusFilter]);

  const layoutByDay = useMemo(() => {
    const result = new Map<DayKey, Map<string, { column: number; columns: number }>>();
    for (const day of days) {
      const boxes = layoutDayEvents(
        (visibleByDay.get(day) ?? []).map(({ appointment, segment }) => ({
          id: appointment.id,
          startMin: segment.startMin,
          endMin: segment.endMin,
        })),
      );
      result.set(day, new Map(boxes.map((b) => [b.id, { column: b.column, columns: b.columns }])));
    }
    return result;
  }, [days, visibleByDay]);

  // Scroll inicial: primera franja abierta o primera cita, con media hora de margen.
  useEffect(() => {
    const el = scrollRef.current;
    if (el === null) return;
    let firstMin = DEFAULT_SCROLL_HOUR * 60;
    const opens = schedules.map((s) => hhmmToMinutes(s.opens_at));
    if (opens.length > 0) firstMin = Math.min(firstMin, ...opens);
    for (const day of days) {
      for (const { segment } of visibleByDay.get(day) ?? []) {
        firstMin = Math.min(firstMin, segment.startMin);
      }
    }
    el.scrollTop = Math.max(0, (firstMin - 30) * MINUTE_PX);
    // Solo al montar / cambiar de rango: no perseguir el scroll del usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.join(",")]);

  const columnsTemplate = { gridTemplateColumns: `${GUTTER_PX}px repeat(${days.length}, minmax(0, 1fr))` };
  const isDayView = days.length === 1;
  const offset = timezoneOffsetLabel(timezone);
  const empty = days.every((day) => (visibleByDay.get(day) ?? []).length === 0);

  /** Media hora bajo el puntero, si ahí se puede agendar. */
  const slotUnder = (day: DayKey, offsetY: number): number | null => {
    const minutes = slotAtOffset(offsetY, MINUTE_PX);
    if (day < todayKey || (day === todayKey && minutes + 30 <= nowMin)) return null;
    return minutes;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xs">
      {/* Día o semana sin citas: se dice, sin tapar la rejilla (se puede tocar). */}
      {empty && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3 md:px-5">
          <div className="min-w-0 flex-1">
            <p className="font-heading text-base font-bold">
              {isDayView ? "Día libre" : "Sin citas en estos días"}
            </p>
            <p className="text-sm text-muted-foreground">
              {onCreateAt !== null
                ? "Toca una hora del calendario para agendar."
                : "Cuando Axi o tu equipo agenden, las verás aquí."}
            </p>
          </div>
          {onCreate != null && (
            <Button size="sm" className="rounded-full" onClick={onCreate}>
              <Plus aria-hidden className="size-4" />
              Nueva cita
            </Button>
          )}
        </div>
      )}

      {/* Cabecera de días */}
      <div className={cn("grid shrink-0 border-b border-border", compact && "hidden")} style={columnsTemplate}>
        <div
          className="flex items-center justify-center text-xs text-muted-foreground"
          title="La agenda se muestra en la hora del negocio"
        >
          {offset}
        </div>
        {days.map((day) => {
          const isToday = day === todayKey;
          const count = (visibleByDay.get(day) ?? []).filter(
            ({ appointment }) => appointment.status !== "cancelled",
          ).length;
          const closedAllDay = !schedules.some((s) => s.weekday === weekdayOfKey(day));
          return (
            <div
              key={day}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "flex h-13 min-w-0 items-center gap-2 border-l border-border px-3 text-xs whitespace-nowrap",
                isToday ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              <span className="capitalize">{weekdayShort(day)}</span>
              <span
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-full font-heading text-lg font-semibold text-foreground tabular-nums",
                  isToday && "bg-foreground text-background",
                )}
              >
                {dayNumber(day)}
              </span>
              {count > 0 ? (
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {isDayView ? `${count} ${count === 1 ? "cita" : "citas"}` : count}
                </span>
              ) : (
                schedules.length > 0 &&
                closedAllDay && <span className="ml-auto text-xs text-muted-foreground">Cerrado</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Cuerpo scrolleable (el único scroll del área) */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div ref={columnsRef} className="grid" style={columnsTemplate}>
          {/* Gutter de horas */}
          <div aria-hidden className="relative" style={{ height: 24 * HOUR_PX }}>
            {Array.from({ length: 23 }, (_, i) => i + 1).map((hour) => (
              <span
                key={hour}
                className="absolute right-2.5 -translate-y-1/2 text-xs whitespace-nowrap text-muted-foreground tabular-nums"
                style={{ top: hour * HOUR_PX }}
              >
                {hourLabel(hour)}
              </span>
            ))}
            {days.includes(todayKey) && (
              <span
                className="absolute right-2.5 z-[4] -translate-y-1/2 bg-card pl-1 text-xs font-semibold text-foreground tabular-nums"
                style={{ top: nowMin * MINUTE_PX }}
              >
                {hhmm(nowMin)}
              </span>
            )}
          </div>

          {days.map((day) => {
            const closed = closedByWeekday.get(weekdayOfKey(day)) ?? [];
            const segments = visibleByDay.get(day) ?? [];
            const layout = layoutByDay.get(day);
            const ghost = hover !== null && hover.day === day ? hover.minutes : null;
            return (
              <div
                key={day}
                className={cn("relative border-l border-border", onCreateAt !== null && "cursor-pointer")}
                style={{ height: 24 * HOUR_PX }}
                onMouseMove={
                  onCreateAt === null
                    ? undefined
                    : (event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        const minutes = slotUnder(day, event.clientY - rect.top);
                        setHover((prev) =>
                          minutes === null
                            ? null
                            : prev?.day === day && prev.minutes === minutes
                              ? prev
                              : { day, minutes },
                        );
                      }
                }
                onMouseLeave={onCreateAt === null ? undefined : () => setHover(null)}
                onClick={
                  onCreateAt === null
                    ? undefined
                    : (event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        const minutes = slotUnder(day, event.clientY - rect.top);
                        if (minutes !== null) onCreateAt(day, minutes);
                      }
                }
              >
                {/* Tramos fuera del horario de atención */}
                {closed.map((interval) => (
                  <div
                    key={`${interval.startMin}-${interval.endMin}`}
                    aria-hidden
                    className={cn("absolute inset-x-0", QUIET)}
                    style={{
                      top: interval.startMin * MINUTE_PX,
                      height: (interval.endMin - interval.startMin) * MINUTE_PX,
                    }}
                  />
                ))}
                {/* Líneas de hora y de media hora */}
                {Array.from({ length: 24 }, (_, hour) => (
                  <div key={hour} aria-hidden>
                    {hour > 0 && (
                      <div
                        className="absolute inset-x-0 border-t border-border"
                        style={{ top: hour * HOUR_PX }}
                      />
                    )}
                    <div
                      className="absolute inset-x-0 border-t border-dashed border-border/70"
                      style={{ top: hour * HOUR_PX + HOUR_PX / 2 }}
                    />
                  </div>
                ))}
                {/* Hueco bajo el puntero: «+ 10:30» */}
                {ghost !== null && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0.5 z-[1] flex items-start gap-1 rounded-[10px] bg-secondary px-2 py-1 text-xs font-medium text-foreground/80 tabular-nums ring-[1.5px] ring-foreground ring-inset"
                    style={{ top: ghost * MINUTE_PX + 1, height: 30 * MINUTE_PX - 2 }}
                  >
                    <Plus className="size-3.5 shrink-0" />
                    {hhmm(ghost)}
                  </div>
                )}
                {/* Citas */}
                {segments.map(({ appointment, segment }) => {
                  const box = layout?.get(appointment.id);
                  if (box === undefined) return null;
                  return (
                    <AppointmentBlock
                      key={`${appointment.id}-${segment.startMin}`}
                      appointment={appointment}
                      contactName={contactNames[appointment.contact_id] ?? "Contacto"}
                      serviceName={
                        isDayView && appointment.product_id !== null
                          ? (serviceNames?.[appointment.product_id] ?? null)
                          : null
                      }
                      timezone={timezone}
                      top={segment.startMin * MINUTE_PX}
                      height={(segment.endMin - segment.startMin) * MINUTE_PX}
                      column={box.column}
                      columns={box.columns}
                      columnWidthPx={columnWidth}
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
