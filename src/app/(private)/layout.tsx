import type { Metadata } from "next";
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
/**
 * El panel nunca debe aparecer en un buscador. El middleware ya lo protege, así
 * que esto es defensa en profundidad: cubre el caso de una ruta privada nueva
 * que se olvide de registrar, y las URLs que puedan filtrarse por referrer.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

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
    // Marco fijo del panel, topado al viewport: el documento nunca scrollea.
    // `min-h-0` anula el `min-h-svh` del primitivo (misma propiedad, gana por
    // orden en tailwind-merge), que de otro modo dejaría crecer el wrapper.
    <SidebarProvider defaultOpen={sidebarOpen} className="h-dvh min-h-0 overflow-hidden">
      {/* Notifica al splash post-login que la app ya está montada */}
      <AppReadySignal />
      {/* Identidad del tenant (logo/nombre de empresa): composición desde la
          capa app, igual que NotificationBell (arquitectura §3.3). */}
      <AppSidebar
        identity={<CompanyIdentity />}
        initialItems={navigation}
        defaultOpenCodes={openCodes}
      />
      {/* ÚNICO contenedor de scroll del panel, con la scrollbar de marca.
          Es `flex-col` a propósito: el grupo pegado de arriba consume su altura
          REAL y `SidebarInset` se queda con el resto vía `flex-1`. Así ninguna
          vista tiene que restar la altura del header — restarla a mano (52px
          contra un header de 54px) era la causa del doble scroll.
          Ver DESIGN-SYSTEM §4.2. */}
      <div data-app-scroll className="flex min-h-0 flex-1 flex-col overflow-y-auto sidebar-scroll">
        {/* Header y banner pegados como un solo grupo: el contenido sigue
            pasando por detrás del glass al scrollear (DESIGN §5.1) y el banner
            no necesita conocer la altura del header para colocarse debajo. */}
        <div className="sticky top-0 z-40 shrink-0">
          {/* La campana monta el realtime de notificaciones para todo el panel;
              el chip de trial es permanente */}
          <PrivateHeader actions={<><TrialStatusChip /><NotificationBell /></>} />
          {/* Últimos 2 días de trial: en flujo, empuja el contenido */}
          <TrialCountdownBanner />
        </div>
        {/* `min-height: auto` en estos dos niveles es lo que deja CRECER a las
            vistas documentales (dashboard, ajustes) para que scrollee el panel.
            Pero una vista de APLICACIÓN necesita lo contrario: quedarse topada
            para que scrollee su interior (el timeline del inbox, una tabla).
            Como el mismo shell sirve a las dos, la vista lo declara con
            `data-app-view` y aquí se recoge con `:has()` — mismo mecanismo que
            el `has-data-[variant=inset]` del primitivo. Ver DESIGN-SYSTEM §4.2. */}
        <SidebarInset className="has-[[data-app-view]]:min-h-0">
          {/* Superficie de marca a ancho completo; el centrado del contenido
              (max-w + gutters) lo aporta el layout del grupo (content). Las
              vistas de aplicación (workspace) son full-bleed sobre ella. */}
          <div className="flex w-full flex-1 flex-col rounded-3xl rounded-b-none bg-gradient-to-br from-muted/50 to-muted has-[[data-app-view]]:min-h-0">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

// bg-[url('https://static.vecteezy.com/system/resources/previews/007/278/153/non_2x/abstract-sciencece-or-technology-with-neon-light-and-empty-space-for-text-futuristic-background-vector.jpg')] bg-center bg-cover bg-no-repeat