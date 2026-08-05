import { cookies } from "next/headers";

import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import { AppSidebar } from "@/shared/components/layout/sidebar";
import { AppReadySignal } from "@/core/providers/app-ready-signal";
import { PrivateHeader } from "@/shared/components/layout/private-header";
import { SidebarProvider, SidebarInset } from "@/shared/components/layout/sidebar/core"
import { NotificationBell } from "@/modules/notifications/ui/components/NotificationBell";
import { CompanyIdentity } from "@/modules/companies/ui/components/CompanyIdentity";
import { TrialStatusChip } from "@/modules/companies/ui/components/TrialStatusChip";
import { TrialCountdownBanner } from "@/modules/companies/ui/components/TrialCountdownBanner";

/**
 * Precarga del árbol de navegación en el servidor: `http` en server lee la
 * cookie `accessToken` vía `next/headers`, así que el menú llega resuelto al
 * primer paint — sin skeleton y sin round-trip del browser a
 * `/api/auth/sidebar`.
 *
 * Falla en silencio a propósito: un backend caído no debe tumbar el panel. El
 * `AppSidebar` cae entonces a su fetch cliente y a su estado de error con
 * reintento.
 */
async function prefetchNavigation() {
  try {
    const navigation = await http.get<Schemas["NavigationDto"]>("/me/navigation");
    return navigation.data;
  } catch {
    return undefined;
  }
}

export default async function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [jar, navigation] = await Promise.all([cookies(), prefetchNavigation()]);

  // Estado colapsado: `core.tsx` escribía esta cookie y nadie la leía, así que
  // el colapso no sobrevivía a una recarga.
  const sidebarOpen = jar.get("sidebar_state")?.value !== "false";
  // Grupos desplegados, identificados por `code`.
  const openCodes = (jar.get("sidebar_nav_open")?.value ?? "")
    .split(",")
    .filter((code) => code.length > 0);

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      {/* Notifica al splash post-login que la app ya está montada */}
      <AppReadySignal />
      {/* Identidad del tenant (logo/nombre de empresa): composición desde la
          capa app, igual que NotificationBell (arquitectura §3.3). */}
      <AppSidebar
        identity={<CompanyIdentity />}
        initialItems={navigation}
        defaultOpenCodes={openCodes}
      />
      {/* Contenedor de scroll del panel privado (mismo patrón que el layout
          público): html/body llevan overflow hidden, así que el scroll vive
          aquí, con la scrollbar de marca. El header sticky se ancla a él. */}
      <main data-app-scroll className="h-svh flex-1 overflow-y-auto sidebar-scroll">
        {/* La campana monta el realtime de notificaciones para todo el panel;
            el chip de trial es permanente y no altera los 52px del header */}
        <PrivateHeader actions={<><TrialStatusChip /><NotificationBell /></>} />
        {/* Últimos 2 días de trial: banner sticky en flujo (empuja contenido,
            no rompe los calc de 52px del workspace full-bleed) */}
        <TrialCountdownBanner />
        <SidebarInset>
          {/* Superficie de marca a ancho completo; el centrado del contenido
              (max-w + gutters) lo aporta el layout del grupo (content). Las
              vistas de aplicación (workspace) son full-bleed sobre ella. */}
          <div className="w-full min-h-[calc(100vh-52px)] rounded-3xl rounded-b-none bg-gradient-to-br from-muted/50 to-muted">
            {children}
          </div>
        </SidebarInset>
      </main>
    </SidebarProvider>
  );
}

// bg-[url('https://static.vecteezy.com/system/resources/previews/007/278/153/non_2x/abstract-sciencece-or-technology-with-neon-light-and-empty-space-for-text-futuristic-background-vector.jpg')] bg-center bg-cover bg-no-repeat