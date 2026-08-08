"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarOff } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { AvailabilityDTO } from "@/modules/scheduling/domain/availability";
import { fmtTime, hhmmFromInstant, type DayKey } from "@/modules/scheduling/domain/business-time";
import { getAvailability } from "@/modules/scheduling/infrastructure/services/availability-service.adapter";

/**
 * Slots sugeridos por `GET /scheduling/availability` para la fecha del
 * formulario. Son una SUGERENCIA: el operador puede agendar off-grid (la IA
 * no). `schedule_configured: false` = "configura tu horario", nunca "sin cupo".
 */
export function AvailabilityPanel({
  date,
  productId,
  durationMinutes,
  timezone,
  selectedTime,
  refreshKey,
  onPickSlot,
}: {
  date: DayKey | "";
  productId?: string;
  durationMinutes?: number;
  timezone: string;
  /** "HH:mm" elegido en el formulario (slot o libre). */
  selectedTime: string;
  /** Bump para refrescar tras un 409 de cupo. */
  refreshKey: number;
  onPickSlot: (time: string) => void;
}) {
  const [availability, setAvailability] = useState<AvailabilityDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (date === "") {
      setAvailability(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    getAvailability({
      date_from: date,
      date_to: date,
      product_id: productId !== "" ? productId : undefined,
      duration_minutes: productId === "" || productId === undefined ? durationMinutes : undefined,
    })
      .then((data) => {
        if (alive) setAvailability(data);
      })
      .catch((err: unknown) => {
        if (alive) setError(errorMessage(err, "No se pudo consultar la disponibilidad"));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [date, productId, durationMinutes, refreshKey]);

  if (date === "") {
    return <p className="text-xs text-muted-foreground">Elige una fecha para ver horarios sugeridos.</p>;
  }

  if (loading) {
    return (
      <div className="flex flex-wrap gap-2" role="status" aria-label="Consultando disponibilidad">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
    );
  }

  if (error !== null) {
    return <p className="text-xs text-destructive">{error}</p>;
  }

  if (availability === null) return null;

  if (!availability.schedule_configured) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/8 p-3 text-xs">
        <CalendarOff aria-hidden className="mt-0.5 size-3.5 shrink-0 text-warning" />
        <span>
          La empresa aún no tiene horario de atención configurado: no hay horarios sugeridos, pero
          puedes elegir una hora libre.{" "}
          <Link href="/settings/company" className="font-medium text-brand hover:underline">
            Configurar horario
          </Link>
        </span>
      </div>
    );
  }

  if (availability.slots.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Sin disponibilidad este día según el horario y el cupo. Puedes elegir una hora libre.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Horarios sugeridos · duración {availability.duration_minutes} min
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Horarios sugeridos">
        {availability.slots.map((slot) => {
          const time = hhmmFromInstant(slot.starts_at, timezone);
          const selected = time === selectedTime;
          const full = slot.remaining_capacity <= 0;
          return (
            <button
              key={slot.starts_at}
              type="button"
              disabled={full}
              aria-pressed={selected}
              onClick={() => onPickSlot(time)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium tabular-nums transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-brand",
                full && "cursor-not-allowed line-through opacity-45",
              )}
            >
              {fmtTime(slot.starts_at, timezone)}
              {/* "quedan N" es aviso funcional (familia warning), no acento de vista. */}
              {slot.remaining_capacity > 1 && (
                <span
                  className={cn(
                    "text-[10px] font-bold",
                    selected ? "text-primary-foreground" : "text-warning",
                  )}
                >
                  quedan {slot.remaining_capacity}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
