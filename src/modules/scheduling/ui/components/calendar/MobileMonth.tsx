"use client";

import { ChevronLeft, ChevronRight, MessageSquareText, Phone, UserRound } from "lucide-react";
import { cn } from "@/core/lib/utils";
import {
  APPOINTMENT_STATUS_DOT,
  appointmentOrigin,
  type AppointmentSegment,
} from "@/modules/scheduling/domain/appointment";
import { dayNumber, fmtClock } from "@/modules/scheduling/domain/time-grid";
import { fmtDayLong, fmtMonthTitle, monthOfKey, type DayKey } from "@/core/lib/business-time";
import { dayHeading } from "./AppointmentsList";

const LETTERS = ["L", "M", "X", "J", "V", "S", "D"];
const ORIGIN_ICON = { call: Phone, conversation: MessageSquareText, team: UserRound } as const;
const ORIGIN_LABEL = { call: "Por llamada", conversation: "Por chat", team: "Equipo" } as const;

/**
 * Mes del celular (lienzo F1): el mes en puntos —hasta tres por día— y, debajo,
 * las citas del día elegido. Tocar un día lo elige; «Ver el día» abre su Día.
 */
export function MobileMonth({
  days,
  anchor,
  todayKey,
  timezone,
  segmentsByDay,
  contactNames,
  productNames,
  onPickDay,
  onStepMonth,
  onOpenDay,
  onOpen,
}: {
  days: DayKey[];
  anchor: DayKey;
  todayKey: DayKey;
  timezone: string;
  segmentsByDay: Map<DayKey, AppointmentSegment[]>;
  contactNames: Record<string, string>;
  productNames: Record<string, string>;
  onPickDay: (day: DayKey) => void;
  onStepMonth: (delta: 1 | -1) => void;
  onOpenDay: (day: DayKey) => void;
  onOpen: (id: string) => void;
}) {
  const anchorMonth = monthOfKey(anchor);
  const picked = segmentsByDay.get(anchor) ?? [];
  const title = fmtMonthTitle(anchor).replace(" de ", " ");

  return (
    <div className="-mx-4 flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-4 pb-1.5">
        <h2 className="font-heading text-lg font-bold first-letter:uppercase">{title}</h2>
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-label="Mes anterior"
            onClick={() => onStepMonth(-1)}
            className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Mes siguiente"
            onClick={() => onStepMonth(1)}
            className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
      </div>

      <div className="px-2.5">
        <div aria-hidden className="grid grid-cols-7 pb-1.5 text-center text-xs text-muted-foreground">
          {LETTERS.map((letter) => (
            <span key={letter}>{letter}</span>
          ))}
        </div>
        <div role="group" aria-label="Días del mes" className="grid grid-cols-7 gap-y-0.5">
          {days.map((day) => {
            const count = (segmentsByDay.get(day) ?? []).filter(
              ({ appointment }) => appointment.status !== "cancelled",
            ).length;
            const isToday = day === todayKey;
            const selected = day === anchor;
            const inMonth = monthOfKey(day) === anchorMonth;
            return (
              <button
                key={day}
                type="button"
                aria-pressed={selected}
                aria-current={isToday ? "date" : undefined}
                aria-label={`${fmtDayLong(day)}, ${count === 1 ? "1 cita" : `${count} citas`}`}
                onClick={() => onPickDay(day)}
                className="flex h-12 flex-col items-center gap-0.5 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "inline-flex size-9 items-center justify-center rounded-full font-heading text-base font-semibold tabular-nums",
                    isToday
                      ? "bg-foreground text-background"
                      : selected
                        ? "ring-[1.5px] ring-foreground ring-inset"
                        : inMonth
                          ? "text-foreground"
                          : "text-muted-foreground",
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
      </div>

      <section
        aria-label={`Citas del ${fmtDayLong(anchor)}`}
        className="sidebar-scroll mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto border-t border-border bg-card"
      >
        <div className="flex items-baseline justify-between gap-3 px-4 pt-3.5 pb-2.5">
          <h3 className="min-w-0 truncate text-sm font-semibold">{dayHeading(anchor, todayKey)}</h3>
          <button
            type="button"
            onClick={() => onOpenDay(anchor)}
            className="inline-flex min-h-6 shrink-0 items-center rounded-full text-xs font-medium underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Ver el día
          </button>
        </div>
        {picked.length === 0 ? (
          <p className="border-t border-border px-4 py-4 text-sm text-muted-foreground">Día libre.</p>
        ) : (
          <ul>
            {picked.map(({ appointment, segment }) => {
              const kind = appointmentOrigin(appointment).kind;
              const Icon = ORIGIN_ICON[kind];
              const cancelled = appointment.status === "cancelled";
              const minutes = Math.round(
                (new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60_000,
              );
              return (
                <li key={`${appointment.id}-${segment.startMin}`}>
                  <button
                    type="button"
                    onClick={() => onOpen(appointment.id)}
                    className="grid min-h-14 w-full grid-cols-[48px_8px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-border px-4 py-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
                  >
                    <span className="font-mono text-xs">{fmtClock(appointment.starts_at, timezone)}</span>
                    <span aria-hidden className={cn("size-2 rounded-full", APPOINTMENT_STATUS_DOT[appointment.status])} />
                    <span className="min-w-0">
                      <span className={cn("block truncate text-sm font-semibold", cancelled && "text-muted-foreground line-through")}>
                        {contactNames[appointment.contact_id] ?? "Contacto"}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {appointment.product_id !== null
                          ? `${productNames[appointment.product_id] ?? "Servicio"} · ${minutes} min`
                          : `${minutes} min`}
                      </span>
                    </span>
                    <Icon aria-label={ORIGIN_LABEL[kind]} className="size-3.5 text-muted-foreground" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
