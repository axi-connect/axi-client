import { AppSidebar } from "@/components/ui/sidebar";
import { PrivateHeader } from "@/components/ui/private-header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar/core"

export default function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <PrivateHeader />
        <SidebarInset>
          <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
            <div className="rounded-xl border border-border bg-background shadow-sm p-4 md:p-6">
              {children}
            </div>
          </div>
        </SidebarInset>
      </main>
    </SidebarProvider>
  );
}