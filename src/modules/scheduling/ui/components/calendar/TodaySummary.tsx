"use client";

import { useEffect, useState } from "react";
import type { AppointmentDTO } from "@/modules/scheduling/domain/appointment";
import { nextUpcoming, todaySentence } from "@/modules/scheduling/domain/day-summary";
import { rangeForView } from "@/modules/scheduling/domain/calendar-range";
import { fmtClock } from "@/modules/scheduling/domain/time-grid";
import { todayKey } from "@/core/lib/business-time";
import { useCompanySchedule } from "@/modules/scheduling/infrastructure/hooks/use-company-schedule";
import { listAppointments } from "@/modules/scheduling/infrastructure/services/appointments-service.adapter";
import { hydrateContactNames } from "@/modules/scheduling/infrastructure/services/entity-names.cache";
import { useCalendarStore } from "@/modules/scheduling/infrastructure/stores/calendar.store";

/**
 * La frase del día bajo «Agenda» (lienzo F1): cuántas citas hay hoy, cuántas
 * esperan confirmación y cuál sigue. Pide su propio día —el calendario puede
 * estar mirando otra semana— y se recalcula cuando el calendario cambia algo.
 * Sin datos todavía, no pinta nada (no reserva un hueco que salte).
 */
export function TodaySummary() {
  const { timezone } = useCompanySchedule();
  // Cualquier mutación del calendario (crear, reagendar, cambiar estado) toca el mapa.
  const version = useCalendarStore((s) => s.appointmentsById);
  const [today, setToday] = useState<AppointmentDTO[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (timezone === null) return;
    let alive = true;
    const key = todayKey(new Date(), timezone);
    const range = rangeForView("list", key, timezone, { from: key, to: key });
    listAppointments({ from: range.fromUtc, to: range.toUtc })
      .then(async (appointments) => {
        if (!alive) return;
        setToday(appointments);
        const next = nextUpcoming(appointments, new Date());
        if (next !== null) {
          const resolved = await hydrateContactNames([next.contact_id]).catch(() => ({}));
          if (alive) setNames(resolved);
        }
      })
      .catch(() => {
        // La frase es un extra: si falla, la cabecera queda solo con el título.
      });
    return () => {
      alive = false;
    };
  }, [timezone, version]);

  if (today === null || timezone === null) return null;

  const next = nextUpcoming(today, new Date());
  const sentence = todaySentence(
    today,
    next === null
      ? null
      : { appointment: next, contactName: names[next.contact_id] ?? null, time: fmtClock(next.starts_at, timezone) },
  );

  return (
    <p className="text-sm text-pretty text-foreground/80">
      {sentence.lead}
      {sentence.next !== null && (
        <>
          {" "}
          La próxima, a las {sentence.next.time}:{" "}
          <span className="font-semibold text-foreground">{sentence.next.name}</span>.
        </>
      )}
    </p>
  );
}
