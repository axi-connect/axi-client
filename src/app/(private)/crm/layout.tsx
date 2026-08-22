import type { ReactNode } from "react";
import { CrmNav } from "@/modules/crm/ui/CrmNav";

/**
 * Shell de la sección CRM: sub-navegación fija arriba y el contenido debajo.
 *
 * La sección tiene rutas de los DOS modos de scroll (DESIGN-SYSTEM §4.2):
 * `pipeline` es una vista de APLICACIÓN (kanban topado al viewport que scrollea
 * por dentro) y contactos/tareas/configuración son DOCUMENTALES (crecen y las
 * scrollea el panel). Por eso este layout **no declara el modo**: lo propaga
 * con `:has()`, igual que el shell privado con `SidebarInset`. Declararlo aquí
 * imponía un scroller interno a las documentales y producía el doble scroll de
 * `/crm/contacts` — el de la sección más el del panel — y, como el
 * `overflow-y: auto` fuerza `overflow-x` a `auto`, la franja vacía de abajo.
 *
 * El centrado documental (`max-w-7xl` + gutters, como el grupo `(content)`)
 * vive aquí y solo aquí: las páginas no añaden padding propio. Una vista de
 * aplicación lo anula para quedarse full-bleed.
 */
export default function CrmLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-1 flex-col has-[[data-app-view]]:min-h-0 has-[[data-app-view]]:overflow-hidden">
      <CrmNav />
      <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col p-4 md:p-6 has-[[data-app-view]]:min-h-0 has-[[data-app-view]]:max-w-none has-[[data-app-view]]:overflow-hidden has-[[data-app-view]]:p-0">
        {children}
      </div>
    </div>
  );
}
