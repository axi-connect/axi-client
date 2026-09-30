"use client";

import { useMemo } from "react";
import { MessageSquareText, Phone, UserRound } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Input } from "@/shared/components/ui/input";
import {
  APPOINTMENT_STATUS_DOT,
  APPOINTMENT_STATUS_LABELS,
  appointmentOrigin,
  type AppointmentDTO,
} from "@/modules/scheduling/domain/appointment";
import { fmtClockRange } from "@/modules/scheduling/domain/time-grid";
import { addDaysToKey, businessDayKey, fmtDayLong, type DayKey } from "@/core/lib/business-time";
import { LIST_MAX_DAYS } from "@/modules/scheduling/domain/calendar-range";
import { GlassGlyph } from "@/shared/components/ui/glyphs";

const ORIGIN_LABEL = {
  call: { icon: Phone, label: "Por llamada" },
  conversation: { icon: MessageSquareText, label: "Por chat" },
  team: { icon: UserRound, label: "Equipo" },
} as const;

/** «Hoy · Miércoles 30 de septiembre»: sin coma ni año. */
export function dayHeading(day: DayKey, todayKey: DayKey): string {
  const raw = fmtDayLong(day).replace(", ", " ").replace(/ de \d{4}$/, "");
  const long = raw.charAt(0).toUpperCase() + raw.slice(1);
  if (day === todayKey) return `Hoy · ${long}`;
  if (day === addDaysToKey(todayKey, 1)) return `Mañana · ${long}`;
  return long;
}

/**
 * Vista Lista (lienzo F1): citas del rango agrupadas por día. Cada fila dice
 * la hora, el estado en su punto, quién y qué servicio, y de dónde vino. El
 * rango es manual y el backend lo limita a 92 días; el clamp lo aplica el store.
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xs">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 text-sm md:px-6">
        <span className="text-muted-foreground">Del</span>
        <Input
          type="date"
          value={listRange.from}
          aria-label="Desde"
          classNameContainer="w-40 shrink-0"
          className="h-9 rounded-full tabular-nums"
          onChange={(e) => {
            if (e.target.value) onRangeChange(e.target.value, listRange.to);
          }}
        />
        <span className="text-muted-foreground">al</span>
        <Input
          type="date"
          value={listRange.to}
          aria-label="Hasta"
          classNameContainer="w-40 shrink-0"
          className="h-9 rounded-full tabular-nums"
          onChange={(e) => {
            if (e.target.value) onRangeChange(listRange.from, e.target.value);
          }}
        />
        <span className="text-xs text-muted-foreground">Hasta {LIST_MAX_DAYS} días</span>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {appointments.length === 1 ? "1 cita" : `${appointments.length} citas`}
        </span>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <GlassGlyph kind="noresults" tier="sm" />
          <p className="font-heading text-lg font-bold">Sin citas en estos días</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Cambia las fechas o el filtro de estado. Cuando Axi o tu equipo agenden, las verás aquí.
          </p>
        </div>
      ) : (
        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto">
          {groups.map(([day, items], index) => {
            const active = items.filter((a) => a.status !== "cancelled").length;
            return (
              <section key={day} aria-label={fmtDayLong(day)}>
                <h3
                  className={cn(
                    "sticky top-0 z-[1] flex items-baseline justify-between gap-3 bg-card px-4 pt-4 pb-2.5 md:px-6",
                    index > 0 && "border-t border-border",
                  )}
                >
                  <span className="font-heading text-base font-bold md:text-lg">
                    {dayHeading(day, todayKey)}
                  </span>
                  <span className="shrink-0 text-xs font-normal text-muted-foreground tabular-nums">
                    {active === 1 ? "1 cita" : `${active} citas`}
                  </span>
                </h3>
                <ul>
                  {items.map((appointment) => {
                    const origin = ORIGIN_LABEL[appointmentOrigin(appointment).kind];
                    const OriginIcon = origin.icon;
                    const cancelled = appointment.status === "cancelled";
                    return (
                      <li key={appointment.id}>
                        <button
                          type="button"
                          onClick={() => onOpen(appointment.id)}
                          className="grid w-full grid-cols-[88px_8px_minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-4 py-3 text-left text-sm transition-colors hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset md:grid-cols-[110px_8px_minmax(0,1fr)_auto_auto] md:gap-4 md:px-6"
                        >
                          <span className="font-mono text-xs whitespace-nowrap md:text-sm">
                            {fmtClockRange(appointment.starts_at, appointment.ends_at, timezone)}
                          </span>
                          <span aria-hidden className={cn("size-2 rounded-full", APPOINTMENT_STATUS_DOT[appointment.status])} />
                          <span className="min-w-0">
                            <span
                              className={cn(
                                "block truncate font-semibold",
                                cancelled && "text-muted-foreground line-through",
                              )}
                            >
                              {contactNames[appointment.contact_id] ?? "Contacto"}
                            </span>
                            {appointment.product_id !== null && (
                              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                {productNames[appointment.product_id] ?? "Servicio"}
                              </span>
                            )}
                          </span>
                          <span className="hidden items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground md:inline-flex">
                            <OriginIcon aria-hidden className="size-3.5" />
                            {origin.label}
                          </span>
                          <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-secondary px-2.5 text-xs font-medium whitespace-nowrap">
                            <span aria-hidden className={cn("size-1.5 rounded-full", APPOINTMENT_STATUS_DOT[appointment.status])} />
                            {APPOINTMENT_STATUS_LABELS[appointment.status]}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
