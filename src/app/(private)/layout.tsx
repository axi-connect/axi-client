import { AppSidebar } from "@/components/ui/sidebar";
import { PrivateHeader } from "@/components/features/private-header";
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
          <div className="mx-auto w-full min-h-[calc(100vh-52px)] max-w-7xl p-4 md:p-6 rounded-3xl rounded-b-none bg-gradient-to-br from-muted/50 to-muted">
            {children}
          </div>
        </SidebarInset>
      </main>
    </SidebarProvider>
  );
}

// bg-[url('https://static.vecteezy.com/system/resources/previews/007/278/153/non_2x/abstract-sciencece-or-technology-with-neon-light-and-empty-space-for-text-futuristic-background-vector.jpg')] bg-center bg-cover bg-no-repeat