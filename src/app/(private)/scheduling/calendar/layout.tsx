import type { ReactNode } from "react";

/**
 * Segmento del calendario: @sheet = rail de detalle de la cita (ruta
 * interceptada /scheduling/calendar/appointment/[id]); @form = modal de
 * crear/reagendar (/scheduling/calendar/create, con `?reschedule=<id>`).
 *
 * Vista de APLICACIÓN: la rejilla horaria se topa al viewport y scrollea por
 * dentro, así que es ella —y no el shell de sección— la que declara
 * `data-app-view` (DESIGN-SYSTEM §4.2). `flex-1` en vez de `h-full`: un
 * porcentaje contra un padre de altura `auto` resuelve a `auto`.
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
    <div data-app-view className="flex min-h-0 w-full flex-1 overflow-hidden">
      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
      {sheet}
      {form}
    </div>
  );
}
