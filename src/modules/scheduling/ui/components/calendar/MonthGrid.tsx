"use client";

import { cn } from "@/core/lib/utils";
import {
  APPOINTMENT_STATUS_DOT,
  type AppointmentDTO,
  type AppointmentSegment,
} from "@/modules/scheduling/domain/appointment";
import { dayNumber, fmtClock } from "@/modules/scheduling/domain/time-grid";
import { fmtDayLong, monthOfKey, type DayKey } from "@/core/lib/business-time";

/**
 * Dos citas por día y «N más»: con chips de 24 px (el mínimo táctil) caben seis
 * semanas en la altura de la vista sin que el mes scrollee a 1440 × 900.
 */
const MAX_CHIPS = 2;

const WEEKDAY_HEADER = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function AppointmentChip({
  appointment,
  contactName,
  timezone,
  onOpen,
}: {
  appointment: AppointmentDTO;
  contactName: string;
  timezone: string;
  onOpen: (id: string) => void;
}) {
  const cancelled = appointment.status === "cancelled";
  return (
    <button
      type="button"
      onClick={() => onOpen(appointment.id)}
      className={cn(
        "flex h-6 w-full min-w-0 shrink-0 items-center gap-1.5 rounded-lg px-1.5 text-left text-xs",
        "transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      )}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", APPOINTMENT_STATUS_DOT[appointment.status])} />
      <span className="shrink-0 text-muted-foreground tabular-nums">
        {fmtClock(appointment.starts_at, timezone)}
      </span>
      <span className={cn("min-w-0 truncate", cancelled && "text-muted-foreground line-through")}>
        {contactName}
      </span>
    </button>
  );
}

/**
 * Vista Mes (lienzo F1): 42 celdas (6 semanas, lunes primero). Cada día
 * muestra hasta 2 citas con su punto de estado y «N más», que abre el día.
 * Hoy va en tinta. Las canceladas sí se ven aquí, tachadas (decisión D1).
 */
export function MonthGrid({
  days,
  anchorMonth,
  todayKey,
  timezone,
  segmentsByDay,
  contactNames,
  onOpen,
  onSelectDay,
}: {
  days: DayKey[];
  /** "YYYY-MM" del ancla: las celdas de otros meses van atenuadas. */
  anchorMonth: string;
  todayKey: DayKey;
  timezone: string;
  segmentsByDay: Map<DayKey, AppointmentSegment[]>;
  contactNames: Record<string, string>;
  onOpen: (id: string) => void;
  onSelectDay: (day: DayKey) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xs">
      <div className="grid shrink-0 grid-cols-7">
        {WEEKDAY_HEADER.map((label, index) => (
          <div
            key={label}
            className={cn("px-3 pt-3 pb-2 text-xs text-muted-foreground", index > 0 && "border-l border-border")}
          >
            {label}
          </div>
        ))}
      </div>
      <div className="sidebar-scroll grid min-h-0 flex-1 auto-rows-[minmax(7rem,1fr)] grid-cols-7 overflow-y-auto">
        {days.map((day, index) => {
          const inMonth = monthOfKey(day) === anchorMonth;
          const isToday = day === todayKey;
          const entries = segmentsByDay.get(day) ?? [];
          return (
            <div
              key={day}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "flex min-w-0 flex-col gap-0.5 overflow-hidden border-t border-border p-1.5",
                index % 7 !== 0 && "border-l",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDay(day)}
                aria-label={`Ver el ${fmtDayLong(day)}`}
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-full font-heading text-sm font-semibold tabular-nums transition-colors",
                  "hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  isToday
                    ? "bg-foreground text-background hover:bg-foreground"
                    : inMonth
                      ? "text-foreground"
                      : "font-medium text-muted-foreground",
                )}
              >
                {dayNumber(day)}
              </button>

              {entries.slice(0, MAX_CHIPS).map(({ appointment, segment }) => (
                <AppointmentChip
                  key={`${appointment.id}-${segment.startMin}`}
                  appointment={appointment}
                  contactName={contactNames[appointment.contact_id] ?? "Contacto"}
                  timezone={timezone}
                  onOpen={onOpen}
                />
              ))}
              {entries.length > MAX_CHIPS && (
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className="inline-flex min-h-6 shrink-0 items-center self-start rounded-md px-1.5 text-xs font-medium text-foreground/80 underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {entries.length - MAX_CHIPS} más
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
