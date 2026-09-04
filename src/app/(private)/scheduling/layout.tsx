import type { ReactNode } from "react";
import { SchedulingNav } from "@/modules/scheduling/ui/SchedulingNav";

/**
 * Shell de la sección Agenda: sub-navegación fija arriba y el contenido debajo.
 *
 * La sección tiene rutas de los DOS modos de scroll (DESIGN-SYSTEM §4.2):
 * `calendar` y `reminders` son vistas de APLICACIÓN (se topan al viewport y
 * scrollea su interior — la rejilla horaria y la tabla) y `settings` es
 * DOCUMENTAL (crece y la scrollea el panel). Por eso este layout **no declara
 * el modo**: lo propaga con `:has()`, y cada vista de aplicación se marca a sí
 * misma. Declararlo aquí imponía un scroller propio a `settings` y producía las
 * dos barras apiladas más la franja vacía de abajo — el mismo bug que
 * `aed8893` borró del CRM y que este shell heredó al copiarlo antes del
 * arreglo.
 *
 * El centrado documental (`max-w-7xl` + gutters) vive aquí y solo aquí: las
 * documentales no añaden padding propio; las de aplicación lo anulan para
 * quedarse full-bleed y ponen el suyo.
 */
export default function SchedulingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-1 flex-col has-[[data-app-view]]:min-h-0 has-[[data-app-view]]:overflow-hidden">
      <SchedulingNav />
      <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col p-4 md:p-6 has-[[data-app-view]]:min-h-0 has-[[data-app-view]]:max-w-none has-[[data-app-view]]:overflow-hidden has-[[data-app-view]]:p-0">
        {children}
      </div>
    </div>
  );
}
