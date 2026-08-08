"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/core/lib/utils";
import type {
  AppointmentDTO,
  AppointmentSegment,
  AppointmentStatus,
} from "@/modules/scheduling/domain/appointment";
import { fmtTime, monthOfKey, type DayKey } from "@/modules/scheduling/domain/business-time";

const MAX_CHIPS = 3;

const WEEKDAY_HEADER = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Punto de color por estado en el chip mensual. */
const DOT_CLASSES: Record<AppointmentStatus, string> = {
  scheduled: "bg-info",
  confirmed: "bg-success",
  completed: "bg-muted-foreground",
  cancelled: "bg-destructive",
  no_show: "bg-warning",
};

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
  return (
    <button
      type="button"
      onClick={() => onOpen(appointment.id)}
      className={cn(
        "flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight",
        "bg-secondary/70 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        appointment.status === "cancelled" && "opacity-60",
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", DOT_CLASSES[appointment.status])}
      />
      <span className="shrink-0 text-muted-foreground tabular-nums">
        {fmtTime(appointment.starts_at, timezone)}
      </span>
      {appointment.created_by_type === "ai_agent" && (
        <Sparkles aria-label="Agendada por el asistente" className="size-3 shrink-0 text-accent-violet" />
      )}
      <span
        className={cn("truncate", appointment.status === "cancelled" && "line-through")}
      >
        {contactName}
      </span>
    </button>
  );
}

/**
 * Vista Mes: 42 celdas (6 semanas, lunes primero). Cada día muestra hasta 3
 * chips + "+N más" (navega a la vista Día) y un contador que crece al hacer
 * hover sobre la celda.
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid shrink-0 grid-cols-7 border-b border-border bg-secondary/50">
        {WEEKDAY_HEADER.map((label) => (
          <div
            key={label}
            className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7 overflow-y-auto">
        {days.map((day, index) => {
          const inMonth = monthOfKey(day) === anchorMonth;
          const isToday = day === todayKey;
          // El chip pertenece al día donde la cita EMPIEZA (los tramos de
          // continuación de una cita que cruza medianoche también se listan).
          const entries = segmentsByDay.get(day) ?? [];
          const dayNumber = Number(day.slice(8));
          return (
            <div
              key={day}
              className={cn(
                "group relative flex min-h-24 flex-col gap-0.5 border-b border-border p-1.5",
                index % 7 !== 0 && "border-l",
                inMonth ? "bg-card" : "bg-muted/40",
                "transition-colors hover:bg-accent/40",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDay(day)}
                aria-label={`Ver día ${day}`}
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isToday
                    ? "bg-primary font-semibold text-primary-foreground"
                    : inMonth
                      ? "text-foreground"
                      : "text-muted-foreground/60",
                )}
              >
                {dayNumber}
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
                  className="px-1.5 text-left text-[11px] font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  +{entries.length - MAX_CHIPS} más
                </button>
              )}

              {entries.length > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute bottom-1.5 right-1.5 flex h-5 min-w-5 origin-bottom-right items-center justify-center rounded-full",
                    "border border-border bg-secondary px-1 text-[10px] font-bold text-muted-foreground tabular-nums",
                    "transition-transform duration-200 motion-safe:group-hover:scale-140 group-hover:border-brand group-hover:bg-primary group-hover:text-primary-foreground",
                  )}
                >
                  {entries.length}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
