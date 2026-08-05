import type { ReactNode } from "react";
import { CrmNav } from "@/modules/crm/ui/CrmNav";

/**
 * Shell de la sección CRM: full-bleed acotado a la altura disponible (patrón
 * orders) con la sub-navegación fija arriba y el contenido scrolleable. El
 * slot @sheet (rail de deal) se añade en F3.
 *
 * `min-h-0 flex-1` en vez de `calc(100svh - alto del header)`: la altura la
 * reparte el flex del shell privado (DESIGN-SYSTEM §4.2).
 */
export default function CrmLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <CrmNav />
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
