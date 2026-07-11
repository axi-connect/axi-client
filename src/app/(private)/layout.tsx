import { AppSidebar } from "@/shared/components/layout/sidebar";
import { AppReadySignal } from "@/core/providers/app-ready-signal";
import { PrivateHeader } from "@/shared/components/layout/private-header";
import { SidebarProvider, SidebarInset } from "@/shared/components/layout/sidebar/core"
import { NotificationBell } from "@/modules/notifications/ui/components/NotificationBell";
import { CompanyIdentity } from "@/modules/companies/ui/components/CompanyIdentity";

export default function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      {/* Notifica al splash post-login que la app ya está montada */}
      <AppReadySignal />
      {/* Identidad del tenant (logo/nombre de empresa): composición desde la
          capa app, igual que NotificationBell (arquitectura §3.3). */}
      <AppSidebar identity={<CompanyIdentity />} />
      {/* Contenedor de scroll del panel privado (mismo patrón que el layout
          público): html/body llevan overflow hidden, así que el scroll vive
          aquí, con la scrollbar de marca. El header sticky se ancla a él. */}
      <main data-app-scroll className="h-svh flex-1 overflow-y-auto sidebar-scroll">
        {/* La campana monta el realtime de notificaciones para todo el panel */}
        <PrivateHeader actions={<NotificationBell />} />
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