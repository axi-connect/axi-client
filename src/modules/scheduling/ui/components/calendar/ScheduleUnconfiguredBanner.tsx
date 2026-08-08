"use client";

import Link from "next/link";
import { CalendarOff } from "lucide-react";

/**
 * La empresa no tiene franjas de horario: sin horario no hay grilla de
 * disponibilidad y el asistente de IA no puede agendar. NUNCA confundir con
 * "sin cupo" (kb §3). El CTA lleva al editor de horario existente
 * (`/settings/company`; en F3 pasará a `/scheduling/settings`).
 */
export function ScheduleUnconfiguredBanner() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-warning/40 bg-warning/8 px-4 py-3 text-sm">
      <CalendarOff aria-hidden className="size-4 shrink-0 text-warning" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Configura tu horario de atención</p>
        <p className="text-xs text-muted-foreground">
          Sin horario, el asistente de IA no ofrece citas y el calendario no puede sugerir
          disponibilidad.
        </p>
      </div>
      <Link
        href="/settings/company"
        className="shrink-0 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Configurar horario
      </Link>
    </div>
  );
}
