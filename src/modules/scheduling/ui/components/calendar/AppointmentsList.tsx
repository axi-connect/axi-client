"use client";

import { useMemo } from "react";
import { CalendarX2, Sparkles } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import {
  APPOINTMENT_STATUS_BADGE_CLASSES,
  APPOINTMENT_STATUS_LABELS,
  type AppointmentDTO,
} from "@/modules/scheduling/domain/appointment";
import {
  businessDayKey,
  fmtDayLong,
  fmtTimeRange,
  type DayKey,
} from "@/modules/scheduling/domain/business-time";
import { LIST_MAX_DAYS } from "@/modules/scheduling/domain/calendar-range";

/**
 * Vista Lista: citas del rango agrupadas por día (headers sticky). El rango
 * es manual y el backend lo limita a 92 días; el clamp lo aplica el store.
 */
export function AppointmentsList({
  appointments,
  timezone,
  todayKey,
  listRange,
  contactNames,
  productNames,
  onRangeChange,
  onOpen,
}: {
  appointments: AppointmentDTO[];
  timezone: string;
  todayKey: DayKey;
  listRange: { from: DayKey; to: DayKey };
  contactNames: Record<string, string>;
  productNames: Record<string, string>;
  onRangeChange: (from: DayKey, to: DayKey) => void;
  onOpen: (id: string) => void;
}) {
  const groups = useMemo(() => {
    const byDay = new Map<DayKey, AppointmentDTO[]>();
    for (const appointment of appointments) {
      const key = businessDayKey(appointment.starts_at, timezone);
      const bucket = byDay.get(key);
      if (bucket === undefined) byDay.set(key, [appointment]);
      else bucket.push(appointment);
    }
    return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [appointments, timezone]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 text-sm">
        <span className="text-muted-foreground">Rango:</span>
        <Input
          type="date"
          value={listRange.from}
          aria-label="Desde"
          className="h-8 w-fit tabular-nums"
          onChange={(e) => {
            if (e.target.value) onRangeChange(e.target.value, listRange.to);
          }}
        />
        <span aria-hidden className="text-muted-foreground">
          →
        </span>
        <Input
          type="date"
          value={listRange.to}
          aria-label="Hasta"
          className="h-8 w-fit tabular-nums"
          onChange={(e) => {
            if (e.target.value) onRangeChange(listRange.from, e.target.value);
          }}
        />
        <span className="text-xs text-muted-foreground">(máximo {LIST_MAX_DAYS} días)</span>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {appointments.length === 1 ? "1 cita" : `${appointments.length} citas`}
        </span>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <CalendarX2 aria-hidden className="size-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">Sin citas en el rango</p>
          <p className="text-xs text-muted-foreground">
            Ajusta las fechas o cambia el filtro de estado.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {groups.map(([day, items]) => (
            <section key={day} aria-label={fmtDayLong(day)}>
              <h3
                className={cn(
                  "sticky top-0 z-[1] border-b border-border bg-secondary/80 px-4 py-1.5 text-xs font-semibold backdrop-blur",
                  day === todayKey ? "text-brand" : "text-muted-foreground",
                )}
              >
                {day === todayKey && "Hoy · "}
                <span className="capitalize">{fmtDayLong(day)}</span>
              </h3>
              <ul>
                {items.map((appointment) => (
                  <li key={appointment.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(appointment.id)}
                      className="grid w-full grid-cols-[110px_1.4fr_120px] items-center gap-3 border-b border-border px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[150px_1.4fr_1fr_130px_120px]"
                    >
                      <span className="font-semibold tabular-nums">
                        {fmtTimeRange(appointment.starts_at, appointment.ends_at, timezone)}
                      </span>
                      <span className="flex min-w-0 items-center gap-1.5">
                        {appointment.created_by_type === "ai_agent" && (
                          <Sparkles
                            aria-label="Agendada por el asistente"
                            className="size-3.5 shrink-0 text-accent-violet"
                          />
                        )}
                        <span className="truncate font-medium">
                          {contactNames[appointment.contact_id] ?? "Contacto"}
                        </span>
                      </span>
                      <span className="hidden truncate text-muted-foreground md:inline">
                        {appointment.product_id !== null
                          ? (productNames[appointment.product_id] ?? "Servicio")
                          : "—"}
                      </span>
                      <span className="hidden md:inline-flex">
                        <Badge className={APPOINTMENT_STATUS_BADGE_CLASSES[appointment.status]}>
                          {APPOINTMENT_STATUS_LABELS[appointment.status]}
                        </Badge>
                      </span>
                      <span className="inline-flex justify-end md:justify-start">
                        <Badge
                          className={cn(
                            "md:hidden",
                            APPOINTMENT_STATUS_BADGE_CLASSES[appointment.status],
                          )}
                        >
                          {APPOINTMENT_STATUS_LABELS[appointment.status]}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="hidden text-muted-foreground md:inline-flex"
                        >
                          {appointment.created_by_type === "ai_agent" ? "Asistente" : "Manual"}
                        </Badge>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
