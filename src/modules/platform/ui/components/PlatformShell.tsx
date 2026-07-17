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
    <SidebarProvider>
      <PlatformSidebar />
      <main data-app-scroll className="h-svh flex-1 overflow-y-auto sidebar-scroll">
        <PlatformHeader />
        <SessionBanner />
        <SidebarInset>
          <div className="min-h-[calc(100vh-52px)] w-full rounded-3xl rounded-b-none bg-gradient-to-br from-muted/50 to-muted">
            {/* Centrado estándar del contenido (DESIGN-SYSTEM §4.2): las
                páginas no añaden padding propio. */}
            <div className="mx-auto w-full max-w-7xl p-4 md:p-6">{children}</div>
          </div>
        </SidebarInset>
      </main>
      <ReLoginModal />
    </SidebarProvider>
  );
}
