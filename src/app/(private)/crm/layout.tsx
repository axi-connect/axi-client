import type { ReactNode } from "react";
import { CrmNav } from "@/modules/crm/ui/CrmNav";

/**
 * Shell de la sección CRM: full-bleed acotado al viewport (patrón orders,
 * 52px = PrivateHeader) con la sub-navegación fija arriba y el contenido
 * scrolleable. El slot @sheet (rail de deal) se añade en F3.
 */
export default function CrmLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[calc(100svh-52px)] w-full min-h-0 flex-col overflow-hidden">
      <CrmNav />
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
