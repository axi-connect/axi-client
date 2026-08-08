import type { ReactNode } from "react";

/**
 * Segmento del calendario: @sheet = rail de detalle de la cita (ruta
 * interceptada /scheduling/calendar/appointment/[id]); @form = modal de
 * crear/reagendar (/scheduling/calendar/create, con `?reschedule=<id>`).
 */
export default function SchedulingCalendarLayout({
  children,
  sheet,
  form,
}: {
  children: ReactNode;
  sheet: ReactNode;
  form: ReactNode;
}) {
  return (
    <div className="flex h-full w-full min-h-0 overflow-hidden">
      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
      {sheet}
      {form}
    </div>
  );
}
