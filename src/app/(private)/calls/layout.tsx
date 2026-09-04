import type { ReactNode } from "react";
import { CallsNav } from "@/modules/calls/ui/CallsNav";

/**
 * Shell de la sección Llamadas: sub-navegación fija arriba y el contenido
 * debajo.
 *
 * **No declara el modo de scroll.** Las cuatro rutas del módulo —monitoreo,
 * historial, detalle y configuración— son DOCUMENTALES: crecen y las scrollea
 * el panel. Este layout declaraba `data-app-view` para todas ellas, que es el
 * marcador de vista de APLICACIÓN, y les imponía un scroller propio: de ahí las
 * dos barras apiladas de `/calls/settings` y, como un `overflow-y: auto` fuerza
 * `overflow-x` a `auto`, la franja vacía de abajo. Es exactamente el bug que
 * `aed8893` borró del shell del CRM; el módulo de llamadas aterrizó después y
 * reintrodujo el patrón copiándolo.
 *
 * Si algún día llega una vista de aplicación al módulo, es ELLA la que se marca
 * (molde: `crm/pipeline/layout.tsx`) y el `:has()` de aquí hace el resto.
 * Ver DESIGN-SYSTEM §4.2.
 *
 * El centrado documental (`max-w-7xl` + gutters, como el grupo `(content)`)
 * vive aquí y solo aquí: las vistas no añaden padding propio.
 */
export default function CallsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-1 flex-col has-[[data-app-view]]:min-h-0 has-[[data-app-view]]:overflow-hidden">
      <CallsNav />
      <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col p-4 md:p-6 has-[[data-app-view]]:min-h-0 has-[[data-app-view]]:max-w-none has-[[data-app-view]]:overflow-hidden has-[[data-app-view]]:p-0">
        {children}
      </div>
    </div>
  );
}
