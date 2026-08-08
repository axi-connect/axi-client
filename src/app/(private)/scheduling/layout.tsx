import type { ReactNode } from "react";
import { SchedulingNav } from "@/modules/scheduling/ui/SchedulingNav";

/**
 * Shell de la sección Agenda: full-bleed acotado a la altura disponible
 * (patrón CRM) con la sub-navegación fija arriba y el contenido scrolleable.
 */
export default function SchedulingLayout({ children }: { children: ReactNode }) {
  return (
    <div data-app-view className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <SchedulingNav />
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
