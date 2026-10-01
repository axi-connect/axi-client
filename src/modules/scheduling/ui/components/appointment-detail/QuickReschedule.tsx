"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AvailabilityPanel } from "@/modules/scheduling/ui/components/AvailabilityPanel";
import type { AppointmentDTO } from "@/modules/scheduling/domain/appointment";
import { businessDayKey, type DayKey } from "@/core/lib/business-time";

/**
 * Reagendar rápido (lienzo F1): los horarios libres del mismo día dentro del
 * detalle, sin abrir el formulario. Elegir uno deja listo «Mover a las …» en
 * el pie; «Otro día» abre el formulario de reagendar con la cita precargada.
 */
export function QuickReschedule({
  appointment,
  contactName,
  timezone,
  todayKey,
  selectedTime,
  refreshKey,
  onPick,
}: {
  appointment: AppointmentDTO;
  contactName: string | null;
  timezone: string;
  todayKey: DayKey;
  selectedTime: string;
  refreshKey: number;
  onPick: (time: string) => void;
}) {
  // Una cita que ya pasó se reagenda desde hoy: el backend exige futuro.
  const ownDay = businessDayKey(appointment.starts_at, timezone);
  const day = ownDay < todayKey ? todayKey : ownDay;
  const minutes = Math.round(
    (new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60_000,
  );

  return (
    <section aria-label="Reagendar" className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">Reagendar · {day === todayKey ? "hoy" : "el mismo día"}</h3>
        <Link
          href={`/scheduling/calendar/create?reschedule=${appointment.id}`}
          className="inline-flex min-h-6 items-center gap-1 rounded-full text-sm font-medium underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Otro día
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>
      <AvailabilityPanel
        date={day}
        productId={appointment.product_id ?? undefined}
        durationMinutes={appointment.product_id === null ? minutes : undefined}
        timezone={timezone}
        selectedTime={selectedTime}
        refreshKey={refreshKey}
        onPickSlot={onPick}
      />
      <p className="text-xs text-muted-foreground">
        Axi rehace los recordatorios{contactName !== null ? ` de ${contactName}` : ""} para la nueva hora.
      </p>
    </section>
  );
}
