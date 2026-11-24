"use client";

/**
 * Armazón de la consola (rediseño F1, mockup aprobado): barra lateral en seis
 * grupos + columna de contenido con UN solo contenedor de scroll. En
 * escritorio no hay barra superior: la ruta legible va encima del contenido
 * (`PlatformBreadcrumb`) y cada página trae su encabezado. En el celular y la
 * tableta (< 1024 px) aparece la barra con el menú y la lupa.
 *
 * Se conserva la UX de la sesión: aviso T−2 min pegado arriba y el
 * `ReLoginModal` global que tapa la vista sin perderla. El buscador (Ctrl K)
 * se monta una vez para toda la consola.
 */
import { SidebarInset, SidebarProvider } from "@/shared/components/layout/sidebar/core";
import { PlatformBreadcrumb } from "./PlatformBreadcrumb";
import { PlatformCommandProvider } from "./PlatformCommand";
import { PlatformSidebar } from "./PlatformSidebar";
import { PlatformTopbar } from "./PlatformTopbar";
import { ReLoginModal } from "./ReLoginModal";
import { SessionBanner } from "./SessionBanner";

export function PlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <PlatformCommandProvider>
      {/* Marco fijo topado al viewport: el documento nunca scrollea (DESIGN-SYSTEM §4.2). */}
      <SidebarProvider className="h-dvh min-h-0 overflow-hidden">
        <PlatformSidebar />
        {/* ÚNICO contenedor de scroll de la consola */}
        <div data-app-scroll className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto sidebar-scroll">
          {/* Barra del celular + aviso de sesión, pegados como un solo grupo. */}
          <div className="sticky top-0 z-40 shrink-0">
            <PlatformTopbar />
            <SessionBanner />
          </div>
          {/* Una vista de aplicación (`data-app-view`, hoy el simulacro de
              quality) se topa al viewport con :has() — solo en `app-fit`. */}
          <SidebarInset className="min-w-0 app-fit:has-[[data-app-view]]:min-h-0">
            {/* Bloque, no flex, como antes: las vistas de F2–F5 se pintan con el mismo
                flujo que tenían (una vista con un mínimo de contenido ancho no ensancha la columna). */}
            <div className="mx-auto w-full max-w-7xl min-w-0 px-4 pt-5 pb-20 md:px-8 md:pt-7 app-fit:has-[[data-app-view]]:flex app-fit:has-[[data-app-view]]:min-h-0 app-fit:has-[[data-app-view]]:flex-1 app-fit:has-[[data-app-view]]:flex-col app-fit:has-[[data-app-view]]:pb-6">
              <PlatformBreadcrumb className="mb-5" />
              {children}
            </div>
          </SidebarInset>
        </div>
        <ReLoginModal />
      </SidebarProvider>
    </PlatformCommandProvider>
  );
}
