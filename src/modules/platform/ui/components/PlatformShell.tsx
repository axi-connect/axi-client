"use client";

/**
 * Shell del panel de plataforma: sidebar propio + header glass + superficie
 * de contenido centrada (mismo patrón visual que el layout privado de
 * tenant) + UX de expiración (banner T−2 min y ReLoginModal superpuestos).
 */
import { SidebarInset, SidebarProvider } from "@/shared/components/layout/sidebar/core";
import { PlatformHeader } from "./PlatformHeader";
import { PlatformSidebar } from "./PlatformSidebar";
import { ReLoginModal } from "./ReLoginModal";
import { SessionBanner } from "./SessionBanner";

export function PlatformShell({ children }: { children: React.ReactNode }) {
  return (
    // Marco fijo topado al viewport: el documento nunca scrollea. Mismo
    // reparto de altura por flex que el shell privado (DESIGN-SYSTEM §4.2):
    // ninguna vista resta la altura del header.
    <SidebarProvider className="h-dvh min-h-0 overflow-hidden">
      <PlatformSidebar />
      {/* ÚNICO contenedor de scroll de la consola */}
      <div data-app-scroll className="flex min-h-0 flex-1 flex-col overflow-y-auto sidebar-scroll">
        {/* Header + banner de sesión pegados como un solo grupo: el contenido
            pasa por detrás del glass y el banner no calcula el offset. */}
        <div className="sticky top-0 z-40 shrink-0">
          <PlatformHeader />
          <SessionBanner />
        </div>
        <SidebarInset>
          <div className="flex w-full flex-1 flex-col rounded-3xl rounded-b-none bg-gradient-to-br from-muted/50 to-muted">
            {/* Centrado estándar del contenido (DESIGN-SYSTEM §4.2): las
                páginas no añaden padding propio. */}
            <div className="mx-auto w-full max-w-7xl p-4 md:p-6">{children}</div>
          </div>
        </SidebarInset>
      </div>
      <ReLoginModal />
    </SidebarProvider>
  );
}
