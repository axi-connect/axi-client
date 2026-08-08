import type { ReactNode } from "react";

/**
 * Segmento del calendario: @sheet = rail de detalle de la cita (ruta
 * interceptada /scheduling/calendar/appointment/[id]). El slot @form
 * (crear/reagendar) se añade en F2.
 */
export default function SchedulingCalendarLayout({
  children,
  sheet,
}: {
  children: ReactNode;
  sheet: ReactNode;
}) {
  return (
    <div className="flex h-full w-full min-h-0 overflow-hidden">
      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
      {sheet}
    </div>
  );
}
