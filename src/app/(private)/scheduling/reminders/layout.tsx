import type { ReactNode } from "react";

/**
 * Segmento de recordatorios. Vista de APLICACIÓN: se topa al viewport y el
 * único scroll del área es el de la tabla (`RemindersView`), así que es este
 * segmento —y no el shell de sección— el que declara `data-app-view`
 * (DESIGN-SYSTEM §4.2). Vive en el layout y no en la vista para que el
 * `loading.tsx` quede en el mismo modo; si no, el esqueleto se pinta como
 * documental y hereda el padding del shell además del suyo.
 */
export default function SchedulingRemindersLayout({ children }: { children: ReactNode }) {
  return (
    <div data-app-view className="flex min-h-0 w-full flex-1 overflow-hidden">
      {children}
    </div>
  );
}
