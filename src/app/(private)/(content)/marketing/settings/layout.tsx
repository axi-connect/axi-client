import type { Metadata } from "next";
import { PageHeader } from "@/shared/components/layout/page-header";
import { MarketingSettingsNav } from "@/modules/marketing/ui/components/MarketingSettingsNav";

export const metadata: Metadata = { title: "Configuración · Marketing" };

export default function MarketingSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configuración"
        description="Los límites que protegen a tus clientes y a tus números de WhatsApp."
      />
      <MarketingSettingsNav />
      {children}
    </div>
  );
}
