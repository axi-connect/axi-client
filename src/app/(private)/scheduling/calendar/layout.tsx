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
      {/* flex-col: sin él, el `flex-1` del calendario no tiene contra qué
          crecer y la rejilla medía sus 24 h enteras (1536 px) — nada
          scrolleaba y la vista abría a medianoche en vez del horario. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
      {sheet}
      {form}
    </div>
  );
}
